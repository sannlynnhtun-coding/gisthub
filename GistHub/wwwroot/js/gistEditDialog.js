const states = new WeakMap();
export function open(dialog, reference) {
    if (states.has(dialog)) return;
    const trigger = document.activeElement;
    const cancel = event => { event.preventDefault(); reference.invokeMethodAsync('RequestClose'); };
    const keydown = event => {
        if (event.key !== 'Escape' || event.repeat) return;
        event.preventDefault();
        event.stopPropagation();
        reference.invokeMethodAsync('RequestClose');
    };
    states.set(dialog, {trigger, cancel, keydown});
    dialog.addEventListener('cancel', cancel);
    dialog.addEventListener('keydown', keydown);
    dialog.showModal();
    dialog.querySelector('#gist-description')?.focus();
}
export function close(dialog) {
    const state = states.get(dialog);
    if (!state) return;
    dialog.removeEventListener('cancel', state.cancel);
    dialog.removeEventListener('keydown', state.keydown);
    dialog.close();
    if (state.trigger?.isConnected) state.trigger.focus({preventScroll:true});
    states.delete(dialog);
}
