import assert from 'node:assert/strict';
import test from 'node:test';

import { GenericStorageHandler } from '../interface/lib/genericStorageHandler.js';
import { ExportFormats } from '../interface/lib/options/exportFormats.js';
import { ExtraInfos } from '../interface/lib/options/extraInfos.js';
import { Themes } from '../interface/lib/options/themes.js';
import { OptionsHandler } from '../interface/lib/optionsHandler.js';
import { createSinonBrowserMock } from './mocks/sinonBrowserMock.js';

test('OptionsHandler - default initialization and loadOptions', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  stubs.storage.local.get.resolves({});

  const storageHandler = new GenericStorageHandler(detector);
  const optionsHandler = new OptionsHandler(detector, storageHandler);

  await optionsHandler.loadOptions();

  assert.ok(optionsHandler.options !== null);
  assert.equal(typeof optionsHandler.getCookieAdvanced(), 'boolean');
  assert.equal(optionsHandler.getAnimationsEnabled(), true);
  assert.equal(optionsHandler.getAdsEnabled(), true);
  assert.equal(optionsHandler.getExportFormat(), ExportFormats.Ask);
  assert.equal(optionsHandler.getExtraInfo(), ExtraInfos.Nothing);
  assert.equal(optionsHandler.getTheme(), Themes.Auto);
});

test('OptionsHandler - setters and getters update options and invoke storage.set', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  stubs.storage.local.get.resolves({});

  const storageHandler = new GenericStorageHandler(detector);
  const optionsHandler = new OptionsHandler(detector, storageHandler);

  await optionsHandler.loadOptions();

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
  const { detector, stubs } = createSinonBrowserMock();
  stubs.storage.local.get.resolves({
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

  const storageHandler = new GenericStorageHandler(detector);
  const optionsHandler = new OptionsHandler(detector, storageHandler);
  await optionsHandler.loadOptions();

  assert.equal(optionsHandler.getExportFormat(), ExportFormats.Ask);
  assert.equal(optionsHandler.getExtraInfo(), ExtraInfos.Nothing);
  assert.equal(optionsHandler.getTheme(), Themes.Auto);
});

test('OptionsHandler - onMessage reloads and emits optionsChanged only for external senders', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  stubs.storage.local.get.resolves({});

  const storageHandler = new GenericStorageHandler(detector);
  const optionsHandler = new OptionsHandler(detector, storageHandler);
  await optionsHandler.loadOptions();

  let emittedOldOptions = null;
  optionsHandler.on('optionsChanged', oldOpts => {
    emittedOldOptions = oldOpts;
  });

  // Ignore optionsChanged sent by self
  await optionsHandler.onMessage({
    type: 'optionsChanged',
    data: { from: optionsHandler.guid },
  });
  assert.equal(emittedOldOptions, null);

  // Reload and emit optionsChanged when sent by another context
  await optionsHandler.onMessage({
    type: 'optionsChanged',
    data: { from: 'other-guid' },
  });
  assert.ok(emittedOldOptions !== null);
});
