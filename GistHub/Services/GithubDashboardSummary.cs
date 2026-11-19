using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using GistHub.Models;

namespace GistHub.Services;

public static class GithubDashboardSummary
{
    public static bool ValidUsername(string value) => Regex.IsMatch(value, @"\A[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?\z") && !value.Contains("--");
    public static string? SafeGithubUrl(string? value) => Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme == "https" && uri.Host == "github.com" && uri.IsDefaultPort && string.IsNullOrEmpty(uri.UserInfo) ? uri.AbsoluteUri : null;
    public static string? SafeAvatar(string? value) => Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme == "https" && uri.Host == "avatars.githubusercontent.com" && uri.IsDefaultPort && string.IsNullOrEmpty(uri.UserInfo) ? uri.AbsoluteUri : null;
    public static string? CloneCommand(GithubRepository repo) => repo.Owner is { } owner && ValidUsername(owner.Login) && Regex.IsMatch(repo.Name, @"\A[a-zA-Z0-9_.-]+\z") && repo.Name is not "." and not ".." ? $"git clone https://github.com/{owner.Login}/{repo.Name}.git" : null;
    public static string Language(GithubRepository repo) => string.IsNullOrWhiteSpace(repo.Language) ? "Unknown" : repo.Language;
    public static IEnumerable<(string Name, int Count)> Languages(IReadOnlyList<GithubRepository> rows) => rows.GroupBy(Language).Select(g => (Name: g.Key, Count: g.Count())).OrderByDescending(g => g.Count).ThenBy(g => g.Name, StringComparer.OrdinalIgnoreCase);
    public static IEnumerable<(string Name, long Stars)> LanguageStars(IReadOnlyList<GithubRepository> rows) => rows.GroupBy(Language).Select(g => (Name: g.Key, Stars: g.Sum(r => r.Stars))).OrderByDescending(g => g.Stars).ThenBy(g => g.Name, StringComparer.OrdinalIgnoreCase);
    public static IEnumerable<(string Name, int Count)> Coverage(IReadOnlyList<GithubRepository> rows) => new[] {
        ("License", rows.Count(r => !string.IsNullOrWhiteSpace(r.License?.SpdxId) && r.License.SpdxId != "NOASSERTION")),
        ("Description", rows.Count(r => !string.IsNullOrWhiteSpace(r.Description))),
        ("Topic tags", rows.Count(r => r.Topics?.Any(t => !string.IsNullOrWhiteSpace(t)) == true)) };
    public static IEnumerable<GithubRepository> Explore(IReadOnlyList<GithubRepository> rows, string search, string language, string sort)
    {
        var matches = rows.Where(r => (string.IsNullOrEmpty(language) || Language(r) == language) && (r.Name.Contains(search, StringComparison.OrdinalIgnoreCase) || r.Description?.Contains(search, StringComparison.OrdinalIgnoreCase) == true));
        var ordered = sort switch {
            "stars" => matches.OrderByDescending(r => r.Stars),
            "forks" => matches.OrderByDescending(r => r.Forks),
            "name" => matches.OrderBy(r => r.Name, StringComparer.OrdinalIgnoreCase),
            _ => matches.OrderByDescending(r => r.UpdatedAt) };
        return ordered.ThenBy(r => r.Name, StringComparer.OrdinalIgnoreCase).ThenBy(r => r.Id);
    }
    public static string Csv(GithubDashboardResult result)
    {
        var rows = result.Repositories.Select(r => new Dictionary<string, object?> {
            ["Developer"] = result.Developer?.Login, ["Repository"] = r.Name, ["Language"] = r.Language,
            ["Stars"] = r.Stars, ["Forks"] = r.Forks, ["Open issues (including PRs)"] = r.OpenIssues,
            ["Updated UTC"] = r.UpdatedAt?.UtcDateTime.ToString("O", CultureInfo.InvariantCulture), ["URL"] = SafeGithubUrl(r.HtmlUrl),
            ["Loaded at UTC"] = result.LoadedAt.UtcDateTime.ToString("O", CultureInfo.InvariantCulture), ["Scope"] = result.Scope });
        return JsonTableConverter.Csv(JsonTableConverter.Create(JsonSerializer.SerializeToElement(rows)));
    }
}
