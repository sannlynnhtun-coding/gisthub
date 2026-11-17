using GistHub.Components.UI;
using GistHub.Pages;
using GistHub.Services;

internal static class VisualStudioShortcutsTests
{
    public static void Run()
    {
        var categories = VisualStudioShortcuts.Categories;
        var expected = new (string Title, int Count)[]
        {
            ("Code editing", 19), ("Search and replace", 5), ("Refactoring", 9),
            ("Navigation", 15), ("Debugging", 12), ("Multi caret and selection", 8),
            ("Projects and solutions", 8), ("File management", 10),
            ("Windows and display", 9), ("Git", 6), ("Unit testing", 7)
        };
        Check(categories.Select(c => (c.Title, c.Rows.Length)).SequenceEqual(expected), "All source categories and rows are present in order.");
        Check(categories.SelectMany(c => c.Rows).All(r => !string.IsNullOrWhiteSpace(r.Action) && !string.IsNullOrWhiteSpace(r.Keys)), "Every shortcut has an action and keys.");
        Check(categories.Single(c => c.Title == "File management").Rows.Contains(("Reveal active file in Explorer", "Ctrl + [ + S")), "Bracket shortcut is preserved.");
        Check(categories.Single(c => c.Title == "Windows and display").Rows.Contains(("Activate GitHub Copilot Chat", "Ctrl + \\ + C")), "Backslash shortcut is preserved.");
        Check(categories.Single(c => c.Title == "Multi caret and selection").Rows.Count(r => r.Action == "Column (box) selection") == 2, "Keyboard and mouse selection alternatives remain separate.");
        Check(ToolWorkspace.Pages["Visual Studio Shortcuts"] == (typeof(VisualStudioShortcuts), "tools/visual-studio-shortcuts"), "Workspace route resolves to the page.");
        Check(ToolHelpContent.Entries.ContainsKey("Visual Studio Shortcuts"), "Shared help is available.");
        Console.WriteLine("PASS: Visual Studio shortcut categories, content and workspace registration.");
    }

    private static void Check(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
    }
}
