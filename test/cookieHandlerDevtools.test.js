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

for (const [label, cookieStoreId, expectedParams] of [
  [
    'includes storeId when cookieStoreId is defined',
    'firefox-container-2',
    {
      url: 'https://example.com',
      tabId: 7,
      storeId: 'firefox-container-2',
    },
  ],
  [
    'omits storeId when cookieStoreId is undefined',
    undefined,
    {
      url: 'https://example.com',
      tabId: 7,
    },
  ],
]) {
  test(`CookieHandlerDevtools - getAllCookies: ${label}`, async () => {
    const { detector, stubs } = createSinonBrowserMock();
    const expectedCookies = [{ name: 'c1', value: 'v1' }];
    stubs.runtime.sendMessage.resolves(expectedCookies);

    const handler = await createInitializedDevtoolsHandler(detector, {
      id: 7,
      url: 'https://example.com',
      cookieStoreId,
    });

    stubs.runtime.sendMessage.resetHistory();

    const cookies = await handler.getAllCookies();

    assert.deepEqual(cookies, expectedCookies);
    assert.equal(stubs.runtime.sendMessage.calledOnce, true);
    assert.deepEqual(stubs.runtime.sendMessage.firstCall.args[0], {
      type: 'getAllCookies',
      params: expectedParams,
    });
  });
}

for (const [label, cookieStoreId, partitionKey, expectedParams] of [
  [
    'omits storeId when cookieStoreId is undefined',
    undefined,
    null,
    {
      name: 'old_cookie',
      url: 'https://example.com/home',
    },
  ],
  [
    'includes storeId when cookieStoreId is defined',
    '0',
    null,
    {
      name: 'old_cookie',
      url: 'https://example.com/home',
      storeId: '0',
    },
  ],
  [
    'forwards partitionKey when provided',
    '0',
    { topLevelSite: 'https://example.com' },
    {
      name: 'old_cookie',
      url: 'https://example.com/home',
      storeId: '0',
      partitionKey: { topLevelSite: 'https://example.com' },
    },
  ],
]) {
  test(`CookieHandlerDevtools - removeCookie: ${label}`, async () => {
    const { detector, stubs } = createSinonBrowserMock();
    const handler = await createInitializedDevtoolsHandler(detector, {
      id: 1,
      url: 'https://example.com/home',
      cookieStoreId,
    });

    stubs.runtime.sendMessage.resetHistory();
    stubs.runtime.sendMessage.resolves({ name: 'old_cookie' });

    const removed = await handler.removeCookie(
      'old_cookie',
      'https://example.com/home',
      partitionKey
    );
    assert.deepEqual(removed, { name: 'old_cookie' });
    assert.deepEqual(stubs.runtime.sendMessage.firstCall.args[0], {
      type: 'removeCookie',
      params: expectedParams,
    });
  });
}

test('CookieHandlerDevtools - removeCookie on Safari queries cookies and forwards resolved storeId and exact domain', async () => {
  const { detector, stubs } = createSinonBrowserMock({ browserName: 'safari' });
  const handler = await createInitializedDevtoolsHandler(detector, {
    id: 5,
    url: 'https://example.com/safari',
    cookieStoreId: undefined,
  });

  stubs.runtime.sendMessage.resetHistory();
  stubs.runtime.sendMessage
    .withArgs({
      type: 'getAllCookies',
      params: { url: 'https://example.com/safari', tabId: 5 },
    })
    .resolves([
      { name: 'sid', domain: '.example.com', storeId: 'safari-private' },
      { name: 'other', domain: '.example.com', storeId: 'safari-private' },
    ]);
  stubs.runtime.sendMessage
    .withArgs({
      type: 'removeCookie',
      params: {
        name: 'sid',
        url: 'http://.example.com',
        storeId: 'safari-private',
      },
    })
    .resolves({ name: 'sid' });

  await handler.removeCookie('sid', 'https://example.com/safari');
  assert.equal(stubs.runtime.sendMessage.callCount, 2);
  assert.deepEqual(stubs.runtime.sendMessage.secondCall.args[0], {
    type: 'removeCookie',
    params: {
      name: 'sid',
      url: 'http://.example.com',
      storeId: 'safari-private',
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
