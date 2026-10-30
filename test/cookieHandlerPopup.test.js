import assert from 'node:assert/strict';
import test from 'node:test';

import sinon from 'sinon';

import { CookieHandlerPopup } from '../interface/popup/cookieHandlerPopup.js';
import {
  createSinonBrowserMock,
  flushMicrotasks,
} from './mocks/sinonBrowserMock.js';

test('CookieHandlerPopup - initializes currentTab, registers listeners, and emits ready', async () => {
  const { detector, stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  const readySpy = sinon.spy();

  const handler = new CookieHandlerPopup(detector);
  handler.on('ready', readySpy);

  await flushMicrotasks();

  assert.equal(handler.isReady, true);
  assert.equal(handler.currentTabId, 1);
  assert.equal(handler.currentTab.url, 'https://example.com/page');
  assert.equal(readySpy.calledOnce, true);
  assert.equal(stubs.tabs.onUpdated.addListener.calledOnce, true);
  assert.equal(stubs.tabs.onActivated.addListener.calledOnce, true);
  assert.equal(stubs.cookies.onChanged.addListener.calledOnce, true);
});

test('CookieHandlerPopup - skips cookies.onChanged listener on Safari', async () => {
  const { detector, stubs } = createSinonBrowserMock({ browserName: 'safari' });

  const handler = new CookieHandlerPopup(detector);
  await flushMicrotasks();

  assert.equal(handler.isReady, true);
  assert.equal(stubs.tabs.onUpdated.addListener.calledOnce, true);
  assert.equal(stubs.tabs.onActivated.addListener.calledOnce, true);
  assert.equal(stubs.cookies.onChanged.addListener.called, false);
});

test('CookieHandlerPopup - stays uninitialized when tabs.query returns empty array', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  stubs.tabs.query.resolves([]);

  const handler = new CookieHandlerPopup(detector);
  await flushMicrotasks();

  assert.equal(handler.isReady, false);
  assert.equal(handler.currentTab, null);
});

test('CookieHandlerPopup - handles rejected tabs.query gracefully on init', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  stubs.tabs.query.rejects(new Error('Tab query failed'));

  const handler = new CookieHandlerPopup(detector);
  await flushMicrotasks();

  assert.equal(handler.isReady, false);
  assert.equal(handler.currentTab, null);
});

for (const [label, browserName, cookie, shouldEmit] of [
  [
    'matching domain and storeId',
    'chrome',
    { domain: '.example.com', storeId: '0', name: 'sid' },
    true,
  ],
  [
    'non-matching domain',
    'chrome',
    { domain: '.other.com', storeId: '0', name: 'sid' },
    false,
  ],
  [
    'non-matching storeId',
    'chrome',
    { domain: '.example.com', storeId: '1', name: 'sid' },
    false,
  ],
  [
    'matching domain with Safari storeId when tab cookieStoreId is undefined',
    'safari',
    { domain: '.example.com', storeId: 'safari-private', name: 'sid' },
    true,
  ],
]) {
  test(`CookieHandlerPopup - onCookiesChanged filter: ${label}`, async () => {
    const { detector, stubs } = createSinonBrowserMock({ browserName });
    if (browserName === 'safari') {
      stubs.tabs.query.resolves([
        { id: 1, url: 'https://example.com/page', cookieStoreId: undefined },
      ]);
    }
    const handler = new CookieHandlerPopup(detector);
    await flushMicrotasks();

    const changedSpy = sinon.spy();
    handler.on('cookiesChanged', changedSpy);

    const changeInfo = { cookie };
    handler.onCookiesChanged(changeInfo);

    if (shouldEmit) {
      assert.equal(changedSpy.calledOnceWithExactly(changeInfo), true);
    } else {
      assert.equal(changedSpy.called, false);
    }
  });
}

for (const [label, tabId, changeInfo] of [
  ['ignores unrelated tabId', 999, { url: 'https://new.example.com' }],
  ['ignores incomplete status without URL change', 1, { status: 'loading' }],
]) {
  test(`CookieHandlerPopup - onTabsChanged guard: ${label}`, async () => {
    const { detector, stubs } = createSinonBrowserMock();
    const handler = new CookieHandlerPopup(detector);
    await flushMicrotasks();

    // Stub tabs.query with a new URL so the test would fail if the guard didn't return early
    stubs.tabs.query.resolves([
      { id: 1, url: 'https://new.example.com/path', cookieStoreId: '0' },
    ]);

    const changedSpy = sinon.spy();
    handler.on('cookiesChanged', changedSpy);

    await handler.onTabsChanged(tabId, changeInfo, {});
    assert.equal(changedSpy.called, false);
  });
}

for (const [label, changeInfo] of [
  ['status is complete', { status: 'complete' }],
  ['changeInfo contains new url', { url: 'https://new.example.com/path' }],
]) {
  test(`CookieHandlerPopup - onTabsChanged updates currentTab and emits cookiesChanged when ${label}`, async () => {
    const { detector, stubs } = createSinonBrowserMock();
    const handler = new CookieHandlerPopup(detector);
    await flushMicrotasks();

    const changedSpy = sinon.spy();
    handler.on('cookiesChanged', changedSpy);

    stubs.tabs.query.resolves([
      {
        id: 1,
        url: 'https://new.example.com/path',
        cookieStoreId: '0',
      },
    ]);
    await handler.onTabsChanged(1, changeInfo, {});

    assert.equal(handler.currentTab.url, 'https://new.example.com/path');
    assert.equal(changedSpy.calledOnce, true);
  });
}

test('CookieHandlerPopup - onTabActivated does not emit cookiesChanged when active tab is unchanged', async () => {
  const { detector } = createSinonBrowserMock();
  const handler = new CookieHandlerPopup(detector);
  await flushMicrotasks();

  const changedSpy = sinon.spy();
  handler.on('cookiesChanged', changedSpy);

  await handler.onTabActivated({ tabId: 1 });
  assert.equal(changedSpy.called, false);
});

test('CookieHandlerPopup - onTabActivated updates currentTab and emits cookiesChanged when switching tabs', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  const handler = new CookieHandlerPopup(detector);
  await flushMicrotasks();

  const changedSpy = sinon.spy();
  handler.on('cookiesChanged', changedSpy);

  stubs.tabs.query.resolves([
    {
      id: 2,
      url: 'https://another-site.org/',
      cookieStoreId: '0',
    },
  ]);
  await handler.onTabActivated({ tabId: 2 });

  assert.equal(handler.currentTabId, 2);
  assert.equal(handler.currentTab.url, 'https://another-site.org/');
  assert.equal(changedSpy.calledOnce, true);
});
