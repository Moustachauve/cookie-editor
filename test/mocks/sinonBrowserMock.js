import sinon from 'sinon';

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
    supportsSidePanel: () => Boolean(options.supportsSidePanel),
    overrideBrowserName: sinon.spy(),
  };

  return { detector, stubs };
}
