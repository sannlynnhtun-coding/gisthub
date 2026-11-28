namespace GistHub.Models;

/// <summary>Public browser configuration only. No credentials are persisted here.</summary>
public sealed class GoogleSyncOptions
{
    public const string SectionName = "GoogleSheetsSync";
    public string ClientId { get; init; } = "";
    public string ProjectNumber { get; init; } = "";
    public string PickerApiKey { get; init; } = "";
    public bool IsConfigured => ClientId.EndsWith(".apps.googleusercontent.com", StringComparison.Ordinal)
        && ProjectNumber.Length > 0 && ProjectNumber.All(char.IsAsciiDigit)
        && !string.IsNullOrWhiteSpace(PickerApiKey);
}
