# Google setup for the live transport gate

T001-T006 provide a foundation, not a working app feature. The actual app still has no sync UI or storage upgrade. T007 is not passed until the live proof and required edge scenarios have real evidence.

## Create public OAuth configuration

1. Open https://console.cloud.google.com/ and create/select a project named GistHub Sync Test.
2. In APIs & Services, enable Google Sheets API and Google Drive API. Google Picker API is needed later for application integration, not this standalone create/join harness.
3. In Google Auth Platform, configure Branding (app name and support/contact email). For a personal Gmail account select an External audience, leave the app in Testing and add your Google account as a test user. Workspace organization-only use may select Internal when available.
4. In Data Access add `https://www.googleapis.com/auth/drive.file`.
5. In Clients create a **Web application** OAuth client. Add `http://localhost:5190` under Authorized JavaScript origins (no trailing path). This standalone token flow does not require a redirect endpoint.
6. Copy the public client ID ending in `.apps.googleusercontent.com`. Do not send or place a client secret/service-account key/access token in the repository or this chat.
7. Later app integration uses `http://localhost:5187` and the real production HTTPS origin plus a restricted Picker API key and project number. A public client configuration record exists as `GoogleSyncOptions`; runtime application binding has deliberately not been connected before T007.

Sources: [Google Sheets JavaScript setup](https://developers.google.com/workspace/sheets/api/quickstart/js), [browser token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model).

## Run the isolated harness

From repository root in PowerShell:

```powershell
$env:GOOGLE_SYNC_TEST_CLIENT_ID = 'YOUR_PUBLIC_CLIENT_ID.apps.googleusercontent.com'
node scripts/test-google-sheets-transport.mjs
```

Open `http://localhost:5190/` in two separate browser profiles. Use the same Google account in both. Choose role A in the first profile and authorize: it creates a private disposable file named **GistHub DISPOSABLE transport proof ...**. Choose role B in the second profile and authorize after A is ready. Click **Run 100 rounds** in both pages. Keep both pages open and online, approximately 15-20 minutes, possibly longer with quota backoff. Popups must be allowed. No application database or real sync spreadsheet is opened.

The local server receives control metadata only. Google tokens stay in each page's memory; Google API requests go directly from the browser to Google. The server has no token-input endpoint. Stop the server with Ctrl+C; closing a page discards that page's token. The disposable file remains in your Drive for inspection/removal. The harness never deletes it automatically.

## Read the result honestly

The normal run exercises simultaneous independent appends from the same causal base, parent-first chains over many requests, intentionally disregarded append acknowledgement followed by identical-ID retries, duplicate-row replay, stable Google identity and matching eventual field-head replay in both profiles. The intentional ignored acknowledgement models a client-side lost response; actual network interruption before/after request completion also needs a manual run.

Both browser summaries and the terminal must agree: 100 rounds, 200 distinct operations, matching final replay digest and no missing/changed previously verified operations. A page completing alone is not an overall pass. Record redacted summaries, browser versions, durations and file ID in validation/transport.md; never copy request authorization headers. If either profile fails, preserve the evidence and do not mark T007 complete.

Remaining required live edge evidence: interruption before/after dependent batches and the separate near-capacity concurrent-admission scenario from contracts/sync-protocol.md. The Node capacity tests validate exact thresholds locally but do not replace that live gate evidence. T009 and story integration remain blocked until every T007 condition is satisfied.

## Local checks available now

```powershell
dotnet run --project GistHub.RegressionTests/GistHub.RegressionTests.csproj -- --google-sync-only
node scripts/test-google-sync-protocol.mjs
node scripts/test-google-sync-harness.mjs
```

The harness smoke test uses mock local control messages and no Google requests. It cannot pass the live gate.
