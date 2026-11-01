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

        var path = Path.Combine(AppContext.BaseDirectory, "agent-skills.json");
        var catalog = JsonSerializer.Deserialize<List<AgentSkill>>(File.ReadAllText(path))!;
        Check(catalog.Count(s => s.Article) == 17, "All 17 article entries are included");
        Check(catalog.Select(s => s.Name).Distinct(StringComparer.OrdinalIgnoreCase).Count() == catalog.Count, "Names are unique");
        Check(catalog.All(s => !string.IsNullOrWhiteSpace(s.Name) && !string.IsNullOrWhiteSpace(s.Install) &&
            !string.IsNullOrWhiteSpace(s.Call) && !string.IsNullOrWhiteSpace(s.DescriptionEn) &&
            s.DescriptionMm.Any(c => c >= '\u1000' && c <= '\u109f')), "Every row has setup, invocation and bilingual content");
        Check(catalog.All(s => s.Source is null || Uri.TryCreate(s.Source, UriKind.Absolute, out var uri) && uri.Scheme == "https"), "Source links use HTTPS");
        Console.WriteLine("PASS: skill catalog content and combined search/category/environment/installed filters.");
    }

    private static void Check(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
    }
}
