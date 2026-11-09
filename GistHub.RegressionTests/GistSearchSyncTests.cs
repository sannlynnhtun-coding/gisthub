using System.Net;
using System.Net.Http.Json;
using System.Reflection;
using GistHub.Components.UI;
using GistHub.Models;
using GistHub.Services;

static class GistSearchSyncTests
{
    public static async Task RunAsync()
    {
        foreach (var count in new[] { 0, 30, 100, 101 })
        {
            var handler = new GistsHandler(count);
            var github = new GithubService(new HttpClient(handler), "https://api.github.com");
            var gists = await github.GetUserGistsAsync("test-token");
            Check(gists.Count == count && handler.Requests == count / 100 + 1,
                "Sync must fetch every page, including an empty page after an exact full batch.");
            if (count == 101)
            {
                // Sync hydrates list entries before putting them in the local search index.
                var fullGist = await github.GetGistByIdAsync(gists[^1].Id, "test-token");
                var results = new GistSearchService().Search([fullGist!], "DOCKER", false);
                Check(results.TotalCount == 1 && results.Results[0].MatchKind == GistSearchMatchKind.Content,
                    "Content-only docker matches from later pages must be searchable.");
            }
        }

        var failedGithub = new GithubService(new HttpClient(new GistsHandler(101, true)), "https://api.github.com");
        try
        {
            await failedGithub.GetUserGistsAsync("test-token");
            throw new Exception("A failed later page must not look like a successful partial sync.");
        }
        catch (InvalidOperationException)
        {
            Check(failedGithub.LastError?.StatusCode == HttpStatusCode.Forbidden, "Sync must retain the GitHub error.");
        }
        var storage = new SearchStorage();
        var profile = new GistProfile { GithubUsername = "alice", AccessToken = "test-token" };
        var syncGithub = new GithubService(new HttpClient(new GistsHandler(101)), "https://api.github.com");
        await new GistSyncService(syncGithub, storage).SyncAsync(profile);
        var cached = await storage.GetLocalGistsAsync("alice");
        Check(cached.Count == 101 && (await storage.GetLocalGistsAsync("bob")).Count == 0,
            "Sync must save all pages under the captured account.");
        foreach (var (query, kind) in new[] { ("docker", GistSearchMatchKind.Content),
            ("database", GistSearchMatchKind.Description), ("setup.sh", GistSearchMatchKind.Filename) })
        {
            var match = new GistSearchService().Search(cached, query, false);
            Check(match.TotalCount == 1 && match.Results[0].GistId == "100" && match.Results[0].MatchKind == kind,
                "Synced cache must support description, filename, and content search.");
        }
        Check(new GistSearchService().Search(cached, "database docker setup.sh", false).TotalCount == 1,
            "Query words may match across fields of the same cached gist.");
        Check(new GistSearchService().Search(cached, "docker", true).TotalCount == 0,
            "Bookmark filtering must still apply to synced content.");
        foreach (var truncated in new[] { false, true })
        {
            var incomplete = new GithubService(new HttpClient(new GistsHandler(1, incomplete: true, truncated: truncated)), "https://api.github.com");
            try
            {
                await new GistSyncService(incomplete, storage).SyncAsync(profile);
                throw new Exception("Incomplete contents must surface a sync error.");
            }
            catch (InvalidOperationException) { }
            Check(storage.Saves == 101, "Failed or truncated downloads must not overwrite cached files.");
        }
        var searchStorage = new SearchStorage();
        var state = new AppState();
        state.SetProfile(profile);
        var dialog = new GlobalGistSearch();
        const BindingFlags flags = BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public;
        void Set(string name, object value) => typeof(GlobalGistSearch).GetProperty(name, flags)!.SetValue(dialog, value);
        Set("Storage", searchStorage);
        Set("AppState", state);
        Set("SearchService", new GistSearchService());
        Set("SyncService", new GistSyncService(new GithubService(new HttpClient(new GistsHandler(101)), "https://api.github.com"), searchStorage));
        Set("AccountUsername", "alice");
        Set("IsAuthenticated", true);
        Set("Query", "docker");
        await (Task)typeof(GlobalGistSearch).GetMethod("SyncGistsAsync", flags)!.Invoke(dialog, null)!;
        var dialogResults = (IReadOnlyList<GistSearchResult>)typeof(GlobalGistSearch).GetProperty("Results", flags)!.GetValue(dialog)!;
        Check(dialogResults.Count == 1 && dialogResults[0].GistId == "100",
            "Search dialog sync must reload the stored index and rerun the existing query.");
        Set("SyncService", new GistSyncService(new GithubService(new HttpClient(new GistsHandler(101, true)), "https://api.github.com"), searchStorage));
        await (Task)typeof(GlobalGistSearch).GetMethod("SyncGistsAsync", flags)!.Invoke(dialog, null)!;
        Check(!string.IsNullOrWhiteSpace((string)typeof(GlobalGistSearch).GetProperty("SyncError", flags)!.GetValue(dialog)!) &&
            ((IReadOnlyList<GistSearchResult>)typeof(GlobalGistSearch).GetProperty("Results", flags)!.GetValue(dialog)!).Count == 1,
            "Failed dialog sync must show an error and keep cached results searchable.");
        Console.WriteLine("PASS: gist sync paginates, exposes failures, and includes later-page content in search.");
    }

    private static void Check(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }

    private sealed class SearchStorage : FakeStorageService
    {
        private readonly Dictionary<string, List<LocalGist>> accounts = new();
        public int Saves;
        public override Task SaveSyncedGistAsync(LocalGist gist, string username)
        {
            if (!accounts.TryGetValue(username, out var gists)) accounts[username] = gists = [];
            gists.Add(gist);
            Saves++;
            return Task.CompletedTask;
        }
        public override Task<List<LocalGist>> GetLocalGistsAsync(string username)
            => Task.FromResult(accounts.TryGetValue(username, out var gists) ? gists.ToList() : []);
    }

    private sealed class GistsHandler(int count, bool failSecondPage = false, bool incomplete = false, bool truncated = false) : HttpMessageHandler
    {
        public int Requests;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Check(request.Headers.Authorization?.Parameter == "test-token", "Every page must use the account token.");
            if (request.RequestUri!.AbsolutePath.StartsWith("/gists/"))
            {
                if (incomplete && !truncated)
                    return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Forbidden) { Content = JsonContent.Create(new { message = "Download failed" }) });
                var id = request.RequestUri.AbsolutePath.Split('/')[^1];
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = JsonContent.Create(new LocalGist { Id = id, Description = id == "100" ? "Database setup" : "Other note",
                        Files = new() { [id == "100" ? "setup.sh" : "note.txt"] = new() { Content = id == "100" ? "docker run mysql:latest" : "other text", Truncated = truncated } } })
                });
            }

            Requests++;
            Check(request.RequestUri.Query == $"?per_page=100&page={Requests}", "Pages must advance with the same page size.");
            if (failSecondPage && Requests == 2)
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Forbidden)
                {
                    Content = JsonContent.Create(new { message = "API rate limit exceeded" })
                });
            }
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = JsonContent.Create(Enumerable.Range(0, count).Skip((Requests - 1) * 100).Take(100)
                    .Select(index => new LocalGist { Id = index.ToString() }).ToList())
            });
        }
    }
}
