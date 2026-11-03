import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import sinon from 'sinon';

import { BrowserDetector } from '../interface/lib/browserDetector.js';
import { Browsers } from '../interface/lib/browsers.js';
import { EventEmitter } from '../interface/lib/eventEmitter.js';
import { GenericStorageHandler } from '../interface/lib/genericStorageHandler.js';
import { GUID } from '../interface/lib/guid.js';
import { Themes } from '../interface/lib/options/themes.js';
import { ThemeHandler } from '../interface/lib/themeHandler.js';
import {
  createSinonBrowserMock,
  installChromeGlobal,
  setupDom,
} from './mocks/sinonBrowserMock.js';

let restoreGlobals = null;
let teardownDom = null;

afterEach(() => {
  if (restoreGlobals) {
    restoreGlobals();
    restoreGlobals = null;
  }
  if (teardownDom) {
    teardownDom();
    teardownDom = null;
  }
  sinon.restore();
});

test('EventEmitter - registers listeners and emits payloads', () => {
  const emitter = new EventEmitter();
  const spy1 = sinon.spy();
  const spy2 = sinon.spy();

  emitter.emit('unregistered', 123);

  emitter.on('update', spy1);
  emitter.on('update', spy2);
  emitter.emit('update', 'arg1', 42);

  assert.equal(spy1.calledOnceWithExactly('arg1', 42), true);
  assert.equal(spy2.calledOnceWithExactly('arg1', 42), true);
});

for (const [label, resolvedData, key, expected] of [
  ['existing key', { myKey: { hello: 'world' } }, 'myKey', { hello: 'world' }],
  ['missing key returns null', {}, 'missingKey', null],
]) {
  test(`GenericStorageHandler - getLocal: ${label}`, async () => {
    const { detector, stubs } = createSinonBrowserMock();
    const storage = new GenericStorageHandler(detector);
    stubs.storage.local.get.resolves(resolvedData);

    const val = await storage.getLocal(key);
    assert.deepEqual(val, expected);
  });
}

test('GenericStorageHandler - setLocal writes key-value pair to storage.local', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  const storage = new GenericStorageHandler(detector);

  await storage.setLocal('myKey', 'newValue');
  assert.equal(
    stubs.storage.local.set.calledOnceWithExactly({ myKey: 'newValue' }),
    true
  );
});

test('GUID.get - generates valid v4 UUID strings', () => {
  const id1 = GUID.get();
  const id2 = GUID.get();

  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.match(id1, uuidV4Regex);
  assert.match(id2, uuidV4Regex);
  assert.notEqual(id1, id2);
});

test('BrowserDetector - detects API namespace, fallback browser name, and sidePanel support', () => {
  const { stubs } = createSinonBrowserMock();
  restoreGlobals = installChromeGlobal(stubs, '@@browser_name');

  const detector = new BrowserDetector();
  assert.equal(detector.getApi(), stubs);
  assert.equal(detector.isChrome(), true);
  assert.equal(detector.isFirefox(), false);
  assert.equal(detector.isSafari(), false);
  assert.equal(detector.isEdge(), false);
  assert.equal(detector.supportsSidePanel(), true);
});

test('BrowserDetector - overrideBrowserName updates browser detection flags', () => {
  const { stubs } = createSinonBrowserMock();
  restoreGlobals = installChromeGlobal(stubs, Browsers.Chrome);

  const detector = new BrowserDetector();
  detector.overrideBrowserName(Browsers.Firefox);

  assert.equal(detector.getBrowserName(), Browsers.Firefox);
  assert.equal(detector.isFirefox(), true);
  assert.equal(detector.isChrome(), false);
});

/**
 * Sets up a JSDOM environment and stubbed matchMedia/optionHandler for ThemeHandler tests.
 * @param {object} [options={}]
 * @return {{ themeHandler: ThemeHandler, optionEvents: EventEmitter, setState: function }}
 */
function setupThemeTest(options = {}) {
  const { teardown } = setupDom();
  teardownDom = teardown;

  let prefersDark = options.prefersDark ?? true;
  let currentTheme = options.theme ?? Themes.Auto;
  let mediaChangeListener = null;

  globalThis.window.matchMedia = sinon.stub().callsFake(() => ({
    get matches() {
      return prefersDark;
    },
    addEventListener: (_event, cb) => {
      mediaChangeListener = cb;
    },
  }));

  const optionEvents = new EventEmitter();
  const fakeOptionHandler = {
    on: (ev, cb) => optionEvents.on(ev, cb),
    getTheme: () => currentTheme,
  };

  const themeHandler = new ThemeHandler(fakeOptionHandler);

  return {
    themeHandler,
    optionEvents,
    triggerMediaChange: isDark => {
      prefersDark = isDark;
      mediaChangeListener();
    },
    setCurrentTheme: theme => {
      currentTheme = theme;
    },
  };
}

for (const [label, theme, prefersDark, expectedDatasetTheme] of [
  ['Auto with dark OS preference', Themes.Auto, true, 'dark'],
  ['Auto with light OS preference', Themes.Auto, false, 'light'],
  ['Explicit Dark theme', Themes.Dark, false, 'dark'],
  ['Explicit Light theme', Themes.Light, true, 'light'],
]) {
  test(`ThemeHandler - updateTheme: ${label}`, () => {
    const { themeHandler } = setupThemeTest({ theme, prefersDark });
    themeHandler.updateTheme();
    assert.equal(document.body.dataset.theme, expectedDatasetTheme);
  });
}

test('ThemeHandler - updates theme when OS color scheme changes in Auto mode', () => {
  const { themeHandler, triggerMediaChange } = setupThemeTest({
    theme: Themes.Auto,
    prefersDark: true,
  });
  themeHandler.updateTheme();
  assert.equal(document.body.dataset.theme, 'dark');

  triggerMediaChange(false);
  assert.equal(document.body.dataset.theme, 'light');
});

test('ThemeHandler - updates theme on optionsChanged only when theme option changed', () => {
  const { themeHandler, optionEvents, setCurrentTheme } = setupThemeTest({
    theme: Themes.Light,
    prefersDark: false,
  });
  const updateSpy = sinon.spy(themeHandler, 'updateTheme');

  // Unchanged theme -> should not call updateTheme
  optionEvents.emit('optionsChanged', { theme: Themes.Light });
  assert.equal(updateSpy.called, false);

  // Changed theme -> updates dataset.theme
  setCurrentTheme(Themes.Dark);
  optionEvents.emit('optionsChanged', { theme: Themes.Light });
  assert.equal(updateSpy.calledOnce, true);
  assert.equal(document.body.dataset.theme, 'dark');
});
