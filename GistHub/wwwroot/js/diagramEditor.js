import { registerJsDraftGuard, unregisterDraftGuard } from './appUpdates.js';

const origin = 'https://embed.diagrams.net';
const maxBytes = 5 * 1024 * 1024;
const blank = '<mxfile><diagram name="Page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>';

export function editorTheme() {
    const styles = getComputedStyle(document.documentElement);
    const color = (name, fallback) => {
        const value = styles.getPropertyValue('--' + name).trim();
        return /^[\d.\s%]+$/.test(value) ? `hsl(${value})` : fallback;
    };
    const palette = {
        background: color('background', '#fff8eb'), card: color('card', '#fffdf7'),
        text: color('foreground', '#0d0d0d'), border: color('border', '#0d0d0d'),
        primary: color('primary', '#ffd524'), onPrimary: color('primary-foreground', '#0d0d0d'),
        secondary: color('secondary', '#78dce8'), onSecondary: color('secondary-foreground', '#0d0d0d'),
        ring: color('ring', '#7d5cff')
    };
    return { dark: document.documentElement.classList.contains('dark'), css: `
        .geMenubarContainer, .geMenubar, .geToolbarContainer, .geToolbar,
        .geSidebarContainer, .geSidebar, .geFormatContainer, .geDialog, .mxPopupMenu {
            background-color: ${palette.card} !important; color: ${palette.text} !important;
            border-color: ${palette.border} !important;
            font-family: Aptos, 'Segoe UI', sans-serif;
        }
        .geDiagramContainer { background-color: ${palette.background} !important; }
        .geMenubar, .geToolbarContainer { border-bottom: 2px solid ${palette.border} !important; }
        .geSidebarContainer { border-right: 2px solid ${palette.border} !important; }
        .geFormatContainer { border-left: 2px solid ${palette.border} !important; }
        .geSidebarTitle, .geTabItem { background-color: ${palette.background} !important; color: ${palette.text} !important; font-weight: 700; }
        .geBtn { border: 2px solid ${palette.border} !important; border-radius: 6px !important; font-weight: 700; }
        .gePrimaryBtn { background: ${palette.primary} !important; color: ${palette.onPrimary} !important; box-shadow: 2px 2px 0 ${palette.border}; }
        .geMenubar a:hover, .geBtn:hover, .geTabItem:hover { background-color: ${palette.secondary} !important; color: ${palette.onSecondary} !important; }
        .geBtn:focus-visible, .geMenubar a:focus-visible { outline: 3px solid ${palette.ring} !important; outline-offset: 2px; }
    ` };
}

export function validateXml(xml) {
    if (typeof xml !== 'string' || new TextEncoder().encode(xml).length > maxBytes)
        throw new Error('Diagram source must be no larger than 5 MiB.');
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('XML document types and entities are not supported.');
    const parsed = new DOMParser().parseFromString(xml, 'application/xml');
    if (parsed.querySelector('parsererror') || !['mxfile', 'mxGraphModel'].includes(parsed.documentElement.nodeName))
        throw new Error('Choose a valid .drawio or diagram XML file.');
    return xml;
}

export function exportOptions(input) {
    if (!input || !['png', 'svg'].includes(input.format)) throw new Error('Choose PNG or SVG.');
    const scale = Number(input.scale), border = Number(input.border);
    if (!Number.isFinite(scale) || scale < 1 || scale > 4 || !Number.isInteger(border) || border < 0 || border > 100)
        throw new Error('Export scale must be 1–4 and border must be 0–100 pixels.');
    const options = { border, currentPage: input.currentPage === true };
    if (input.format === 'png') { options.scale = scale; options.transparent = input.transparent === true; }
    return options;
}

function database() {
    return new Promise((resolve, reject) => {
        // Separate versioned database avoids disrupting the existing gist cache.
        const request = indexedDB.open('GistHubDiagrams', 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore('diagrams', { keyPath: 'id' });
            request.result.createObjectStore('presets', { keyPath: 'id' });
        };
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Close other GistHub tabs to upgrade diagram storage.'));
        request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => db.close();
            resolve(db);
        };
    });
}

async function transaction(store, mode, work) {
    const db = await database();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, mode);
        let value;
        let failure;
        tx.oncomplete = () => { db.close(); resolve(value); };
        tx.onabort = () => { db.close(); reject(failure || tx.error || new Error('Local storage failed.')); };
        tx.onerror = () => {};
        try { work(tx.objectStore(store), result => { value = result; }, error => { failure = error; tx.abort(); }); }
        catch (error) { failure = error; tx.abort(); }
    });
}

export async function create(host, callback, owner) {
    return new Editor(host, callback, owner);
}

class Editor {
    constructor(host, callback, owner) {
        this.host = host;
        this.callback = callback;
        this.owner = owner;
        this.pending = new Map();
        this.queue = Promise.resolve();
        this.disposed = false;
        this.dirty = false;
        this.ready = false;
        registerJsDraftGuard('diagram', async () => {
            if (this.doc && !this.ready) throw new Error('Wait for the diagram editor to finish loading before updating.');
            await this.checkpoint();
        });
        this.listener = event => this.receive(event);
        this.beforeUnload = event => { if (this.dirty) { event.preventDefault(); event.returnValue = ''; } };
        window.addEventListener('message', this.listener);
        window.addEventListener('beforeunload', this.beforeUnload);
        this.themeObserver = new MutationObserver(() => {
            clearTimeout(this.themeTimer);
            this.themeTimer = setTimeout(() => this.syncTheme(), 100);
        });
        this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
    notify(status, ready = this.ready) {
        if (!this.disposed) this.callback.invokeMethodAsync('DiagramStatus', status, ready, this.dirty).catch(() => {});
    }
    async list() {
        const all = await transaction('diagrams', 'readonly', (store, done) => {
            store.getAll().onsuccess = event => done(event.target.result);
        });
        return all.filter(d => d.owner === this.owner).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    async presets() {
        const all = await transaction('presets', 'readonly', (store, done) => {
            store.getAll().onsuccess = event => done(event.target.result);
        });
        return all.filter(p => p.owner === this.owner).sort((a, b) => a.name.localeCompare(b.name));
    }
    async savePreset(input) {
        exportOptions(input);
        const name = String(input.name || '').trim().slice(0, 80);
        if (!name) throw new Error('Name the export preset.');
        const preset = { schemaVersion: 1, id: input.id || crypto.randomUUID(), owner: this.owner,
            name, format: input.format, scale: Number(input.scale), border: Number(input.border),
            transparent: input.transparent === true, currentPage: input.currentPage === true };
        await transaction('presets', 'readwrite', (store, done, fail) => {
            store.get(preset.id).onsuccess = event => {
                if (event.target.result && event.target.result.owner !== this.owner) return fail(new Error('Preset belongs to another account.'));
                store.put(preset); done(true);
            };
        });
        return preset;
    }
    async removePreset(id) {
        await transaction('presets', 'readwrite', (store, done, fail) => {
            store.get(id).onsuccess = event => {
                if (event.target.result?.owner !== this.owner) return fail(new Error('Preset was not found in this account.'));
                store.delete(id); done(true);
            };
        });
    }
    async persist() {
        if (!this.doc) return;
        this.queue = this.queue.catch(() => {}).then(async () => {
            const snapshot = structuredClone(this.doc);
            const saved = await transaction('diagrams', 'readwrite', (store, done, fail) => {
                store.get(snapshot.id).onsuccess = event => {
                    const existing = event.target.result;
                    if ((!existing && snapshot.revision > 0) || (existing && existing.revision !== snapshot.revision)) {
                        fail(new Error('This diagram changed in another tab. Use Duplicate to keep your work as a new draft.'));
                        return;
                    }
                    const next = { ...snapshot, revision: snapshot.revision + 1, updatedAt: new Date().toISOString() };
                    store.put(next);
                    done(next);
                };
            });
            if (this.doc?.id === saved.id) {
                this.doc.revision = saved.revision;
                this.doc.updatedAt = saved.updatedAt;
                if (this.doc.xml === saved.xml && this.doc.title === saved.title) this.dirty = false;
            }
            this.notify('Saved locally · ' + new Date(saved.updatedAt).toLocaleTimeString());
        });
        return this.queue;
    }
    schedule() {
        this.dirty = true;
        this.notify('Saving locally…');
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.persist().catch(error => this.notify('Save failed: ' + error.message)), 1000);
    }
    async flush() {
        clearTimeout(this.saveTimer);
        await this.queue.catch(() => {});
        if (this.dirty) await this.persist();
    }
    async open(id) {
        await this.checkpoint();
        const doc = (await this.list()).find(d => d.id === id);
        if (!doc) throw new Error('Diagram was not found in this profile.');
        this.doc = doc;
        this.mount();
        return doc;
    }
    async newDocument(title, xml = blank) {
        validateXml(xml);
        await this.checkpoint();
        const previous = this.doc;
        this.doc = { schemaVersion: 1, id: crypto.randomUUID(), owner: this.owner,
            title: (title || 'Untitled diagram').trim().slice(0, 120), xml, revision: 0,
            updatedAt: new Date().toISOString() };
        this.dirty = true;
        try { await this.persist(); }
        catch (error) { this.doc = previous; this.dirty = false; throw error; }
        this.mount();
        return this.doc;
    }
    async rename(title) {
        if (!this.doc) throw new Error('Open a diagram first.');
        this.doc.title = title.trim().slice(0, 120) || 'Untitled diagram';
        this.dirty = true;
        await this.flush();
        return this.doc;
    }
    async duplicate() {
        if (!this.doc) throw new Error('Open a diagram first.');
        // A conflicting original must not prevent preserving the current XML.
        const xml = this.ready ? await this.snapshot() : this.doc.xml;
        const title = this.doc.title + ' (copy)';
        const previous = this.doc;
        clearTimeout(this.saveTimer);
        await this.queue.catch(() => {});
        this.dirty = false;
        this.doc = null;
        try { return await this.newDocument(title, xml); }
        catch (error) { this.doc = previous; this.dirty = true; throw error; }
    }
    async remove(id) {
        await this.checkpoint();
        await transaction('diagrams', 'readwrite', (store, done, fail) => {
            store.get(id).onsuccess = event => {
                if (event.target.result?.owner !== this.owner) return fail(new Error('Diagram does not belong to this profile.'));
                store.delete(id); done(true);
            };
        });
        if (this.doc?.id === id) { this.doc = null; this.unmount(); this.notify('Diagram deleted.'); }
    }
    async setOwner(owner) {
        await this.checkpoint();
        this.owner = owner;
        this.doc = null;
        this.unmount();
        this.notify('Choose or create a diagram.');
    }
    unmount() {
        clearTimeout(this.loadTimer);
        this.ready = false;
        for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new Error('Editor closed.')); }
        this.pending.clear();
        this.frame?.remove();
        this.frame = null;
    }
    mount() {
        this.unmount();
        if (!this.doc) return;
        const frame = document.createElement('iframe');
        frame.title = 'Diagram canvas';
        frame.referrerPolicy = 'no-referrer';
        frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-downloads allow-forms allow-popups');
        this.activeTheme = editorTheme();
        frame.src = origin + '/?embed=1&proto=json&spin=1&libraries=1&noExitBtn=1&saveAndExit=0&configure=1&ui=' + (this.activeTheme.dark ? 'dark' : 'kennedy') + '&dark=' + (this.activeTheme.dark ? '1' : '0');
        this.frame = frame;
        this.host.replaceChildren(frame);
        this.notify('Loading online editor…');
        this.loadTimer = setTimeout(() => {
            if (!this.ready) this.notify('Editor unavailable. Check your connection and select Retry editor. Local drafts are retained.');
        }, 20000);
    }
    async syncTheme() {
        if (this.disposed || !this.frame || this.activeTheme?.dark === editorTheme().dark || this.themeSync) return;
        const frame = this.frame, id = this.doc?.id;
        this.themeSync = true;
        try {
            await this.checkpoint();
            if (!this.disposed && this.frame === frame && this.doc?.id === id) this.mount();
        } catch (error) {
            this.notify('Theme update deferred to protect your diagram: ' + error.message);
        } finally { this.themeSync = false; }
    }
    async retry() {
        try { await this.checkpoint(); }
        catch (error) {
            if (!window.confirm('The editor could not confirm its latest state. Reload from the latest received source? Download recovery source first if you need a backup.')) throw error;
        }
        this.mount();
    }
    send(message) { this.frame?.contentWindow?.postMessage(JSON.stringify(message), origin); }
    async receive(event) {
        if (this.disposed || event.origin !== origin || event.source !== this.frame?.contentWindow || typeof event.data !== 'string' || event.data.length > maxBytes * 12) return;
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        if (!message || typeof message.event !== 'string') return;
        try {
            if (message.event === 'configure') {
                this.send({ action: 'configure', config: { suppressNewWindows: true, css: this.activeTheme.css } });
            } else if (message.event === 'init') {
                this.send({ action: 'load', xml: this.doc.xml, autosave: 1, title: this.doc.title, noExitBtn: 1, dark: this.activeTheme.dark });
            } else if (message.event === 'load') {
                clearTimeout(this.loadTimer); this.ready = true; this.notify('Editor ready · drafts saved on this device');
            } else if (['autosave', 'save'].includes(message.event) && this.doc && this.ready) {
                this.doc.xml = validateXml(message.xml); this.schedule();
                if (message.event === 'save') await this.flush();
            } else if (message.event === 'export') {
                const id = message.message?.requestId;
                const pending = this.pending.get(id);
                if (!pending) return;
                clearTimeout(pending.timer); this.pending.delete(id);
                if (message.error) pending.reject(new Error(String(message.error)));
                else pending.resolve(message);
            } else if (message.event === 'openLink') {
                const url = new URL(message.href);
                if (['https:', 'http:'].includes(url.protocol)) window.open(url.href, '_blank', 'noopener,noreferrer');
            }
        } catch (error) { this.dirty = true; this.notify('Save failed: ' + error.message); }
    }
    request(format, options = {}) {
        if (!this.ready) throw new Error('Wait for the editor to load.');
        return new Promise((resolve, reject) => {
            const requestId = crypto.randomUUID();
            const timer = setTimeout(() => { this.pending.delete(requestId); reject(new Error('Export timed out. Retry or download the saved source.')); }, 20000);
            this.pending.set(requestId, { resolve, reject, timer });
            this.send({ action: 'export', ...options, format, requestId });
        });
    }
    async snapshot() { return validateXml((await this.request('xml')).xml); }
    async checkpoint() {
        if (this.doc && this.ready) {
            const xml = await this.snapshot();
            if (xml !== this.doc.xml) { this.doc.xml = xml; this.dirty = true; }
        }
        await this.flush();
    }
    async current() {
        if (!this.doc) throw new Error('Open a diagram first.');
        if (this.ready) { this.doc.xml = await this.snapshot(); this.dirty = true; }
        await this.flush();
        return this.doc;
    }
    async linkGist(gistId, filename, xml) {
        if (!this.doc) throw new Error('Open a diagram first.');
        this.doc.gistId = gistId;
        this.doc.gistFilename = filename;
        this.doc.remoteXml = xml;
        this.dirty = true;
        await this.flush();
        return this.doc;
    }
    async copyToOwner(owner) {
        if (typeof owner !== 'string' || !owner.startsWith('github:')) throw new Error('Choose a GitHub account.');
        const doc = await this.current();
        const xml = doc.xml, title = doc.title;
        await this.setOwner(owner);
        return this.newDocument(title, xml);
    }
    async download(format, options = {}) {
        if (!this.doc) throw new Error('Open a diagram first.');
        if (format === 'xml') {
            // Retain a recovery download even after quota or cross-tab conflicts.
            const xml = this.ready ? await this.snapshot() : this.doc.xml;
            this.saveBlob(new Blob([xml], { type: 'application/xml' }), '.drawio');
            return;
        }
        if (!['png', 'svg'].includes(format)) throw new Error('Unsupported image format.');
        const result = await this.request(format, exportOptions({ format, scale: 1, border: 10, ...options }));
        const prefix = format === 'png' ? 'data:image/png;' : 'data:image/svg+xml';
        if (typeof result.data !== 'string' || !result.data.startsWith(prefix) || result.data.length < 30)
            throw new Error('Editor returned an invalid image.');
        const response = await fetch(result.data);
        this.saveBlob(await response.blob(), '.' + format);
    }
    recoverySource() {
        if (!this.doc) throw new Error('Open a diagram first.');
        this.saveBlob(new Blob([this.doc.xml], { type: 'application/xml' }), '.drawio');
    }
    saveBlob(blob, extension) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = (this.doc.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') || 'diagram') + extension;
        a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
    async importFile(input) {
        const file = input.files?.[0];
        if (!file) return null;
        try {
            if (file.size > maxBytes) throw new Error('Diagram source must be no larger than 5 MiB.');
            return await this.newDocument(file.name.replace(/\.(drawio|xml)$/i, ''), validateXml(await file.text()));
        } finally { input.value = ''; }
    }
    async fullscreen(element) {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await element.requestFullscreen();
    }
    async dispose() {
        unregisterDraftGuard('diagram');
        this.themeObserver.disconnect();
        clearTimeout(this.themeTimer);
        clearTimeout(this.saveTimer);
        await this.checkpoint().catch(() => {});
        this.disposed = true;
        this.unmount();
        window.removeEventListener('message', this.listener);
        window.removeEventListener('beforeunload', this.beforeUnload);
    }
}
