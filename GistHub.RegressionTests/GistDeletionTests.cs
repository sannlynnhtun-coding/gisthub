using System.Net;
using System.Reflection;
using GistHub.Models;
using GistHub.Pages;
using GistHub.Services;
using Microsoft.JSInterop;

static class GistDeletionTests
{
    public static async Task RunAsync()
    {
        var state = new AppState();
        state.SetProfile(new GistProfile { GithubUsername = "alice", AccessToken = "test" });
        foreach (var switchAccount in new[] { false, true })
        {
            var page = new MyGists();
            var gist = new LocalGist { Id = "a", Description = "Keep cached content" };
            var handler = new DeleteHandler(switchAccount ? () => state.SetProfile(new GistProfile { GithubUsername = "bob" }) : null);
            Set(page, "AppState", state); Set(page, "Storage", new FakeStorageService()); Set(page, "JS", new ConfirmJs());
            Set(page, "Github", new GithubService(new HttpClient(handler), "https://api.github.com"));
            Set(page, "LocalGists", new List<LocalGist> { gist });
            await (Task)typeof(MyGists).GetMethod("HandleDelete", BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(page, [gist])!;
            var cached = (List<LocalGist>)typeof(MyGists).GetField("LocalGists", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(page)!;
            if (cached.Count != 1) throw new Exception("Failed deletion or an account switch must preserve cached cards.");
        }
        Console.WriteLine("PASS: failed remote deletion and account switching preserve cached collection cards.");
    }
    static void Set(object target, string name, object value)
    {
        const BindingFlags flags = BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public;
        if (target.GetType().GetProperty(name, flags) is { } property) property.SetValue(target, value);
        else target.GetType().GetField(name, flags)!.SetValue(target, value);
    }
    sealed class ConfirmJs : IJSRuntime
    {
        public ValueTask<T> InvokeAsync<T>(string identifier, object?[]? args) => ValueTask.FromResult((T)(object)true);
        public ValueTask<T> InvokeAsync<T>(string identifier, CancellationToken token, object?[]? args) => InvokeAsync<T>(identifier, args);
    }
    sealed class DeleteHandler(Action? switchAccount) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        {
            switchAccount?.Invoke();
            return Task.FromResult(new HttpResponseMessage(switchAccount is null ? HttpStatusCode.Forbidden : HttpStatusCode.NoContent) {
                Content = new StringContent("{\"message\":\"Forbidden\"}") });
        }
    }
}
