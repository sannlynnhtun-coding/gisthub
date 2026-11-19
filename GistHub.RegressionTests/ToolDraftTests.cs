using Microsoft.JSInterop;
using System.Reflection;
using GistHub.Services;

internal static class ToolDraftTests
{
    public static void Run()
    {
        var browser = new DraftBrowser();
        var store = new ToolDraftStore(browser);
        var cases = new (Type Type, string Field, object Value)[]
        {
            (typeof(GistHub.Pages.CronExpression), "Expression", "*/15 * * * *"),
            (typeof(GistHub.Pages.PasswordGenerator), "Separator", " "),
            (typeof(GistHub.Pages.PasswordGenerator), "Uppercase", false),
            (typeof(GistHub.Pages.FormulaToImage), "Transparent", true),
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
            store = new ToolDraftStore(browser);
            var reopened = Create();
            if (ReferenceEquals(original, reopened) || !Equals(type.GetField(field, flags)!.GetValue(reopened), value))
                throw new InvalidOperationException($"{type.Name} must restore input into a new component.");
        }
        if (store.Restore(typeof(string), "default") != "default")
            throw new InvalidOperationException("Unopened tools must keep their defaults.");
        var key = "gisthub:tool-draft:v1:" + typeof(GistHub.Pages.CronExpression).FullName;
        browser.Values[key] = "{broken";
        store = new ToolDraftStore(browser);
        if (store.Restore(typeof(GistHub.Pages.CronExpression), "default") != "default" || store.Error is null)
            throw new InvalidOperationException("Damaged drafts must fall back with a warning.");
        store.Save(typeof(GistHub.Pages.CronExpression), "recovered");
        if (browser.Values[key + ":unreadable"] != "{broken") throw new InvalidOperationException("Preserve damaged draft before replacing it.");
        browser.FailWrites = true;
        store.Save(typeof(GistHub.Pages.CronExpression), "unsaved input");
        if (store.Error is null || store.Restore(typeof(GistHub.Pages.CronExpression), "default") != "unsaved input" || browser.Values[key] != "\"recovered\"")
            throw new InvalidOperationException("Failed writes must keep the previous saved copy and current input, and warn the user.");
        browser.FailWrites = false;
        store.Save(typeof(string), "another tool");
        if (store.Error is null) throw new InvalidOperationException("Saving another tool must not hide an unsaved draft warning.");
        store.Save(typeof(GistHub.Pages.CronExpression), "unsaved input");
        if (store.Error is not null) throw new InvalidOperationException("A successful retry must clear the warning.");
        foreach (var failRestore in new[] { true, false })
        {
            var settings = new GistHub.Pages.Settings();
            var type = settings.GetType();
            var navigation = new RestoreNavigation();
            var module = new RestoreModule(failRestore);
            type.GetProperty("Drafts", flags)!.SetValue(settings, store);
            type.GetProperty("Navigation", flags)!.SetValue(settings, navigation);
            type.GetField("Module", flags)!.SetValue(settings, module);
            type.GetField("Json", flags)!.SetValue(settings, "backup to restore");
            store.Save(type, settings.CaptureDraft());
            ((Task)type.GetMethod("RestoreAsync", flags)!.Invoke(settings, null)!).GetAwaiter().GetResult();
            var json = (string?)type.GetField("Json", flags)!.GetValue(settings);
            if (failRestore ? json != "backup to restore" || navigation.Reloaded : json is not null || !navigation.Reloaded)
                throw new Exception("Settings restore must consume its draft only after success, retaining failed input for retry.");
            var saved = browser.Values["gisthub:tool-draft:v1:" + type.FullName];
            if (failRestore ? !saved.Contains("backup to restore") : saved != "{\"Item1\":null,\"Item2\":null}")
                throw new Exception("Settings restore must persist its consumed draft before reloading.");
        }
        Console.WriteLine("PASS: local tool drafts survive a fresh store, preserve Unicode and nested tuple options, and handle corrupt drafts and failed writes.");
    }
    private sealed class RestoreNavigation : Microsoft.AspNetCore.Components.NavigationManager
    {
        public bool Reloaded;
        public RestoreNavigation() => Initialize("http://localhost/", "http://localhost/settings");
        protected override void NavigateToCore(string uri, Microsoft.AspNetCore.Components.NavigationOptions options) => Reloaded = options.ForceLoad && uri == "settings";
    }
    private sealed class RestoreModule(bool fail) : IJSObjectReference
    {
        public ValueTask<T> InvokeAsync<T>(string identifier, object?[]? args) => fail ? ValueTask.FromException<T>(new JSException("Restore failed")) : ValueTask.FromResult(default(T)!);
        public ValueTask<T> InvokeAsync<T>(string identifier, CancellationToken cancellationToken, object?[]? args) => InvokeAsync<T>(identifier, args);
        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
    private sealed class DraftBrowser : IJSInProcessRuntime
    {
        public Dictionary<string, string> Values { get; } = new();
        public bool FailWrites;
        public TValue Invoke<TValue>(string identifier, params object?[]? args)
        {
            var key = (string)args![0]!;
            if (identifier == "localStorage.getItem") return (TValue)(object?)Values.GetValueOrDefault(key)!;
            if (identifier != "localStorage.setItem") throw new InvalidOperationException(identifier);
            if (FailWrites) throw new JSException("Storage quota exceeded.");
            Values[key] = (string)args[1]!;
            return default!;
        }
        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, object?[]? args) => ValueTask.FromResult(Invoke<TValue>(identifier, args));
        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, CancellationToken cancellationToken, object?[]? args) => InvokeAsync<TValue>(identifier, args);
    }
}
