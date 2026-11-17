import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const storage = new Map();
const context = vm.createContext({ sessionStorage: {
    getItem: key => storage.get(key), removeItem: key => storage.delete(key)
} });
const source = await readFile(new URL('../GistHub/wwwroot/js/editorDrafts.js', import.meta.url), 'utf8');
vm.runInContext(source.replaceAll('export ', '') + '\nglobalThis.api = { loadEditorDraft, removeEditorDraft };', context);
const draft = { description: 'private draft', filename: 'notes.md', content: 'unsaved', isPublic: false, isBookmarked: true };
storage.set('profile-a:gist-a', JSON.stringify(draft));
assert.equal(JSON.stringify(context.api.loadEditorDraft('profile-a:gist-a')), JSON.stringify(draft));
assert.equal(context.api.loadEditorDraft('profile-b:gist-a'), null);
storage.set('invalid', '{}');
assert.throws(() => context.api.loadEditorDraft('invalid'), /could not be read/);
context.api.removeEditorDraft('profile-a:gist-a');
assert.equal(context.api.loadEditorDraft('profile-a:gist-a'), null);
console.log('PASS: existing draft recovery, profile isolation, validation, and cleanup.');
