import assert from 'node:assert/strict';
import test from 'node:test';

import { HeaderstringFormat } from '../interface/lib/headerstringFormat.js';
import { JsonFormat } from '../interface/lib/jsonFormat.js';
import { NetscapeFormat } from '../interface/lib/netscapeFormat.js';

test('JsonFormat - format and parse cookies', () => {
  const cookiesMap = {
    c1: {
      cookie: {
        name: 'session',
        value: 'xyz123',
        domain: '.example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
      },
    },
    c2: {
      cookie: {
        name: 'theme',
        value: 'dark',
        domain: 'example.com',
        path: '/app',
        secure: false,
        httpOnly: false,
      },
    },
  };

  const formattedJson = JsonFormat.format(cookiesMap);
  assert.ok(typeof formattedJson === 'string');

  const parsed = JsonFormat.parse(formattedJson);
  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, 'session');
  assert.equal(parsed[0].value, 'xyz123');
  assert.equal(parsed[1].name, 'theme');
  assert.equal(parsed[1].value, 'dark');
});

test('HeaderstringFormat - format and parse header string', () => {
  const cookiesMap = {
    c1: { cookie: { name: 'user_id', value: '42' } },
    c2: { cookie: { name: 'logged_in', value: 'true' } },
  };

  const formattedHeader = HeaderstringFormat.format(cookiesMap);
  assert.equal(formattedHeader, 'user_id=42;logged_in=true');

  const parsed = HeaderstringFormat.parse(
    'user_id=42; logged_in=true; token=abc=123'
  );
  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].name, 'user_id');
  assert.equal(parsed[0].value, '42');
  assert.equal(parsed[1].name, 'logged_in');
  assert.equal(parsed[1].value, 'true');
  assert.equal(parsed[2].name, 'token');
  assert.equal(parsed[2].value, 'abc=123');
});

test('NetscapeFormat - format and parse Netscape cookies', () => {
  const cookiesMap = {
    c1: {
      cookie: {
        name: 'session',
        value: 'abc',
        domain: '.example.com',
        path: '/',
        secure: true,
        expirationDate: 1900000000,
        hostOnly: false,
      },
    },
  };

  const formattedNetscape = NetscapeFormat.format(cookiesMap);
  assert.ok(formattedNetscape.includes('# Netscape HTTP Cookie File'));
  assert.ok(
    formattedNetscape.includes(
      '.example.com\tTRUE\t/\tTRUE\t1900000000\tsession\tabc'
    )
  );

  const parsed = NetscapeFormat.parse(formattedNetscape);
  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, 'session');
  assert.equal(parsed[0].value, 'abc');
  assert.equal(parsed[0].domain, '.example.com');
  assert.equal(parsed[0].path, '/');
  assert.equal(parsed[0].secure, true);
  assert.equal(parsed[0].expiration, '1900000000');
});

test('JsonFormat - normalizes unspecified sameSite and clears storeId', () => {
  const jsonOut = JsonFormat.format({
    c1: {
      cookie: {
        name: 'a',
        value: 'b',
        sameSite: 'unspecified',
        storeId: '0',
      },
    },
  });
  const parsedJson = JsonFormat.parse(jsonOut);
  assert.equal(parsedJson[0].sameSite, null);
  assert.equal(parsedJson[0].storeId, null);
});

test('HeaderstringFormat - throws when no valid key=value pairs exist', () => {
  assert.throws(() => HeaderstringFormat.parse('invalid_without_equals; ;'), {
    message: 'No cookies found.',
  });
});

test('NetscapeFormat - handles #HttpOnly_ prefix, session TTL, and malformed column count', () => {
  const netscapeStr = NetscapeFormat.format({
    c1: {
      cookie: {
        name: 'http_only_sid',
        value: 'secret',
        domain: 'example.com',
        path: '/',
        secure: false,
        session: true,
        hostOnly: true,
        httpOnly: true,
      },
    },
  });
  assert.ok(netscapeStr.includes('#HttpOnly_example.com\tFALSE\t/\tFALSE\t'));

  const parsedNetscape = NetscapeFormat.parse(netscapeStr);
  assert.equal(parsedNetscape.length, 1);
  assert.equal(parsedNetscape[0].httpOnly, true);
  assert.equal(parsedNetscape[0].hostOnly, true);
  assert.equal(parsedNetscape[0].secure, false);

  assert.throws(() => NetscapeFormat.parse('example.com\tTRUE\t/\tONLY_FOUR'), {
    message: 'Invalid netscape format',
  });
});
