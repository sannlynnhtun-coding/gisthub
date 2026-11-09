using System.Reflection;
using System.Net;
using System.Text;
using GistHub.Components;
using GistHub.Models;
using GistHub.Pages;
using GistHub.Services;
using Microsoft.JSInterop;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

static class LooseleafTests
{
    const BindingFlags Private = BindingFlags.Instance | BindingFlags.NonPublic;
    public static async Task RunAsync()
    {
        var note = new LocalGist { Id = "a", Description = "Notebook", CollectionNames = ["Work"], Files = new() {
            ["first.md"] = new GistFile { Content = "hello" },
            ["docker.txt"] = new GistFile { Content = "container engine" } } };
        var notes = new LooseleafNotes { Gists = [note, new LocalGist { Id = "b", Description = "Other" }] };
        Set(notes, "Search", new GistSearchService());
        foreach (var query in new[] { "notebook", "docker", "container" })
        {
            Set(notes, "Query", query);
            Check(Get<List<LocalGist>>(notes, "VisiblePages").Single().Id == "a", "Shelf searches descriptions, filenames and content");
        }
        Set(notes, "Notebook", "Personal");
        Check(Get<List<LocalGist>>(notes, "VisiblePages").Count == 0, "Search must respect notebook filters");
        await Call(notes, "OpenPageAsync", "a");
        Check(Get<bool>(notes, "ShowPage"), "Opening a page shows the mobile editor pane");
        await Call(notes, "BackAsync");
        Check(!Get<bool>(notes, "ShowPage"), "Back returns to the shelf");

        var js = new ConfirmJs();
        var editor = new Editor();
        Set(editor, "JS", js);
        Set(editor, "EditorLoaded", true);
        Set(editor, "SavedState", Get<string>(editor, "CurrentState"));
        Check(await editor.CanLeaveAsync() && js.Calls == 0, "Unchanged notes leave without confirmation");
        Set(editor, "Content", "Unsaved page");
        Check(!await editor.CanLeaveAsync(), "Cancelled confirmation must keep unsaved writing");
        Set(notes, "Editor", editor); Set(notes, "Writing", true);
        await Call(notes, "OpenPageAsync", "b");
        Check(Get<string>(notes, "SelectedId") == "a" && Get<bool>(notes, "Writing"), "Cancelled page switching keeps the same editor");
        js.Accept = true;
        await Call(notes, "OpenPageAsync", "b");
        Check(Get<string>(notes, "SelectedId") == "b" && !Get<bool>(notes, "Writing"), "Confirmed page switching opens the requested note");

        var state = new AppState(); state.SetProfile(new GistProfile { GithubUsername = "alice", AccessToken = "test" });
        Set(editor, "AppState", state);
        Set(editor, "Storage", new NotesStorage(note));
        Set(editor, "GistId", "a"); Set(editor, "InitialFilename", "docker.txt");
        await Call(editor, "LoadGistForEditing");
        Check(Get<string>(editor, "Content") == "container engine", "Write opens the selected file, including secondary files");
        var editable = typeof(Editor).GetMethod("HasEditableContent", BindingFlags.NonPublic | BindingFlags.Static)!;
        note.Files["first.md"].Content = "";
        Check((bool)editable.Invoke(null, [note])!, "Empty cached files are valid");
        note.Files["first.md"].Truncated = true;
        Check(!(bool)editable.Invoke(null, [note])!, "Truncated cached files must be fetched before editing");

        var page = new MyGists();
        Set(page, "AppState", state); Set(page, "JS", js); Set(page, "Storage", new NotesStorage(note));
        Set(page, "Github", new GithubService(new HttpClient(new FailedDelete()), "https://api.github.com"));
        Set(page, "LocalGists", new List<LocalGist> { note });
        await Call(page, "HandleDelete", note);
        Check(Get<List<LocalGist>>(page, "LocalGists").Count == 1 && Get<string>(page, "SyncError").Contains("kept"), "Failed remote deletion must keep the local note");
        note.Files["first.md"].Truncated = false;
        var handler = new SaveHandler();
        using var provider = new ServiceCollection().AddLogging().AddSingleton(state)
            .AddSingleton<IJSRuntime>(js).AddSingleton<IStorageService>(new NotesStorage(note))
            .AddSingleton<NavigationManager>(new FakeNavigationManager())
            .AddSingleton<IGithubService>(new GithubService(new HttpClient(handler), "https://api.github.com")).BuildServiceProvider();
        await using var renderer = new HtmlRenderer(provider, provider.GetRequiredService<ILoggerFactory>());
        Editor? mounted = null; LocalGist? saved = null;
        await renderer.Dispatcher.InvokeAsync(async () =>
        {
            await renderer.RenderComponentAsync<EditorHost>(ParameterView.FromDictionary(new Dictionary<string, object?> {
                ["Capture"] = (Action<Editor>)(value => mounted = value),
                ["Saved"] = EventCallback.Factory.Create<LocalGist>(new object(), (LocalGist value) => saved = value)
            }));
            Set(mounted!, "Content", "Edited secondary file");
            await Call(mounted!, "HandleSave");
            Check(saved is null && mounted!.HasUnsavedChanges, "Failed saves retain the editor and dirty content");
            handler.Fail = false;
            await Call(mounted!, "HandleSave");
            Check(saved?.Id == "a" && !mounted!.HasUnsavedChanges, "Successful embedded saves notify the notebook and clear dirty state");
            using var payload = System.Text.Json.JsonDocument.Parse(handler.Body!);
            var files = payload.RootElement.GetProperty("files");
            Check(files.EnumerateObject().Count() == 1 && files.GetProperty("docker.txt").GetProperty("content").GetString() == "Edited secondary file", "Saving a secondary file must not overwrite other gist files");
        });
        Console.WriteLine("PASS: Looseleaf notebook search, mobile navigation, unsaved-change protection, selected-file editing and failed-delete recovery.");
    }
    static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    static T Get<T>(object obj, string name) => (T)(obj.GetType().GetProperty(name, Private | BindingFlags.Public)?.GetValue(obj) ?? obj.GetType().GetField(name, Private)!.GetValue(obj))!;
    static void Set(object obj, string name, object value)
    {
        if (obj.GetType().GetProperty(name, Private | BindingFlags.Public) is { } property) property.SetValue(obj, value);
        else obj.GetType().GetField(name, Private)!.SetValue(obj, value);
    }
    static async Task Call(object obj, string name, params object[] args)
    {
        if (obj.GetType().GetMethod(name, Private)!.Invoke(obj, args) is Task task) await task;
    }
    sealed class ConfirmJs : IJSRuntime
    {
        public bool Accept; public int Calls;
        public ValueTask<T> InvokeAsync<T>(string identifier, object?[]? args) { Check(identifier == "confirm", "Unexpected JS"); Calls++; return ValueTask.FromResult((T)(object)Accept); }
        public ValueTask<T> InvokeAsync<T>(string identifier, CancellationToken token, object?[]? args) => InvokeAsync<T>(identifier, args);
    }
    sealed class NotesStorage(LocalGist note) : FakeStorageService
    {
        public override Task<List<LocalGist>> GetLocalGistsAsync(string username) => Task.FromResult(new List<LocalGist> { note });
    }
    sealed class FailedDelete : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
            => Task.FromResult(new HttpResponseMessage(HttpStatusCode.Forbidden) { Content = new StringContent("{\"message\":\"Forbidden\"}", Encoding.UTF8, "application/json") });
    }
    public sealed class EditorHost : ComponentBase
    {
        [Parameter] public Action<Editor> Capture { get; set; } = null!;
        [Parameter] public EventCallback<LocalGist> Saved { get; set; }
        protected override void BuildRenderTree(RenderTreeBuilder builder)
        {
            builder.OpenComponent<Editor>(0); builder.AddAttribute(1, "Embedded", true);
            builder.AddAttribute(2, "GistId", "a"); builder.AddAttribute(3, "InitialFilename", "docker.txt");
            builder.AddAttribute(4, "OnSaved", Saved); builder.AddComponentReferenceCapture(5, value => Capture((Editor)value)); builder.CloseComponent();
        }
    }
    sealed class SaveHandler : HttpMessageHandler
    {
        public bool Fail = true; public string? Body;
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        {
            Body = await request.Content!.ReadAsStringAsync(token);
            return new HttpResponseMessage(Fail ? HttpStatusCode.Forbidden : HttpStatusCode.OK) {
                Content = new StringContent(Fail ? "{\"message\":\"Forbidden\"}" : "{\"id\":\"a\",\"description\":\"Notebook\",\"files\":{\"docker.txt\":{\"filename\":\"docker.txt\",\"content\":\"Edited secondary file\"}}}", Encoding.UTF8, "application/json") };
        }
    }
}
