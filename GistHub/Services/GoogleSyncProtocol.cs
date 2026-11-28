using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using GistHub.Models;

namespace GistHub.Services;

/// <summary>Pure transport codec and causal replay; no storage, network or active account access.</summary>
public static class GoogleSyncProtocol
{
    public static string Canonicalize(string json)
    {
        using var document = JsonDocument.Parse(json);
        var output = new StringBuilder();
        Write(document.RootElement, output);
        return output.ToString();
    }

    public static string Hash(string canonicalBody) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonicalBody))).ToLowerInvariant();

    public static GoogleSyncEnvelope Encode(GoogleSyncOperation operation)
    {
        Validate(operation);
        var normalized = operation with
        {
            ParentIds = operation.ParentIds.Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal).ToArray()
        };
        var body = Canonicalize(JsonSerializer.Serialize(normalized));
        return new(operation.OpId, Hash(body), body);
    }

    public static GoogleSyncOperation Decode(GoogleSyncEnvelope envelope, GoogleSyncScope scope)
    {
        var canonical = Canonicalize(envelope.PayloadJson);
        if (canonical != envelope.PayloadJson || Hash(canonical) != envelope.PayloadHash)
            throw new InvalidDataException("Noncanonical body or digest mismatch.");
        var operation = JsonSerializer.Deserialize<GoogleSyncOperation>(canonical)
            ?? throw new InvalidDataException("Missing operation body.");
        Validate(operation);
        if (operation.OpId != envelope.OpId || operation.LibraryId != scope.LibraryId
            || operation.WorkspaceId != scope.WorkspaceId || Encode(operation).PayloadJson != canonical)
            throw new InvalidDataException("Operation identity, scope or parent normalization mismatch.");
        return operation with { ParentIds = Array.AsReadOnly(operation.ParentIds.ToArray()) };
    }

    public static GoogleSyncReplayResult Replay(IEnumerable<GoogleSyncEnvelope> rows, GoogleSyncScope scope)
    {
        var operations = new Dictionary<string, GoogleSyncOperation>(StringComparer.Ordinal);
        var bodies = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var row in rows)
        {
            var operation = Decode(row, scope);
            if (bodies.TryGetValue(operation.OpId, out var previous) && previous != row.PayloadJson)
                throw new InvalidDataException("One operation ID has different bodies.");
            operations[operation.OpId] = operation;
            bodies[operation.OpId] = row.PayloadJson;
        }

        // Kahn's algorithm: missing parents and cycles are both errors, never a partial success.
        var children = operations.Keys.ToDictionary(id => id, _ => new List<string>(), StringComparer.Ordinal);
        var indegree = operations.ToDictionary(pair => pair.Key, pair => pair.Value.ParentIds.Count, StringComparer.Ordinal);
        foreach (var operation in operations.Values)
            foreach (var parentId in operation.ParentIds)
            {
                if (!operations.TryGetValue(parentId, out var parent)
                    || parent.EntityId != operation.EntityId || parent.EntityType != operation.EntityType)
                    throw new InvalidDataException("Missing or cross-entity dependency.");
                children[parentId].Add(operation.OpId);
            }
        var ready = new SortedSet<string>(indegree.Where(pair => pair.Value == 0).Select(pair => pair.Key), StringComparer.Ordinal);
        var ordered = new List<GoogleSyncOperation>();
        while (ready.Count > 0)
        {
            var id = ready.Min!;
            ready.Remove(id);
            ordered.Add(operations[id]);
            foreach (var child in children[id]) if (--indegree[child] == 0) ready.Add(child);
        }
        if (ordered.Count != operations.Count) throw new InvalidDataException("Cyclic dependency graph.");

        // Reusable reachability avoids storing an O(n^2) ancestor matrix for long journals.
        bool Descends(string descendant, string ancestor)
        {
            var seen = new HashSet<string>(StringComparer.Ordinal);
            var pending = new Stack<string>(operations[descendant].ParentIds);
            while (pending.TryPop(out var id))
            {
                if (id == ancestor) return true;
                if (seen.Add(id)) foreach (var parent in operations[id].ParentIds) pending.Push(parent);
            }
            return false;
        }

        var fields = new List<GoogleSyncFieldState>();
        foreach (var entity in ordered.GroupBy(op => (op.EntityType, op.EntityId)))
        {
            var entityOperations = entity.ToArray();
            foreach (var group in entityOperations.GroupBy(op => op.Field))
            {
                var all = group.ToArray();
                var heads = all.Where(op => !all.Any(other => other.OpId != op.OpId && Descends(other.OpId, op.OpId)))
                    .OrderBy(op => op.OpId, StringComparer.Ordinal).ToArray();
                fields.Add(State(group.Key, heads));
            }
            // A concurrent deletion and any edit is visible as an entity lifecycle conflict.
            var entityHeads = entityOperations.Where(op => !entityOperations.Any(other =>
                other.OpId != op.OpId && Descends(other.OpId, op.OpId))).ToArray();
            if (entityHeads.Any(IsDeleted) && entityHeads.Any(op => !IsDeleted(op)))
            {
                fields.RemoveAll(field => field.Key.EntityType == entity.Key.EntityType
                    && field.Key.EntityId == entity.Key.EntityId && field.Key.Field == "$lifecycle");
                fields.Add(State("$lifecycle", entityHeads, true));
            }

            GoogleSyncFieldState State(string field, GoogleSyncOperation[] heads, bool forceConflict = false)
            {
                var candidates = heads.OrderBy(op => op.OpId, StringComparer.Ordinal)
                    .Select(op => new GoogleSyncCandidate(op.OpId, op.Kind, op.Value.Clone())).ToArray();
                var values = heads.Select(op => IsDeleted(op) ? "delete:" : "value:"
                    + Canonicalize(op.Value.GetRawText())).Distinct(StringComparer.Ordinal).Count();
                return new(new(scope.WorkspaceId, scope.LibraryId, entity.Key.EntityType, entity.Key.EntityId, field),
                    Array.AsReadOnly(candidates), forceConflict || values > 1);
            }
        }
        return new(ordered.AsReadOnly(), fields.OrderBy(field => field.Key.EntityType, StringComparer.Ordinal)
            .ThenBy(field => field.Key.EntityId, StringComparer.Ordinal).ThenBy(field => field.Key.Field, StringComparer.Ordinal)
            .ToList().AsReadOnly());
    }

    private static bool IsDeleted(GoogleSyncOperation operation) => operation.Kind == "delete"
        || operation.Field == "$lifecycle" && operation.Value.ValueKind == JsonValueKind.False;

    private static void Validate(GoogleSyncOperation op)
    {
        if (!Guid.TryParseExact(op.OpId, "D", out _) || !Guid.TryParseExact(op.WorkspaceId, "D", out _)
            || !Guid.TryParseExact(op.DeviceId, "D", out _) || string.IsNullOrEmpty(op.LibraryId)
            || !op.LibraryId.All(char.IsAsciiDigit) || string.IsNullOrWhiteSpace(op.EntityId)
            || string.IsNullOrEmpty(op.LogicalCounter) || !op.LogicalCounter.All(char.IsAsciiDigit)
            || op.ParentIds is null || op.ParentIds.Any(id => !Guid.TryParseExact(id, "D", out _))
            || op.Kind is not ("set" or "delete" or "resolve") || op.Value.ValueKind == JsonValueKind.Undefined)
            throw new InvalidDataException("Invalid operation schema.");
        var fields = op.EntityType switch
        {
            "bookmark" => new[] { "present", "position", "$lifecycle" },
            "collection" => new[] { "displayName", "$lifecycle" },
            "assignment" => new[] { "present", "$lifecycle" },
            "localTag" => new[] { "displayLabel", "present", "$lifecycle" },
            "appearance" => new[] { "theme", "font", "$lifecycle" },
            _ => Array.Empty<string>()
        };
        if (!fields.Contains(op.Field, StringComparer.Ordinal)
            || op.Kind == "delete" && (op.Field != "$lifecycle" || op.Value.ValueKind != JsonValueKind.Null)
            || op.Kind != "delete" && (op.Field is "present" or "$lifecycle"
                ? op.Value.ValueKind is not (JsonValueKind.True or JsonValueKind.False)
                : op.Value.ValueKind != JsonValueKind.String)
            || op.Kind == "resolve" && op.ParentIds.Count == 0
            || op.DisplayTime is not null && !DateTimeOffset.TryParse(op.DisplayTime, CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind, out _))
            throw new InvalidDataException("Unsupported field or value.");
    }

    private static void Write(JsonElement element, StringBuilder output)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                var properties = element.EnumerateObject().OrderBy(p => p.Name, StringComparer.Ordinal).ToArray();
                if (properties.Select(p => p.Name).Distinct(StringComparer.Ordinal).Count() != properties.Length)
                    throw new InvalidDataException("Duplicate JSON property.");
                output.Append('{');
                for (var i = 0; i < properties.Length; i++)
                {
                    if (i > 0) output.Append(',');
                    Quote(properties[i].Name, output); output.Append(':'); Write(properties[i].Value, output);
                }
                output.Append('}'); break;
            case JsonValueKind.Array:
                output.Append('['); var first = true;
                foreach (var item in element.EnumerateArray())
                { if (!first) output.Append(','); first = false; Write(item, output); }
                output.Append(']'); break;
            case JsonValueKind.String: Quote(element.GetString()!, output); break;
            case JsonValueKind.Number: output.Append(Number(element.GetDouble())); break;
            case JsonValueKind.True: output.Append("true"); break;
            case JsonValueKind.False: output.Append("false"); break;
            case JsonValueKind.Null: output.Append("null"); break;
            default: throw new InvalidDataException("Unsupported JSON value.");
        }
    }

    private static void Quote(string value, StringBuilder output)
    {
        output.Append('"');
        for (var i = 0; i < value.Length; i++)
        {
            var c = value[i];
            if (char.IsSurrogate(c))
            {
                if (!char.IsHighSurrogate(c) || i + 1 >= value.Length || !char.IsLowSurrogate(value[i + 1]))
                    throw new InvalidDataException("Invalid Unicode.");
                output.Append(c).Append(value[++i]); continue;
            }
            output.Append(c switch
            {
                '"' => "\\\"", '\\' => "\\\\", '\b' => "\\b", '\t' => "\\t", '\n' => "\\n",
                '\f' => "\\f", '\r' => "\\r", < ' ' => "\\u" + ((int)c).ToString("x4"), _ => c.ToString()
            });
        }
        output.Append('"');
    }

    private static string Number(double number)
    {
        if (!double.IsFinite(number)) throw new InvalidDataException("Nonfinite JSON number.");
        if (number == 0) return "0";
        var sign = number < 0 ? "-" : "";
        var raw = Math.Abs(number).ToString("R", CultureInfo.InvariantCulture).ToLowerInvariant();
        var split = raw.Split('e');
        var exponent = split.Length == 2 ? int.Parse(split[1], CultureInfo.InvariantCulture) : 0;
        var dot = split[0].IndexOf('.');
        var point = (dot < 0 ? split[0].Length : dot) + exponent;
        var digits = split[0].Replace(".", "");
        while (digits.Length > 1 && digits[0] == '0') { digits = digits[1..]; point--; }
        digits = digits.TrimEnd('0');
        if (point > 0 && point <= 21)
            return sign + (point >= digits.Length ? digits + new string('0', point - digits.Length) : digits.Insert(point, "."));
        if (point <= 0 && point > -6) return sign + "0." + new string('0', -point) + digits;
        var power = point - 1;
        return sign + digits[0] + (digits.Length > 1 ? "." + digits[1..] : "") + "e"
            + (power >= 0 ? "+" : "") + power.ToString(CultureInfo.InvariantCulture);
    }
}
