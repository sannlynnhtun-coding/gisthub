import { writeFile } from 'node:fs/promises';

const appId = process.env.ONESIGNAL_APP_ID || '';
if (appId && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appId))
    throw new Error('ONESIGNAL_APP_ID must be the public OneSignal app UUID.');
await writeFile(new URL('../GistHub/wwwroot/push-config.json', import.meta.url), JSON.stringify({ appId }) + '\n');
