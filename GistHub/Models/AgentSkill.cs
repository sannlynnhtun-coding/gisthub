namespace GistHub.Models;

public sealed record AgentSkill(string Name, string Category, string Type, string Agent,
    string DescriptionEn, string DescriptionMm, string Install, string Call,
    string? Source, bool Installed, bool Article)
{
    public bool Matches(string search, string category, string agent, bool installedOnly) =>
        (category.Length == 0 || Category == category) &&
        (agent.Length == 0 || Agent == agent) &&
        (!installedOnly || Installed) &&
        (string.IsNullOrWhiteSpace(search) ||
         new[] { Name, Category, Type, Agent, DescriptionEn, DescriptionMm, Install, Call }
             .Any(value => value.Contains(search.Trim(), StringComparison.OrdinalIgnoreCase)));
}
