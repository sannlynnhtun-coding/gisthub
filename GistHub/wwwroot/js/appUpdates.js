let registration, callback, currentVersion, pendingVersion, sdk, sdkReady;
const draftGuards = new Map();
const editedFields = new Map();
const stateCache = 'gisthub-update-state';
const stateUrl = '/__gisthub_update__';

function workerRequest(worker, type) {
    return new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Update worker did not respond. Please retry.')); }, 10000);
        channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
        worker.postMessage({ type }, [channel.port2]);
    });
}

async function refreshBadge() {
    const response = await (await caches.open(stateCache)).match(stateUrl);
    pendingVersion = response ? (await response.json()).version : null;
    await callback?.invokeMethodAsync('UpdateAvailable', Boolean(registration?.waiting || (pendingVersion && pendingVersion !== currentVersion)));
}

function onMessage(event) {
    if (event.data?.type === 'GISTHUB_UPDATE') refreshBadge().catch(() => {});
}
function onInput(event) {
    if (event.target.matches('textarea, input:not([type=search]), select')) editedFields.set(event.target, location.pathname);
}
function watchInstallation() {
    const worker = registration.installing;
    if (worker) worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') refreshBadge().catch(() => {});
    });
}

export async function watch(dotnet) {
    callback = dotnet;
    if (!('serviceWorker' in navigator)) return false;
    document.addEventListener('input', onInput, true);
    document.addEventListener('change', onInput, true);
    registration = await (window.gistHubServiceWorkerReady || navigator.serviceWorker.getRegistration('/'));
    if (!registration) throw new Error('Update service is not ready. Reload once to enable it.');
    if (navigator.serviceWorker.controller) {
        try { currentVersion = (await workerRequest(navigator.serviceWorker.controller, 'GET_VERSION')).version; }
        catch { currentVersion = null; }
    }
    navigator.serviceWorker.addEventListener('message', onMessage);
    registration.addEventListener('updatefound', watchInstallation);
    watchInstallation();
    await refreshBadge();
    if (sdkReady) { await sdkReady; return sdk.Notifications.isPushSupported(); }
    // Configuration is public; the API key is used only by GitHub Actions.
    const response = await fetch('/push-config.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load update notification settings.');
    const { appId } = await response.json();
    if (!appId) return false;
    sdkReady = new Promise((resolve, reject) => {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async OneSignal => {
            try {
                await OneSignal.init({
                    appId, serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js',
                    serviceWorkerParam: { scope: '/push/onesignal/' },
                    notificationClickHandlerMatch: 'origin', notificationClickHandlerAction: 'focus',
                    notifyButton: { enable: false }, welcomeNotification: { disable: true },
                    promptOptions: { slidedown: { prompts: [{ type: 'push', autoPrompt: false }] } }
                });
                sdk = OneSignal;
                resolve();
            } catch (error) { reject(error); }
        });
        const script = document.createElement('script');
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        script.defer = true;
        script.onerror = () => reject(new Error('Push service could not load. Check your connection.'));
        document.head.append(script);
    });
    await sdkReady;
    return sdk.Notifications.isPushSupported();
}

export async function enablePush() {
    await sdkReady;
    if (!sdk) throw new Error('Push notifications have not been configured.');
    await sdk.User.PushSubscription.optIn();
    if (!sdk.User.PushSubscription.optedIn) throw new Error('Notifications are not enabled. Allow them in your browser settings and retry.');
}

export function registerDraftGuard(id, guard) { draftGuards.set(id, guard); }
export function registerJsDraftGuard(id, guard) { draftGuards.set(id, { invokeMethodAsync: guard }); }
export function unregisterDraftGuard(id) { draftGuards.delete(id); }
export function loadEditorDraft(key) {
    const value = sessionStorage.getItem(key);
    if (!value) return null;
    const draft = JSON.parse(value);
    if (typeof draft.description !== 'string' || typeof draft.filename !== 'string' || typeof draft.content !== 'string'
        || typeof draft.isPublic !== 'boolean' || typeof draft.isBookmarked !== 'boolean') throw new Error('The saved editor draft could not be read.');
    return draft;
}
export function saveEditorDraft(key, draft) { sessionStorage.setItem(key, JSON.stringify(draft)); }
export function removeEditorDraft(key) { sessionStorage.removeItem(key); }

function waitForInstallation() {
    if (registration.waiting) return Promise.resolve();
    const worker = registration.installing;
    if (!worker) throw new Error('The update is not ready yet. Please retry shortly.');
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => finish(new Error('Download is taking too long. Your current version is unchanged; retry.')), 120000);
        const changed = () => {
            if (worker.state === 'installed') finish();
            if (worker.state === 'redundant') finish(new Error('Update download failed. Your current version is unchanged; retry.'));
        };
        function finish(error) { clearTimeout(timer); worker.removeEventListener('statechange', changed); error ? reject(error) : resolve(); }
        worker.addEventListener('statechange', changed);
        changed();
    });
}

export async function applyUpdate() {
    await registration.update();
    await waitForInstallation();
    const worker = registration.waiting;
    const { clients } = await workerRequest(worker, 'GET_CLIENT_COUNT');
    if (clients > 1) throw new Error('Close the other GistHub tabs/windows, then retry. Their unsaved work must be protected first.');
    // Unregistered tools cannot promise draft recovery, so keep their edited fields intact.
    if ([...editedFields].some(([field, path]) => (field.isConnected || path === location.pathname)
        && !draftGuards.has(field.closest('[data-update-draft]')?.dataset.updateDraft)))
        throw new Error('This tool has unsaved changes. Keep a copy and leave the tool before updating.');
    document.body.inert = true;
    try {
        for (const guard of draftGuards.values()) await guard.invokeMethodAsync('SaveUpdateDraft');
        await new Promise((resolve, reject) => {
            const changed = () => { cleanup(); location.reload(); resolve(); };
            const timer = setTimeout(() => { cleanup(); reject(new Error('Update activation did not finish. Please retry.')); }, 15000);
            const cleanup = () => { clearTimeout(timer); navigator.serviceWorker.removeEventListener('controllerchange', changed); };
            navigator.serviceWorker.addEventListener('controllerchange', changed);
            workerRequest(worker, 'ACTIVATE_UPDATE').then(result => {
                if (!result.ok) { cleanup(); reject(new Error('Close other GistHub tabs before updating.')); }
            }).catch(error => { cleanup(); reject(error); });
        });
    } finally { document.body.inert = false; }
}

export function unwatch() {
    callback = null;
    navigator.serviceWorker?.removeEventListener('message', onMessage);
    document.removeEventListener('input', onInput, true);
    document.removeEventListener('change', onInput, true);
    registration?.removeEventListener('updatefound', watchInstallation);
    editedFields.clear();
}
