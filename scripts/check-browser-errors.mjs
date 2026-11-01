import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const url = process.argv[2];
const waitMs = Number.parseInt(process.env.BROWSER_CHECK_WAIT_MS ?? "15000", 10);
const browserPath = process.env.CHROME_PATH
  ?? (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "google-chrome");

if (!url) {
  console.error("Usage: node scripts/check-browser-errors.mjs <url>");
  process.exit(2);
}

const errorPatterns = [
  /One of the specified object stores was not found/i,
  /SRI's integrity checks failed/i,
  /Password field is not contained in a form/i,
];

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForDebugger(port) {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return response.json();
    } catch {
      // Chrome has not opened its debugging endpoint yet.
    }
    await delay(100);
  }
  throw new Error("Chrome DevTools endpoint did not become ready");
}

const port = await reservePort();
const profilePath = await mkdtemp(path.join(os.tmpdir(), "gist-hub-browser-check-"));
const chrome = spawn(browserPath, [
  "--headless=new",
  "--disable-gpu",
  "--disable-background-networking",
  "--enable-logging=stderr",
  "--no-first-run",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profilePath}`,
  "about:blank",
], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });

let socket;
try {
  const debuggerInfo = await waitForDebugger(port);
  socket = new WebSocket(debuggerInfo.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  const observedMessages = [];
  let resolvePageSession;
  const pageSession = new Promise((resolve) => { resolvePageSession = resolve; });
  let targetPageId;
  const attachedPageSessions = new Map();

  chrome.stdout.on("data", (chunk) => observedMessages.push(chunk.toString()));
  chrome.stderr.on("data", (chunk) => observedMessages.push(chunk.toString()));

  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }

    if (message.method === "Runtime.exceptionThrown") {
      const details = message.params.exceptionDetails;
      observedMessages.push(details.exception?.description ?? details.text ?? "");
    } else if (message.method === "Runtime.consoleAPICalled") {
      observedMessages.push(message.params.args.map((argument) => argument.value ?? argument.description ?? "").join(" "));
    } else if (message.method === "Log.entryAdded") {
      observedMessages.push(message.params.entry.text ?? "");
    } else if (message.method === "Network.responseReceived"
      && message.params.type === "Document") {
      observedMessages.push(`Document ${message.params.response.status} ${message.params.response.url}`);
    } else if (message.method === "Target.attachedToTarget") {
      const { sessionId, targetInfo } = message.params;
      void send("Runtime.enable", {}, sessionId).catch(() => {});
      void send("Log.enable", {}, sessionId).catch(() => {});
      if (targetInfo.type === "page") {
        attachedPageSessions.set(targetInfo.targetId, sessionId);
        void send("Page.enable", {}, sessionId).catch(() => {});
        if (targetInfo.targetId === targetPageId) resolvePageSession(sessionId);
      }
    }
  });

  await send("Target.setAutoAttach", {
    autoAttach: true,
    waitForDebuggerOnStart: false,
    flatten: true,
  });
  const createdPage = await send("Target.createTarget", { url: "about:blank" });
  targetPageId = createdPage.targetId;
  if (attachedPageSessions.has(targetPageId)) {
    resolvePageSession(attachedPageSessions.get(targetPageId));
  }
  const sessionId = await pageSession;
  await Promise.all([
    send("Runtime.enable", {}, sessionId),
    send("Log.enable", {}, sessionId),
    send("Page.enable", {}, sessionId),
    send("Network.enable", {}, sessionId),
  ]);

  const evaluate = async (expression) => {
    const evaluation = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    }, sessionId);
    if (evaluation.exceptionDetails) {
      throw new Error(evaluation.exceptionDetails.exception?.description
        ?? evaluation.exceptionDetails.text
        ?? "Browser evaluation failed");
    }
    return evaluation.result.value;
  };

  const waitFor = async (expression, description, timeout = 10000) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      if (await evaluate(expression)) return;
      await delay(100);
    }
    const snapshot = await evaluate(`({
      url: location.href,
      text: document.body?.innerText?.slice(0, 1600) ?? "",
      searchAccount: document.querySelector('.global-search-panel')?.dataset.account ?? null,
      searchGistCount: document.querySelector('.global-search-panel')?.dataset.gistCount ?? null,
      blazorErrorVisible: !document.querySelector('#blazor-error-ui')?.classList.contains('hidden')
    })`);
    throw new Error(`Timed out waiting for ${description}: ${JSON.stringify(snapshot)}`);
  };

  if (process.env.BROWSER_CHECK_PRESEED_IDB === "1") {
    const metadataUrl = new URL("/manifest.webmanifest", url).href;
    await send("Page.navigate", { url: metadataUrl }, sessionId);
    await delay(500);
    await send("Runtime.evaluate", {
      expression: `(async () => {
        await new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase("GistHubDB");
          request.onerror = () => reject(request.error);
          request.onsuccess = resolve;
        });
        await new Promise((resolve, reject) => {
          const request = indexedDB.open("GistHubDB", 3);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            request.result.close();
            resolve();
          };
        });
      })()`,
      awaitPromise: true,
    }, sessionId);
  }
  await send("Page.navigate", { url }, sessionId);
  await delay(waitMs);

  const verificationFailures = [];
  if (process.env.BROWSER_CHECK_PRESEED_IDB === "1") {
    const databaseSnapshot = await send("Runtime.evaluate", {
      expression: `(async () => {
        const databases = await indexedDB.databases();
        return Promise.all(databases.map((database) => new Promise((resolve, reject) => {
          const request = indexedDB.open(database.name);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const stores = Array.from(request.result.objectStoreNames);
            request.result.close();
            resolve({ ...database, stores });
          };
        })));
      })()`,
      awaitPromise: true,
      returnByValue: true,
    }, sessionId);
    const databases = databaseSnapshot.result.value;
    const database = databases.find((candidate) => candidate.name === "GistHubDB");
    const expectedStores = ["gists", "groups", "profiles"];
    if (!database || database.version < 4
      || expectedStores.some((store) => !database.stores.includes(store))) {
      verificationFailures.push(`IndexedDB schema repair failed: ${JSON.stringify(database ?? null)}`);
    }
  }

  if (process.env.BROWSER_CHECK_UI === "1") {
    await evaluate(`(async () => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("GistHubDB", 4);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(["profiles", "gists"], "readwrite");
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
        transaction.objectStore("profiles").put({
          id: "browser-profile",
          name: "Browser Test",
          accessToken: "browser-test-token",
          githubUsername: "browser-user",
          bio: ""
        });
        transaction.objectStore("gists").put({
          id: "search-gist",
          cacheOwnerUsername: "browser-user",
          storageKey: "browser-user:search-gist",
          description: "Browser search sample",
          files: {
            "sample.js": {
              filename: "sample.js",
              type: "text/javascript",
              language: "JavaScript",
              raw_url: "",
              content: "export const hiddenNeedle = 'indexed-db-result';"
            }
          },
          public: false,
          html_url: "",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
          tags: ["browser"],
          collectionNames: [],
          collectionName: null,
          isSynced: true,
          isBookmarked: true,
          bookmarkOrder: 1,
          owner: null
        });
        transaction.objectStore("gists").put({
          id: "reorder-gist",
          cacheOwnerUsername: "browser-user",
          storageKey: "browser-user:reorder-gist",
          description: "Bookmark reorder sample",
          files: {
            "reorder.txt": {
              filename: "reorder.txt",
              type: "text/plain",
              language: "Text",
              raw_url: "",
              content: "bookmark workflow regression"
            }
          },
          public: true,
          html_url: "",
          created_at: "2026-01-03T00:00:00Z",
          updated_at: "2026-01-04T00:00:00Z",
          tags: ["workflow"],
          collectionNames: ["Regression"],
          collectionName: "Regression",
          isSynced: true,
          isBookmarked: true,
          bookmarkOrder: 2,
          owner: null
        });
        transaction.objectStore("gists").put({
          id: "foreign-gist",
          cacheOwnerUsername: "another-user",
          storageKey: "another-user:foreign-gist",
          description: "Other account result",
          files: {
            "foreign.js": {
              filename: "foreign.js",
              type: "text/javascript",
              language: "JavaScript",
              raw_url: "",
              content: "const hiddenNeedle = 'must-not-leak';"
            }
          },
          public: false,
          html_url: "",
          created_at: "2026-01-05T00:00:00Z",
          updated_at: "2026-01-06T00:00:00Z",
          tags: ["private"],
          collectionNames: [],
          collectionName: null,
          isSynced: true,
          isBookmarked: false,
          bookmarkOrder: 0,
          owner: null
        });
      });
      db.close();
      return true;
    })()`);

    const myGistsUrl = new URL("/my-gists", url).href;
    await send("Page.navigate", { url: myGistsUrl }, sessionId);
    await waitFor(`Boolean(document.querySelector('[data-testid="global-search-trigger"]'))`, "the GistHub toolbar");

    const legacySearchExists = await evaluate(`Boolean(document.querySelector('.neo-search-bar'))`);
    if (legacySearchExists) verificationFailures.push("The My Gists body search bar is still visible.");

    await evaluate(`document.querySelector('[data-testid="global-search-trigger"]').click()`);
    await waitFor(`Boolean(document.querySelector('[data-testid="global-search-input"]'))`, "the global search dialog");
    await evaluate(`(() => {
      const input = document.querySelector('[data-testid="global-search-input"]');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'hiddenNeedle');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
    await waitFor(`document.querySelector('[data-testid="global-search-result"]')?.textContent.includes('hiddenNeedle') === true`, "the IndexedDB content search result");

    const resultCount = await evaluate(`document.querySelectorAll('[data-testid="global-search-result"]').length`);
    if (resultCount !== 1) verificationFailures.push(`Expected one grouped gist result, found ${resultCount}.`);

    await evaluate(`document.querySelector('[data-testid="global-search-input"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`);
    await waitFor(`location.pathname === '/view/search-gist'`, "search result navigation");

    await send("Page.navigate", { url: myGistsUrl }, sessionId);
    await waitFor(`Boolean(document.querySelector('[data-testid="global-search-trigger"]'))`, "the toolbar after returning to My Gists");
    await waitFor(`document.querySelector('[data-testid="global-search-trigger"]')?.dataset.shortcutReady === 'true'`, "the global search shortcut registration");
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "k", code: "KeyK", modifiers: 2, windowsVirtualKeyCode: 75 }, sessionId);
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "k", code: "KeyK", modifiers: 2, windowsVirtualKeyCode: 75 }, sessionId);
    await waitFor(`Boolean(document.querySelector('[data-testid="global-search-input"]'))`, "the Ctrl+K search shortcut");
    await evaluate(`document.querySelector('[data-testid="global-search-input"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    await waitFor(`!document.querySelector('[data-testid="global-search-input"]')`, "Escape to close global search");

    await evaluate(`document.querySelector('[data-testid="tools-trigger"]').click()`);
    await waitFor(`Boolean(document.querySelector('[data-testid="json-parser-menu-item"]')) && Boolean(document.querySelector('[data-testid="code-image-menu-item"]'))`, "the Tools menu");
    await evaluate(`document.querySelector('[data-testid="json-parser-menu-item"]').click()`);
    await waitFor(`Boolean(document.querySelector('.json-parser-overlay'))`, "the JSON parser overlay");
    await evaluate(`document.querySelector('.json-parser-overlay').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    await waitFor(`!document.querySelector('.json-parser-overlay')`, "Escape to close the JSON parser");

    await evaluate(`document.querySelector('[data-testid="tools-trigger"]').click()`);
    await waitFor(`Boolean(document.querySelector('[data-testid="code-image-menu-item"]'))`, "the Code Image menu item");
    await evaluate(`document.querySelector('[data-testid="code-image-menu-item"]').click()`);
    await waitFor(`Boolean(document.querySelector('.code-image-overlay'))`, "the Code Image overlay");
    await evaluate(`document.querySelector('.code-image-overlay').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    await waitFor(`!document.querySelector('.code-image-overlay')`, "Escape to close Code Image");

    await evaluate(`document.querySelector('[data-testid="settings-trigger"]').click()`);
    await waitFor(`Boolean(document.querySelector('[data-testid="blur-files-menu-item"]'))`, "the Settings menu");
    await evaluate(`document.querySelector('[data-testid="blur-files-menu-item"]').click()`);
    await waitFor(`document.querySelector('.neo-app-shell')?.classList.contains('gist-files-blurred') === true`, "the Blur Files setting");
    const blurPreference = await evaluate(`localStorage.getItem('gisthub:files-blurred')`);
    if (blurPreference !== "true") verificationFailures.push("Blur Files was not persisted to localStorage.");

    await waitFor(`Boolean(document.querySelector('header [data-testid="sidebar-toggle-trigger"]'))`, "the top navigation sidebar toggle");
    await evaluate(`document.querySelector('[data-testid="sidebar-toggle-trigger"]').click()`);
    await waitFor(`!document.querySelector('.neo-sidebar')`, "the sidebar to hide");
    const sidebarPreference = await evaluate(`localStorage.getItem('gisthub:sidebar-visible')`);
    if (sidebarPreference !== "false") verificationFailures.push("Sidebar visibility was not persisted to localStorage.");

    await send("Emulation.setDeviceMetricsOverride", {
      width: 360,
      height: 800,
      deviceScaleFactor: 1,
      mobile: true,
    }, sessionId);
    await evaluate(`document.querySelector('[data-testid="global-search-trigger"]').click()`);
    await waitFor(`Boolean(document.querySelector('.global-search-panel'))`, "the mobile search dialog");
    const mobileLayout = await evaluate(`(() => {
      const searchButton = document.querySelector('[data-testid="global-search-trigger"]').getBoundingClientRect();
      const bookmarksButton = document.querySelector('[data-testid="bookmarks-filter-trigger"]').getBoundingClientRect();
      const settingsButton = document.querySelector('[data-testid="settings-trigger"]').getBoundingClientRect();
      const panel = document.querySelector('.global-search-panel').getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        searchTarget: Math.min(searchButton.width, searchButton.height),
        bookmarksTarget: Math.min(bookmarksButton.width, bookmarksButton.height),
        settingsTarget: Math.min(settingsButton.width, settingsButton.height),
        panelWidth: Math.round(panel.width),
        viewportWidth: window.innerWidth
      };
    })()`);
    if (mobileLayout.overflow) verificationFailures.push("The 360px layout has horizontal overflow.");
    if (mobileLayout.searchTarget < 44 || mobileLayout.bookmarksTarget < 44 || mobileLayout.settingsTarget < 44) {
      verificationFailures.push(`Mobile toolbar targets are below 44px: ${JSON.stringify(mobileLayout)}`);
    }
    if (mobileLayout.panelWidth !== mobileLayout.viewportWidth) {
      verificationFailures.push(`Mobile search is not full width: ${JSON.stringify(mobileLayout)}`);
    }

    await evaluate(`document.querySelector('[data-testid="global-search-input"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    await waitFor(`!document.querySelector('.global-search-panel')`, "the mobile search dialog to close");
    await send("Emulation.clearDeviceMetricsOverride", {}, sessionId);

    const initialDarkTheme = await evaluate(`document.documentElement.classList.contains('dark')`);
    await evaluate(`document.querySelector('.neo-theme-toggle').click()`);
    await waitFor(`document.documentElement.classList.contains('dark') === ${!initialDarkTheme}`, "the alternate color theme");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 768,
      height: 900,
      deviceScaleFactor: 1,
      mobile: true,
    }, sessionId);
    await evaluate(`document.querySelector('[data-testid="global-search-trigger"]').click()`);
    await waitFor(`Boolean(document.querySelector('.global-search-panel'))`, "the tablet search dialog");
    const tabletLayout = await evaluate(`(() => {
      const panel = document.querySelector('.global-search-panel').getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        panelWidth: Math.round(panel.width),
        viewportWidth: window.innerWidth,
        panelBackground: getComputedStyle(document.querySelector('.global-search-panel')).backgroundColor
      };
    })()`);
    if (tabletLayout.overflow || tabletLayout.panelWidth > tabletLayout.viewportWidth || tabletLayout.panelBackground === "rgba(0, 0, 0, 0)") {
      verificationFailures.push(`Tablet search layout failed in the alternate theme: ${JSON.stringify(tabletLayout)}`);
    }
    await evaluate(`document.querySelector('[data-testid="global-search-input"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    await waitFor(`!document.querySelector('.global-search-panel')`, "the tablet search dialog to close");
    await send("Emulation.clearDeviceMetricsOverride", {}, sessionId);

    const favoritesUrl = new URL("/my-gists?favorites=true", url).href;
    await send("Page.navigate", { url: favoritesUrl }, sessionId);
    await waitFor(`document.querySelectorAll('.bookmark-draggable').length === 2 && document.querySelector('[data-testid="collection-bookmarks-toggle"]')?.getAttribute('aria-pressed') === 'true'`, "the bookmarked gist reorder view");
    const activeBookmarkButton = await evaluate(`({
      pressed: document.querySelector('[data-testid="bookmarks-filter-trigger"]')?.getAttribute('aria-pressed'),
      filled: document.querySelector('[data-testid="bookmarks-filter-trigger"] svg')?.getAttribute('fill')
    })`);
    if (activeBookmarkButton.pressed !== "true" || activeBookmarkButton.filled !== "currentColor") {
      verificationFailures.push(`The bookmark toolbar button does not show its active state: ${JSON.stringify(activeBookmarkButton)}`);
    }

    const activeCollectionBookmarkButton = await evaluate(`({
      pressed: document.querySelector('[data-testid="collection-bookmarks-toggle"]')?.getAttribute('aria-pressed'),
      filled: document.querySelector('[data-testid="collection-bookmarks-toggle"] svg')?.getAttribute('fill'),
      text: document.querySelector('[data-testid="collection-bookmarks-toggle"]')?.textContent ?? ''
    })`);
    if (activeCollectionBookmarkButton.pressed !== "true"
      || activeCollectionBookmarkButton.filled !== "currentColor"
      || !activeCollectionBookmarkButton.text.includes("Bookmarks")) {
      verificationFailures.push(`The collection bookmark toggle does not show its active state: ${JSON.stringify(activeCollectionBookmarkButton)}`);
    }

    await evaluate(`document.querySelector('[data-testid="collection-bookmarks-toggle"]').click()`);
    await waitFor(`!new URL(location.href).searchParams.has('favorites') && document.querySelector('[data-testid="collection-bookmarks-toggle"]').getAttribute('aria-pressed') === 'false' && document.querySelector('[data-testid="bookmarks-filter-trigger"]').getAttribute('aria-pressed') === 'false'`, "the all-gists view from the collection bookmark toggle");
    await evaluate(`document.querySelector('[data-testid="collection-bookmarks-toggle"]').click()`);
    await waitFor(`new URL(location.href).searchParams.get('favorites') === 'true' && document.querySelector('[data-testid="collection-bookmarks-toggle"]').getAttribute('aria-pressed') === 'true' && document.querySelectorAll('.bookmark-draggable').length === 2`, "the bookmarked gist view from the collection toggle");

    await evaluate(`document.querySelector('[data-testid="bookmarks-filter-trigger"]').click()`);
    await waitFor(`!new URL(location.href).searchParams.has('favorites') && document.querySelector('[data-testid="bookmarks-filter-trigger"]').getAttribute('aria-pressed') === 'false'`, "the all-gists view from the bookmark toolbar toggle");
    await evaluate(`document.querySelector('[data-testid="bookmarks-filter-trigger"]').click()`);
    await waitFor(`new URL(location.href).searchParams.get('favorites') === 'true' && document.querySelectorAll('.bookmark-draggable').length === 2`, "the bookmarked gist view from the toolbar button");
    const bookmarkWorkflow = await evaluate(`({
      dragHandles: document.querySelectorAll('.bookmark-draggable [draggable="true"][aria-label="Drag to reorder bookmark"]').length,
      firstTitle: document.querySelector('.bookmark-draggable:first-child h3')?.textContent ?? ''
    })`);
    if (bookmarkWorkflow.dragHandles !== 2 || !bookmarkWorkflow.firstTitle.includes("Browser search sample")) {
      verificationFailures.push(`Bookmark ordering or drag handles are unavailable: ${JSON.stringify(bookmarkWorkflow)}`);
    }

    const collectionUrl = new URL("/my-gists?collection=Regression", url).href;
    await send("Page.navigate", { url: collectionUrl }, sessionId);
    await waitFor(`document.querySelectorAll('.gist-collection-grid .neo-gist-card').length === 1 && document.body.innerText.includes('Collection: Regression')`, "collection-only filtering without the old body search");
    await evaluate(`document.querySelector('[data-testid="collection-bookmarks-toggle"]').click()`);
    await waitFor(`new URL(location.href).searchParams.get('favorites') === 'true' && new URL(location.href).searchParams.get('collection') === 'Regression' && document.querySelectorAll('.bookmark-draggable').length === 1`, "bookmark filtering inside a selected collection");
    await evaluate(`document.querySelector('[data-testid="collection-bookmarks-toggle"]').click()`);
    await waitFor(`!new URL(location.href).searchParams.has('favorites') && new URL(location.href).searchParams.get('collection') === 'Regression' && document.querySelectorAll('.gist-collection-grid .neo-gist-card').length === 1`, "removing bookmark filtering while preserving the selected collection");

    await send("Emulation.setDeviceMetricsOverride", {
      width: 360,
      height: 800,
      deviceScaleFactor: 1,
      mobile: true,
    }, sessionId);
    const collectionMobileLayout = await evaluate(`(() => {
      const button = document.querySelector('[data-testid="collection-bookmarks-toggle"]').getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        buttonTarget: Math.min(button.width, button.height)
      };
    })()`);
    if (collectionMobileLayout.overflow || collectionMobileLayout.buttonTarget < 44) {
      verificationFailures.push(`The mobile collection bookmark control is not usable: ${JSON.stringify(collectionMobileLayout)}`);
    }
    await send("Emulation.clearDeviceMetricsOverride", {}, sessionId);

    const collectionsUrl = new URL("/collections", url).href;
    await send("Page.navigate", { url: collectionsUrl }, sessionId);
    await waitFor(`Boolean(document.querySelector('a[href="/my-gists?favorites=true"]'))`, "the Collections bookmark shortcut");
  }

  if (process.env.BROWSER_CHECK_MARKDOWN === "1") {
    const { checkMarkdownCards } = await import('./test-markdown-cards.mjs');
    await checkMarkdownCards({ evaluate, send, sessionId, waitFor, url });
  }

  if (process.env.BROWSER_CHECK_DOCX === "1") {
    const { checkMarkdownDocx } = await import('./test-markdown-docx.mjs');
    await checkMarkdownDocx({ evaluate, send, sessionId, waitFor });
  }

  if (process.env.BROWSER_CHECK_CONVERTER === "1") {
    const { checkMarkdownConverter } = await import('./test-markdown-converter.mjs');
    await checkMarkdownConverter({ evaluate, send, sessionId, waitFor });
  }

  if (process.env.BROWSER_CHECK_CARD_TOOL === "1") {
    const { checkMarkdownCardTool } = await import('./test-markdown-card-tool.mjs');
    await checkMarkdownCardTool({ evaluate, send, sessionId, waitFor });
  }

  if (process.env.BROWSER_CHECK_MERMAID === "1") {
    const { checkMermaidImage } = await import('./test-mermaid-image.mjs');
    await checkMermaidImage({ evaluate, send, sessionId, waitFor });
  }

  if (process.env.BROWSER_CHECK_FORMULA === "1") {
    const { checkFormulaImage } = await import('./test-formula-image.mjs');
    await checkFormulaImage({ evaluate, send, sessionId, waitFor });
  }

  if (process.env.BROWSER_CHECK_MARKDOWN_TEXT === "1") {
    const { checkMarkdownText } = await import('./test-markdown-text.mjs');
    await checkMarkdownText({ evaluate, send, sessionId, waitFor });
  }

  if (process.env.BROWSER_CHECK_AGENT_SKILLS === "1") {
    const { checkAgentSkills } = await import('./test-agent-skills.mjs');
    await checkAgentSkills({ evaluate, send, sessionId, waitFor });
  }

  if (process.env.BROWSER_CHECK_TOOLS_GUIDE === "1") {
    const { checkToolsGuide } = await import('./test-tools-guide.mjs');
    await checkToolsGuide({ evaluate, send, sessionId, waitFor });
  }

  if (process.env.BROWSER_CHECK_HTML_IMAGE === "1") {
    const { checkHtmlImage } = await import('./test-html-image.mjs');
    await checkHtmlImage({ evaluate, send, sessionId, waitFor });
  }

  if (process.env.BROWSER_CHECK_LOCAL_SETTINGS === "1") {
    const { checkLocalSettings } = await import('./test-local-settings.mjs');
    await checkLocalSettings({ evaluate, send, sessionId, waitFor });
  }

  if (process.env.BROWSER_CHECK_GIST_COPY === "1") {
    const { checkGistCopy } = await import('./test-gist-copy.mjs');
    await checkGistCopy({ evaluate, send, sessionId, waitFor });
  }

  const failures = [...new Set([
    ...observedMessages.filter((message) => errorPatterns.some((pattern) => pattern.test(message))),
    ...verificationFailures,
  ])];

  if (failures.length > 0) {
    console.error(`Browser regression check failed for ${url}`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`Browser regression check passed for ${url}`);
  }
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  chrome.kill();
  await delay(250);
  await rm(profilePath, { recursive: true, force: true });
}
