import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as pw from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceExtensionDir = path.resolve(__dirname, '../../build/chrome');

export const test = pw.test.extend({
  // Local HTTP test server bound to 127.0.0.1 and resolved via example.test
  // eslint-disable-next-line no-empty-pattern
  testServerUrl: async ({}, use) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/html',
        Connection: 'close',
      });
      res.end(
        '<!doctype html><html><head><title>Test Page</title></head><body><h1>Test Site</h1></body></html>'
      );
    });

    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    const baseUrl = `http://example.test:${port}`;

    await use(baseUrl);

    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  },

  // Persistent Chromium context with the built Chrome extension loaded
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    // Stage a temporary copy of build/chrome with host_permissions granted
    // so headless Chromium allows real chrome.cookies API calls on test origins.
    const tmpRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'cookie-editor-e2e-')
    );
    const extDir = path.join(tmpRoot, 'ext');
    fs.cpSync(sourceExtensionDir, extDir, { recursive: true });

    const manifestPath = path.join(extDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.host_permissions = ['<all_urls>'];
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    const context = await pw.chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      args: [
        `--disable-extensions-except=${extDir}`,
        `--load-extension=${extDir}`,
        '--host-resolver-rules=MAP *.example.test 127.0.0.1,MAP example.test 127.0.0.1',
      ],
    });

    await use(context);

    await context.close();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  },

  // Discovers the MV3 background service worker and extracts the extension ID
  extensionId: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker');
    }
    const extensionId = serviceWorker.url().split('/')[2];
    await use(extensionId);
  },

  // Helper to open the extension popup targeting a specific tab URL
  openPopup: async ({ context, extensionId }, use) => {
    /**
     * Opens the popup UI bound to a target tab.
     * @param {string} targetUrl URL of the target tab to inspect.
     * @param {object} [options={}] Optional permission overrides.
     * @param {boolean} [options.hasPermission=true] Initial permission state.
     * @param {boolean} [options.grantOnRequest=true] Result when requesting permission.
     * @return {Promise<object>} The initialized popup page.
     */
    const openPopupForUrl = async (targetUrl, options = {}) => {
      const hasPermission = options.hasPermission ?? true;
      const grantOnRequest = options.grantOnRequest ?? true;

      // Ensure a real tab is open at targetUrl if it's an http(s) page
      if (targetUrl.startsWith('http')) {
        const existingPages = context
          .pages()
          .filter(p => p.url().startsWith(targetUrl));
        if (existingPages.length === 0) {
          const webPage = await context.newPage();
          await webPage.goto(targetUrl);
        }
      }

      const popupPage = await context.newPage();
      await popupPage.addInitScript(
        ({ target, initialPerm, grantPerm }) => {
          let permGranted = initialPerm;
          const origQuery = chrome.tabs.query.bind(chrome.tabs);

          // When opened as a tab in Playwright, redirect active-tab queries
          // to the target web page tab rather than the extension tab itself.
          chrome.tabs.query = async queryInfo => {
            if (queryInfo && queryInfo.active && queryInfo.currentWindow) {
              const allTabs = await origQuery({});
              const match = allTabs.find(t => t.url === target);
              if (match) {
                return [match];
              }
              return [
                {
                  id: 999,
                  url: target,
                  cookieStoreId: '0',
                  active: true,
                  currentWindow: true,
                },
              ];
            }
            return origQuery(queryInfo);
          };

          chrome.permissions.contains = async () => permGranted;
          chrome.permissions.request = async () => {
            if (grantPerm) {
              permGranted = true;
            }
            return permGranted;
          };
        },
        {
          target: targetUrl,
          initialPerm: hasPermission,
          grantPerm: grantOnRequest,
        }
      );

      await popupPage.goto(
        `chrome-extension://${extensionId}/interface/popup/cookie-list.html`
      );
      return popupPage;
    };

    await use(openPopupForUrl);
  },
});

export const expect = test.expect;
