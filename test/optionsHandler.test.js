import assert from 'node:assert/strict';
import test from 'node:test';

import sinon from 'sinon';

import { GenericStorageHandler } from '../interface/lib/genericStorageHandler.js';
import { ExportFormats } from '../interface/lib/options/exportFormats.js';
import { ExtraInfos } from '../interface/lib/options/extraInfos.js';
import { Themes } from '../interface/lib/options/themes.js';
import { OptionsHandler } from '../interface/lib/optionsHandler.js';
import { createSinonBrowserMock } from './mocks/sinonBrowserMock.js';

/**
 * Creates an OptionsHandler and loads initial options from stubbed storage.
 * @param {object} [stored={}] Initial storage.local.get payload.
 * @return {Promise<{ optionsHandler: OptionsHandler, stubs: object }>}
 */
async function createLoadedOptionsHandler(stored = {}) {
  const { detector, stubs } = createSinonBrowserMock();
  stubs.storage.local.get.resolves(stored);
  const storageHandler = new GenericStorageHandler(detector);
  const optionsHandler = new OptionsHandler(detector, storageHandler);
  await optionsHandler.loadOptions();
  return { optionsHandler, stubs };
}

test('OptionsHandler - default initialization and loadOptions', async () => {
  const { optionsHandler } = await createLoadedOptionsHandler();

  assert.ok(optionsHandler.options !== null);
  assert.equal(typeof optionsHandler.getCookieAdvanced(), 'boolean');
  assert.equal(optionsHandler.getAnimationsEnabled(), true);
  assert.equal(optionsHandler.getAdsEnabled(), true);
  assert.equal(optionsHandler.getExportFormat(), ExportFormats.Ask);
  assert.equal(optionsHandler.getExtraInfo(), ExtraInfos.Nothing);
  assert.equal(optionsHandler.getTheme(), Themes.Auto);
});

test('OptionsHandler - setters and getters update options and invoke storage.set', async () => {
  const { optionsHandler, stubs } = await createLoadedOptionsHandler();

  optionsHandler.setCookieAdvanced(true);
  assert.equal(optionsHandler.getCookieAdvanced(), true);

  optionsHandler.setDevtoolsEnabled(true);
  assert.equal(optionsHandler.getDevtoolsEnabled(), true);

  optionsHandler.setAnimationsEnabled(false);
  assert.equal(optionsHandler.getAnimationsEnabled(), false);

  optionsHandler.setExportFormat(ExportFormats.JSON);
  assert.equal(optionsHandler.getExportFormat(), ExportFormats.JSON);

  optionsHandler.setExtraInfo(ExtraInfos.Domain);
  assert.equal(optionsHandler.getExtraInfo(), ExtraInfos.Domain);

  optionsHandler.setTheme(Themes.Dark);
  assert.equal(optionsHandler.getTheme(), Themes.Dark);

  optionsHandler.setButtonBarTop(true);
  assert.equal(optionsHandler.getButtonBarTop(), true);

  optionsHandler.setAdsEnabled(false);
  assert.equal(optionsHandler.getAdsEnabled(), false);

  assert.ok(stubs.storage.local.set.callCount > 0);
});

test('OptionsHandler - validation methods', () => {
  const { detector } = createSinonBrowserMock();
  const storageHandler = new GenericStorageHandler(detector);
  const optionsHandler = new OptionsHandler(detector, storageHandler);

  assert.equal(optionsHandler.isExportFormatValid(ExportFormats.JSON), true);
  assert.equal(optionsHandler.isExportFormatValid('invalid_format'), false);

  assert.equal(optionsHandler.isExtraInfoValid(ExtraInfos.Domain), true);
  assert.equal(optionsHandler.isExtraInfoValid('invalid_extra_info'), false);

  assert.equal(optionsHandler.isThemeValid(Themes.Dark), true);
  assert.equal(optionsHandler.isThemeValid('non_existent_theme'), false);
});

test('OptionsHandler - falls back to safe defaults when stored values are invalid', async () => {
  const { optionsHandler } = await createLoadedOptionsHandler({
    all_options: {
      advancedCookies: false,
      devtoolsEnabled: true,
      animationsEnabled: true,
      exportFormat: 'corrupted_format',
      extraInfo: 'corrupted_info',
      theme: 'corrupted_theme',
      buttonBarTop: false,
      adsEnabled: true,
    },
  });

  assert.equal(optionsHandler.getExportFormat(), ExportFormats.Ask);
  assert.equal(optionsHandler.getExtraInfo(), ExtraInfos.Nothing);
  assert.equal(optionsHandler.getTheme(), Themes.Auto);
});

test('OptionsHandler - onMessage ignores optionsChanged sent by own guid', async () => {
  const { optionsHandler, stubs } = await createLoadedOptionsHandler();
  stubs.storage.local.get.resetHistory();

  const changedSpy = sinon.spy();
  optionsHandler.on('optionsChanged', changedSpy);

  await optionsHandler.onMessage({
    type: 'optionsChanged',
    data: { from: optionsHandler.guid },
  });

  assert.equal(changedSpy.called, false);
  assert.equal(stubs.storage.local.get.called, false);
});

test('OptionsHandler - onMessage reloads storage and emits oldOptions for external senders', async () => {
  const { optionsHandler, stubs } = await createLoadedOptionsHandler();
  const previousOptions = optionsHandler.options;
  stubs.storage.local.get.resetHistory();

  const changedSpy = sinon.spy();
  optionsHandler.on('optionsChanged', changedSpy);

  await optionsHandler.onMessage({
    type: 'optionsChanged',
    data: { from: 'other-guid' },
  });

  assert.equal(stubs.storage.local.get.calledOnce, true);
  assert.equal(changedSpy.calledOnceWithExactly(previousOptions), true);
});
