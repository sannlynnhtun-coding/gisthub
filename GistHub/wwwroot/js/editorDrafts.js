export function loadEditorDraft(key) {
    const value = sessionStorage.getItem(key);
    if (!value) return null;
    const draft = JSON.parse(value);
    if (typeof draft.description !== 'string' || typeof draft.filename !== 'string' || typeof draft.content !== 'string'
        || typeof draft.isPublic !== 'boolean' || typeof draft.isBookmarked !== 'boolean') throw new Error('The saved editor draft could not be read.');
    return draft;
}
export function removeEditorDraft(key) { sessionStorage.removeItem(key); }
