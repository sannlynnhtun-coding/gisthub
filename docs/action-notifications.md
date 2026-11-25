# Action notifications

The Blazor web app mounts Ding 0.0.9 once in `wwwroot/js/notifications.js`.
The MIT-licensed distribution and license are vendored in `wwwroot/js/vendor/ding`
so notifications also work offline. The npm dependency is pinned; when updating it,
copy `node_modules/@yusufceng1z/ding/dist/index.js` and `LICENSE` to that directory.

Browser clipboard writes (text and images), editable-field paste, download links,
and native confirmation results use the shared bridge. Download messages report
that the browser started the download; browsers do not expose disk completion.
GitHub create/update/delete results, local metadata saves/deletes, bookmark restore,
and appearance application also report their outcomes. Background gist sync and
draft autosave stay quiet. Selecting a file alone does not imply a successful upload.

Call `window.gistHubNotify('success', 'Saved')` from JavaScript or
`await JS.InvokeVoidAsync("gistHubNotify", "success", "Saved")` from Blazor
after a new action completes. Use `error`, `warning`, or `info` as appropriate.
Keep user content, clipboard data, filenames, and credentials out of toast messages.
Keep detailed validation and recovery instructions on the page.

Ding follows the app's light/dark theme, announces notifications through its live
regions, supports keyboard dismissal, and respects reduced motion. Built-in status sounds are enabled at 50% volume; browser audio requires a user interaction.
Existing confirmations continue to decide whether destructive actions run.
