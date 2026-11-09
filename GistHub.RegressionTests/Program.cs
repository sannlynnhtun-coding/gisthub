using System.Reflection;
using GistHub.Models;
using GistHub.Services;
using Microsoft.AspNetCore.Components;

await DiagramGistTests.RunAsync();
await GistSearchSyncTests.RunAsync();
await ProfileLoadingTests.RunAsync();
await ProfileSwitchingTests.RunAsync();
await MessageDismissalTests.RunAsync();
await GistVisibilityTests.RunAsync();
MarkdownDocxTests.Run();
AgentSkillTests.Run();

using (var tableDocument = System.Text.Json.JsonDocument.Parse("[{\"name\":\"<script>alert(1)</script>\",\"nested\":{\"x\":1}},{\"extra\":null,\"name\":\"=1+1\"}]"))
{
    var table = JsonTableConverter.Create(tableDocument.RootElement);
    Assert(table.Columns.SequenceEqual(new[] { "name", "nested", "extra" }), "Table columns must include keys from every object in source order.");
    Assert(table.Rows[0][2].ValueKind == System.Text.Json.JsonValueKind.Undefined && JsonTableConverter.Text(table.Rows[1][2]) == "null", "Missing cells must remain distinct from explicit nulls.");
    var html = JsonTableConverter.Html(tableDocument.RootElement);
    Assert(!html.Contains("<script>") && html.Contains("&lt;script&gt;") && html.Split("<table>").Length == 3, "HTML exports must escape user text and preserve nested tables.");
    var csv = JsonTableConverter.Csv(table);
    Assert(csv.Contains("\"'=1+1\"") && csv.Contains("\"{\"\"x\"\":1}\""), "CSV must neutralize formulas and quote nested JSON correctly.");
}
foreach (var jsonValue in new[] { "[]", "{}", "null", "[1,\"two\",true]" })
{
    using var document = System.Text.Json.JsonDocument.Parse(jsonValue);
    var table = JsonTableConverter.Create(document.RootElement);
    Assert(table.Rows.All(row => row.Count == table.Columns.Count), "Primitive, empty, and mixed JSON must produce consistent table shapes.");
}
Console.WriteLine("PASS: JSON tables preserve heterogeneous and nested data and export safely.");

using (var filterDocument = System.Text.Json.JsonDocument.Parse("{\"metadata\":{\"sources\":[\"hidden-source\"]},\"records\":[{\"title\":\"Keep\",\"sources\":[\"hidden-record-source\"],\"contact\":{\"city\":\"Yangon\"}},{\"title\":\"Also keep\",\"sources\":[\"other-source\"]}],\"metadata/sources\":[],\"literal\":7}"))
{
    var original = filterDocument.RootElement;
    var fields = JsonTableFieldFilter.Discover(original);
    Assert(fields.Count(field => field.Label == "$[\"records\"][][\"sources\"]") == 1, "Repeated array fields must have one checkbox.");
    Assert(fields.All(field => !field.Label.EndsWith("[\"title\"]") && !field.Label.EndsWith("[\"literal\"]")), "Only object and array fields can be filtered.");
    var hidden = new HashSet<string> { fields.Single(field => field.Label == "$[\"metadata\"]").Path, fields.Single(field => field.Label == "$[\"records\"][][\"sources\"]").Path };
    var filtered = JsonTableFieldFilter.Apply(original, hidden);
    Assert(!filtered.TryGetProperty("metadata", out _) && filtered.GetProperty("records").EnumerateArray().All(record => !record.TryGetProperty("sources", out _)), "Parent and array-item filters must remove selected nested fields throughout the data.");
    Assert(filtered.GetProperty("metadata/sources").GetArrayLength() == 0 && filtered.GetProperty("literal").GetInt32() == 7, "Escaped property paths and scalar fields must remain intact.");
    Assert(original.TryGetProperty("metadata", out _) && original.GetProperty("records")[0].TryGetProperty("sources", out _), "Filtering must not mutate the source JSON.");
    var html = JsonTableConverter.Html(filtered);
    var csv = JsonTableConverter.Csv(JsonTableConverter.Create(filtered));
    Assert(!html.Contains("hidden-source") && !html.Contains("hidden-record-source") && !csv.Contains("hidden-record-source"), "Both export formats must exclude hidden nested data.");
    Assert(JsonTableFieldFilter.Apply(original, new HashSet<string>()).GetRawText() == original.GetRawText(), "Showing all fields must restore the complete original data.");
}
Console.WriteLine("PASS: nested field filters apply to preview and exports without changing source JSON.");

var login = new GistHub.Pages.Login();
SetProperty(login, "Storage", new FakeStorageService());
SetProperty(login, "AppState", new AppState());
SetProperty(login, "Navigation", new FakeNavigationManager());
SetProperty(login, "Github", new ThrowingGithubService());
SetProperty(login, "ProfileName", "Test profile");
SetProperty(login, "Token", "test-token");

Exception? submitError = null;
try
{
    await InvokeAsync(login, "HandleLogin");
}
catch (Exception ex)
{
    submitError = ex;
}

Assert(submitError is null, "Login submission should handle service errors instead of throwing.");
Assert(!GetProperty<bool>(login, "IsLoading"), "Login must leave the loading state after an error.");
Assert(!string.IsNullOrWhiteSpace(GetProperty<string>(login, "ErrorMessage")), "Login must expose an error message for the toast.");

Console.WriteLine("PASS: login errors stop loading and expose a toast message.");

var bookmarkGists = new List<LocalGist>
{
    new() { Id = "newer", IsBookmarked = true, BookmarkOrder = 2, UpdatedAt = new DateTime(2026, 1, 2) },
    new() { Id = "first", IsBookmarked = true, BookmarkOrder = 1, UpdatedAt = new DateTime(2026, 1, 1) },
    new() { Id = "ignored", IsBookmarked = false, UpdatedAt = new DateTime(2026, 1, 3) }
};
var mergedOrder = BookmarkBackupSerializer.CreateMergedOrder(bookmarkGistsForMerge(), new[]
{
    new BookmarkBackupItem { GistId = "EXISTING", Order = 1 },
    new BookmarkBackupItem { GistId = "added", Order = 2 },
    new BookmarkBackupItem { GistId = "added", Order = 3 },
    new BookmarkBackupItem { GistId = "missing", Order = 4 }
});
Assert(mergedOrder.Count == 2 && mergedOrder["existing"] == 1 && mergedOrder["added"] == 2,
    "Restore must preserve existing bookmarks, append new ones, deduplicate IDs, and skip missing gists.");
Assert(BookmarkBackupSerializer.CreateMergedOrder(bookmarkGistsForMerge(), Array.Empty<BookmarkBackupItem>()).ContainsKey("existing"),
    "An empty backup must preserve current bookmarks.");
static LocalGist[] bookmarkGistsForMerge() => new[]
{
    new LocalGist { Id = "existing", IsBookmarked = true, BookmarkOrder = 1 },
    new LocalGist { Id = "added" }
};

var bookmarkJson = BookmarkBackupSerializer.CreateJson(
    bookmarkGists,
    "ExampleUser",
    new DateTimeOffset(2026, 1, 3, 4, 5, 6, TimeSpan.Zero));

Assert(
    BookmarkBackupSerializer.TryParse(bookmarkJson, "exampleuser", out var bookmarkBackup, out var bookmarkError),
    $"Generated bookmark JSON should parse: {bookmarkError}");
var duplicateJson = bookmarkJson.Replace("\"gistId\": \"newer\"", "\"gistId\": \"FIRST\"");
Assert(BookmarkBackupSerializer.TryParse(duplicateJson, "exampleuser", out var deduplicatedBackup, out _)
    && deduplicatedBackup!.Bookmarks!.Count == 1,
    "Duplicate bookmark IDs in a backup should merge case-insensitively.");
Assert(bookmarkBackup!.Bookmarks!.Count == 2, "Only bookmarked gists should be exported.");
Assert(bookmarkBackup.Bookmarks[0].GistId == "first", "Bookmark order should be preserved in the backup.");
Assert(
    !BookmarkBackupSerializer.TryParse(bookmarkJson, "another-user", out _, out var accountError) && accountError.Contains("belongs to"),
    "A bookmark backup from another account must be rejected.");

Console.WriteLine("PASS: bookmark backups preserve order and enforce account scope.");

var searchService = new GistSearchService();
var searchGists = new List<LocalGist>
{
    new()
    {
        Id = "description-match",
        Description = "Needle deployment helper",
        Tags = ["ops"],
        Files = new Dictionary<string, GistFile>
        {
            ["deploy.ps1"] = new() { Filename = "deploy.ps1", Content = "Write-Host 'ready'" }
        },
        IsBookmarked = true,
        UpdatedAt = new DateTime(2026, 1, 3)
    },
    new()
    {
        Id = "content-match",
        Description = "General utilities",
        Tags = ["reference"],
        Files = new Dictionary<string, GistFile>
        {
            ["first.cs"] = new() { Filename = "first.cs", Content = "var needle = FindValue();" },
            ["second.cs"] = new() { Filename = "second.cs", Content = "Console.WriteLine(NEEDLE);" }
        },
        UpdatedAt = new DateTime(2026, 1, 4)
    },
    new()
    {
        Id = "filename-and-tag-match",
        Description = "Handy command",
        Tags = ["NeedleTag"],
        Files = new Dictionary<string, GistFile>
        {
            ["needle-script.sh"] = new() { Filename = "needle-script.sh", Content = "echo ready" }
        },
        UpdatedAt = new DateTime(2026, 1, 2)
    }
};

var needleResults = searchService.Search(searchGists, "NEEDLE", bookmarksOnly: false);
Assert(needleResults.TotalCount == 3, "Search should match descriptions, tags, filenames, and content without case sensitivity.");
Assert(needleResults.Results.Count(result => result.GistId == "content-match") == 1, "A gist with multiple matching files must appear once.");
Assert(needleResults.Results[0].GistId == "description-match", "Description matches should rank ahead of tag, filename, and content matches.");
Assert(needleResults.Results[0].Snippet.Contains("Needle deployment", StringComparison.OrdinalIgnoreCase), "Description matches should show description context rather than unrelated file content.");
Assert(needleResults.Results.First(result => result.GistId == "content-match").Snippet.Contains("needle", StringComparison.OrdinalIgnoreCase), "Content matches should include the matching text in their snippet.");

var exactTagResult = searchService.Search(
    [
        new LocalGist { Id = "exact-tag", Description = "Reference", Tags = ["needle"], UpdatedAt = new DateTime(2026, 1, 1) },
        new LocalGist { Id = "filename", Description = "Reference", Files = new() { ["needle"] = new() { Filename = "needle" } }, UpdatedAt = new DateTime(2026, 1, 2) }
    ],
    "needle",
    bookmarksOnly: false);
Assert(exactTagResult.Results[0].GistId == "exact-tag", "An exact tag match should rank ahead of a filename match even when the filename is newer.");

var tiedDescriptionResults = searchService.Search(
    [
        new LocalGist { Id = "older", Description = "needle note", UpdatedAt = new DateTime(2026, 1, 1) },
        new LocalGist { Id = "newer", Description = "needle note", UpdatedAt = new DateTime(2026, 1, 2) }
    ],
    "needle",
    bookmarksOnly: false);
Assert(tiedDescriptionResults.Results[0].GistId == "newer", "Equally relevant matches should sort by the newest update time.");

var boundaryContent = $"{new string('a', 100)}needle{new string('b', 150)}";
var boundaryResult = searchService.Search(
    [new LocalGist { Id = "boundary", Description = "Reference", Files = new() { ["long.txt"] = new() { Filename = "long.txt", Content = boundaryContent } } }],
    "needle",
    bookmarksOnly: false).Results[0];
Assert(boundaryResult.Snippet.StartsWith("...", StringComparison.Ordinal) && boundaryResult.Snippet.EndsWith("...", StringComparison.Ordinal), "Long content snippets should show both clipped boundaries.");
Assert(boundaryResult.Snippet.Contains("needle", StringComparison.OrdinalIgnoreCase), "A clipped content snippet must keep the matched term in context.");

var bookmarkedResults = searchService.Search(searchGists, "needle", bookmarksOnly: true);
Assert(bookmarkedResults.TotalCount == 1 && bookmarkedResults.Results[0].GistId == "description-match", "Bookmark filtering should exclude unbookmarked search matches.");

var multiWordResults = searchService.Search(searchGists, "utilities needle", bookmarksOnly: false);
Assert(multiWordResults.TotalCount == 1 && multiWordResults.Results[0].GistId == "content-match", "Every word in a multi-word query should match somewhere in the same gist.");

var limitedResults = searchService.Search(searchGists, "needle", bookmarksOnly: false, limit: 2);
Assert(limitedResults.TotalCount == 3 && limitedResults.Results.Count == 2, "Search should retain the total count while limiting rendered results.");

Console.WriteLine("PASS: local gist search ranks fields, groups by gist, filters bookmarks, and returns safe context snippets.");

var unicode = "Hello မြန်မာ 👋\nSecond line";
Assert(Base64Converter.ConvertText("Hello", false) == "SGVsbG8=", "Standard text encoding must emit the expected padded Base64.");
Assert(Base64Converter.ConvertText(Base64Converter.ConvertText(unicode, false), true) == unicode, "UTF-8 Base64 must round-trip Unicode and newlines.");
Assert(Base64Converter.ConvertText(" SGVs\nbG8= \r\n", true) == "Hello", "Decode should ignore whitespace.");
Assert(Base64Converter.ConvertText("Hello\r\n\rWorld\n", false, eachLine: true) == "SGVsbG8=\n\nV29ybGQ=\n", "Separate-line encoding must handle mixed line endings and preserve blank lines.");
Assert(Base64Converter.ConvertText("SGVsbG8=\r\n\r\nV29ybGQ=", true, eachLine: true) == "Hello\n\nWorld", "Separate-line mode must preserve blank lines.");
Assert(Base64Converter.ConvertText("é", false, latin1: true) == "6Q==", "Latin-1 must use one byte for accented characters.");
Assert(Base64Converter.ConvertText("6Q==", true, latin1: true) == "é", "Latin-1 bytes should decode correctly.");
var binary = new byte[] { 0, 255, 254, 128, 1 };
Assert(Base64Converter.EncodeBytes(binary) == "AP/+gAE=", "Standard binary encoding must emit the standard alphabet and padding.");
Assert(Base64Converter.EncodeBytes(binary, true) == "AP_-gAE", "URL-safe encoding must substitute both alphabet characters and omit padding.");
Assert(Base64Converter.DecodeBytes("AP_-gAE=", true).SequenceEqual(binary), "URL-safe decoding must also accept padding.");
Assert(Base64Converter.DecodeBytes(Base64Converter.EncodeBytes(binary, true), true).SequenceEqual(binary), "URL-safe unpadded Base64 must preserve binary files.");
Assert(Base64Converter.DecodeBytes("Zg", true).SequenceEqual(new byte[] { 102 }), "URL-safe input should accept omitted padding.");
foreach (var (invalid, urlSafe) in new[] { ("!bad", false), ("A", false), ("AA=A", false),
    ("Zg===", false), ("SGVsbG8", false), ("AP_-gAE=", false), ("AP/+gAE=", true), ("A", true) })
{
    var rejected = false;
    try { Base64Converter.DecodeBytes(invalid, urlSafe); }
    catch (FormatException) { rejected = true; }
    Assert(rejected, $"Invalid Base64 must be rejected (URL-safe: {urlSafe}): {invalid}");
}
var invalidLatin1Rejected = false;
try { Base64Converter.ConvertText("€", false, latin1: true); }
catch (System.Text.EncoderFallbackException) { invalidLatin1Rejected = true; }
Assert(invalidLatin1Rejected, "Latin-1 encoding must reject characters it cannot represent.");
var invalidUtf8Rejected = false;
try { Base64Converter.ConvertText("/w==", true); }
catch (System.Text.DecoderFallbackException) { invalidUtf8Rejected = true; }
Assert(invalidUtf8Rejected, "Binary content must not silently decode into replacement characters.");
Console.WriteLine("PASS: Base64 Unicode, charsets, whitespace, lines, URL-safe binary, and invalid input.");

static void SetProperty(object target, string name, object value)
{
    var property = target.GetType().GetProperty(name, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)
        ?? throw new InvalidOperationException($"Property '{name}' was not found.");
    property.SetValue(target, value);
}

static T GetProperty<T>(object target, string name)
{
    var property = target.GetType().GetProperty(name, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)
        ?? throw new InvalidOperationException($"Property '{name}' was not found.");
    return (T)property.GetValue(target)!;
}

static async Task InvokeAsync(object target, string name)
{
    var method = target.GetType().GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)
        ?? throw new InvalidOperationException($"Method '{name}' was not found.");

    try
    {
        await (Task)method.Invoke(target, null)!;
    }
    catch (TargetInvocationException ex) when (ex.InnerException is not null)
    {
        throw ex.InnerException;
    }
}

static void Assert(bool condition, string message)
{
    if (!condition)
    {
        throw new InvalidOperationException(message);
    }
}

sealed class ThrowingGithubService : IGithubService
{
    public GithubApiError? LastError => null;

    public Task<GithubUser?> GetUserInfoAsync(string token)
        => throw new HttpRequestException("GitHub is unreachable.");

    public Task<List<LocalGist>> GetPublicGistsAsync(string? token = null) => throw new NotSupportedException();
    public Task<List<LocalGist>> GetUserGistsAsync(string token) => throw new NotSupportedException();
    public Task<bool> DeleteGistAsync(string gistId, string token) => throw new NotSupportedException();
    public Task<LocalGist?> CreateGistAsync(string description, bool isPublic, Dictionary<string, GistFile> files, string token) => throw new NotSupportedException();
    public Task<LocalGist?> UpdateGistAsync(string id, string description, Dictionary<string, GistFile> files, string token) => throw new NotSupportedException();
    public Task<LocalGist?> GetGistByIdAsync(string id, string? token = null) => throw new NotSupportedException();
    public Task<List<LocalGist>> GetUserPublicGistsAsync(string username, string? token = null) => throw new NotSupportedException();
}

class FakeStorageService : IStorageService
{
    public Task InitAsync() => Task.CompletedTask;
    public Task SaveProfileAsync(GistProfile profile) => Task.CompletedTask;
    public virtual Task<List<GistProfile>> GetProfilesAsync() => Task.FromResult(new List<GistProfile>());
    public Task DeleteProfileAsync(string id) => Task.CompletedTask;
    public Task SaveGistAsync(LocalGist gist) => Task.CompletedTask;
    public virtual Task SaveSyncedGistAsync(LocalGist gist, string username) => Task.CompletedTask;
    public Task<List<LocalGist>> GetLocalGistsAsync() => GetLocalGistsAsync("");
    public virtual Task<List<LocalGist>> GetLocalGistsAsync(string username) => Task.FromResult(new List<LocalGist>());
    public Task DeleteGistAsync(string id) => Task.CompletedTask;
    public Task SaveGroupAsync(GistGroup group) => Task.CompletedTask;
    public Task<List<GistGroup>> GetGroupsAsync() => Task.FromResult(new List<GistGroup>());
    public Task DeleteGroupAsync(string id) => Task.CompletedTask;
}

sealed class FakeNavigationManager : NavigationManager
{
    public FakeNavigationManager() => Initialize("http://localhost/", "http://localhost/login");

    protected override void NavigateToCore(string uri, NavigationOptions options)
    {
    }
}
