import assert from 'node:assert/strict';
import test from 'node:test';

import sinon from 'sinon';

import { CookieHandlerPopup } from '../interface/popup/cookieHandlerPopup.js';
import { createSinonBrowserMock } from './mocks/sinonBrowserMock.js';

/**
 * Waits for a microtask turn so constructor promises settle.
 * @return {Promise<void>}
 */
function flushMicrotasks() {
  return new Promise(resolve => setImmediate(resolve));
}

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

test('CookieHandlerPopup - handles empty or rejected tabs.query gracefully on init', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  stubs.tabs.query.resolves([]);

  const handler = new CookieHandlerPopup(detector);
  await flushMicrotasks();

  assert.equal(handler.isReady, false);
  assert.equal(handler.currentTab, null);

  // Also test rejected promise path
  stubs.tabs.query.rejects(new Error('Tab query failed'));
  const handlerRejected = new CookieHandlerPopup(detector);
  await flushMicrotasks();
  assert.equal(handlerRejected.isReady, false);
});

test('CookieHandlerPopup - onCookiesChanged filters by domain and storeId', async () => {
  const { detector } = createSinonBrowserMock();
  const handler = new CookieHandlerPopup(detector);
  await flushMicrotasks();

  const changedSpy = sinon.spy();
  handler.on('cookiesChanged', changedSpy);

  // Matching domain and storeId
  const validChange = {
    cookie: { domain: '.example.com', storeId: '0', name: 'sid' },
  };
  handler.onCookiesChanged(validChange);
  assert.equal(changedSpy.calledOnceWithExactly(validChange), true);

  // Non-matching domain
  handler.onCookiesChanged({
    cookie: { domain: '.other.com', storeId: '0', name: 'sid' },
  });
  assert.equal(changedSpy.callCount, 1);

  // Non-matching storeId
  handler.onCookiesChanged({
    cookie: { domain: '.example.com', storeId: '1', name: 'sid' },
  });
  assert.equal(changedSpy.callCount, 1);
});

test('CookieHandlerPopup - onTabsChanged updates currentTab and emits cookiesChanged when URL changes', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  const handler = new CookieHandlerPopup(detector);
  await flushMicrotasks();

  const changedSpy = sinon.spy();
  handler.on('cookiesChanged', changedSpy);

  // Ignore unrelated tabId
  await handler.onTabsChanged(999, { url: 'https://new.example.com' }, {});
  assert.equal(changedSpy.called, false);

  // Ignore incomplete status without URL change
  await handler.onTabsChanged(1, { status: 'loading' }, {});
  assert.equal(changedSpy.called, false);

  // Relevant tab update with new URL
  stubs.tabs.query.resolves([
    {
      id: 1,
      url: 'https://new.example.com/path',
      cookieStoreId: '0',
    },
  ]);
  await handler.onTabsChanged(1, { status: 'complete' }, {});

  assert.equal(handler.currentTab.url, 'https://new.example.com/path');
  assert.equal(changedSpy.calledOnce, true);
});

test('CookieHandlerPopup - onTabActivated queries active tab and emits cookiesChanged if tab changed', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  const handler = new CookieHandlerPopup(detector);
  await flushMicrotasks();

  const changedSpy = sinon.spy();
  handler.on('cookiesChanged', changedSpy);

  // Same tab id and url -> should not emit
  await handler.onTabActivated({ tabId: 1 });
  assert.equal(changedSpy.called, false);

  // Different tab -> should emit
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
