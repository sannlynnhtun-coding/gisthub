const databaseName = "GistHubDB";
const databaseVersion = 4;

function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName, databaseVersion);
        let upgradeWasBlocked = false;

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const transaction = event.target.transaction;

            if (!db.objectStoreNames.contains("profiles")) {
                db.createObjectStore("profiles", { keyPath: "id" });
            }

            if (event.oldVersion < 3 && db.objectStoreNames.contains("gists")) {
                // Version 2 used the gist ID alone as its key. Rebuild the store
                // with an account-qualified key while retaining all existing data.
                const legacyGists = transaction.objectStore("gists");
                const getLegacyGists = legacyGists.getAll();
                getLegacyGists.onsuccess = () => {
                    const records = getLegacyGists.result;
                    db.deleteObjectStore("gists");
                    const scopedGists = db.createObjectStore("gists", { keyPath: "storageKey" });

                    for (const gist of records) {
                        const username = (gist.cacheOwnerUsername || gist.owner?.login || "").trim().toLowerCase();
                        gist.cacheOwnerUsername = username;
                        gist.storageKey = `${username}:${gist.id}`;
                        scopedGists.put(gist);
                    }
                };
            } else if (!db.objectStoreNames.contains("gists")) {
                db.createObjectStore("gists", { keyPath: "storageKey" });
            }

            if (!db.objectStoreNames.contains("groups")) {
                db.createObjectStore("groups", { keyPath: "id" });
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            if (upgradeWasBlocked) {
                db.close();
                return;
            }
            db.onversionchange = () => db.close();
            resolve(db);
        };
        request.onerror = () => reject(request.error);
        request.onblocked = () => {
            upgradeWasBlocked = true;
            reject(new Error("The local database upgrade is blocked by another open GistHub tab."));
        };
    });
}

function runTransaction(storeName, mode, operation) {
    return openDb().then((db) => new Promise((resolve, reject) => {
        let transaction;
        let request;

        try {
            transaction = db.transaction(storeName, mode);
            request = operation(transaction.objectStore(storeName));
        } catch (error) {
            db.close();
            reject(error);
            return;
        }

        transaction.oncomplete = () => {
            const result = request.result;
            db.close();
            resolve(result);
        };
        transaction.onabort = () => {
            const error = transaction.error || request.error || new Error("IndexedDB transaction was aborted.");
            db.close();
            reject(error);
        };
        transaction.onerror = () => {
            // The abort handler reports the underlying request/transaction error.
        };
    })).catch(error => {
        if (mode === "readwrite") globalThis.gistHubNotify?.('error', 'Could not save local changes');
        throw error;
    });
}

export async function initDb() {
    const db = await openDb();
    db.close();
    return true;
}

export async function saveItem(storeName, item) {
    let changed = false;
    await runTransaction(storeName, "readwrite", store => {
        if (!['gists', 'groups'].includes(storeName)) return store.put(item);
        const request = store.get(storeName === 'gists' ? item.storageKey : item.id);
        request.onsuccess = () => {
            changed = backupMetadata(storeName, request.result) !== backupMetadata(storeName, item);
            store.put(item);
        };
        return request;
    });
    if (changed) globalThis.gistHubBackup?.changed();
    if (changed || storeName === 'profiles') globalThis.gistHubNotify?.('success', 'Saved');
    return true;
}

function backupMetadata(storeName, item) {
    if (storeName === 'groups') return item?.name ?? null;
    if (!item || !(item.isBookmarked || item.collectionNames?.length || item.collectionName || item.tags?.length)) return null;
    return JSON.stringify({ bookmarked: !!item.isBookmarked, order: item.isBookmarked ? item.bookmarkOrder || 0 : 0,
        updatedAt: item.isBookmarked && !(item.bookmarkOrder > 0) ? item.updated_at : null,
        collections: [...new Set([...(item.collectionNames || []), item.collectionName].filter(Boolean))], tags: item.tags || [] });
}

export function mergeSyncedGist(incoming, existing) {
    // Never replace complete cached notes with a partial/failed GitHub response.
    const files = Object.values(incoming.files ?? {});
    if (!files.length || files.some(file => !file || file.truncated || typeof file.content !== "string")) {
        return existing;
    }
    if (existing?.isSynced === false ||
        (existing && Date.parse(existing.updated_at) > Date.parse(incoming.updated_at))) {
        return existing;
    }
    return existing ? {
        ...incoming,
        isBookmarked: existing.isBookmarked ?? false,
        bookmarkOrder: existing.bookmarkOrder ?? 0,
        collectionNames: existing.collectionNames ?? [],
        collectionName: existing.collectionName ?? null
    } : incoming;
}

export async function saveSyncedGist(incoming) {
    if (!incoming.id || !incoming.cacheOwnerUsername ||
        incoming.storageKey !== `${incoming.cacheOwnerUsername}:${incoming.id}`) {
        throw new Error("Invalid account-scoped gist key.");
    }
    let changed = false;
    await runTransaction("gists", "readwrite", store => {
        const request = store.get(incoming.storageKey);
        request.onsuccess = () => {
            // Read and merge in one transaction so another tab's bookmark wins over stale UI state.
            const merged = mergeSyncedGist(incoming, request.result);
            changed = backupMetadata('gists', merged) !== backupMetadata('gists', request.result);
            if (merged && merged !== request.result) store.put(merged);
        };
        return request;
    });
    if (changed) globalThis.gistHubBackup?.changed();
}

export function getAllItems(storeName) {
    return runTransaction(storeName, "readonly", (store) => store.getAll());
}

export async function deleteItem(storeName, id) {
    let changed = false;
    await runTransaction(storeName, "readwrite", store => {
        if (!['gists', 'groups'].includes(storeName)) return store.delete(id);
        const request = store.get(id);
        request.onsuccess = () => {
            changed = backupMetadata(storeName, request.result) !== null;
            store.delete(id);
        };
        return request;
    });
    if (changed) globalThis.gistHubBackup?.changed();
    globalThis.gistHubNotify?.('success', 'Deleted');
    return true;
}

// The backup parser validates input before this transaction merges local metadata.
export async function restoreLocalMetadata(items, groups) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['gists', 'groups'], 'readwrite');
        const gistStore = transaction.objectStore('gists'), groupStore = transaction.objectStore('groups');
        let restored = 0, missing = 0, changed = false;
        const gistsRequest = gistStore.getAll();
        gistsRequest.onsuccess = () => {
            const gists = gistsRequest.result, byKey = new Map(gists.map(gist => [gist.storageKey, gist]));
            const ranks = new Map();
            for (const gist of gists.filter(gist => gist.isBookmarked).sort((a, b) =>
                (a.bookmarkOrder > 0 ? a.bookmarkOrder : Infinity) - (b.bookmarkOrder > 0 ? b.bookmarkOrder : Infinity) ||
                Date.parse(b.updated_at) - Date.parse(a.updated_at))) {
                const rank = (ranks.get(gist.cacheOwnerUsername) || 0) + 1;
                ranks.set(gist.cacheOwnerUsername, rank);
                if (gist.bookmarkOrder !== rank) changed = true;
                gist.bookmarkOrder = rank;
                gistStore.put(gist);
            }
            for (const item of [...items].sort((a, b) => (a.bookmarkOrder || Infinity) - (b.bookmarkOrder || Infinity))) {
                const gist = byKey.get(`${item.username}:${item.id}`);
                if (!gist) { missing++; continue; }
                const previous = backupMetadata('gists', gist);
                if (item.isBookmarked && !gist.isBookmarked) {
                    gist.isBookmarked = true;
                    gist.bookmarkOrder = (ranks.get(item.username) || 0) + 1;
                    ranks.set(item.username, gist.bookmarkOrder);
                }
                gist.collectionNames = [...new Set([...(gist.collectionNames || []), gist.collectionName, ...item.collectionNames].filter(Boolean))];
                gist.collectionName = gist.collectionNames[0] || null;
                gist.tags = [...new Set([...(gist.tags || []), ...item.tags])];
                if (previous !== backupMetadata('gists', gist)) changed = true;
                gistStore.put(gist);
                restored++;
            }
        };
        const groupsRequest = groupStore.getAll();
        groupsRequest.onsuccess = () => {
            const names = new Set(groupsRequest.result.map(group => group.name.toLowerCase()));
            for (const group of groups) {
                if (names.has(group.name.toLowerCase())) continue;
                groupStore.put({ id: crypto.randomUUID(), name: group.name, createdAt: new Date().toISOString() });
                changed = true;
                names.add(group.name.toLowerCase());
            }
        };
        transaction.oncomplete = () => { if (changed) globalThis.gistHubBackup?.changed(); resolve({ restored, missing }); };
        transaction.onabort = () => reject(transaction.error || new Error('Local settings restore was aborted.'));
        transaction.onerror = () => {};
    }).finally(() => db.close());
}
