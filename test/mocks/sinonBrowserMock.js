import { JSDOM } from 'jsdom';
import sinon from 'sinon';

import { Browsers } from '../../interface/lib/browsers.js';
import { Env } from '../../interface/lib/env.js';

/**
 * Creates a mock BrowserDetector equipped with Sinon stubs for extension APIs.
 * @param {object} [options={}] Custom stub behaviors or overrides.
 * @param {string} [options.browserName='chrome'] Browser name.
 * @return {{ detector: object, stubs: object }} Detector and attached stubs.
 */
export function createSinonBrowserMock(options = {}) {
  const browserName = options.browserName || 'chrome';

  const stubs = {
    cookies: {
      getAll: sinon.stub().resolves([]),
      getAllCookieStores: sinon.stub().resolves([{ id: '0', tabIds: [1] }]),
      set: sinon.stub().resolves({}),
      remove: sinon.stub().resolves({}),
      onChanged: { addListener: sinon.spy(), removeListener: sinon.spy() },
    },
    storage: {
      local: {
        get: sinon.stub().resolves({}),
        set: sinon.stub().resolves(),
      },
    },
    tabs: {
      query: sinon.stub().resolves([
        {
          id: 1,
          url: 'https://example.com/page',
          cookieStoreId: '0',
          active: true,
          currentWindow: true,
        },
      ]),
      onUpdated: { addListener: sinon.spy(), removeListener: sinon.spy() },
      onActivated: { addListener: sinon.spy(), removeListener: sinon.spy() },
    },
    permissions: {
      contains: sinon.stub().resolves(true),
      request: sinon.stub().resolves(true),
    },
    runtime: {
      sendMessage: sinon.stub().resolves({ success: true }),
      connect: sinon.stub().returns({
        name: 'panel',
        onMessage: { addListener: sinon.spy(), removeListener: sinon.spy() },
        onDisconnect: { addListener: sinon.spy(), removeListener: sinon.spy() },
        postMessage: sinon.spy(),
      }),
      onConnect: { addListener: sinon.spy(), removeListener: sinon.spy() },
      onMessage: { addListener: sinon.spy(), removeListener: sinon.spy() },
      getPlatformInfo: sinon.stub().resolves({ os: 'mac', arch: 'arm64' }),
      getManifest: sinon.stub().returns({ version: '1.13.0' }),
      getURL: sinon.stub().callsFake(path => `chrome-extension://mock/${path}`),
    },
    action: {
      setPopup: sinon.stub().resolves(),
    },
    sidePanel: {
      setPanelBehavior: sinon.stub().resolves(),
    },
    devtools: {
      inspectedWindow: { tabId: 1 },
    },
  };

  const detector = {
    getApi: () => stubs,
    isSafari: () => browserName === 'safari',
    isFirefox: () => browserName === 'firefox',
    isChrome: () => browserName === 'chrome',
    isEdge: () => browserName === 'edge',
    getBrowserName: () => browserName,
  };

  return { detector, stubs };
}

/**
 * Waits for a microtask turn so pending promises settle.
 * @return {Promise<void>}
 */
export function flushMicrotasks() {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Installs `globalThis.chrome` and `Env.browserName` for tests that use the
 * real `BrowserDetector`, returning a restore callback for teardown.
 * @param {object} stubs Sinon browser API stubs.
 * @param {string} [browserName=Browsers.Chrome] Browser name to set in Env.
 * @return {function(): void} Restore function.
 */
export function installChromeGlobal(stubs, browserName = Browsers.Chrome) {
  const hadChrome = 'chrome' in globalThis;
  const prevChrome = globalThis.chrome;
  const hadBrowser = 'browser' in globalThis;
  const prevBrowser = globalThis.browser;
  const prevBrowserName = Env.browserName;

  globalThis.chrome = stubs;
  delete globalThis.browser;
  Env.browserName = browserName;

  return () => {
    if (hadChrome) {
      globalThis.chrome = prevChrome;
    } else {
      delete globalThis.chrome;
    }
    if (hadBrowser) {
      globalThis.browser = prevBrowser;
    } else {
      delete globalThis.browser;
    }
    Env.browserName = prevBrowserName;
  };
}

/**
 * Initializes a JSDOM environment and binds `window`, `document`, and `Element`
 * on `globalThis`, returning a teardown function that closes the window and
 * restores previous globals.
 * @param {string} html HTML markup to load.
 * @return {{ dom: JSDOM, teardown: function(): void }}
 */
export function setupDom(html = '<!doctype html><html><body></body></html>') {
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevElement = globalThis.Element;

  const dom = new JSDOM(html);
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Element = dom.window.Element;

  const teardown = () => {
    dom.window.close();
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
    globalThis.Element = prevElement;
  };

  return { dom, teardown };
}
