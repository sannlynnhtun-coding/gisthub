using System.Text.Json;
using GistHub.Models;
using GistHub.Services;

static class GoogleSyncProtocolTests
{
    private static readonly GoogleSyncScope Scope = new("9007199254740993", "10000000-0000-4000-8000-000000000001");
    private static int checks;
    private static void Check(bool success, string message)
    { if (!success) throw new Exception("Google sync: " + message); checks++; }
    private static void Reject(Action action, string message)
    {
        try { action(); }
        catch (Exception ex) when (ex is InvalidDataException or JsonException or InvalidOperationException or ArgumentException)
        { checks++; return; }
        throw new Exception("Google sync should reject " + message);
    }
    private static GoogleSyncOperation Op(int id, string value, string[]? parents = null,
        string field = "displayName", string kind = "set") => new()
    {
        OpId = Id(id), LibraryId = Scope.LibraryId, WorkspaceId = Scope.WorkspaceId,
        DeviceId = "20000000-0000-4000-8000-000000000001", EntityType = "collection", EntityId = "reading",
        Field = field, Kind = kind, Value = JsonSerializer.SerializeToElement(value),
        ParentIds = parents ?? [], LogicalCounter = id.ToString()
    };
    private static string Id(int id) => $"30000000-0000-4000-8000-{id:D12}";
    private static GoogleSyncReplayResult Replay(params GoogleSyncOperation[] ops) =>
        GoogleSyncProtocol.Replay(ops.Select(GoogleSyncProtocol.Encode), Scope);

    public static void RunAll()
    {
        Check(!new GoogleSyncOptions().IsConfigured, "absent options are disabled");
        Check(new GoogleSyncOptions { ClientId = "test.apps.googleusercontent.com", ProjectNumber = "123", PickerApiKey = "public-key" }.IsConfigured,
            "complete public options can be configured");
        using var vectors = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,
            "Fixtures", "GoogleSheetsSync", "canonical-vectors.json")));
        foreach (var vector in vectors.RootElement.EnumerateArray())
        {
            var canonical = GoogleSyncProtocol.Canonicalize(vector.GetProperty("input").GetString()!);
            Check(canonical == vector.GetProperty("canonical").GetString(), "shared canonical vector");
            Check(GoogleSyncProtocol.Hash(canonical) == vector.GetProperty("sha256").GetString(), "shared digest vector");
        }
        using var fixture = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,
            "Fixtures", "GoogleSheetsSync", "two-device.json")));
        var fixtureRows = fixture.RootElement.GetProperty("rows").EnumerateArray()
            .Select(row => new GoogleSyncEnvelope(row[0].GetString()!, row[1].GetString()!, row[2].GetString()!)).ToArray();
        var fixtureReplay = GoogleSyncProtocol.Replay(fixtureRows, Scope);
        Check(fixtureReplay.Operations.Count == 3 && fixtureReplay.Fields.Single().IsConflict,
            "JavaScript-produced complete envelopes replay in C# without serializer differences");
        Reject(() => GoogleSyncProtocol.Canonicalize("{\"a\":1,\"a\":2}"), "duplicate properties");
        Reject(() => GoogleSyncProtocol.Canonicalize("\"\\ud800\""), "invalid Unicode");
        Reject(() => GoogleSyncProtocol.Canonicalize("1e400"), "nonfinite numbers");

        var original = Op(1, "Original");
        var left = Op(2, "Left", [original.OpId]);
        var right = Op(3, "Right", [original.OpId]);
        var result = Replay(original, left, right);
        Check(result.Fields.Single().IsConflict && result.Fields.Single().Candidates.Count == 2, "concurrent values are retained");
        var reverse = Replay(right, left, original, right);
        Check(JsonSerializer.Serialize(result) == JsonSerializer.Serialize(reverse), "replay independent of row order and duplicate rows");
        var resolution = Op(4, "Left", [left.OpId, right.OpId], kind: "resolve");
        Check(!Replay(original, left, right, resolution).Fields.Single().IsConflict, "explicit resolution converges");
        var otherResolution = Op(5, "Right", [left.OpId, right.OpId], kind: "resolve");
        Check(Replay(original, left, right, resolution, otherResolution).Fields.Single().IsConflict, "competing resolutions remain visible");
        Check(!Replay(original, left, right with { Value = left.Value }).Fields.Single().IsConflict, "same concurrent value is one logical result");
        Check(Replay(original, left, right with { DisplayTime = "2099-01-01T00:00:00Z" }).Fields.Single().IsConflict,
            "wall clock never chooses a winner");
        var independent = Op(6, "Other entity") with { EntityId = "other" };
        Check(Replay(original, left, right, independent).Fields.Count == 2, "unrelated entity progresses");
        var deletion = Op(7, "", [original.OpId], "$lifecycle", "delete") with { Value = JsonSerializer.SerializeToElement<object?>(null) };
        Check(Replay(original, left, deletion).Fields.Any(field => field.Key.Field == "$lifecycle" && field.IsConflict), "delete versus edit across fields conflicts");
        var restore = Op(8, "", [left.OpId, deletion.OpId], "$lifecycle", "resolve") with { Value = JsonSerializer.SerializeToElement(true) };
        Check(!Replay(original, left, deletion, restore).Fields.Any(field => field.IsConflict), "explicit lifecycle restoration resolves conflict");
        var keepDeleted = restore with { Value = JsonSerializer.SerializeToElement(false) };
        Check(!Replay(original, left, deletion, keepDeleted).Fields.Any(field => field.IsConflict), "explicit keep-deleted resolution converges");
        var lateEdit = Op(10, "Unseen", [left.OpId]);
        Check(Replay(original, left, deletion, keepDeleted, lateEdit).Fields.Any(field => field.Key.Field == "$lifecycle" && field.IsConflict),
            "unseen edit still conflicts with a resolved deletion");
        var changedField = Op(9, "", [original.OpId], "$lifecycle") with { Value = JsonSerializer.SerializeToElement(true) };
        Check(Replay(original, changedField).Fields.Single(f => f.Key.Field == "displayName").Candidates.Single().Value.GetString() == "Original",
            "dependency does not overwrite unrelated field");
        Reject(() => Replay(left), "missing parent");
        Reject(() => Replay(original with { ParentIds = [left.OpId] }, left), "cycle");
        Reject(() => Replay(original, left with { EntityId = "different" }), "cross entity parent");
        Reject(() => Replay(original, left with { WorkspaceId = Guid.NewGuid().ToString() }), "cross workspace");
        Reject(() => Replay(original, left with { LibraryId = "2" }), "cross library");
        Reject(() => Replay(original, original with { Value = left.Value }), "same ID changed body");
        Reject(() => GoogleSyncProtocol.Encode(original with { Field = "accessToken" }), "nonallowlisted field");
        Reject(() => GoogleSyncProtocol.Encode(original with { Value = JsonSerializer.SerializeToElement(new { accessToken = "synthetic" }) }), "object payload");
        Reject(() => GoogleSyncProtocol.Encode(original with { LogicalCounter = "1.2" }), "noninteger counter");
        var encoded = GoogleSyncProtocol.Encode(original);
        Check(!encoded.PayloadJson.Contains("payloadHash") && GoogleSyncProtocol.Decode(encoded, Scope).LibraryId == Scope.LibraryId,
            "separate digest and exact large ID");
        Reject(() => GoogleSyncProtocol.Decode(encoded with { PayloadHash = new string('0', 64) }, Scope), "hash mismatch");
        Reject(() => GoogleSyncProtocol.Decode(encoded with { OpId = Id(99) }, Scope), "column ID mismatch");
        var unknown = encoded.PayloadJson[..^1] + ",\"token\":\"synthetic\"}";
        unknown = GoogleSyncProtocol.Canonicalize(unknown);
        Reject(() => GoogleSyncProtocol.Decode(new(encoded.OpId, GoogleSyncProtocol.Hash(unknown), unknown), Scope), "unknown body property");
        var normalized = GoogleSyncProtocol.Encode(resolution with { ParentIds = [right.OpId, left.OpId, right.OpId] });
        Check(normalized == GoogleSyncProtocol.Encode(resolution), "parents sorted and deduplicated before hash");
        Console.WriteLine($"PASS: Google Sheets sync protocol ({checks} checks), no storage or network access.");
    }
}
