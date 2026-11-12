using System.Reflection;
using System.Text.Json;
using GistHub.Models;
using GistHub.Pages;
using GistHub.Services;

static class EditorAppearanceTests
{
    private static PropertyInfo Property(string name) => typeof(Editor).GetProperty(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)!;
    private static object? Get(Editor editor, string name) => Property(name).GetValue(editor);
    private static void Set(Editor editor, string name, object value) => Property(name).SetValue(editor, value);
    private static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }

    public static async Task RunAsync()
    {
        foreach (var (input, expected) in new[] {
            ("My Useful Snippet.cs", "my-useful-snippet.cs"), ("my_archive.tar.gz", "my-archive.tar.gz"),
            (".gitignore", ".gitignore"), ("မြန်မာ စာ.md", "မြန်မာ-စာ.md"), ("a___b--c.txt", "a-b-c.txt") })
        {
            var result = EditorTextConverter.KebabFilename(input);
            Check(result == expected && EditorTextConverter.KebabFilename(result) == result, "Filename conversion must preserve suffixes/Unicode and be idempotent.");
        }
        var editor = new Editor();
        Check(Get(editor, "IsPublic") is false && Get(editor, "IsBookmarked") is true && Get(editor, "FilenameKebabEnabled") is true, "New editor defaults must be Secret, Bookmarked and kebab On.");
        Set(editor, "Filename", "Keep My Name.cs");
        Set(editor, "FilenameKebabEnabled", false);
        typeof(Editor).GetMethod("NormalizeFilename", BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(editor, null);
        Check((string)Get(editor, "Filename")! == "Keep My Name.cs", "Toggle Off must retain filename exactly.");
        var gist = new LocalGist { Id = "existing", Description = "keep-this-description", Public = true, IsBookmarked = false,
            Files = new() { ["Keep My Name.cs"] = new GistFile { Filename = "Keep My Name.cs", Content = "original content" } } };
        Set(editor, "Storage", new ExistingStorage(gist));
        Set(editor, "GistId", gist.Id);
        await (Task)typeof(Editor).GetMethod("LoadGistForEditing", BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(editor, null)!;
        Check(Get(editor, "IsPublic") is true && Get(editor, "IsBookmarked") is false && (string)Get(editor, "Filename")! == "Keep My Name.cs" && (string)Get(editor, "Description")! == gist.Description, "Loading an existing gist must preserve its data over new defaults.");
        Set(editor, "FilenameKebabEnabled", true);
        typeof(Editor).GetMethod("NormalizeEditedFilename", BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(editor, null);
        Check((string)Get(editor, "Filename")! == "Keep My Name.cs", "Focusing and blurring an unchanged existing name must not rename it.");
        Check(gist.Public && !gist.IsBookmarked && gist.Files.ContainsKey("Keep My Name.cs"), "Loading must not mutate stored gist data.");
        var oldJson = "{\"description\":\"keep-kebab\",\"filename\":\"Keep My Name.cs\",\"content\":\"keep\",\"isPublic\":true,\"isBookmarked\":false}";
        var draft = JsonSerializer.Deserialize<Editor.UpdateDraft>(oldJson, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        Check(draft.Description == "keep-kebab" && draft.Filename == "Keep My Name.cs" && draft.IsPublic && !draft.IsBookmarked && draft.FilenameKebabEnabled, "Older draft values must be retained with a compatible toggle default.");
        draft.FilenameKebabEnabled = false;
        Check(!JsonSerializer.Deserialize<Editor.UpdateDraft>(JsonSerializer.Serialize(draft))!.FilenameKebabEnabled, "Draft toggle Off must round-trip.");
        Console.WriteLine("PASS: filename conversion, new defaults, existing gist immutability and legacy draft compatibility.");
    }
    private sealed class ExistingStorage(LocalGist gist) : FakeStorageService
    {
        public override Task<List<LocalGist>> GetLocalGistsAsync(string username) => Task.FromResult(new List<LocalGist> { gist });
    }
}
