# Data model: Quick Access

## Command definition

One static, trusted ribbon entry: stable kebab-case ID, visible label, existing icon/rendering, original category and existing action. Action uses an existing route, workspace callback or reusable preference component. Availability is computed from existing conditions such as IsVercelApp. Do not store labels, URLs, component types, executable actions or credentials in preferences.

## Ordered membership

Storage key: gisthub:quick-access. Value: JSON array of unique command IDs, for example ["json-parser", "my-collection"]. Array position is the order; no separate index or version envelope is needed.

- Missing key means empty list.
- IDs must be strings from the finite command catalog. Bound raw storage input to 16 KiB before parsing; bound array length to the catalog size for imports.
- Existing storage: malformed data falls back to empty with recoverable feedback; ignore unknown IDs and deduplicate first-seen IDs. Do not automatically overwrite malformed storage during initialization.
- Backup import: require a valid array, known unique IDs and bounded size before any restore writes. Existing backups without this preference remain valid and leave the current value unchanged under the existing merge behavior.
- Keep known unavailable IDs in stored state; filter only rendering. A visible item moves relative to its visible target without deleting hidden IDs.
- Writes use existing backup preference tracking; on failure restore last saved membership/order and announce the failure.

## State transitions

Add absent ID: append. Add present ID: no-op. Remove: delete only that ID. Move source before target: remove source, insert before target in remaining array. Self/unknown/external drops: no-op. Earlier/later: move relative to the adjacent visible command, with boundary controls disabled. Apply visible reorder while preserving hidden IDs' relative order.

Transient state: active drag ID, drop target, launcher refs and status message. None persist. Clear drag state on completion, cancellation and tab change. Initial selected tab and collapsed state retain existing defaults.
