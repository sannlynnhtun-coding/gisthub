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
