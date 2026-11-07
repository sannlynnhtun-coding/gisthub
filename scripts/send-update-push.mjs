import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function manifestVersion(source) {
    const version = source.match(/"version"\s*:\s*"([^"\r\n]{1,128})"/)?.[1];
    if (!version) throw new Error('The published asset manifest has no version.');
    return version;
}

export function pushMessage(appId, version, origin) {
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
        throw new Error('GISTHUB_PUBLIC_URL must be the production HTTPS origin.');
    return {
        app_id: appId, included_segments: ['Subscribed Users'], target_channel: 'push', isAnyWeb: true,
        headings: { en: 'GistHub update available' },
        contents: { en: 'A new version is ready. Open GistHub to update when you are ready.' },
        web_url: url.origin + '/', web_push_topic: 'gisthub-update',
        data: { type: 'gisthub-update', version }, idempotency_key: randomUUID()
    };
}

export async function waitForRelease(origin, version) {
    let observed = 'unavailable';
    for (let attempt = 1; attempt <= 12; attempt++) {
        try {
            const url = new URL('/service-worker-assets.js', origin);
            url.searchParams.set('version', version);
            const live = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
            observed = live.ok ? manifestVersion(await live.text()) : `HTTP ${live.status}`;
            if (observed === version) return;
        } catch { observed = 'unavailable or invalid manifest'; }
        if (attempt < 12) {
            console.log(`Waiting for production release ${version} (observed ${observed}, attempt ${attempt}/12).`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    throw new Error(`The production domain is not serving this release (expected ${version}, observed ${observed}). No update notification was sent.`);
}

async function send() {
    const { ONESIGNAL_APP_ID: appId, ONESIGNAL_REST_API_KEY: key, GISTHUB_PUBLIC_URL: origin } = process.env;
    if (!appId) { console.log('Web Push is not configured; deployment completed without sending notifications.'); return; }
    if (!key) throw new Error('GitHub Actions did not provide ONESIGNAL_REST_API_KEY.');
    if (!origin) throw new Error('GitHub Actions did not provide GISTHUB_PUBLIC_URL.');
    const version = manifestVersion(await readFile(process.argv[2], 'utf8'));
    const message = pushMessage(appId, version, origin);
    await waitForRelease(origin, version);
    const response = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST', headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(message), signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`OneSignal rejected the update notification (HTTP ${response.status}).`);
    const result = await response.json();
    if (result.id === '') {
        console.log('::notice::OneSignal accepted the request, but no subscribed browsers matched. No notification was sent.');
        return;
    }
    if (!result.id) throw new Error('OneSignal returned an unexpected response without a notification ID.');
    console.log(`::notice::OneSignal accepted update notification ${result.id}.`);
    if (result.errors) console.warn('OneSignal reported partial delivery errors. Check its dashboard.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        await send();
    } catch (error) {
        const message = error.message.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
        console.error(`::error::${message}`);
        process.exitCode = 1;
    }
}
