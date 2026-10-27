import assert from 'node:assert/strict';
import test from 'node:test';

import sinon from 'sinon';

import { CookieHandlerDevtools } from '../interface/devtools/cookieHandlerDevtools.js';
import {
  createSinonBrowserMock,
  flushMicrotasks,
} from './mocks/sinonBrowserMock.js';

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

test('CookieHandlerDevtools - getAllCookies sends storeId and partitionKey to background script', async () => {
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
      partitionKey: {},
    },
  });
});

test('CookieHandlerDevtools - removeCookie sends removeCookie message to background script', async () => {
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
});

test('CookieHandlerDevtools - removeCookie forwards partitionKey when provided', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  const handler = await createInitializedDevtoolsHandler(detector, {
    id: 1,
    url: 'https://example.com/home',
    cookieStoreId: '0',
  });

  const partitionKey = { topLevelSite: 'https://example.com' };
  stubs.runtime.sendMessage.resetHistory();
  stubs.runtime.sendMessage.resolves({ name: 'part_cookie', partitionKey });

  const removed = await handler.removeCookie(
    'part_cookie',
    'https://example.com/home',
    partitionKey
  );
  assert.deepEqual(removed, { name: 'part_cookie', partitionKey });
  assert.deepEqual(stubs.runtime.sendMessage.firstCall.args[0], {
    type: 'removeCookie',
    params: {
      name: 'part_cookie',
      url: 'https://example.com/home',
      storeId: '0',
      partitionKey,
    },
  });
});

test('CookieHandlerDevtools - removeCookie throws Error on background error response', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  const handler = await createInitializedDevtoolsHandler(detector, {
    id: 1,
    url: 'https://example.com/home',
    cookieStoreId: '0',
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

for (const [label, domain, shouldEmit] of [
  ['matching domain emits cookiesChanged', '.example.com', true],
  ['non-matching domain does not emit', '.other.com', false],
]) {
  test(`CookieHandlerDevtools - onMessage cookiesChanged: ${label}`, async () => {
    const { detector } = createSinonBrowserMock();
    const handler = await createInitializedDevtoolsHandler(detector, {
      id: 1,
      url: 'https://example.com/home',
      cookieStoreId: '0',
    });

    const changedSpy = sinon.spy();
    handler.on('cookiesChanged', changedSpy);

    const payload = { cookie: { domain, name: 'sid' } };
    handler.onMessage({ type: 'cookiesChanged', data: payload });

    if (shouldEmit) {
      assert.equal(changedSpy.calledOnceWithExactly(payload), true);
    } else {
      assert.equal(changedSpy.called, false);
    }
  });
}

test('CookieHandlerDevtools - onMessage tabsChanged refreshes currentTab', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  const handler = await createInitializedDevtoolsHandler(detector, {
    id: 1,
    url: 'https://example.com/home',
    cookieStoreId: '0',
  });

  stubs.runtime.sendMessage.resolves([
    { id: 1, url: 'https://example.com/updated' },
  ]);
  handler.onMessage({
    type: 'tabsChanged',
    data: { status: 'complete' },
  });
  await flushMicrotasks();

  assert.equal(handler.currentTab.url, 'https://example.com/updated');
});
