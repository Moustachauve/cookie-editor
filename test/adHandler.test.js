import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import sinon from 'sinon';

import { Ad } from '../interface/lib/ads/ad.js';
import { AdHandler } from '../interface/lib/ads/adHandler.js';
import { Browsers } from '../interface/lib/browsers.js';
import { GenericStorageHandler } from '../interface/lib/genericStorageHandler.js';
import { OptionsHandler } from '../interface/lib/optionsHandler.js';
import { createSinonBrowserMock } from './mocks/sinonBrowserMock.js';

const DAY_MS = 24 * 60 * 60 * 1000;

afterEach(() => {
  sinon.restore();
});

/**
 * Creates an AdHandler and its dependencies backed by Sinon stubs.
 * @param {object} [options={}]
 * @return {Promise<{ adHandler: AdHandler, optionsHandler: OptionsHandler, stubs: object }>}
 */
async function createAdHandler(options = {}) {
  const { detector, stubs } = createSinonBrowserMock(options);
  stubs.storage.local.get.resolves({});
  const storageHandler = new GenericStorageHandler(detector);
  const optionsHandler = new OptionsHandler(detector, storageHandler);
  await optionsHandler.loadOptions();
  const adHandler = new AdHandler(detector, storageHandler, optionsHandler);
  return { adHandler, optionsHandler, stubs };
}

/**
 * Builds an Ad instance with sensible defaults.
 * @param {object} [overrides={}]
 * @return {Ad}
 */
function makeAd(overrides = {}) {
  return new Ad({
    id: 'test_ad',
    text: 'Test Ad',
    tooltip: 'Tip',
    url: 'https://example.com',
    supportedBrowsers: Browsers.Any,
    refreshDays: 10,
    startDate: null,
    endDate: null,
    ...overrides,
  });
}

test('AdHandler - isAdValid checks browser compatibility', async () => {
  const { adHandler } = await createAdHandler({ browserName: 'chrome' });

  const firefoxOnlyAd = makeAd({
    id: 'ff_ad',
    supportedBrowsers: [Browsers.Firefox],
  });
  const chromeAd = makeAd({
    id: 'chrome_ad',
    supportedBrowsers: [Browsers.Chrome],
  });

  assert.equal(await adHandler.isAdValid(firefoxOnlyAd), false);
  assert.equal(await adHandler.isAdValid(chromeAd), true);
});

for (const [label, storedValue, expected] of [
  ['never dismissed', {}, true],
  [
    'dismissed within refreshDays window',
    { 'adDismiss.test_ad': { version: 1, date: Date.now() - 2 * DAY_MS } },
    false,
  ],
  [
    'dismissed longer ago than refreshDays',
    { 'adDismiss.test_ad': { version: 1, date: Date.now() - 15 * DAY_MS } },
    true,
  ],
]) {
  test(`AdHandler - isAdValid dismissal window: ${label}`, async () => {
    const { adHandler, stubs } = await createAdHandler();
    stubs.storage.local.get.resolves(storedValue);
    assert.equal(
      await adHandler.isAdValid(makeAd({ refreshDays: 10 })),
      expected
    );
  });
}

for (const [label, startDate, endDate, expected] of [
  ['no start or end date', null, null, true],
  ['future start date', new Date(Date.now() + DAY_MS), null, false],
  ['past end date', null, new Date(Date.now() - DAY_MS), false],
  [
    'within active start and end window',
    new Date(Date.now() - DAY_MS),
    new Date(Date.now() + DAY_MS),
    true,
  ],
]) {
  test(`AdHandler - isAdTimeframeValid: ${label}`, async () => {
    const { adHandler } = await createAdHandler();
    assert.equal(
      adHandler.isAdTimeframeValid(makeAd({ startDate, endDate })),
      expected
    );
  });
}

for (const [label, storedValue, expected] of [
  ['never dismissed', {}, true],
  [
    'dismissed 1 hour ago',
    { adDismissLast: { version: 1, date: Date.now() - 3600 * 1000 } },
    false,
  ],
  [
    'dismissed 2 days ago',
    { adDismissLast: { version: 1, date: Date.now() - 2 * DAY_MS } },
    true,
  ],
]) {
  test(`AdHandler - canShowAnyAd cooldown: ${label}`, async () => {
    const { adHandler, stubs } = await createAdHandler();
    stubs.storage.local.get.resolves(storedValue);
    assert.equal(await adHandler.canShowAnyAd(), expected);
  });
}

test('AdHandler - canShowAnyAd returns false when ads are disabled in options', async () => {
  const { adHandler, optionsHandler } = await createAdHandler();
  optionsHandler.setAdsEnabled(false);
  assert.equal(await adHandler.canShowAnyAd(), false);
});

test('AdHandler - getRandomValidAd selects a supported ad', async () => {
  const { adHandler } = await createAdHandler({ browserName: 'chrome' });
  const invalidAd = makeAd({
    id: 'safari_only',
    supportedBrowsers: [Browsers.Safari],
  });
  const validAd = makeAd({ id: 'universal', supportedBrowsers: Browsers.Any });

  const chosen = await adHandler.getRandomValidAd([invalidAd, validAd]);
  assert.equal(chosen.id, 'universal');
});

test('AdHandler - getRandomValidAd returns false when no ads are valid', async () => {
  const { adHandler } = await createAdHandler({ browserName: 'chrome' });
  const invalidAd = makeAd({
    id: 'safari_only',
    supportedBrowsers: [Browsers.Safari],
  });

  assert.equal(await adHandler.getRandomValidAd([invalidAd]), false);
});

test('AdHandler - markAdAsDismissed stores ad-specific and global dismissal timestamps', async () => {
  const clock = sinon.useFakeTimers(1700000000000);
  const { adHandler, stubs } = await createAdHandler();
  stubs.storage.local.set.resetHistory();

  await adHandler.markAdAsDismissed(makeAd({ id: 'universal' }));

  assert.equal(stubs.storage.local.set.calledTwice, true);
  assert.deepEqual(stubs.storage.local.set.firstCall.args[0], {
    'adDismiss.universal': { version: 1, date: clock.now },
  });
  assert.deepEqual(stubs.storage.local.set.secondCall.args[0], {
    adDismissLast: { version: 1, date: clock.now },
  });
});
