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

test('GenericCookieHandler - prepareCookie with partitionKey preserves partitionKey and forces secure=true', () => {
  const { detector } = createSinonBrowserMock({ browserName: 'chrome' });
  const handler = new GenericCookieHandler(detector);
  handler.currentTab = { url: 'https://example.com/page' };

  const partitionKey = {
    topLevelSite: 'https://example.com',
    hasCrossSiteAncestor: false,
  };
  const prepared = handler.prepareCookie(
    {
      name: 'cf_clearance',
      value: 'part_val',
      domain: '.example.com',
      path: '/',
      secure: false,
      partitionKey,
    },
    'https://example.com/page'
  );
  assert.deepEqual(prepared.partitionKey, partitionKey);
  assert.equal(prepared.secure, true);
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

test('GenericCookieHandler - getAllCookies falls back without partitionKey if browser throws on partitionKey', async () => {
  const { detector, stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  const handler = new GenericCookieHandler(detector);
  handler.currentTab = {
    url: 'https://example.com/app',
    cookieStoreId: '0',
  };

  const tabCookies = [{ name: 'c1', value: 'v1' }];
  stubs.cookies.getAll
    .onFirstCall()
    .throws(new TypeError("Unexpected property: 'partitionKey'"));
  stubs.cookies.getAll.onSecondCall().resolves(tabCookies);

  const resTab = await handler.getAllCookies();
  assert.deepEqual(resTab, tabCookies);
  assert.equal(stubs.cookies.getAll.callCount, 2);
  assert.deepEqual(stubs.cookies.getAll.secondCall.args[0], {
    url: 'https://example.com/app',
    storeId: '0',
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
