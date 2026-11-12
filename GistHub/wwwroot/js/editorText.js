export function normalDescription(text) {
    return text.replace(/\S+/gu, token => {
        const match = token.match(/^([("'“‘]*)([\p{L}\p{M}\p{N}]+(?:-[\p{L}\p{M}\p{N}]+)+)([).,!?;:"'”’]*)$/u);
        return match && /\p{L}/u.test(match[2]) ? match[1] + match[2].replaceAll('-', ' ') + match[3] : token;
    });
}
const handlers = new WeakMap();
export function attachDescriptionPaste(element) {
    detachDescriptionPaste(element);
    const handler = event => {
        const text = event.clipboardData?.getData('text/plain');
        if (!text) return;
        const converted = normalDescription(text);
        if (converted === text) return;
        event.preventDefault();
        // Use the browser's editing command to preserve selection and the native undo stack.
        if (!document.execCommand('insertText', false, converted)) {
            // shortcut: this fallback has no native undo; replace when browsers provide a standard undo-preserving edit API.
            element.setRangeText(converted, element.selectionStart, element.selectionEnd, 'end');
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
    };
    handlers.set(element, handler);
    element.addEventListener('paste', handler);
}
export function detachDescriptionPaste(element) {
    const handler = handlers.get(element);
    if (handler) element.removeEventListener('paste', handler);
    handlers.delete(element);
}
export function attachFilenamePaste(element, reference) {
    detachDescriptionPaste(element);
    const handler = event => {
        const text = event.clipboardData?.getData('text/plain');
        if (!text) return;
        event.preventDefault();
        element.setRangeText(text, element.selectionStart, element.selectionEnd, 'end');
        element.dispatchEvent(new Event('input', { bubbles: true }));
        reference.invokeMethodAsync('FilenamePasted');
    };
    handlers.set(element, handler);
    element.addEventListener('paste', handler);
}
