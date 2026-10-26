import assert from 'node:assert/strict';
import test from 'node:test';

import { CookieHandlerDevtools } from '../interface/devtools/cookieHandlerDevtools.js';
import { createSinonBrowserMock } from './mocks/sinonBrowserMock.js';

/**
 * Creates and fully awaits initialization of a CookieHandlerDevtools instance.
 * @param {object} detector Browser detector mock.
 * @param {object} [currentTab] Tab object to assign after init.
 * @return {Promise<CookieHandlerDevtools>} Initialized handler.
 */
async function createInitializedDevtoolsHandler(
  detector,
  currentTab = { url: 'https://example.com' }
) {
  const handler = new CookieHandlerDevtools(detector);
  await handler.updateCurrentTab();
  handler.currentTab = currentTab;
  return handler;
}

test('CookieHandlerDevtools - saveCookie succeeds with Promise and returns cookie', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  const fakeSavedCookie = { name: 'auth_token', value: 'secret' };
  stubs.runtime.sendMessage.resolves({
    success: true,
    cookie: fakeSavedCookie,
  });

  const handler = await createInitializedDevtoolsHandler(detector, {
    url: 'https://example.com',
  });

  const saved = await handler.saveCookie(
    { name: 'auth_token', value: 'secret' },
    'https://example.com'
  );

  assert.deepEqual(saved, fakeSavedCookie);
});

test('CookieHandlerDevtools - saveCookie throws Error on background error response', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  stubs.runtime.sendMessage.resolves({
    success: false,
    error: 'Cookie name is required',
  });

  const handler = await createInitializedDevtoolsHandler(detector, {
    url: 'https://example.com',
  });

  await assert.rejects(
    async () => {
      await handler.saveCookie({ name: '' }, 'https://example.com');
    },
    {
      name: 'Error',
      message: 'Cookie name is required',
    }
  );
});

test('CookieHandlerDevtools - getAllCookies sends storeId to background script', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  const expectedCookies = [{ name: 'c1', value: 'v1' }];
  stubs.runtime.sendMessage.resolves(expectedCookies);

  const handler = await createInitializedDevtoolsHandler(detector, {
    url: 'https://example.com',
    cookieStoreId: 'firefox-container-2',
  });

  stubs.runtime.sendMessage.resetHistory();

  const cookies = await handler.getAllCookies();

  assert.deepEqual(cookies, expectedCookies);
  assert.equal(stubs.runtime.sendMessage.calledOnce, true);
  assert.deepEqual(stubs.runtime.sendMessage.firstCall.args[0], {
    type: 'getAllCookies',
    params: {
      url: 'https://example.com',
      storeId: 'firefox-container-2',
    },
  });
});

test('CookieHandlerDevtools - removeCookie sends request and throws on background error response', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  const handler = await createInitializedDevtoolsHandler(detector, {
    id: 1,
    url: 'https://example.com/home',
    cookieStoreId: '0',
  });

  stubs.runtime.sendMessage.resetHistory();
  stubs.runtime.sendMessage.resolves({ name: 'old_cookie' });

  const removed = await handler.removeCookie(
    'old_cookie',
    'https://example.com/home'
  );
  assert.deepEqual(removed, { name: 'old_cookie' });
  assert.deepEqual(stubs.runtime.sendMessage.firstCall.args[0], {
    type: 'removeCookie',
    params: {
      name: 'old_cookie',
      url: 'https://example.com/home',
      storeId: '0',
    },
  });

  stubs.runtime.sendMessage.resolves({
    success: false,
    error: 'Cannot remove cookie',
  });
  await assert.rejects(
    () => handler.removeCookie('old_cookie', 'https://example.com/home'),
    { message: 'Cannot remove cookie' }
  );
});

test('CookieHandlerDevtools - onMessage handles cookiesChanged and tabsChanged port events', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  const handler = await createInitializedDevtoolsHandler(detector, {
    id: 1,
    url: 'https://example.com/home',
    cookieStoreId: '0',
  });

  let emittedChange = null;
  handler.on('cookiesChanged', data => {
    emittedChange = data;
  });

  handler.onMessage({
    type: 'cookiesChanged',
    data: { cookie: { domain: '.example.com', name: 'sid' } },
  });
  assert.deepEqual(emittedChange, {
    cookie: { domain: '.example.com', name: 'sid' },
  });

  stubs.runtime.sendMessage.resolves([
    { id: 1, url: 'https://example.com/updated' },
  ]);
  handler.onMessage({
    type: 'tabsChanged',
    data: { status: 'complete' },
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(handler.currentTab.url, 'https://example.com/updated');
});
