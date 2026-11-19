using GistHub.Models;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace GistHub.Services;

public interface IGithubService
{
    GithubApiError? LastError { get; }
    Task<GithubDashboardResult> GetPublicDashboardAsync(string username, string? token = null);
    Task<GithubDashboardAnalytics> GetDashboardAnalyticsAsync(string login, string token, DateOnly since);
    Task<List<LocalGist>> GetPublicGistsAsync(string? token = null);
    Task<List<LocalGist>> GetUserGistsAsync(string token);
    Task<bool> DeleteGistAsync(string gistId, string token);
    Task<LocalGist?> CreateGistAsync(string description, bool isPublic, Dictionary<string, GistFile> files, string token);
    Task<LocalGist?> UpdateGistAsync(string id, string description, Dictionary<string, GistFile> files, string token);
    Task<LocalGist?> GetGistByIdAsync(string id, string? token = null);
    Task<GithubUser?> GetUserInfoAsync(string token);
    Task<List<LocalGist>> GetUserPublicGistsAsync(string username, string? token = null);
}

public sealed record GithubApiError(HttpStatusCode? StatusCode, string Message, DateTimeOffset? RateLimitReset)
{
    public bool IsRateLimited =>
        StatusCode is HttpStatusCode.Forbidden or HttpStatusCode.TooManyRequests &&
        Message.Contains("rate limit", StringComparison.OrdinalIgnoreCase);
}

public class GithubUser
{
    [JsonPropertyName("login")]
    public string Login { get; set; } = string.Empty;
    [JsonPropertyName("name")]
    public string? Name { get; set; }
    [JsonPropertyName("avatar_url")]
    public string AvatarUrl { get; set; } = string.Empty;
    [JsonPropertyName("bio")]
    public string? Bio { get; set; }
}

public class GithubService : IGithubService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _http;
    private readonly string _gitHubApiBaseUrl;

    public GithubApiError? LastError { get; private set; }

    public GithubService(HttpClient http, string gitHubApiBaseUrl)
    {
        _http = http;
        _gitHubApiBaseUrl = gitHubApiBaseUrl.TrimEnd('/');
    }

    private HttpRequestMessage CreateGitHubRequest(HttpMethod method, string path, string? token = null)
    {
        var request = new HttpRequestMessage(method, $"{_gitHubApiBaseUrl}{path}");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

        if (!string.IsNullOrWhiteSpace(token))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        return request;
    }

    private async Task<T?> SendGitHubJsonAsync<T>(HttpMethod method, string path, string? token = null, object? payload = null)
    {
        LastError = null;

        using var request = CreateGitHubRequest(method, path, token);
        if (payload != null)
        {
            request.Content = JsonContent.Create(payload, options: JsonOptions);
        }

        try
        {
            using var response = await _http.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                LastError = await CreateGithubApiErrorAsync(response);
                return default;
            }

            return await response.Content.ReadFromJsonAsync<T>(JsonOptions);
        }
        catch (Exception ex)
        {
            LastError = new GithubApiError(null, ex.Message, null);
            return default;
        }
    }

    private async Task<bool> SendGitHubForSuccessAsync(HttpMethod method, string path, string token)
    {
        LastError = null;

        using var request = CreateGitHubRequest(method, path, token);
        try
        {
            using var response = await _http.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                return true;
            }

            LastError = await CreateGithubApiErrorAsync(response);
            return false;
        }
        catch (Exception ex)
        {
            LastError = new GithubApiError(null, ex.Message, null);
            return false;
        }
    }

    private static async Task<GithubApiError> CreateGithubApiErrorAsync(HttpResponseMessage response)
    {
        var message = response.ReasonPhrase ?? "GitHub API request failed.";

        try
        {
            var error = await response.Content.ReadFromJsonAsync<GithubErrorResponse>(JsonOptions);
            if (!string.IsNullOrWhiteSpace(error?.Message))
            {
                message = error.Message;
            }
        }
        catch
        {
            var content = await response.Content.ReadAsStringAsync();
            if (!string.IsNullOrWhiteSpace(content))
            {
                message = content;
            }
        }

        return new GithubApiError(response.StatusCode, message, GetRateLimitReset(response));
    }

    private static DateTimeOffset? GetRateLimitReset(HttpResponseMessage response)
    {
        if (response.Headers.TryGetValues("X-RateLimit-Reset", out var values) &&
            long.TryParse(values.FirstOrDefault(), out var epochSeconds))
        {
            return DateTimeOffset.FromUnixTimeSeconds(epochSeconds);
        }

        return null;
    }

    public async Task<GithubDashboardResult> GetPublicDashboardAsync(string username, string? token = null)
    {
        username = username.Trim().TrimStart('@');
        GithubDashboardResult Failure(GithubApiError error) => new(null, [], DateTimeOffset.UtcNow, false, error);
        if (!GithubDashboardSummary.ValidUsername(username))
            return Failure(new(null, "Enter a valid GitHub username (1–39 letters, digits or single hyphens).", null));
        if (token is not null && string.IsNullOrWhiteSpace(token))
            return Failure(new(HttpStatusCode.Unauthorized, "Connect a GitHub token to load this account.", null));
        try
        {
            // Dashboard requests keep their errors local; gist callers still own LastError.
            using var userRequest = CreateGitHubRequest(HttpMethod.Get, token is null ? $"/users/{Uri.EscapeDataString(username)}" : "/user", token);
            using var userResponse = await _http.SendAsync(userRequest);
            if (!userResponse.IsSuccessStatusCode) return Failure(await CreateGithubApiErrorAsync(userResponse));
            var developer = await userResponse.Content.ReadFromJsonAsync<GithubDeveloper>(JsonOptions);
            if (developer is null || !GithubDashboardSummary.ValidUsername(developer.Login))
                return Failure(new(null, "GitHub returned an invalid developer profile.", null));
            if (!developer.Login.Equals(username, StringComparison.OrdinalIgnoreCase))
                return Failure(new(null, "This GitHub token does not match the selected account. Reconnect the profile.", null));
            var repositories = new List<GithubRepository>();
            var repositoryPath = token is null
                ? $"/users/{Uri.EscapeDataString(username)}/repos?per_page=100&sort=updated&direction=desc"
                : "/user/repos?visibility=all&affiliation=owner&per_page=100&sort=updated&direction=desc";
            for (var page = 1; ; page++)
            {
                var path = token is null ? repositoryPath : $"{repositoryPath}&page={page}";
                using var repoRequest = CreateGitHubRequest(HttpMethod.Get, path, token);
                using var repoResponse = await _http.SendAsync(repoRequest);
                if (!repoResponse.IsSuccessStatusCode) return Failure(await CreateGithubApiErrorAsync(repoResponse));
                var batch = await repoResponse.Content.ReadFromJsonAsync<List<GithubRepository>>(JsonOptions);
                if (batch is null) return Failure(new(null, "GitHub returned an invalid repository list.", null));
                if (page > 1 && batch.Count == 100 && batch.All(repo => repositories.Any(previous => previous.Id == repo.Id)))
                    return Failure(new(null, "GitHub returned a repeated repository page. Try again.", null));
                repositories.AddRange(batch);
                if (token is null || batch.Count < 100) break;
            }
            var rows = (token is null
                ? repositories.Where(repo => !repo.Private)
                : repositories.Where(repo => string.Equals(repo.Owner?.Login, developer.Login, StringComparison.OrdinalIgnoreCase)))
                .DistinctBy(repo => repo.Id).ToArray();
            foreach (var repo in rows)
            {
                repo.Stars = Math.Max(0, repo.Stars);
                repo.Forks = Math.Max(0, repo.Forks);
                repo.OpenIssues = Math.Max(0, repo.OpenIssues);
            }
            return new(developer, rows, DateTimeOffset.UtcNow, token is null && repositories.Count >= 100, null) { Authenticated = token is not null };
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or TaskCanceledException or NotSupportedException)
        {
            return Failure(new(null, "Could not load GitHub data. " + ex.Message, null));
        }
    }

    public async Task<GithubDashboardAnalytics> GetDashboardAnalyticsAsync(string login, string token, DateOnly since)
    {
        if (!GithubDashboardSummary.ValidUsername(login) || string.IsNullOrWhiteSpace(token))
            return new(null, null);

        var commits = SearchDashboardAsync<GithubAnalyticsCommit>("commits", $"user:{login} author-date:>={since:yyyy-MM-dd}", "author-date", token);
        var pulls = SearchDashboardAsync<GithubAnalyticsPull>("issues", $"user:{login} is:pr created:>={since:yyyy-MM-dd}", "created", token);
        await Task.WhenAll(commits, pulls);
        return new(await commits, await pulls);
    }

    private async Task<GithubAnalyticsSearch<T>?> SearchDashboardAsync<T>(string resource, string query, string sort, string token)
    {
        try
        {
            using var request = CreateGitHubRequest(HttpMethod.Get, $"/search/{resource}?q={Uri.EscapeDataString(query)}&sort={sort}&order=desc&per_page=100", token);
            using var response = await _http.SendAsync(request);
            return response.IsSuccessStatusCode
                ? await response.Content.ReadFromJsonAsync<GithubAnalyticsSearch<T>>(JsonOptions)
                : null;
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or TaskCanceledException or NotSupportedException)
        {
            return null;
        }
    }

    public async Task<List<LocalGist>> GetPublicGistsAsync(string? token = null)
        => await SendGitHubJsonAsync<List<LocalGist>>(HttpMethod.Get, "/gists/public", token) ?? new List<LocalGist>();

    public async Task<List<LocalGist>> GetUserGistsAsync(string token)
    {
        var gists = new List<LocalGist>();
        for (var page = 1; ; page++)
        {
            var batch = await SendGitHubJsonAsync<List<LocalGist>>(
                HttpMethod.Get, $"/gists?per_page=100&page={page}", token);
            if (batch is null)
            {
                throw new InvalidOperationException(LastError?.Message ?? "Could not load your gists from GitHub.");
            }

            gists.AddRange(batch);
            if (batch.Count < 100)
            {
                return gists;
            }
        }
    }

    public async Task<bool> DeleteGistAsync(string gistId, string token)
        => await SendGitHubForSuccessAsync(HttpMethod.Delete, $"/gists/{gistId}", token);

    public async Task<LocalGist?> CreateGistAsync(string description, bool isPublic, Dictionary<string, GistFile> files, string token)
    {
        var payload = new
        {
            description = description,
            @public = isPublic,
            files = files.ToDictionary(f => f.Key, f => new { content = f.Value.Content })
        };

        return await SendGitHubJsonAsync<LocalGist>(HttpMethod.Post, "/gists", token, payload);
    }

    public async Task<LocalGist?> GetGistByIdAsync(string id, string? token = null)
        => await SendGitHubJsonAsync<LocalGist>(HttpMethod.Get, $"/gists/{id}", token);

    public async Task<LocalGist?> UpdateGistAsync(string id, string description, Dictionary<string, GistFile> files, string token)
    {
        var body = new
        {
            description = description,
            files = files.ToDictionary(
                file => file.Key,
                file => CreateGistUpdateFilePayload(file.Key, file.Value))
        };

        return await SendGitHubJsonAsync<LocalGist>(HttpMethod.Patch, $"/gists/{id}", token, body);
    }

    private static Dictionary<string, object?> CreateGistUpdateFilePayload(string existingFilename, GistFile file)
    {
        var payload = new Dictionary<string, object?>
        {
            ["content"] = file.Content ?? string.Empty
        };

        if (!string.IsNullOrWhiteSpace(file.Filename) &&
            !string.Equals(file.Filename, existingFilename, StringComparison.Ordinal))
        {
            payload["filename"] = file.Filename;
        }

        return payload;
    }

    public async Task<GithubUser?> GetUserInfoAsync(string token)
        => await SendGitHubJsonAsync<GithubUser>(HttpMethod.Get, "/user", token);

    public async Task<List<LocalGist>> GetUserPublicGistsAsync(string username, string? token = null)
        => await SendGitHubJsonAsync<List<LocalGist>>(HttpMethod.Get, $"/users/{Uri.EscapeDataString(username.Trim())}/gists", token) ?? new List<LocalGist>();

    private sealed class GithubErrorResponse
    {
        [JsonPropertyName("message")]
        public string? Message { get; set; }
    }
}
