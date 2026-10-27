import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { afterEach, beforeEach } from 'node:test';
import { fileURLToPath } from 'node:url';

import sinon from 'sinon';

import { Cookie } from '../interface/lib/cookie.js';
import { ExtraInfos } from '../interface/lib/options/extraInfos.js';
import { setupDom } from './mocks/sinonBrowserMock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const popupHtml = fs.readFileSync(
  path.resolve(__dirname, '../interface/popup/cookie-list.html'),
  'utf8'
);

let teardownDom = null;

beforeEach(() => {
  const { teardown } = setupDom(popupHtml);
  teardownDom = teardown;
});

afterEach(() => {
  sinon.restore();
  if (teardownDom) {
    teardownDom();
    teardownDom = null;
  }
});

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

const sampleCookie = Object.freeze({
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
});

test('Cookie.hashCode - generates deterministic 32-bit integer hash from key attributes without collision across paths or partitions', () => {
  const hash1 = Cookie.hashCode({ name: 'session', domain: 'example.com' });
  const hash2 = Cookie.hashCode({ name: 'session', domain: 'example.com' });
  const hash3 = Cookie.hashCode({ name: 'session', domain: 'other.com' });
  const hashRootPath = Cookie.hashCode({
    name: 'session',
    domain: 'example.com',
    path: '/',
  });
  const hashSubPath = Cookie.hashCode({
    name: 'session',
    domain: 'example.com',
    path: '/app',
  });
  const hashPartitioned = Cookie.hashCode({
    name: 'session',
    domain: 'example.com',
    path: '/',
    partitionKey: {
      topLevelSite: 'https://example.com',
      hasCrossSiteAncestor: false,
    },
  });
  const hashCrossPartitioned = Cookie.hashCode({
    name: 'session',
    domain: 'example.com',
    path: '/',
    partitionKey: {
      topLevelSite: 'https://example.com',
      hasCrossSiteAncestor: true,
    },
  });
  const emptyHash = Cookie.hashCode({ name: '', domain: '' });

  assert.equal(typeof hash1, 'number');
  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hash3);
  assert.notEqual(hashRootPath, hashSubPath);
  assert.notEqual(hashRootPath, hashPartitioned);
  assert.notEqual(hashPartitioned, hashCrossPartitioned);
  assert.equal(emptyHash, 0);
});

for (const [mode, expectedValue, expectedTitle] of [
  [ExtraInfos.Nothing, '', ''],
  [ExtraInfos.Value, 'val123', 'Value: val123'],
  [ExtraInfos.Domain, '.example.com', 'Domain: .example.com'],
  [ExtraInfos.Path, '/api', 'Path: /api'],
  [ExtraInfos.Expiration, '2023-11-14T22:13:20Z', null],
  [ExtraInfos.Samesite, 'lax', 'Same Site: lax'],
  [ExtraInfos.Hostonly, '☐ Host Only', 'Host Only: false'],
  [ExtraInfos.Session, '☐ Session', 'Session: false'],
  [ExtraInfos.Secure, '☑ Secure', 'Secure: true'],
  [ExtraInfos.Httponly, '☑ Http Only', 'HTTP Only: true'],
]) {
  test(`Cookie - getExtraInfoValue and getExtraInfoTitle for mode "${mode}"`, () => {
    const optionHandler = createStubOptionHandler({ extraInfo: mode });
    const cookieObj = new Cookie('id-1', sampleCookie, optionHandler);

    assert.equal(cookieObj.getExtraInfoValue(), expectedValue);
    if (expectedTitle !== null) {
      assert.equal(cookieObj.getExtraInfoTitle(), expectedTitle);
    } else {
      // formatExpirationForDisplay() uses local Date string formatting, which depends on the host timezone
      assert.ok(cookieObj.getExtraInfoTitle().startsWith('Expiration: '));
    }
  });
}

test('Cookie - generateHtml populates DOM fields and respects advanced option', () => {
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
  assert.equal(el.querySelector('.input-expiration').disabled, false);
  assert.equal(
    el.querySelector('.input-expiration').value,
    String(new Date(1800000000 * 1000))
  );
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
  sinon.useFakeTimers();
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
  assert.equal(el.querySelector('.input-expiration').disabled, true);
  assert.equal(el.querySelector('.input-expiration').value, 'No Expiration');
  assert.equal(el.querySelector('.input-sameSite').value, 'no_restriction');
  assert.equal(el.querySelector('.input-hostOnly').checked, true);
  assert.equal(el.querySelector('.input-session').checked, true);
  assert.equal(el.querySelector('.input-secure').checked, true);
  assert.equal(el.querySelector('.input-httpOnly').checked, true);
});

test('Cookie - afterSessionChanged(true) disables expiration input and sets No Expiration', () => {
  const optionHandler = createStubOptionHandler();
  const cookie = new Cookie(
    'hash-session-on',
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

  cookie.afterSessionChanged(true);
  assert.equal(el.querySelector('.input-expiration').disabled, true);
  assert.equal(el.querySelector('.input-expiration').value, 'No Expiration');
});

test('Cookie - afterSessionChanged(false) enables expiration input and populates a 1-hour default TTL', () => {
  const clock = sinon.useFakeTimers(1700000000000);
  const optionHandler = createStubOptionHandler();
  const cookie = new Cookie(
    'hash-session-off',
    {
      name: 'sid',
      value: '1',
      domain: 'example.com',
      path: '/',
      expirationDate: null,
    },
    optionHandler
  );
  const el = cookie.html;

  cookie.afterSessionChanged(false);
  const expectedEpochSeconds = clock.now / 1000 + 3600;
  assert.equal(cookie.cookie.expirationDate, expectedEpochSeconds);
  assert.equal(el.querySelector('.input-expiration').disabled, false);
  assert.equal(
    el.querySelector('.input-expiration').value,
    String(new Date(expectedEpochSeconds * 1000))
  );
});
