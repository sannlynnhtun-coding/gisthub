using System.Net;
using System.Net.Http.Json;
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
        Console.WriteLine("PASS: gist sync paginates, exposes failures, and includes later-page content in search.");
    }

    private static void Check(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }

    private sealed class GistsHandler(int count, bool failSecondPage = false) : HttpMessageHandler
    {
        public int Requests;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Check(request.Headers.Authorization?.Parameter == "test-token", "Every page must use the account token.");
            if (request.RequestUri!.AbsolutePath == "/gists/100")
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = JsonContent.Create(new LocalGist { Id = "100", Description = "Database setup",
                        Files = new() { ["setup.sh"] = new() { Content = "docker run mysql:latest" } } })
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
