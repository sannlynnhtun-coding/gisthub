using System.Text.Json.Serialization;
using GistHub.Services;

namespace GistHub.Models;

public sealed record GithubDashboardResult(GithubDeveloper? Developer, IReadOnlyList<GithubRepository> Repositories, DateTimeOffset LoadedAt, bool PossiblyTruncated, GithubApiError? Error)
{
    public bool Authenticated { get; init; }
    public string Scope => Authenticated ? $"{Repositories.Count} repositories owned by your account and visible to this token" : $"{Repositories.Count} latest updated public repositories (up to 100)" + (PossiblyTruncated ? "; possibly incomplete" : "");
}

public sealed class GithubDeveloper
{
    public string Login { get; set; } = "";
    public string? Name { get; set; }
    public string? Bio { get; set; }
    public long? Followers { get; set; }
    public long? Following { get; set; }
    public string? Location { get; set; }
    [JsonPropertyName("avatar_url")] public string? AvatarUrl { get; set; }
    [JsonPropertyName("public_repos")] public int? PublicRepos { get; set; }
}

public sealed class GithubRepository
{
    public long Id { get; set; }
    public string Name { get; set; } = "";
    [JsonPropertyName("full_name")] public string? FullName { get; set; }
    public GithubDeveloper? Owner { get; set; }
    public string? Description { get; set; }
    public string? Language { get; set; }
    public GithubLicense? License { get; set; }
    public string[]? Topics { get; set; }
    [JsonPropertyName("size")] public long? SizeKb { get; set; }
    [JsonPropertyName("stargazers_count")] public long Stars { get; set; }
    [JsonPropertyName("forks_count")] public long Forks { get; set; }
    [JsonPropertyName("open_issues_count")] public long OpenIssues { get; set; }
    [JsonPropertyName("updated_at")] public DateTimeOffset? UpdatedAt { get; set; }
    [JsonPropertyName("html_url")] public string? HtmlUrl { get; set; }
    public bool Private { get; set; }
    public bool Fork { get; set; }
    public bool Archived { get; set; }
}

public sealed class GithubLicense
{
    [JsonPropertyName("spdx_id")] public string? SpdxId { get; set; }
}

public sealed record GithubDashboardAnalytics(GithubAnalyticsSearch<GithubAnalyticsCommit>? Commits, GithubAnalyticsSearch<GithubAnalyticsPull>? Pulls);

public sealed record GithubAnalyticsSearch<T>(
    [property: JsonPropertyName("total_count")] int TotalCount,
    [property: JsonPropertyName("incomplete_results")] bool Incomplete,
    T[] Items)
{
    public bool IsPartial => Incomplete || TotalCount > Items.Length;
}

public sealed record GithubAnalyticsCommit(GithubDeveloper? Author, GithubCommitMetadata? Commit);
public sealed record GithubCommitMetadata(GithubCommitAuthor? Author);
public sealed record GithubCommitAuthor(DateTimeOffset? Date);

public sealed record GithubAnalyticsPull(
    long Id, int Number, string Title, string State, string? Body, GithubDeveloper? User,
    [property: JsonPropertyName("created_at")] DateTimeOffset CreatedAt,
    [property: JsonPropertyName("html_url")] string? HtmlUrl,
    [property: JsonPropertyName("pull_request")] GithubPullMetadata? PullRequest)
{
    public string Status => PullRequest?.MergedAt is not null ? "Merged" : State == "open" ? "Open" : "Closed";
}

public sealed record GithubPullMetadata([property: JsonPropertyName("merged_at")] DateTimeOffset? MergedAt);
