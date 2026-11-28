using System.Text.Json;
using System.Text.Json.Serialization;

namespace GistHub.Models;

// These DTOs deliberately cannot hold a profile, token, gist body or device layout.
public sealed record GoogleSyncScope(string LibraryId, string WorkspaceId);
public sealed record GoogleSyncConnectionIdentity(string GooglePermissionId, string SpreadsheetId,
    string WorkspaceId, string GithubUserId);
public sealed record GoogleSyncConnection(string ConnectionId, GoogleSyncConnectionIdentity Identity,
    string Status, long Generation, DateTimeOffset? LastSuccessfulSyncAt);
public sealed record GoogleSyncManifest(string Format, int SchemaVersion, string WorkspaceId,
    string GithubUserId, string CreatorGooglePermissionId);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record GoogleSyncOperation
{
    [JsonPropertyName("opId")] public required string OpId { get; init; }
    [JsonPropertyName("libraryId")] public required string LibraryId { get; init; }
    [JsonPropertyName("workspaceId")] public required string WorkspaceId { get; init; }
    [JsonPropertyName("deviceId")] public required string DeviceId { get; init; }
    [JsonPropertyName("entityType")] public required string EntityType { get; init; }
    [JsonPropertyName("entityId")] public required string EntityId { get; init; }
    [JsonPropertyName("field")] public required string Field { get; init; }
    [JsonPropertyName("kind")] public required string Kind { get; init; }
    [JsonPropertyName("value")] public required JsonElement Value { get; init; }
    [JsonPropertyName("parentIds")] public required IReadOnlyList<string> ParentIds { get; init; }
    [JsonPropertyName("logicalCounter")] public required string LogicalCounter { get; init; }
    [JsonPropertyName("displayTime"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DisplayTime { get; init; }
}

public sealed record GoogleSyncEnvelope(string OpId, string PayloadHash, string PayloadJson);
public enum GoogleSyncOutboxState { Pending, InFlight, Uncertain, Acknowledged }
public sealed record GoogleSyncOutboxEntry(string ConnectionId, GoogleSyncConnectionIdentity Origin,
    GoogleSyncEnvelope Operation, GoogleSyncOutboxState State, int Attempts);
public sealed record GoogleSyncBookmark(string LibraryId, string GistId, bool Present, string? Position);
public sealed record GoogleSyncCollection(string LibraryId, string CollectionId, string DisplayName, bool Deleted);
public sealed record GoogleSyncAssignment(string LibraryId, string GistId, string CollectionId, bool Present);
public sealed record GoogleSyncLocalTag(string LibraryId, string GistId, string NormalizedTag,
    string DisplayLabel, bool Present);
public sealed record GoogleSyncAppearance(string LibraryId, string? Theme, string? Font);
public sealed record GoogleSyncImportReceipt(string ReceiptId, string DestinationConnectionId,
    string PreviewDigest, IReadOnlyDictionary<string, string> SourceCandidateMap,
    IReadOnlyList<string> AcknowledgedOperationIds);
public sealed record GoogleSyncFieldKey(string WorkspaceId, string LibraryId, string EntityType,
    string EntityId, string Field);
public sealed record GoogleSyncCandidate(string OpId, string Kind, JsonElement Value);
public sealed record GoogleSyncFieldState(GoogleSyncFieldKey Key,
    IReadOnlyList<GoogleSyncCandidate> Candidates, bool IsConflict);
public sealed record GoogleSyncReplayResult(IReadOnlyList<GoogleSyncOperation> Operations,
    IReadOnlyList<GoogleSyncFieldState> Fields);
