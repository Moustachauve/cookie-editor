import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { JSDOM } from 'jsdom';

import { Cookie } from '../interface/lib/cookie.js';
import { ExtraInfos } from '../interface/lib/options/extraInfos.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const popupHtml = fs.readFileSync(
  path.resolve(__dirname, '../interface/popup/cookie-list.html'),
  'utf8'
);

/**
 * Sets up a JSDOM environment using the popup HTML template.
 * @return {JSDOM}
 */
function setupPopupDom() {
  const dom = new JSDOM(popupHtml);
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Element = dom.window.Element;
  return dom;
}

/**
 * Creates a stubbed OptionsHandler for Cookie tests.
 * @param {object} [overrides={}]
 * @return {object}
 */
function createStubOptionHandler(overrides = {}) {
  let extraInfo = overrides.extraInfo ?? ExtraInfos.Nothing;
  let advanced = overrides.advanced ?? false;
  return {
    getExtraInfo: () => extraInfo,
    setExtraInfo: val => {
      extraInfo = val;
    },
    getCookieAdvanced: () => advanced,
    setCookieAdvanced: val => {
      advanced = val;
    },
  };
}

test('Cookie.hashCode - generates deterministic 32-bit integer hash from name and domain', () => {
  const hash1 = Cookie.hashCode({ name: 'session', domain: 'example.com' });
  const hash2 = Cookie.hashCode({ name: 'session', domain: 'example.com' });
  const hash3 = Cookie.hashCode({ name: 'session', domain: 'other.com' });
  const emptyHash = Cookie.hashCode({ name: '', domain: '' });

  assert.equal(typeof hash1, 'number');
  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hash3);
  assert.equal(emptyHash, 0);
});

test('Cookie - getExtraInfoValue and getExtraInfoTitle across all ExtraInfos modes', () => {
  const sampleCookie = {
    name: 'token',
    value: 'val123',
    domain: '.example.com',
    path: '/api',
    expirationDate: 1700000000,
    sameSite: 'lax',
    hostOnly: false,
    session: false,
    secure: true,
    httpOnly: true,
  };

  const optionHandler = createStubOptionHandler();
  const cookieObj = new Cookie('id-1', sampleCookie, optionHandler);

  const cases = [
    [ExtraInfos.Nothing, '', ''],
    [ExtraInfos.Value, 'val123', 'Value: val123'],
    [ExtraInfos.Domain, '.example.com', 'Domain: .example.com'],
    [ExtraInfos.Path, '/api', 'Path: /api'],
    [ExtraInfos.Samesite, 'lax', 'Same Site: lax'],
    [ExtraInfos.Hostonly, '☐ Host Only', 'Host Only: false'],
    [ExtraInfos.Session, '☐ Session', 'Session: false'],
    [ExtraInfos.Secure, '☑ Secure', 'Secure: true'],
    [ExtraInfos.Httponly, '☑ Http Only', 'HTTP Only: true'],
  ];

  for (const [mode, expectedValue, expectedTitle] of cases) {
    optionHandler.setExtraInfo(mode);
    assert.equal(cookieObj.getExtraInfoValue(), expectedValue);
    assert.equal(cookieObj.getExtraInfoTitle(), expectedTitle);
  }

  optionHandler.setExtraInfo(ExtraInfos.Expiration);
  assert.equal(cookieObj.getExtraInfoValue(), '2023-11-14T22:13:20Z');
  assert.ok(cookieObj.getExtraInfoTitle().startsWith('Expiration: '));
});

test('Cookie - generateHtml populates DOM fields and respects advanced option', () => {
  setupPopupDom();
  const optionHandler = createStubOptionHandler({
    extraInfo: ExtraInfos.Domain,
    advanced: true,
  });

  const cookieData = {
    name: 'auth_id',
    value: 'secret_val',
    domain: 'example.com',
    path: '/dashboard',
    expirationDate: 1800000000,
    sameSite: 'strict',
    hostOnly: true,
    session: false,
    secure: true,
    httpOnly: false,
  };

  const cookie = new Cookie('hash-123', cookieData, optionHandler);
  assert.equal(cookie.isGenerated, false);

  const el = cookie.html;
  assert.equal(cookie.isGenerated, true);
  assert.equal(el.id, 'hash-123');
  assert.equal(el.getAttribute('data-name'), 'auth_id');
  assert.equal(el.querySelector('.header-name').textContent, 'auth_id');
  assert.equal(
    el.querySelector('.header-extra-info').textContent,
    'example.com'
  );
  assert.equal(el.querySelector('.input-name').value, 'auth_id');
  assert.equal(el.querySelector('.input-value').value, 'secret_val');
  assert.equal(el.querySelector('.input-domain').value, 'example.com');
  assert.equal(el.querySelector('.input-domain').disabled, true);
  assert.equal(el.querySelector('.input-path').value, '/dashboard');
  assert.equal(el.querySelector('.input-sameSite').value, 'strict');
  assert.equal(el.querySelector('.input-hostOnly').checked, true);
  assert.equal(el.querySelector('.input-session').checked, false);
  assert.equal(el.querySelector('.input-secure').checked, true);
  assert.equal(el.querySelector('.input-httpOnly').checked, false);
  assert.equal(
    el.querySelector('.advanced-form').classList.contains('show'),
    true
  );
  assert.equal(
    el.querySelector('.advanced-toggle').textContent,
    'Hide Advanced'
  );
});

test('Cookie - updateHtml updates changed fields in generated DOM', () => {
  setupPopupDom();
  const optionHandler = createStubOptionHandler({
    extraInfo: ExtraInfos.Value,
    advanced: false,
  });

  const initialCookie = {
    name: 'prefs',
    value: 'v1',
    domain: '.example.com',
    path: '/',
    expirationDate: 1800000000,
    sameSite: 'lax',
    hostOnly: false,
    session: false,
    secure: false,
    httpOnly: false,
  };

  const cookie = new Cookie('hash-prefs', initialCookie, optionHandler);
  const el = cookie.html;

  cookie.updateHtml({
    name: 'prefs_renamed',
    value: 'v2',
    domain: 'sub.example.com',
    path: '/sub',
    expirationDate: null,
    sameSite: 'no_restriction',
    hostOnly: true,
    session: true,
    secure: true,
    httpOnly: true,
  });

  assert.equal(el.querySelector('.header-name').textContent, 'prefs_renamed');
  assert.equal(el.querySelector('.header-extra-info').textContent, 'v2');
  assert.equal(el.querySelector('.input-name').value, 'prefs_renamed');
  assert.equal(el.querySelector('.input-value').value, 'v2');
  assert.equal(el.querySelector('.input-domain').value, 'sub.example.com');
  assert.equal(el.querySelector('.input-domain').disabled, true);
  assert.equal(el.querySelector('.input-path').value, '/sub');
  assert.equal(el.querySelector('.input-sameSite').value, 'no_restriction');
  assert.equal(el.querySelector('.input-hostOnly').checked, true);
  assert.equal(el.querySelector('.input-session').checked, true);
  assert.equal(el.querySelector('.input-secure').checked, true);
  assert.equal(el.querySelector('.input-httpOnly').checked, true);
});

test('Cookie - afterSessionChanged toggles expiration input state and default TTL', () => {
  setupPopupDom();
  const optionHandler = createStubOptionHandler();
  const cookie = new Cookie(
    'hash-session',
    {
      name: 'sid',
      value: '1',
      domain: 'example.com',
      path: '/',
      expirationDate: 1800000000,
    },
    optionHandler
  );
  const el = cookie.html;

  // Toggling session on sets expiration to 'No Expiration' and disables input
  cookie.afterSessionChanged(true);
  assert.equal(el.querySelector('.input-expiration').disabled, true);
  assert.equal(el.querySelector('.input-expiration').value, 'No Expiration');

  // Toggling session off populates a default 1-hour expiration
  cookie.cookie.expirationDate = null;
  cookie.afterSessionChanged(false);
  assert.equal(el.querySelector('.input-expiration').disabled, false);
  assert.notEqual(el.querySelector('.input-expiration').value, 'No Expiration');
});
