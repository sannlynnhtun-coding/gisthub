# Deployment update notifications

The Blazor app uses OneSignal Web Push without a custom backend or changes to the
app's IndexedDB schema. There is no version polling or application SSE/WebSocket.
OneSignal manages browser push subscriptions; browser notification permission is
required. Browser/OS delivery can be delayed or disabled.

## Enable production push

1. Create a OneSignal **Web Push** app for the production HTTPS origin. Choose
   **Custom Code** integration. Do not add the Typical Site auto-prompt or a second
   OneSignal snippet. The app already initializes SDK v16, with a separate worker
   at `/push/onesignal/OneSignalSDKWorker.js` and scope `/push/onesignal/` so it does
   not replace Blazor's offline worker.
2. Add GitHub Actions repository variables:
   - `ONESIGNAL_APP_ID`: public OneSignal App ID (UUID v4).
   - `GISTHUB_PUBLIC_URL`: production origin, e.g. `https://your-site.example`.
3. Add GitHub Actions repository **secret** `ONESIGNAL_REST_API_KEY`: the
   OneSignal App API key. Never put it in wwwroot, Vercel public assets, or chat.
4. Deploy through `.github/workflows/deploy.yml`. Before publishing, the workflow
   writes only the public App ID into `push-config.json`. After Vercel production
   deployment succeeds, it checks that the production domain serves the expected
   asset-manifest version and sends a visible push to `Subscribed Users`. The
   deployment check retries up to 12 times, five seconds apart (each request has
   a ten-second timeout), to allow production alias propagation. It still fails
   without sending push if the expected version never becomes available; the
   error reports the expected and last observed version/status.
5. Open the site, click the notification bell, and choose **Enable update
   notifications**. Allow browser notifications. On iOS/iPadOS, use a supported
   installed Home Screen web app. The first deployment enables the mechanism;
   users running older code may need one manual refresh first.
6. Make another production deployment. An existing open tab should receive the
   bell badge plus a browser notification. **Later** keeps the badge. **Yes,
   update now** downloads the new offline assets with their manifest integrity
   checks, saves the current snippet draft in account/gist-scoped tab session
   storage, then activates the waiting worker and reloads. On return, the draft is
   restored without publishing it to GitHub. A successful GitHub save removes the
   temporary draft.

Markdown Cards uses its existing local draft save; Diagram Editor checkpoints its
existing local document. Edited controls in tools without registered draft
recovery block updating: keep a copy and leave the tool first. Other open
tabs/windows also block activation; close them after protecting their work.
Download, draft-storage, and activation errors keep a retryable notification.
The badge clears when the running worker's asset version matches the pushed
version. Browser storage is never cleared to force an update.

If App ID is unset, push stays disabled; the bell can still show a waiting offline
worker discovered by the browser. No server key or service account is needed to
build or test locally. Manual deployments/promotions outside this workflow do not
send push; webhook coverage for those is not included.

## Checks

Run `node scripts/test-app-updates.mjs` and
`dotnet run --project GistHub.RegressionTests`. For a real deployment, verify
successful update/draft restore, Later, blocked permission, offline download
failure, full browser storage, multiple tabs, and notification clicks focusing an
existing editor without navigating it. A failed push step can occur after a
successful deployment; investigate the push configuration separately.

The existing disposable-Chrome harness also supports `BROWSER_CHECK_UPDATES=1`
with `BROWSER_CHECK_UI=0`. It seeds its own disposable profile and snippet. Run it through
`node scripts/test-browser-regressions.mjs <published-wwwroot>`. It checks the
badge and Later action, then simulates the worker handoff to verify the .NET
editor draft survives a real page reload. Push delivery and actual worker
activation are separate from that simulated handoff.

References: [OneSignal worker setup](https://documentation.onesignal.com/docs/en/onesignal-service-worker),
[SDK options](https://documentation.onesignal.com/docs/en/web-sdk-reference),
[push API](https://documentation.onesignal.com/reference/push-notification).
