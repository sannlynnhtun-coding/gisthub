using GistHub.Layout;
using GistHub.Services;
using GistHub.Models;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.JSInterop;

static class ProfileLoadingTests
{
    public static async Task RunAsync()
    {
        foreach (var fail in new[] { false, true })
        {
            var storage = new DelayedProfiles();
            var state = new AppState();
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddSingleton(state);
            services.AddSingleton<IStorageService>(storage);
            services.AddSingleton<NavigationManager>(new FakeNavigationManager());
            services.AddSingleton<IJSRuntime>(new NoJs());
            services.AddSingleton<GistSearchService>();
            services.AddSingleton<IGithubService>(new ThrowingGithubService());
            services.AddSingleton<GistSyncService>();
            using var provider = services.BuildServiceProvider();
            await using var renderer = new HtmlRenderer(provider, provider.GetRequiredService<ILoggerFactory>());
            var childReads = 0;
            RenderFragment body = builder => {
                if (!state.IsAuthenticated) throw new Exception("Page rendered before profile restoration.");
                childReads++;
                builder.AddContent(0, state.CurrentProfile!.GithubUsername);
            };
            var root = await renderer.Dispatcher.InvokeAsync(() => renderer.BeginRenderingComponent<MainLayout>(
                ParameterView.FromDictionary(new Dictionary<string, object?> { ["Body"] = body })));
            if (root.QuiescenceTask.IsCompleted || childReads != 0) throw new Exception("Profile loading did not gate the child page.");
            if (fail) storage.Profiles.SetException(new Exception("Storage unavailable"));
            else storage.Profiles.SetResult([new GistProfile { GithubUsername = "alice", Name = "Alice" }]);
            await root.QuiescenceTask;
            var html = await renderer.Dispatcher.InvokeAsync(root.ToHtmlString);
            if (fail ? childReads != 0 || !html.Contains("Retry") : childReads == 0 || !html.Contains("alice"))
                throw new Exception("Profile gate did not restore the account or show a recoverable storage error.");
        }
        Console.WriteLine("PASS: delayed profile restoration gates child pages; failed storage offers retry without rendering an empty account.");
    }

    private sealed class DelayedProfiles : FakeStorageService
    {
        public TaskCompletionSource<List<GistProfile>> Profiles { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public override Task<List<GistProfile>> GetProfilesAsync() => Profiles.Task;
    }
    private sealed class NoJs : IJSRuntime
    {
        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, object?[]? args) => throw new Exception("Unexpected JS in static render: " + identifier);
        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, CancellationToken cancellationToken, object?[]? args) => InvokeAsync<TValue>(identifier, args);
    }
}
