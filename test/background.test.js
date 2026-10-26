import assert from 'node:assert/strict';
import test from 'node:test';

import sinon from 'sinon';

import { Browsers } from '../interface/lib/browsers.js';
import { Env } from '../interface/lib/env.js';
import { createSinonBrowserMock } from './mocks/sinonBrowserMock.js';

let importCounter = 0;

/**
 * Runs a fresh instance of the background service worker against provided stubs.
 * @param {object} stubs Sinon browser API stubs.
 * @param {string} [browserName='chrome'] Browser name to set in Env.
 * @return {Promise<void>}
 */
async function loadBackgroundScript(stubs, browserName = Browsers.Chrome) {
  globalThis.chrome = stubs;
  delete globalThis.browser;
  Env.browserName = browserName;
  importCounter += 1;
  await import(`../cookie-editor.js?test=${importCounter}`);
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

test('background script (cookie-editor.js) - registers listeners synchronously and configures sidePanel', async () => {
  const { stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  await loadBackgroundScript(stubs, Browsers.Chrome);

  assert.equal(stubs.runtime.onConnect.addListener.calledOnce, true);
  assert.equal(stubs.runtime.onMessage.addListener.calledOnce, true);
  assert.equal(stubs.tabs.onUpdated.addListener.calledOnce, true);
  assert.equal(stubs.cookies.onChanged.addListener.calledOnce, true);
  assert.equal(
    stubs.sidePanel.setPanelBehavior.calledOnceWithExactly({
      openPanelOnActionClick: false,
    }),
    true
  );
});

test('background script - configures mobile popup on Firefox Android and iOS Safari', async () => {
  const { stubs: ffStubs } = createSinonBrowserMock({ browserName: 'firefox' });
  ffStubs.runtime.getPlatformInfo.resolves({ os: 'android' });
  await loadBackgroundScript(ffStubs, Browsers.Firefox);

  assert.equal(
    ffStubs.action.setPopup.calledOnceWithExactly({
      popup: '/interface/popup-mobile/cookie-list.html',
    }),
    true
  );

  const { stubs: iosStubs } = createSinonBrowserMock({ browserName: 'chrome' });
  iosStubs.runtime.getPlatformInfo.resolves({ os: 'ios' });
  await loadBackgroundScript(iosStubs, Browsers.Chrome);

  assert.equal(Env.browserName, Browsers.Safari);
  assert.equal(
    iosStubs.action.setPopup.calledOnceWithExactly({
      popup: '/interface/popup-mobile/cookie-list.html',
    }),
    true
  );
});

test('background script - handleMessage routes tab, cookie, and permission queries', async () => {
  const { stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  await loadBackgroundScript(stubs, Browsers.Chrome);
  const handleMessage = stubs.runtime.onMessage.addListener.firstCall.args[0];

  const expectedTabs = [{ id: 10, url: 'https://example.com' }];
  stubs.tabs.query.resolves(expectedTabs);
  assert.deepEqual(
    await sendBackgroundMessage(handleMessage, { type: 'getTabs' }),
    expectedTabs
  );
  assert.deepEqual(
    await sendBackgroundMessage(handleMessage, { type: 'getCurrentTab' }),
    expectedTabs
  );

  const fakeCookies = [{ name: 'a', value: 'b' }];
  stubs.cookies.getAll.resolves(fakeCookies);
  assert.deepEqual(
    await sendBackgroundMessage(handleMessage, {
      type: 'getAllCookies',
      params: { url: 'https://example.com', storeId: '0' },
    }),
    fakeCookies
  );
  assert.deepEqual(stubs.cookies.getAll.firstCall.args[0], {
    url: 'https://example.com',
    storeId: '0',
  });

  stubs.cookies.remove.resolves({ name: 'sid' });
  assert.deepEqual(
    await sendBackgroundMessage(handleMessage, {
      type: 'removeCookie',
      params: { name: 'sid', url: 'https://example.com' },
    }),
    { name: 'sid' }
  );

  stubs.permissions.contains.resolves(true);
  assert.equal(
    await sendBackgroundMessage(handleMessage, {
      type: 'permissionsContains',
      params: 'https://example.com',
    }),
    true
  );

  stubs.permissions.request.resolves(false);
  assert.equal(
    await sendBackgroundMessage(handleMessage, {
      type: 'permissionsRequest',
      params: 'https://example.com',
    }),
    false
  );
});

test('background script - handleMessage saveCookie wraps success and error responses', async () => {
  const { stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  await loadBackgroundScript(stubs, Browsers.Chrome);
  const handleMessage = stubs.runtime.onMessage.addListener.firstCall.args[0];

  const savedCookie = { name: 'sid', value: '123' };
  stubs.cookies.set.resolves(savedCookie);
  const saveRes = await sendBackgroundMessage(handleMessage, {
    type: 'saveCookie',
    params: { cookie: savedCookie },
  });
  assert.deepEqual(saveRes, { success: true, cookie: savedCookie });

  stubs.cookies.set.rejects(new Error('Set failed'));
  const saveErrRes = await sendBackgroundMessage(handleMessage, {
    type: 'saveCookie',
    params: { cookie: savedCookie },
  });
  assert.deepEqual(saveErrRes, { success: false, error: 'Set failed' });
});

test('background script - routes tab-scoped port messages and cleans up on disconnect', async () => {
  const { stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  await loadBackgroundScript(stubs, Browsers.Chrome);

  const onConnect = stubs.runtime.onConnect.addListener.firstCall.args[0];
  const onTabsChanged = stubs.tabs.onUpdated.addListener.firstCall.args[0];

  const devtoolPort = {
    name: 'panel',
    onMessage: { addListener: sinon.spy(), removeListener: sinon.spy() },
    onDisconnect: { addListener: sinon.spy() },
    postMessage: sinon.spy(),
  };

  onConnect(devtoolPort);
  const devtoolMsgListener =
    devtoolPort.onMessage.addListener.firstCall.args[0];
  devtoolMsgListener({ type: 'init_cookieHandler', tabId: 42 }, devtoolPort);

  onTabsChanged(42, { status: 'complete' }, {});
  assert.equal(devtoolPort.postMessage.calledOnce, true);
  assert.deepEqual(devtoolPort.postMessage.firstCall.args[0], {
    type: 'tabsChanged',
    data: { status: 'complete' },
  });

  // Disconnect devtoolPort and verify it no longer receives tab updates
  const disconnectListener =
    devtoolPort.onDisconnect.addListener.firstCall.args[0];
  disconnectListener(devtoolPort);
  assert.equal(devtoolPort.onMessage.removeListener.calledOnce, true);

  onTabsChanged(42, { status: 'complete' }, {});
  assert.equal(devtoolPort.postMessage.callCount, 1);
});

test('background script - broadcasts cookiesChanged and optionsChanged to all connected ports', async () => {
  const { stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  await loadBackgroundScript(stubs, Browsers.Chrome);

  const onConnect = stubs.runtime.onConnect.addListener.firstCall.args[0];
  const onCookiesChanged =
    stubs.cookies.onChanged.addListener.firstCall.args[0];
  const handleMessage = stubs.runtime.onMessage.addListener.firstCall.args[0];

  const devtoolPort = {
    name: 'panel',
    onMessage: { addListener: sinon.spy(), removeListener: sinon.spy() },
    onDisconnect: { addListener: sinon.spy() },
    postMessage: sinon.spy(),
  };
  const optionsPort = {
    name: 'options-guid-1',
    onMessage: { addListener: sinon.spy(), removeListener: sinon.spy() },
    onDisconnect: { addListener: sinon.spy() },
    postMessage: sinon.spy(),
  };

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
  assert.equal(devtoolPort.postMessage.calledOnce, true);
  assert.equal(optionsPort.postMessage.calledOnce, true);
  assert.deepEqual(optionsPort.postMessage.firstCall.args[0], {
    type: 'cookiesChanged',
    data: cookieChangeInfo,
  });

  handleMessage(
    { type: 'optionsChanged', params: { from: 'options-guid-1' } },
    {},
    () => {}
  );
  assert.equal(devtoolPort.postMessage.callCount, 2);
  assert.equal(optionsPort.postMessage.callCount, 2);
});
