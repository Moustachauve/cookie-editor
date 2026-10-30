import assert from 'node:assert/strict';
import test from 'node:test';

import { GenericCookieHandler } from '../interface/lib/genericCookieHandler.js';
import { createSinonBrowserMock } from './mocks/sinonBrowserMock.js';

test('GenericCookieHandler - prepareCookie standard chrome', () => {
  const { detector } = createSinonBrowserMock({ browserName: 'chrome' });
  const handler = new GenericCookieHandler(detector);
  handler.currentTab = { url: 'https://example.com/page', cookieStoreId: '0' };

  const inputCookie = {
    name: 'session_id',
    value: 'abc123xyz',
    domain: 'example.com',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'lax',
    expirationDate: 1800000000,
  };

  const prepared = handler.prepareCookie(
    inputCookie,
    'https://example.com/page'
  );
  assert.equal(prepared.name, 'session_id');
  assert.equal(prepared.value, 'abc123xyz');
  assert.equal(prepared.domain, 'example.com');
  assert.equal(prepared.path, '/');
  assert.equal(prepared.secure, true);
  assert.equal(prepared.httpOnly, true);
  assert.equal(prepared.sameSite, 'lax');
  assert.equal(prepared.expirationDate, 1800000000);
  assert.equal(prepared.storeId, '0');
  assert.equal(prepared.url, 'https://example.com/page');
});

test('GenericCookieHandler - prepareCookie with sameSite no_restriction forces secure=true', () => {
  const { detector } = createSinonBrowserMock({ browserName: 'chrome' });
  const handler = new GenericCookieHandler(detector);
  handler.currentTab = { url: 'https://example.com/page' };

  const inputCookie = {
    name: 'cross_site_cookie',
    value: 'val',
    domain: 'example.com',
    path: '/',
    secure: false,
    sameSite: 'no_restriction',
  };

  const prepared = handler.prepareCookie(
    inputCookie,
    'https://example.com/page'
  );
  assert.equal(prepared.sameSite, 'no_restriction');
  assert.equal(prepared.secure, true);
});

test('GenericCookieHandler - prepareCookie Safari domain fallback quirks', () => {
  const { detector } = createSinonBrowserMock({ browserName: 'safari' });
  const handler = new GenericCookieHandler(detector);
  handler.currentTab = {};

  const inputCookie = {
    name: 'safari_cookie',
    value: 'val',
    domain: '.example.com',
  };

  const prepared = handler.prepareCookie(inputCookie, '');
  assert.equal(prepared.url, 'http://.example.com');
});

test('GenericCookieHandler - prepareCookie clears domain when hostOnly is true', () => {
  const { detector } = createSinonBrowserMock({ browserName: 'chrome' });
  const handler = new GenericCookieHandler(detector);
  handler.currentTab = {
    url: 'https://example.com/app',
    cookieStoreId: '0',
  };

  const hostOnlyPrepared = handler.prepareCookie(
    {
      name: 'host_cookie',
      value: '1',
      domain: 'example.com',
      hostOnly: true,
    },
    'https://example.com/app'
  );
  assert.equal(hostOnlyPrepared.domain, null);
});

test('GenericCookieHandler - saveCookie calls chrome.cookies.set with prepared data', async () => {
  const { detector, stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  const savedResult = { name: 'my_cookie', value: '123' };
  stubs.cookies.set.resolves(savedResult);

  const handler = new GenericCookieHandler(detector);
  handler.currentTab = { url: 'https://example.com/page' };

  const res = await handler.saveCookie(
    { name: 'my_cookie', value: '123', domain: 'example.com' },
    'https://example.com/page'
  );

  assert.equal(res, savedResult);
  assert.equal(stubs.cookies.set.calledOnce, true);
  const passedArg = stubs.cookies.set.firstCall.args[0];
  assert.equal(passedArg.name, 'my_cookie');
  assert.equal(passedArg.value, '123');
});

test('GenericCookieHandler - removeCookie calls chrome.cookies.remove', async () => {
  const { detector, stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  const removedResult = { name: 'my_cookie', url: 'https://example.com/page' };
  stubs.cookies.remove.resolves(removedResult);

  const handler = new GenericCookieHandler(detector);
  handler.currentTab = {
    url: 'https://example.com/page',
    cookieStoreId: 'firefox-container-1',
  };

  const res = await handler.removeCookie(
    'my_cookie',
    'https://example.com/page'
  );
  assert.equal(res, removedResult);
  assert.equal(stubs.cookies.remove.calledOnce, true);
  assert.deepEqual(stubs.cookies.remove.firstCall.args[0], {
    name: 'my_cookie',
    url: 'https://example.com/page',
    storeId: 'firefox-container-1',
  });
});

test('GenericCookieHandler - removeCookie on Safari queries all cookies and removes each matching domain', async () => {
  const { detector, stubs } = createSinonBrowserMock({
    browserName: 'safari',
  });
  stubs.cookies.getAll.resolves([
    { name: 'session_token', domain: 'example.com' },
    { name: 'session_token', domain: '.example.com' },
    { name: 'unrelated_cookie', domain: 'other.com' },
  ]);
  stubs.cookies.remove.resolves({ name: 'session_token' });

  const handler = new GenericCookieHandler(detector);
  handler.currentTab = {
    url: 'https://example.com/page',
    cookieStoreId: '0',
  };

  await handler.removeCookie('session_token', 'https://example.com/page');

  assert.equal(stubs.cookies.getAll.calledOnce, true);
  assert.equal(stubs.cookies.remove.callCount, 2);
  assert.deepEqual(stubs.cookies.remove.firstCall.args[0], {
    name: 'session_token',
    url: 'http://example.com',
    storeId: '0',
  });
  assert.deepEqual(stubs.cookies.remove.secondCall.args[0], {
    name: 'session_token',
    url: 'http://.example.com',
    storeId: '0',
  });
});

test('GenericCookieHandler - removeCookie on Safari forwards resolved cookie.storeId when cookieStoreId is undefined', async () => {
  const { detector, stubs } = createSinonBrowserMock({
    browserName: 'safari',
  });
  stubs.cookies.getAllCookieStores.resolves([
    { id: 'safari-default', tabIds: [1] },
    { id: 'safari-private', tabIds: [42] },
  ]);
  stubs.cookies.getAll.resolves([
    { name: 'session_token', domain: 'example.com', storeId: 'safari-private' },
  ]);
  stubs.cookies.remove.resolves({ name: 'session_token' });

  const handler = new GenericCookieHandler(detector);
  handler.currentTab = {
    id: 42,
    url: 'https://example.com/page',
    cookieStoreId: undefined,
  };

  await handler.removeCookie('session_token', 'https://example.com/page');

  assert.equal(stubs.cookies.getAll.calledOnce, true);
  assert.equal(stubs.cookies.remove.calledOnce, true);
  assert.deepEqual(stubs.cookies.remove.firstCall.args[0], {
    name: 'session_token',
    url: 'http://example.com',
    storeId: 'safari-private',
  });
});

test('GenericCookieHandler - saveCookie on Safari resolves tab storeId via getAllCookieStores when storeId is omitted', async () => {
  const { detector, stubs } = createSinonBrowserMock({
    browserName: 'safari',
  });
  stubs.cookies.getAllCookieStores.resolves([
    { id: 'safari-default', tabIds: [1] },
    { id: 'safari-private', tabIds: [42] },
  ]);
  const savedResult = {
    name: 'new_cookie',
    value: '123',
    storeId: 'safari-private',
  };
  stubs.cookies.set.resolves(savedResult);

  const handler = new GenericCookieHandler(detector);
  handler.currentTab = {
    id: 42,
    url: 'https://example.com/page',
    cookieStoreId: undefined,
  };

  const res = await handler.saveCookie(
    { name: 'new_cookie', value: '123', domain: 'example.com' },
    'https://example.com/page'
  );

  assert.equal(res, savedResult);
  assert.equal(stubs.cookies.set.calledOnce, true);
  assert.equal(stubs.cookies.set.firstCall.args[0].storeId, 'safari-private');
});

test('GenericCookieHandler - prepareCookie with partitionKey preserves partitionKey without forcing secure=true', () => {
  const { detector } = createSinonBrowserMock({ browserName: 'firefox' });
  const handler = new GenericCookieHandler(detector);
  handler.currentTab = { url: 'http://example.com/page' };

  const partitionKey = {
    topLevelSite: 'http://example.com',
  };
  const prepared = handler.prepareCookie(
    {
      name: 'tcp_cookie',
      value: 'part_val',
      domain: '.example.com',
      path: '/',
      secure: false,
      partitionKey,
    },
    'http://example.com/page'
  );
  assert.deepEqual(prepared.partitionKey, partitionKey);
  assert.equal(prepared.secure, null);
});

test('GenericCookieHandler - removeCookie forwards partitionKey when provided', async () => {
  const { detector, stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  const partitionKey = { topLevelSite: 'https://example.com' };
  const removedResult = {
    name: 'part_cookie',
    url: 'https://example.com/page',
    partitionKey,
  };
  stubs.cookies.remove.resolves(removedResult);

  const handler = new GenericCookieHandler(detector);
  handler.currentTab = {
    url: 'https://example.com/page',
    cookieStoreId: '0',
  };

  const res = await handler.removeCookie(
    'part_cookie',
    'https://example.com/page',
    partitionKey
  );
  assert.equal(res, removedResult);
  assert.deepEqual(stubs.cookies.remove.firstCall.args[0], {
    name: 'part_cookie',
    url: 'https://example.com/page',
    storeId: '0',
    partitionKey,
  });
});

test('GenericCookieHandler - getAllCookies queries cookies for currentTab url, storeId, and partitionKey', async () => {
  const { detector, stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  const handler = new GenericCookieHandler(detector);
  handler.currentTab = {
    url: 'https://example.com/app',
    cookieStoreId: '0',
  };

  const tabCookies = [{ name: 'c1', value: 'v1' }];
  stubs.cookies.getAll.resolves(tabCookies);

  const resTab = await handler.getAllCookies();
  assert.deepEqual(resTab, tabCookies);
  assert.deepEqual(stubs.cookies.getAll.firstCall.args[0], {
    url: 'https://example.com/app',
    storeId: '0',
    partitionKey: {},
  });
});

test('GenericCookieHandler - getAllCookies on Safari with explicit storeId omits partitionKey filter and skips getAllCookieStores', async () => {
  const { detector, stubs } = createSinonBrowserMock({ browserName: 'safari' });
  const handler = new GenericCookieHandler(detector);
  handler.currentTab = {
    id: 1,
    url: 'https://example.com/app',
    cookieStoreId: '0',
  };

  const tabCookies = [{ name: 'c1', value: 'v1' }];
  stubs.cookies.getAll.resolves(tabCookies);

  const resTab = await handler.getAllCookies();
  assert.deepEqual(resTab, tabCookies);
  assert.equal(stubs.cookies.getAllCookieStores.called, false);
  assert.deepEqual(stubs.cookies.getAll.firstCall.args[0], {
    url: 'https://example.com/app',
    storeId: '0',
  });
});

for (const [label, tabId, expectedStoreId] of [
  [
    'resolves matching store when tabId is in store.tabIds',
    42,
    'safari-private',
  ],
  [
    'falls back to default store when tabId does not match any store.tabIds',
    99,
    'safari-default',
  ],
]) {
  test(`GenericCookieHandler - getAllCookies on Safari with undefined cookieStoreId: ${label}`, async () => {
    const { detector, stubs } = createSinonBrowserMock({
      browserName: 'safari',
    });
    const handler = new GenericCookieHandler(detector);
    handler.currentTab = {
      id: tabId,
      url: 'https://example.com/app',
      cookieStoreId: undefined,
    };

    stubs.cookies.getAllCookieStores.resolves([
      { id: 'safari-default', tabIds: [1, 2] },
      { id: 'safari-private', tabIds: [42] },
    ]);
    const expectedCookies = [{ name: 'c1', value: 'v1' }];
    stubs.cookies.getAll.resolves(expectedCookies);

    const resTab = await handler.getAllCookies();
    assert.deepEqual(resTab, expectedCookies);
    assert.equal(stubs.cookies.getAllCookieStores.calledOnce, true);
    assert.equal(stubs.cookies.getAll.calledOnce, true);
    assert.deepEqual(stubs.cookies.getAll.firstCall.args[0], {
      url: 'https://example.com/app',
      storeId: expectedStoreId,
    });
  });
}

test('GenericCookieHandler - getAllCookiesInBrowser on Safari queries all stores from getAllCookieStores', async () => {
  const { detector, stubs } = createSinonBrowserMock({ browserName: 'safari' });
  const handler = new GenericCookieHandler(detector);

  stubs.cookies.getAllCookieStores.resolves([
    { id: 'store-1', tabIds: [1] },
    { id: 'store-2', tabIds: [2] },
  ]);
  stubs.cookies.getAll
    .withArgs({ storeId: 'store-1' })
    .resolves([{ name: 's1', value: 'a' }]);
  stubs.cookies.getAll
    .withArgs({ storeId: 'store-2' })
    .resolves([{ name: 's2', value: 'b' }]);

  const resAll = await handler.getAllCookiesInBrowser();
  assert.deepEqual(resAll, [
    { name: 's1', value: 'a' },
    { name: 's2', value: 'b' },
  ]);
  assert.equal(stubs.cookies.getAll.callCount, 2);
});

test('GenericCookieHandler - getAllCookies omits storeId when cookieStoreId is undefined on Chrome', async () => {
  const { detector, stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  const handler = new GenericCookieHandler(detector);
  handler.currentTab = {
    id: 1,
    url: 'https://example.com/app',
    cookieStoreId: undefined,
  };

  stubs.cookies.getAll.resolves([]);
  await handler.getAllCookies();
  assert.deepEqual(stubs.cookies.getAll.firstCall.args[0], {
    url: 'https://example.com/app',
    partitionKey: {},
  });
});

test('GenericCookieHandler - removeCookie omits storeId when cookieStoreId is undefined on Chrome', async () => {
  const { detector, stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  const handler = new GenericCookieHandler(detector);
  handler.currentTab = {
    id: 1,
    url: 'https://example.com/app',
    cookieStoreId: undefined,
  };

  stubs.cookies.remove.resolves({});
  await handler.removeCookie('sid', 'https://example.com/app');
  assert.deepEqual(stubs.cookies.remove.firstCall.args[0], {
    name: 'sid',
    url: 'https://example.com/app',
  });
});

test('GenericCookieHandler - getAllCookiesInBrowser queries all cookies with partitionKey filter', async () => {
  const { detector, stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  const handler = new GenericCookieHandler(detector);

  const allCookies = [{ name: 'c1', value: 'v1' }];
  stubs.cookies.getAll.resolves(allCookies);

  const resAll = await handler.getAllCookiesInBrowser();
  assert.deepEqual(resAll, allCookies);
  assert.deepEqual(stubs.cookies.getAll.firstCall.args[0], {
    partitionKey: {},
  });
});
