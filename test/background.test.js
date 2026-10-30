import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import sinon from 'sinon';

import { Browsers } from '../interface/lib/browsers.js';
import { Env } from '../interface/lib/env.js';
import {
  createSinonBrowserMock,
  flushMicrotasks,
  installChromeGlobal,
} from './mocks/sinonBrowserMock.js';

let importCounter = 0;
let restoreGlobals = null;

afterEach(() => {
  if (restoreGlobals) {
    restoreGlobals();
    restoreGlobals = null;
  }
  sinon.restore();
});

/**
 * Runs a fresh instance of the background service worker against provided stubs.
 * @param {object} stubs Sinon browser API stubs.
 * @param {string} [browserName=Browsers.Chrome] Browser name to set in Env.
 * @return {Promise<void>}
 */
async function loadBackgroundScript(stubs, browserName = Browsers.Chrome) {
  if (restoreGlobals) {
    restoreGlobals();
  }
  restoreGlobals = installChromeGlobal(stubs, browserName);
  importCounter += 1;
  await import(`../cookie-editor.js?test=${importCounter}`);
  await flushMicrotasks();
}

/**
 * Invokes the background runtime.onMessage listener and returns the response via Promise.
 * @param {function} handleMessage Background message handler.
 * @param {object} message Message payload.
 * @return {Promise<any>}
 */
function sendBackgroundMessage(handleMessage, message) {
  return new Promise(resolve => {
    const keepChannelOpen = handleMessage(message, {}, resolve);
    assert.equal(keepChannelOpen, true);
  });
}

/**
 * Creates a fake runtime.Port object with Sinon spies.
 * @param {string} [name='panel'] Port name.
 * @return {object}
 */
function createPort(name = 'panel') {
  return {
    name,
    onMessage: { addListener: sinon.spy(), removeListener: sinon.spy() },
    onDisconnect: { addListener: sinon.spy() },
    postMessage: sinon.spy(),
  };
}

test('background script - registers event listeners synchronously at startup', async () => {
  const { stubs } = createSinonBrowserMock();
  await loadBackgroundScript(stubs, Browsers.Chrome);

  assert.equal(stubs.runtime.onConnect.addListener.calledOnce, true);
  assert.equal(stubs.runtime.onMessage.addListener.calledOnce, true);
  assert.equal(stubs.tabs.onUpdated.addListener.calledOnce, true);
  assert.equal(stubs.cookies.onChanged.addListener.calledOnce, true);
});

test('background script - configures sidePanel behavior when supported', async () => {
  const { stubs } = createSinonBrowserMock();
  await loadBackgroundScript(stubs, Browsers.Chrome);

  assert.equal(
    stubs.sidePanel.setPanelBehavior.calledOnceWithExactly({
      openPanelOnActionClick: false,
    }),
    true
  );
});

for (const [label, browserName, os, shouldSetPopup, expectedBrowser] of [
  ['Firefox on Android', Browsers.Firefox, 'android', true, Browsers.Firefox],
  [
    'iOS overrides browser to Safari',
    Browsers.Chrome,
    'ios',
    true,
    Browsers.Safari,
  ],
  ['Desktop Chrome on macOS', Browsers.Chrome, 'mac', false, Browsers.Chrome],
]) {
  test(`background script - mobile popup configuration: ${label}`, async () => {
    const { stubs } = createSinonBrowserMock({ browserName });
    stubs.runtime.getPlatformInfo.resolves({ os });
    await loadBackgroundScript(stubs, browserName);

    assert.equal(Env.browserName, expectedBrowser);
    if (shouldSetPopup) {
      assert.equal(
        stubs.action.setPopup.calledOnceWithExactly({
          popup: '/interface/popup-mobile/cookie-list.html',
        }),
        true
      );
    } else {
      assert.equal(stubs.action.setPopup.called, false);
    }
  });
}

for (const { name, message, setupStub, expectedResponse, verifyCall } of [
  {
    name: 'getTabs queries all tabs',
    message: { type: 'getTabs' },
    setupStub: stubs => stubs.tabs.query.resolves([{ id: 10 }]),
    expectedResponse: [{ id: 10 }],
    verifyCall: stubs =>
      assert.deepEqual(stubs.tabs.query.firstCall.args[0], {}),
  },
  {
    name: 'getCurrentTab queries active tab in currentWindow',
    message: { type: 'getCurrentTab' },
    setupStub: stubs => stubs.tabs.query.resolves([{ id: 20 }]),
    expectedResponse: [{ id: 20 }],
    verifyCall: stubs =>
      assert.deepEqual(stubs.tabs.query.firstCall.args[0], {
        active: true,
        currentWindow: true,
      }),
  },
  {
    name: 'getAllCookies forwards url, storeId, and partitionKey to cookies.getAll',
    message: {
      type: 'getAllCookies',
      params: { url: 'https://example.com', storeId: '0' },
    },
    setupStub: stubs => stubs.cookies.getAll.resolves([{ name: 'a' }]),
    expectedResponse: [{ name: 'a' }],
    verifyCall: stubs =>
      assert.deepEqual(stubs.cookies.getAll.firstCall.args[0], {
        url: 'https://example.com',
        storeId: '0',
        partitionKey: {},
      }),
  },
  {
    name: 'removeCookie forwards name and url to cookies.remove',
    message: {
      type: 'removeCookie',
      params: { name: 'sid', url: 'https://example.com' },
    },
    setupStub: stubs => stubs.cookies.remove.resolves({ name: 'sid' }),
    expectedResponse: { name: 'sid' },
    verifyCall: stubs =>
      assert.deepEqual(stubs.cookies.remove.firstCall.args[0], {
        name: 'sid',
        url: 'https://example.com',
      }),
  },
  {
    name: 'removeCookie forwards storeId and partitionKey when present',
    message: {
      type: 'removeCookie',
      params: {
        name: 'part_sid',
        url: 'https://example.com',
        storeId: '0',
        partitionKey: { topLevelSite: 'https://example.com' },
      },
    },
    setupStub: stubs => stubs.cookies.remove.resolves({ name: 'part_sid' }),
    expectedResponse: { name: 'part_sid' },
    verifyCall: stubs =>
      assert.deepEqual(stubs.cookies.remove.firstCall.args[0], {
        name: 'part_sid',
        url: 'https://example.com',
        storeId: '0',
        partitionKey: { topLevelSite: 'https://example.com' },
      }),
  },
  {
    name: 'permissionsContains checks expanded origins',
    message: {
      type: 'permissionsContains',
      params: 'https://sub.example.com/',
    },
    setupStub: stubs => stubs.permissions.contains.resolves(true),
    expectedResponse: true,
    verifyCall: stubs =>
      assert.deepEqual(stubs.permissions.contains.firstCall.args[0], {
        origins: ['https://sub.example.com/*', 'https://*.example.com/*'],
      }),
  },
  {
    name: 'permissionsRequest requests expanded origins',
    message: { type: 'permissionsRequest', params: 'https://sub.example.com/' },
    setupStub: stubs => stubs.permissions.request.resolves(false),
    expectedResponse: false,
    verifyCall: stubs =>
      assert.deepEqual(stubs.permissions.request.firstCall.args[0], {
        origins: ['https://sub.example.com/*', 'https://*.example.com/*'],
      }),
  },
]) {
  test(`background script - handleMessage: ${name}`, async () => {
    const { stubs } = createSinonBrowserMock();
    setupStub(stubs);
    await loadBackgroundScript(stubs, Browsers.Chrome);
    const handleMessage = stubs.runtime.onMessage.addListener.firstCall.args[0];

    const res = await sendBackgroundMessage(handleMessage, message);
    assert.deepEqual(res, expectedResponse);
    verifyCall(stubs);
  });
}

test('background script - handleMessage saveCookie returns success payload', async () => {
  const { stubs } = createSinonBrowserMock();
  const savedCookie = { name: 'sid', value: '123' };
  stubs.cookies.set.resolves(savedCookie);
  await loadBackgroundScript(stubs, Browsers.Chrome);
  const handleMessage = stubs.runtime.onMessage.addListener.firstCall.args[0];

  const saveRes = await sendBackgroundMessage(handleMessage, {
    type: 'saveCookie',
    params: { cookie: savedCookie },
  });
  assert.deepEqual(saveRes, { success: true, cookie: savedCookie });
});

test('background script - handleMessage saveCookie returns error payload on rejection', async () => {
  const { stubs } = createSinonBrowserMock();
  stubs.cookies.set.rejects(new Error('Set failed'));
  await loadBackgroundScript(stubs, Browsers.Chrome);
  const handleMessage = stubs.runtime.onMessage.addListener.firstCall.args[0];

  const saveErrRes = await sendBackgroundMessage(handleMessage, {
    type: 'saveCookie',
    params: { cookie: { name: 'sid', value: '123' } },
  });
  assert.deepEqual(saveErrRes, { success: false, error: 'Set failed' });
});

test('background script - handleMessage getAllCookies on Safari resolves storeId from getAllCookieStores when storeId is omitted', async () => {
  const { stubs } = createSinonBrowserMock({ browserName: Browsers.Safari });
  stubs.runtime.getPlatformInfo.resolves({ os: 'mac' });
  stubs.cookies.getAllCookieStores.resolves([
    { id: 'safari-store-1', tabIds: [10] },
    { id: 'safari-store-2', tabIds: [20] },
  ]);
  stubs.cookies.getAll.resolves([{ name: 'safari_sid', value: 'abc' }]);

  await loadBackgroundScript(stubs, Browsers.Safari);
  const handleMessage = stubs.runtime.onMessage.addListener.firstCall.args[0];

  const cookies = await sendBackgroundMessage(handleMessage, {
    type: 'getAllCookies',
    params: { url: 'https://example.com', tabId: 20 },
  });

  assert.deepEqual(cookies, [{ name: 'safari_sid', value: 'abc' }]);
  assert.equal(stubs.cookies.getAllCookieStores.calledOnce, true);
  assert.equal(stubs.cookies.getAll.calledOnce, true);
  assert.deepEqual(stubs.cookies.getAll.firstCall.args[0], {
    url: 'https://example.com',
    storeId: 'safari-store-2',
  });
});

test('background script - handleMessage saveCookie on Safari resolves storeId from getAllCookieStores when storeId is omitted', async () => {
  const { stubs } = createSinonBrowserMock({ browserName: Browsers.Safari });
  stubs.runtime.getPlatformInfo.resolves({ os: 'mac' });
  stubs.cookies.getAllCookieStores.resolves([
    { id: 'safari-store-1', tabIds: [10] },
    { id: 'safari-store-2', tabIds: [20] },
  ]);
  const savedCookie = {
    name: 'safari_sid',
    value: 'abc',
    storeId: 'safari-store-2',
  };
  stubs.cookies.set.resolves(savedCookie);

  await loadBackgroundScript(stubs, Browsers.Safari);
  const handleMessage = stubs.runtime.onMessage.addListener.firstCall.args[0];

  const res = await sendBackgroundMessage(handleMessage, {
    type: 'saveCookie',
    params: {
      cookie: { name: 'safari_sid', value: 'abc', url: 'http://example.com' },
      tabId: 20,
    },
  });

  assert.deepEqual(res, { success: true, cookie: savedCookie });
  assert.equal(stubs.cookies.getAllCookieStores.calledOnce, true);
  assert.deepEqual(stubs.cookies.set.firstCall.args[0], {
    name: 'safari_sid',
    value: 'abc',
    url: 'http://example.com',
    storeId: 'safari-store-2',
  });
});

test('background script - routes tab-scoped port messages and cleans up on disconnect', async () => {
  const { stubs } = createSinonBrowserMock();
  await loadBackgroundScript(stubs, Browsers.Chrome);

  const onConnect = stubs.runtime.onConnect.addListener.firstCall.args[0];
  const onTabsChanged = stubs.tabs.onUpdated.addListener.firstCall.args[0];

  const devtoolPort = createPort('panel');
  onConnect(devtoolPort);
  devtoolPort.onMessage.addListener.firstCall.args[0](
    { type: 'init_cookieHandler', tabId: 42 },
    devtoolPort
  );

  onTabsChanged(42, { status: 'complete' }, {});
  assert.equal(devtoolPort.postMessage.calledOnce, true);
  assert.deepEqual(devtoolPort.postMessage.firstCall.args[0], {
    type: 'tabsChanged',
    data: { status: 'complete' },
  });

  // Disconnect devtoolPort and verify it no longer receives tab updates
  devtoolPort.onDisconnect.addListener.firstCall.args[0](devtoolPort);
  assert.equal(devtoolPort.onMessage.removeListener.calledOnce, true);

  onTabsChanged(42, { status: 'complete' }, {});
  assert.equal(devtoolPort.postMessage.callCount, 1);
});

test('background script - broadcasts cookiesChanged to all connected ports', async () => {
  const { stubs } = createSinonBrowserMock();
  await loadBackgroundScript(stubs, Browsers.Chrome);

  const onConnect = stubs.runtime.onConnect.addListener.firstCall.args[0];
  const onCookiesChanged =
    stubs.cookies.onChanged.addListener.firstCall.args[0];

  const devtoolPort = createPort('panel');
  const optionsPort = createPort('options-guid-1');

  onConnect(devtoolPort);
  onConnect(optionsPort);

  devtoolPort.onMessage.addListener.firstCall.args[0](
    { type: 'init_cookieHandler', tabId: 42 },
    devtoolPort
  );
  optionsPort.onMessage.addListener.firstCall.args[0](
    { type: 'init_optionsHandler' },
    optionsPort
  );

  const cookieChangeInfo = {
    removed: false,
    cookie: { name: 'c', value: 'v' },
  };
  onCookiesChanged(cookieChangeInfo);

  const expectedPayload = {
    type: 'cookiesChanged',
    data: cookieChangeInfo,
  };
  assert.deepEqual(devtoolPort.postMessage.firstCall.args[0], expectedPayload);
  assert.deepEqual(optionsPort.postMessage.firstCall.args[0], expectedPayload);
});

test('background script - broadcasts optionsChanged to all connected ports', async () => {
  const { stubs } = createSinonBrowserMock();
  await loadBackgroundScript(stubs, Browsers.Chrome);

  const onConnect = stubs.runtime.onConnect.addListener.firstCall.args[0];
  const handleMessage = stubs.runtime.onMessage.addListener.firstCall.args[0];

  const devtoolPort = createPort('panel');
  const optionsPort = createPort('options-guid-1');

  onConnect(devtoolPort);
  onConnect(optionsPort);

  devtoolPort.onMessage.addListener.firstCall.args[0](
    { type: 'init_cookieHandler', tabId: 42 },
    devtoolPort
  );
  optionsPort.onMessage.addListener.firstCall.args[0](
    { type: 'init_optionsHandler' },
    optionsPort
  );

  const keepOpen = handleMessage(
    { type: 'optionsChanged', params: { from: 'options-guid-1' } },
    {},
    () => {}
  );
  assert.equal(keepOpen, true);

  const expectedPayload = {
    type: 'optionsChanged',
    data: { from: 'options-guid-1' },
  };
  assert.deepEqual(devtoolPort.postMessage.firstCall.args[0], expectedPayload);
  assert.deepEqual(optionsPort.postMessage.firstCall.args[0], expectedPayload);
});
