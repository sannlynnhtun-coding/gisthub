using System.Text.Json.Serialization;
using GistHub.Services;

namespace GistHub.Models;

public sealed record GithubDashboardResult(GithubDeveloper? Developer, IReadOnlyList<GithubRepository> Repositories, DateTimeOffset LoadedAt, bool PossiblyTruncated, GithubApiError? Error)
{
    public string Scope => $"{Repositories.Count} latest updated public repositories (up to 100)" + (PossiblyTruncated ? "; possibly incomplete" : "");
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
