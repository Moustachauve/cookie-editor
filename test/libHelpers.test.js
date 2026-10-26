import assert from 'node:assert/strict';
import test from 'node:test';

import { JSDOM } from 'jsdom';
import sinon from 'sinon';

import { BrowserDetector } from '../interface/lib/browserDetector.js';
import { Browsers } from '../interface/lib/browsers.js';
import { Env } from '../interface/lib/env.js';
import { EventEmitter } from '../interface/lib/eventEmitter.js';
import { GenericStorageHandler } from '../interface/lib/genericStorageHandler.js';
import { GUID } from '../interface/lib/guid.js';
import { Themes } from '../interface/lib/options/themes.js';
import { ThemeHandler } from '../interface/lib/themeHandler.js';
import { createSinonBrowserMock } from './mocks/sinonBrowserMock.js';

test('EventEmitter - registers listeners and emits payloads', () => {
  const emitter = new EventEmitter();
  const spy1 = sinon.spy();
  const spy2 = sinon.spy();

  // Emitting an event with no listeners is a no-op
  emitter.emit('unregistered', 123);

  emitter.on('update', spy1);
  emitter.on('update', spy2);
  emitter.emit('update', 'arg1', 42);

  assert.equal(spy1.calledOnceWithExactly('arg1', 42), true);
  assert.equal(spy2.calledOnceWithExactly('arg1', 42), true);
});

test('GenericStorageHandler - getLocal returns value or null and setLocal stores key', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  const storage = new GenericStorageHandler(detector);

  stubs.storage.local.get.resolves({ myKey: { hello: 'world' } });
  const val = await storage.getLocal('myKey');
  assert.deepEqual(val, { hello: 'world' });

  stubs.storage.local.get.resolves({});
  const missing = await storage.getLocal('missingKey');
  assert.equal(missing, null);

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

test('BrowserDetector - detects API namespace, browser flags, and sidePanel support', () => {
  const { stubs } = createSinonBrowserMock();
  globalThis.chrome = stubs;
  delete globalThis.browser;
  Env.browserName = '@@browser_name';

  const detector = new BrowserDetector();
  assert.equal(detector.getApi(), stubs);
  assert.equal(detector.isChrome(), true);
  assert.equal(detector.isFirefox(), false);
  assert.equal(detector.isSafari(), false);
  assert.equal(detector.isEdge(), false);
  assert.equal(detector.supportsSidePanel(), true);

  detector.overrideBrowserName(Browsers.Firefox);
  assert.equal(detector.getBrowserName(), Browsers.Firefox);
  assert.equal(detector.isFirefox(), true);
});

test('ThemeHandler - applies light, dark, and auto themes and reacts to optionsChanged', () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;

  let prefersDark = true;
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
  let currentTheme = Themes.Auto;
  const fakeOptionHandler = {
    on: (ev, cb) => optionEvents.on(ev, cb),
    getTheme: () => currentTheme,
  };

  const themeHandler = new ThemeHandler(fakeOptionHandler);

  // Auto with prefersDark = true -> dark
  themeHandler.updateTheme();
  assert.equal(document.body.dataset.theme, 'dark');

  // OS color scheme changes to light while in Auto
  prefersDark = false;
  mediaChangeListener();
  assert.equal(document.body.dataset.theme, 'light');

  // Options changed to explicit Dark theme
  currentTheme = Themes.Dark;
  optionEvents.emit('optionsChanged', { theme: Themes.Auto });
  assert.equal(document.body.dataset.theme, 'dark');

  // Options changed to explicit Light theme
  currentTheme = Themes.Light;
  optionEvents.emit('optionsChanged', { theme: Themes.Dark });
  assert.equal(document.body.dataset.theme, 'light');
});
