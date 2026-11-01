using GistHub.Models;
using System.Text.Json;

static class AgentSkillTests
{
    public static void Run()
    {
        var skill = new AgentSkill("Taste", "Design & UI", "Skill", "Codex", "Improve layouts",
            "ဒီဇိုင်း", "Install", "Use Taste", "https://example.com", true, false);
        Check(skill.Matches(" LAYOUT ", "Design & UI", "Codex", true), "Search ignores case and combines filters");
        Check(skill.Matches("ဒီဇိုင်း", "", "", false), "Myanmar descriptions are searchable");
        Check(!skill.Matches("missing", "", "", false), "Unmatched text is excluded");
        Check(!skill.Matches("", "Development", "", false), "Category filter excludes other categories");
        Check(!skill.Matches("", "", "Claude Code", false), "Environment filter excludes other environments");
        Check(!(skill with { Installed = false }).Matches("", "", "", true), "Installed filter excludes uninstalled entries");
        Check(skill.Matches("", "", "", false), "Reset shows every entry");
        Check(skill.CallMethods is [{ Call: "Use Taste" }], "Legacy rows retain their default invocation");
        Check((skill with { Methods = [] }).CallMethods.Length == 1, "An empty method list falls back to the original invocation");
        var multi = skill with { Methods = [new("Review layout", "Check spacing"), new("Review typography", "Check fonts")] };
        Check(multi.CallMethods.Length == 2 && multi.Matches("TYPOGRAPHY", "Design & UI", "Codex", true), "Method names are searchable with other filters");
        Check(multi.Matches("Check fonts", "", "", false), "Method commands are searchable");
        Check(!multi.Matches("Check fonts", "Development", "", false), "Method matches cannot bypass category filters");

        var path = Path.Combine(AppContext.BaseDirectory, "agent-skills.json");
        var catalog = JsonSerializer.Deserialize<List<AgentSkill>>(File.ReadAllText(path))!;
        Check(catalog.Count(s => s.Article) == 17, "All 17 article entries are included");
        using var document = JsonDocument.Parse(File.ReadAllText(path));
        var installedNames = document.RootElement.EnumerateArray()
            .SelectMany(row => row.GetProperty("InstalledSkills").EnumerateArray().Select(name => name.GetString()!)).ToList();
        Check(installedNames.Count > 1000, "Full installed inventory replaces the selected subset");
        Check(installedNames.Distinct(StringComparer.OrdinalIgnoreCase).Count() == installedNames.Count, "Each installed skill identity occurs once");
        Check(new[] { "skill-installer", "ponytail:ponytail-review", "ecc:tdd-workflow" }.All(installedNames.Contains), "System and plugin skills are included");
        Check(catalog.Select(s => s.Name).Distinct(StringComparer.OrdinalIgnoreCase).Count() == catalog.Count, "Names are unique");
        Check(catalog.All(s => !string.IsNullOrWhiteSpace(s.Name) && !string.IsNullOrWhiteSpace(s.Install) &&
            !string.IsNullOrWhiteSpace(s.Call) && !string.IsNullOrWhiteSpace(s.DescriptionEn) &&
            s.DescriptionMm.Any(c => c >= '\u1000' && c <= '\u109f')), "Every row has setup, invocation and bilingual content");
        Check(catalog.All(s => s.Source is null || Uri.TryCreate(s.Source, UriKind.Absolute, out var uri) && uri.Scheme == "https"), "Source links use HTTPS");
        Check(catalog.All(s => s.CallMethods.All(m => !string.IsNullOrWhiteSpace(m.Name) && !string.IsNullOrWhiteSpace(m.Call))), "Every method has a name and invocation");
        Check(catalog.Single(s => s.Name == "Ponytail").CallMethods.Any(m => m.Call == "/ponytail ultra"), "Documented alternative methods are included");
        Check(catalog.Where(s => s.Installed).All(s => s.Methods is { Length: > 0 }), "Every installed skill has an explicit method inventory");
        Check(catalog.Single(s => s.Name == "agentdb-query").CallMethods.Any(m => m.Call.Contains("mcp__claude-flow__agentdb_pattern-search")), "MCP methods are imported beyond the original selected skills");
        Check(catalog.Single(s => s.Name == "ecc:source-command-epic-decompose").CallMethods.Any(m => m.Call == "/prp-plan"), "Migrated commands retain documented aliases");
        Console.WriteLine("PASS: skill catalog content and combined search/category/environment/installed filters.");
    }

    private static void Check(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
    }
}
