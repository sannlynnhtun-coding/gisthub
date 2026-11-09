using GistHub.Models;

namespace GistHub.Services;

public sealed class GistSyncService(IGithubService github, IStorageService storage)
{
    public async Task SyncAsync(GistProfile profile)
    {
        if (string.IsNullOrWhiteSpace(profile.GithubUsername) || string.IsNullOrWhiteSpace(profile.AccessToken))
            throw new InvalidOperationException("Connect a GitHub account before syncing.");

        var username = profile.GithubUsername;
        var token = profile.AccessToken;
        var gists = await github.GetUserGistsAsync(token);
        var incompleteCount = 0;
        // Fetch sequentially to avoid flooding GitHub when an account has many gists.
        foreach (var gist in gists)
        {
            var fullGist = await github.GetGistByIdAsync(gist.Id, token);
            if (fullGist is null || fullGist.Files is null || fullGist.Files.Count == 0 ||
                fullGist.Files.Values.Any(file => file is null || file.Truncated || file.Content is null))
            {
                incompleteCount++;
                continue;
            }

            fullGist.IsSynced = true;
            fullGist.Tags = ParseTags(fullGist.Description);
            await storage.SaveSyncedGistAsync(fullGist, username);
        }
        if (incompleteCount > 0)
            throw new InvalidOperationException($"{incompleteCount} gists could not be downloaded completely. Existing cached copies were kept.");
    }

    public static List<string> ParseTags(string description)
        => (description ?? string.Empty).Split(' ')
            .Where(part => part.StartsWith('#') && part.Length > 1)
            .Select(part => part[1..].TrimEnd(',', '.', '!', '?', ';')).ToList();
}
