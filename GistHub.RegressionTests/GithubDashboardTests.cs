using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.JSInterop;
using System.Net;
using System.Text.Json;
using GistHub.Models;
using GistHub.Services;

static class GithubDashboardTests
{
    static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    public static async Task RunAsync()
    {
        var handler = new Handler();
        var service = new GithubService(new HttpClient(handler), "https://example.test/api/github");
        foreach (var invalid in new[] { "", "-abc", "a--b", "a/../b", new string('a', 40) })
            Check((await service.GetPublicDashboardAsync(invalid)).Error is not null && handler.Paths.Count == 0, "Invalid usernames must not send requests.");
        var result = await service.GetPublicDashboardAsync(" @alice ");
        Check(result.Error is null && result.Developer?.Login == "alice" && result.Repositories.Count == 2, "Public result must exclude private rows.");
        Check(handler.Paths.SequenceEqual(new[] { "/api/github/users/alice", "/api/github/users/alice/repos?per_page=100&sort=updated&direction=desc" }), "Dashboard must use configured public paths.");
        Check(service.LastError is null, "Dashboard must not change gist errors.");
        var rows = result.Repositories;
        Check(GithubDashboardSummary.LanguageStars(rows).Single(g => g.Name == "C#").Stars == 10, "Ecosystem must sum actual stars by primary language.");
        Check(rows.Sum(r => r.Stars) == 12 && GithubDashboardSummary.Languages(rows).Count() == 2, "Measured totals and unknown language bucket must match fixture.");
        Check(GithubDashboardSummary.Explore(rows, "ALPHA", "", "updated").Single().Name == "alpha", "Search must ignore case.");
        Check(GithubDashboardSummary.Explore(rows, "", "C#", "stars").Single().Name == "alpha", "Language filtering must match.");
        Check(GithubDashboardSummary.Explore(rows, "", "", "updated").Last().Name == "beta", "Unknown update dates sort last.");
        Check(GithubDashboardSummary.Coverage(rows).Single(x => x.Name == "License").Count == 1, "Quality coverage must count measured metadata.");
        Check(GithubDashboardSummary.Coverage([]).All(x => x.Count == 0), "Empty coverage must be safe.");
        Check(GithubDashboardSummary.CloneCommand(rows[0]) == "git clone https://github.com/alice/alpha.git", "Clone must be constructed from safe identifiers.");
        Check(GithubDashboardSummary.CloneCommand(new GithubRepository { Name = "x;echo", Owner = new() { Login = "alice" } }) is null, "Clone command must reject shell syntax.");
        Check(GithubDashboardSummary.SafeGithubUrl("https://github.com.evil.test/x") is null, "Links must reject foreign hosts.");
        rows[0].Name = "=SUM(1,2)\n\"test\"";
        var csv = GithubDashboardSummary.Csv(result);
        Check(csv.Contains("'=SUM(1,2)") && csv.Contains("\"\"test\"\"") && csv.Contains("Loaded at UTC") && !csv.Contains("Demo"), "Export must quote/neutralize metadata and exclude demo data.");
        handler.Full = true;
        Check((await service.GetPublicDashboardAsync("alice")).PossiblyTruncated, "A full page must disclose possible truncation.");
        handler.Full = false; handler.Empty = true;
        Check((await service.GetPublicDashboardAsync("alice")).Repositories.Count == 0, "Empty success differs from failure.");
        handler.Empty = false;
        foreach (var code in new[] { HttpStatusCode.NotFound, HttpStatusCode.Forbidden, HttpStatusCode.TooManyRequests })
        {
            handler.Failure = code;
            var error = (await service.GetPublicDashboardAsync("alice")).Error;
            Check(error?.StatusCode == code && error.RateLimitReset is not null && service.LastError is null, "Errors must be local and preserve status/reset.");
        }
        handler.Failure = null; handler.Malformed = true;
        Check((await service.GetPublicDashboardAsync("alice")).Error is not null, "Malformed responses must fail safely.");
        handler.Malformed = false; handler.Throw = true;
        Check((await service.GetPublicDashboardAsync("alice")).Error is not null, "Network failure must return an error.");
        var authenticated = new AuthenticatedHandler();
        var signedIn = new GithubService(new HttpClient(authenticated), "https://example.test");
        var account = await signedIn.GetPublicDashboardAsync("alice", "fixture-token");
        Check(account.Error is null && account.Authenticated && account.Repositories.Count == 101 && account.Repositories.Any(repo => repo.Private), "Authenticated repository reads must include private rows and continue beyond 100.");
        Check(authenticated.Paths.Count == 3 && authenticated.Paths[1].StartsWith("/user/repos?") && authenticated.Paths[2].EndsWith("&page=2"), "Home must use authenticated repository pagination.");
        var analytics = await signedIn.GetDashboardAnalyticsAsync("alice", "fixture-token", new DateOnly(2026, 11, 1));
        Check(analytics.Commits is not null && analytics.Pulls is not null && authenticated.Paths.Skip(3).All(path => !Uri.UnescapeDataString(path).Contains("is:public")), "Analytics search must use the token without excluding private repositories.");
        Check(analytics.Commits?.Items.Length == 101 && !analytics.Commits.IsPartial && authenticated.Paths.Any(path => path.StartsWith("/search/commits?") && path.EndsWith("&page=2")), "Commit search must continue beyond its first page.");
        var privateRepo = account.Repositories.Single(repo => repo.Private);
        var runs = await signedIn.GetRepositoryActivityAsync(privateRepo, "actions/runs", "fixture-token");
        Check(runs?.Single() is { Name: "CI", Status: "success", Date: not null }, "Workflow status and timestamp must come from GitHub.");
        var releases = await signedIn.GetRepositoryActivityAsync(privateRepo, "releases", "fixture-token");
        Check(releases?.Single() is { Name: "v1", Status: "Published" }, "Unnamed releases must use their real Git tag.");
        var milestones = await signedIn.GetRepositoryActivityAsync(privateRepo, "milestones", "fixture-token");
        Check(milestones?.Single() is { Name: "Next release", Status: "3 of 5 issues closed" }, "Goal progress must use GitHub issue totals.");
        var beforeMismatch = authenticated.Paths.Count;
        Check((await signedIn.GetPublicDashboardAsync("other", "fixture-token")).Error is not null && authenticated.Paths.Count == beforeMismatch + 1, "A mismatched token must stop before fetching repository data.");
        var delayed = new DelayedHandler();
        var page = new GistHub.Pages.Start();
        var flags = System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance;
        typeof(GistHub.Pages.Start).GetProperty("Github", flags)!.SetValue(page, new GithubService(new HttpClient(delayed), "https://example.test"));
        typeof(GistHub.Pages.Start).GetProperty("AppState", flags)!.SetValue(page, new AppState());
        var state = (AppState)typeof(GistHub.Pages.Start).GetProperty("AppState", flags)!.GetValue(page)!;
        var loadMethod = typeof(GistHub.Pages.Start).GetMethod("LoadAsync", flags)!;
        var resultField = typeof(GistHub.Pages.Start).GetField("Result", flags)!;
        state.SetProfile(new GistProfile { GithubUsername = "slow", AccessToken = "slow" });
        var slowLoad = (Task)loadMethod.Invoke(page, null)!;
        state.SetProfile(new GistProfile { GithubUsername = "bob", AccessToken = "bob" });
        await (Task)loadMethod.Invoke(page, null)!;
        delayed.Gate.SetResult(); await slowLoad;
        Check(((GithubDashboardResult)resultField.GetValue(page)!).Developer?.Login == "bob", "Late requests must not overwrite current developer.");
        delayed.Gate = new(); state.SetProfile(new GistProfile { GithubUsername = "slow", AccessToken = "slow" });
        slowLoad = (Task)loadMethod.Invoke(page, null)!;
        await page.DisposeAsync(); delayed.Gate.SetResult(); await slowLoad;
        Check(resultField.GetValue(page) is null, "Disposed page must ignore late completions.");
        var profileState = new AppState();
        profileState.SetProfile(new GistProfile { GithubUsername = "slow", AccessToken = "slow" });
        var profileHandler = new DelayedHandler();
        var services = new ServiceCollection();
        services.AddLogging(); services.AddSingleton(profileState);
        services.AddSingleton<IGithubService>(new GithubService(new HttpClient(profileHandler), "https://example.test"));
        services.AddSingleton<IJSRuntime>(new NoJs());
        using var provider = services.BuildServiceProvider();
        await using var renderer = new HtmlRenderer(provider, provider.GetRequiredService<ILoggerFactory>());
        var root = await renderer.Dispatcher.InvokeAsync(() => renderer.BeginRenderingComponent<GistHub.Pages.Start>());
        await renderer.Dispatcher.InvokeAsync(() => profileState.SetProfile(new GistProfile { GithubUsername = "bob", AccessToken = "bob" }));
        profileHandler.Gate.SetResult(); await root.QuiescenceTask;
        var html = await renderer.Dispatcher.InvokeAsync(root.ToHtmlString);
        Check(html.Contains("bob-repo") && !html.Contains("slow-repo") && !html.Contains("dashboard-username"), "Profile changes must clear and invalidate old developer loads.");
        Console.WriteLine("PASS: dashboard public requests, validation, scope, errors, summary/filter/coverage and safe export/clone.");
    }
    sealed class NoJs : IJSRuntime
    {
        public ValueTask<T> InvokeAsync<T>(string identifier, object?[]? args) => throw new Exception("Unexpected dashboard JS: " + identifier);
        public ValueTask<T> InvokeAsync<T>(string identifier, CancellationToken cancellationToken, object?[]? args) => InvokeAsync<T>(identifier, args);
    }
    sealed class DelayedHandler : HttpMessageHandler
    {
        public TaskCompletionSource Gate = new();
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var username = request.Headers.Authorization!.Parameter!;
            var path = request.RequestUri!.AbsolutePath;
            if (path == "/user" && username == "slow") await Gate.Task;
            var json = path switch
            {
                "/user" => JsonSerializer.Serialize(new { login = username }),
                "/search/issues" or "/search/commits" => """{"total_count":0,"items":[]}""",
                _ => JsonSerializer.Serialize(new[] { new { id = 1, name = username + "-repo", owner = new { login = username } } })
            };
            return new(HttpStatusCode.OK) { Content = new StringContent(json) };
        }
    }
    sealed class AuthenticatedHandler : HttpMessageHandler
    {
        public List<string> Paths = [];
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Check(request.Method == HttpMethod.Get && request.Headers.Authorization?.Parameter == "fixture-token", "Dashboard account reads must use the active token.");
            var uri = request.RequestUri!;
            Paths.Add(uri.PathAndQuery);
            var json = uri.AbsolutePath switch
            {
                "/user" => """{"login":"alice"}""",
                "/user/repos" => JsonSerializer.Serialize(Enumerable.Range(uri.Query.EndsWith("&page=2") ? 101 : 1, uri.Query.EndsWith("&page=2") ? 1 : 100)
                    .Select(id => new { id, name = "repo-" + id, @private = id == 101, owner = new { login = "alice" } })),
                "/search/commits" => JsonSerializer.Serialize(new { total_count = 101, items = Enumerable.Range(uri.Query.EndsWith("&page=2") ? 101 : 1, uri.Query.EndsWith("&page=2") ? 1 : 100).Select(id => new { sha = id.ToString() }) }),
                "/repos/alice/repo-101/actions/runs" => """{"workflow_runs":[{"name":"CI","conclusion":"success","status":"completed","created_at":"2026-11-19T00:00:00Z"}]}""",
                "/repos/alice/repo-101/releases" => """[{"tag_name":"v1","published_at":"2026-11-19T00:00:00Z"}]""",
                "/repos/alice/repo-101/milestones" => """[{"title":"Next release","open_issues":2,"closed_issues":3}]""",
                _ => """{"total_count":0,"items":[]}"""
            };
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json) });
        }
    }
    sealed class Handler : HttpMessageHandler
    {
        public List<string> Paths = [];
        public bool Full, Empty, Malformed, Throw;
        public HttpStatusCode? Failure;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Check(request.Method == HttpMethod.Get && request.Headers.Authorization is null, "Dashboard must be public and read-only.");
            Paths.Add(request.RequestUri!.PathAndQuery);
            if (Throw) throw new HttpRequestException("offline");
            var response = new HttpResponseMessage(Failure ?? HttpStatusCode.OK);
            response.Headers.TryAddWithoutValidation("X-RateLimit-Reset", "1800000000");
            var repos = "[{\"id\":1,\"name\":\"alpha\",\"owner\":{\"login\":\"alice\"},\"language\":\"C#\",\"license\":{\"spdx_id\":\"MIT\"},\"stargazers_count\":10,\"forks_count\":2,\"updated_at\":\"2026-01-01T00:00:00Z\"},{\"id\":2,\"name\":\"beta\",\"stargazers_count\":2},{\"id\":3,\"name\":\"private\",\"private\":true}]";
            if (Full) repos = JsonSerializer.Serialize(Enumerable.Range(1, 100).Select(id => new { id, name = "repo" + id }));
            response.Content = new StringContent(Failure is not null ? "{\"message\":\"rate limit exceeded\"}" : Malformed ? "{" : request.RequestUri.AbsolutePath.EndsWith("/repos") ? Empty ? "[]" : repos : "{\"login\":\"alice\",\"name\":\"Alice\"}");
            return Task.FromResult(response);
        }
    }
}
