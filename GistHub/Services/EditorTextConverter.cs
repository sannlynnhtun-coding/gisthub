using System.Text.RegularExpressions;

namespace GistHub.Services;

public static class EditorTextConverter
{
    public static string KebabFilename(string value)
        => Regex.Replace(Regex.Replace(value.Trim().ToLowerInvariant(), @"[\s_]+", "-"), "-{2,}", "-");
}
