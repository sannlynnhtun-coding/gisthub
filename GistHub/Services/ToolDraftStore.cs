namespace GistHub.Services;

// Store only input values; tool components and generated previews must be released.
public sealed class ToolDraftStore
{
    private readonly Dictionary<Type, object> drafts = new();

    public T Restore<T>(Type tool, T defaults) => drafts.TryGetValue(tool, out var value) && value is T draft ? draft : defaults;
    public bool Contains(Type tool) => drafts.ContainsKey(tool);
    public void Save(Type tool, object draft) => drafts[tool] = draft;
}

public interface IToolDraft
{
    object CaptureDraft();
    Task SaveDraftAsync() => Task.CompletedTask;
}
