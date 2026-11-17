using System.Text.Json;
using Microsoft.JSInterop;

namespace GistHub.Services;

// Store input values only; components and generated previews are never persisted.
public sealed class ToolDraftStore(IJSRuntime js)
{
    private static readonly JsonSerializerOptions Options = new() { IncludeFields = true };
    private readonly Dictionary<Type, object> unsaved = new();
    private readonly Dictionary<Type, string> damaged = new();
    public string? Error { get; private set; }
    public event Action? ErrorChanged;
    private static string Key(Type tool) => "gisthub:tool-draft:v1:" + tool.FullName;
    private IJSInProcessRuntime Browser => js as IJSInProcessRuntime
        ?? throw new InvalidOperationException("Local draft storage is unavailable.");

    public T Restore<T>(Type tool, T defaults)
    {
        if (unsaved.TryGetValue(tool, out var pending) && pending is T draft) return draft;
        try
        {
            var json = Browser.Invoke<string?>("localStorage.getItem", Key(tool));
            if (json is null) return defaults;
            try
            {
                using var document = JsonDocument.Parse(json);
                var template = JsonSerializer.SerializeToElement(defaults, Options);
                if (!HasShape(document.RootElement, template)) throw new JsonException();
                return JsonSerializer.Deserialize<T>(json, Options) ?? defaults;
            }
            catch (JsonException) { damaged[tool] = json; throw; }
        }
        catch (JsonException)
        {
            SetError("A saved tool draft could not be read. Its stored copy has been kept; keep a backup before editing this tool.");
        }
        catch (Exception ex) when (ex is JSException or InvalidOperationException)
        {
            SetError("Local draft storage is unavailable. Keep a copy of your input before refreshing or closing the app.");
        }
        return defaults;
    }

    private static bool HasShape(JsonElement value, JsonElement template)
    {
        if (template.ValueKind == JsonValueKind.Null) return true;
        if (template.ValueKind is JsonValueKind.True or JsonValueKind.False)
            return value.ValueKind is JsonValueKind.True or JsonValueKind.False;
        if (template.ValueKind != value.ValueKind) return false;
        if (template.ValueKind != JsonValueKind.Object) return true;
        return template.EnumerateObject().All(property => value.TryGetProperty(property.Name, out var field) && HasShape(field, property.Value));
    }

    public bool Contains(Type tool)
    {
        if (unsaved.ContainsKey(tool)) return true;
        try { return Browser.Invoke<string?>("localStorage.getItem", Key(tool)) is not null; }
        catch (Exception ex) when (ex is JSException or InvalidOperationException) { return false; }
    }

    public void Save(Type tool, object draft)
    {
        try
        {
            var json = JsonSerializer.Serialize(draft, draft.GetType(), Options);
            if (damaged.TryGetValue(tool, out var original))
                Browser.InvokeVoid("localStorage.setItem", Key(tool) + ":unreadable", original);
            Browser.InvokeVoid("localStorage.setItem", Key(tool), json);
            damaged.Remove(tool);
            unsaved.Remove(tool);
            if (unsaved.Count == 0 && damaged.Count == 0) SetError(null);
        }
        catch (Exception ex) when (ex is JSException or InvalidOperationException)
        {
            unsaved[tool] = draft;
            SetError("Could not save your tool draft locally. Keep a copy before refreshing or closing the app; browser storage may be full or disabled.");
        }
    }

    private void SetError(string? error)
    {
        if (Error == error) return;
        Error = error;
        ErrorChanged?.Invoke();
    }
}

public interface IToolDraft
{
    object CaptureDraft();
    Task SaveDraftAsync() => Task.CompletedTask;
}
