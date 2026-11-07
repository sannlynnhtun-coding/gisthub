import { render as renderWord } from './markdownDocx.js';
import { render as renderDiagram } from './mermaidImage.js';

const key = 'gisthub.markdown-live-preview.v1';
const maxSize = 1024 * 1024;
const revisions = new WeakMap();
const valid = source => typeof source === 'string' && new TextEncoder().encode(source).length <= maxSize;

export function restore() {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return {};
        const draft = JSON.parse(raw);
        if (draft?.version !== 1 || !valid(draft.source) || typeof draft.filename !== 'string') throw new Error('Invalid draft');
        return draft;
    } catch {
        return { warning: 'Could not restore the local draft. Browser storage may be unavailable or the draft may be damaged.' };
    }
}

export function save(source, filename) {
    if (!valid(source)) return 'Markdown must be 1 MB or smaller. The saved draft was kept.';
    try { localStorage.setItem(key, JSON.stringify({ version: 1, source, filename })); return null; }
    catch { return 'Draft could not be saved in this browser. Download Markdown to keep your work.'; }
}

function content(source) {
    if (!valid(source)) throw new Error('Markdown must be 1 MB or smaller.');
    if (!window.marked || !window.DOMPurify) throw new Error('Markdown renderer unavailable.');
    // Sanitize into a detached fragment before insertion so remote media never starts loading.
    const fragment = DOMPurify.sanitize(marked.parse(source, { gfm: true, breaks: true }), {
        RETURN_DOM_FRAGMENT: true,
        ALLOWED_TAGS: ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'strong', 'em', 'b', 'i', 'del', 's', 'code', 'pre', 'blockquote', 'br', 'hr', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'input', 'img'],
        ALLOWED_ATTR: ['href', 'title', 'start', 'type', 'checked', 'alt', 'class']
    });
    fragment.querySelectorAll('[class]').forEach(element => {
        const language = element.tagName === 'CODE' && [...element.classList].find(name => /^language-[\w-]+$/.test(name));
        if (language) element.className = language;
        else element.removeAttribute('class');
    });
    fragment.querySelectorAll('img').forEach(image => image.replaceWith(document.createTextNode(`[Image: ${image.getAttribute('alt') || 'image'}]`)));
    fragment.querySelectorAll('input').forEach(input => {
        if (input.type !== 'checkbox') input.remove();
        else input.disabled = true;
    });
    fragment.querySelectorAll('a').forEach(link => {
        if (!/^(https?:|mailto:|#)/i.test(link.getAttribute('href') || '')) link.removeAttribute('href');
        link.target = '_blank'; link.rel = 'noopener noreferrer';
    });
    return fragment;
}

export async function render(element, source) {
    const revision = (revisions.get(element) || 0) + 1;
    revisions.set(element, revision);
    const container = document.createElement('div');
    container.append(content(source));
    container.querySelectorAll('pre code:not(.language-mermaid)').forEach(block => {
        const language = [...block.classList].find(name => name.startsWith('language-'))?.slice(9) || '';
        window.highlightGistPreview?.(block, block.textContent, language, '');
    });
    let warning = '';
    if (window.renderMathInElement) window.renderMathInElement(container, {
        output: 'mathml', trust: false, throwOnError: false, maxSize: 10, maxExpand: 1000,
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }]
    });
    else if (source.includes('$')) warning = ' Math renderer unavailable; source is shown.';
    // Show sanitized Markdown immediately; asynchronous diagrams can only replace their own revision.
    element.replaceChildren(container);
    for (const code of container.querySelectorAll('pre code.language-mermaid')) {
        if (!window.mermaid) { warning += ' Diagram renderer unavailable; source is shown.'; continue; }
        if (/%%\{|^---\s|<[a-z!\/]|\b(?:img|image)\s*:|https?:|data:|\/\/|url\s*\(|@import/im.test(code.textContent)) {
            warning += ' Diagram configuration, HTML and external resources are disabled; source is shown.';
            continue;
        }
        const pre = code.parentElement;
        const diagram = document.createElement('div');
        pre.replaceWith(diagram);
        try { await renderDiagram(diagram, code.textContent, { theme: 'neutral' }); }
        catch { diagram.replaceWith(pre); warning += ' Could not render a diagram; source is shown.'; }
        if (revisions.get(element) !== revision) return 'Preview updated.';
    }
    return `Preview updated. Draft autosaves in this browser.${warning}`;
}

export function cancel(element) { revisions.set(element, (revisions.get(element) || 0) + 1); }

export function html(source) {
    const element = document.createElement('div');
    element.append(content(source));
    return `<!doctype html><html><head><meta charset="utf-8"><title>Markdown document</title></head><body>${element.innerHTML}</body></html>`;
}

export function wordSource(source) {
    return renderWord(document.createElement('div'), source);
}

export function print() {
    document.body.classList.add('printing-markdown');
    try { window.print(); }
    finally { document.body.classList.remove('printing-markdown'); }
}
