using System.Reflection;
using GistHub.Services;

internal static class ToolDraftTests
{
    public static void Run()
    {
        var store = new ToolDraftStore();
        var cases = new (Type Type, string Field, object Value)[]
        {
            (typeof(GistHub.Pages.CronExpression), "Expression", "*/15 * * * *"),
            (typeof(GistHub.Pages.PasswordGenerator), "Separator", " "),
            (typeof(GistHub.Pages.MarkdownToDocx), "Source", "# Word draft မြန်မာ"),
            (typeof(GistHub.Pages.MarkdownToText), "Source", "# Plain draft"),
            (typeof(GistHub.Pages.MarkdownConverters), "Source", "# Converter draft"),
            (typeof(GistHub.Pages.MarkdownToCards), "Title", "Card draft"),
            (typeof(GistHub.Pages.MarkdownLivePreview), "Filename", "Live draft"),
            (typeof(GistHub.Pages.MermaidToImage), "Source", "graph TD; A-->B"),
            (typeof(GistHub.Pages.FormulaToImage), "Source", "x^2"),
            (typeof(GistHub.Pages.HtmlToImage), "Source", "<h1>Draft</h1>"),
            (typeof(GistHub.Pages.AgentSkills), "Search", "markdown"),
            (typeof(GistHub.Pages.YouTubeDownloader), "Url", "https://www.youtube.com/watch?v=draft")
        };
        const BindingFlags flags = BindingFlags.Instance | BindingFlags.NonPublic;
        foreach (var (type, field, value) in cases)
        {
            object Create()
            {
                var component = Activator.CreateInstance(type)!;
                type.GetProperty("Drafts", flags)!.SetValue(component, store);
                type.GetMethod("OnInitialized", flags)!.Invoke(component, null);
                return component;
            }
            var original = Create();
            type.GetField(field, flags)!.SetValue(original, value);
            store.Save(type, ((IToolDraft)original).CaptureDraft());
            var reopened = Create();
            if (ReferenceEquals(original, reopened) || !Equals(type.GetField(field, flags)!.GetValue(reopened), value))
                throw new InvalidOperationException($"{type.Name} must restore input into a new component.");
        }
        if (store.Restore(typeof(string), "default") != "default")
            throw new InvalidOperationException("Unopened tools must keep their defaults.");
        Console.WriteLine("PASS: tool drafts restore input into fresh component instances without retaining their previews.");
    }
}
