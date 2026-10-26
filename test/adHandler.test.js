import assert from 'node:assert/strict';
import test from 'node:test';

import { Ad } from '../interface/lib/ads/ad.js';
import { AdHandler } from '../interface/lib/ads/adHandler.js';
import { Browsers } from '../interface/lib/browsers.js';
import { GenericStorageHandler } from '../interface/lib/genericStorageHandler.js';
import { OptionsHandler } from '../interface/lib/optionsHandler.js';
import { createSinonBrowserMock } from './mocks/sinonBrowserMock.js';

test('AdHandler - isAdValid checks browser compatibility and dismissal state', async () => {
  const { detector, stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  const storageHandler = new GenericStorageHandler(detector);
  const optionsHandler = new OptionsHandler(detector, storageHandler);
  const adHandler = new AdHandler(detector, storageHandler, optionsHandler);

  const firefoxOnlyAd = new Ad({
    id: 'ff_ad',
    text: 'Firefox Ad',
    tooltip: 'Tip',
    url: 'https://example.com',
    supportedBrowsers: [Browsers.Firefox],
    refreshDays: 30,
  });

  assert.equal(await adHandler.isAdValid(firefoxOnlyAd), false);

  const chromeAd = new Ad({
    id: 'chrome_ad',
    text: 'Chrome Ad',
    tooltip: 'Tip',
    url: 'https://example.com',
    supportedBrowsers: [Browsers.Chrome],
    refreshDays: 10,
  });

  // Never dismissed -> valid
  stubs.storage.local.get.resolves({});
  assert.equal(await adHandler.isAdValid(chromeAd), true);

  // Dismissed recently -> invalid
  stubs.storage.local.get.resolves({
    'adDismiss.chrome_ad': { version: 1, date: Date.now() },
  });
  assert.equal(await adHandler.isAdValid(chromeAd), false);
});

test('AdHandler - isAdTimeframeValid checks startDate and endDate boundaries', () => {
  const { detector } = createSinonBrowserMock();
  const storageHandler = new GenericStorageHandler(detector);
  const optionsHandler = new OptionsHandler(detector, storageHandler);
  const adHandler = new AdHandler(detector, storageHandler, optionsHandler);

  const timelessAd = new Ad({
    id: 'timeless',
    text: 'Always',
    tooltip: '',
    url: 'https://example.com',
    startDate: null,
    endDate: null,
  });
  assert.equal(adHandler.isAdTimeframeValid(timelessAd), true);

  const futureAd = new Ad({
    id: 'future',
    text: 'Future',
    tooltip: '',
    url: 'https://example.com',
    startDate: new Date(Date.now() + 86400000),
    endDate: null,
  });
  assert.equal(adHandler.isAdTimeframeValid(futureAd), false);

  const expiredAd = new Ad({
    id: 'expired',
    text: 'Expired',
    tooltip: '',
    url: 'https://example.com',
    startDate: null,
    endDate: new Date(Date.now() - 86400000),
  });
  assert.equal(adHandler.isAdTimeframeValid(expiredAd), false);

  const activeWindowAd = new Ad({
    id: 'active',
    text: 'Active',
    tooltip: '',
    url: 'https://example.com',
    startDate: new Date(Date.now() - 86400000),
    endDate: new Date(Date.now() + 86400000),
  });
  assert.equal(adHandler.isAdTimeframeValid(activeWindowAd), true);
});

test('AdHandler - canShowAnyAd checks options and 24-hour dismissal cooldown', async () => {
  const { detector, stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  stubs.storage.local.get.resolves({});
  const storageHandler = new GenericStorageHandler(detector);
  const optionsHandler = new OptionsHandler(detector, storageHandler);
  await optionsHandler.loadOptions();
  const adHandler = new AdHandler(detector, storageHandler, optionsHandler);

  // Ads enabled and never dismissed -> true
  assert.equal(await adHandler.canShowAnyAd(), true);

  // Dismissed 1 hour ago -> false
  stubs.storage.local.get.resolves({
    adDismissLast: { version: 1, date: Date.now() - 3600 * 1000 },
  });
  assert.equal(await adHandler.canShowAnyAd(), false);

  // Dismissed 2 days ago -> true
  stubs.storage.local.get.resolves({
    adDismissLast: { version: 1, date: Date.now() - 2 * 86400 * 1000 },
  });
  assert.equal(await adHandler.canShowAnyAd(), true);

  // Ads disabled in options -> false
  optionsHandler.setAdsEnabled(false);
  assert.equal(await adHandler.canShowAnyAd(), false);
});

test('AdHandler - getRandomValidAd filters out unsupported ads and returns false when none match', async () => {
  const { detector, stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  stubs.storage.local.get.resolves({});
  const storageHandler = new GenericStorageHandler(detector);
  const optionsHandler = new OptionsHandler(detector, storageHandler);
  const adHandler = new AdHandler(detector, storageHandler, optionsHandler);

  const invalidAd = new Ad({
    id: 'safari_only',
    text: 'Safari',
    tooltip: '',
    url: 'https://example.com',
    supportedBrowsers: [Browsers.Safari],
    startDate: null,
    endDate: null,
  });
  const validAd = new Ad({
    id: 'universal',
    text: 'Universal',
    tooltip: '',
    url: 'https://example.com',
    supportedBrowsers: Browsers.Any,
    startDate: null,
    endDate: null,
  });

  const chosen = await adHandler.getRandomValidAd([invalidAd, validAd]);
  assert.equal(chosen.id, 'universal');

  const noneLeft = await adHandler.getRandomValidAd([invalidAd]);
  assert.equal(noneLeft, false);
});

test('AdHandler - markAdAsDismissed stores ad-specific and global dismissal timestamps', async () => {
  const { detector, stubs } = createSinonBrowserMock({ browserName: 'chrome' });
  const storageHandler = new GenericStorageHandler(detector);
  const optionsHandler = new OptionsHandler(detector, storageHandler);
  const adHandler = new AdHandler(detector, storageHandler, optionsHandler);

  const validAd = new Ad({
    id: 'universal',
    text: 'Universal',
    tooltip: '',
    url: 'https://example.com',
    supportedBrowsers: Browsers.Any,
    startDate: null,
    endDate: null,
  });

  await adHandler.markAdAsDismissed(validAd);
  assert.equal(stubs.storage.local.set.calledTwice, true);
  assert.ok('adDismiss.universal' in stubs.storage.local.set.firstCall.args[0]);
  assert.ok('adDismissLast' in stubs.storage.local.set.secondCall.args[0]);
});
