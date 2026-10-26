import assert from 'node:assert/strict';
import test from 'node:test';

import { PermissionHandler as DevtoolsPermissionHandler } from '../interface/devtools/permissionHandler.js';
import { PermissionHandler } from '../interface/lib/permissionHandler.js';
import { createSinonBrowserMock } from './mocks/sinonBrowserMock.js';

test('PermissionHandler - canHavePermissions for regular vs internal URLs', () => {
  const { detector } = createSinonBrowserMock();
  const handler = new PermissionHandler(detector);

  // Standard web pages
  assert.equal(handler.canHavePermissions('https://google.com'), true);
  assert.equal(handler.canHavePermissions('http://localhost:3000'), true);
  assert.equal(handler.canHavePermissions('http://127.0.0.1/app'), true);

  // Browser internal and extension pages
  assert.equal(handler.canHavePermissions(''), false);
  assert.equal(handler.canHavePermissions('about:config'), false);
  assert.equal(handler.canHavePermissions('about:addons'), false);
  assert.equal(
    handler.canHavePermissions('moz-extension://uuid-1234/page.html'),
    false
  );
  assert.equal(handler.canHavePermissions('chrome://settings'), false);
  assert.equal(
    handler.canHavePermissions('chrome-extension://id/popup.html'),
    false
  );
  assert.equal(handler.canHavePermissions('edge://flags'), false);
  assert.equal(
    handler.canHavePermissions('safari-web-extension://id/page.html'),
    false
  );
});

test('PermissionHandler - getRootDomainName', () => {
  const { detector } = createSinonBrowserMock();
  const handler = new PermissionHandler(detector);

  assert.equal(handler.getRootDomainName('example.com'), 'example.com');
  assert.equal(handler.getRootDomainName('sub.example.com'), 'example.com');
  assert.equal(
    handler.getRootDomainName('deep.sub.example.com'),
    'example.com'
  );

  // Second-level domains (ccTLDs like .co.uk, .com.au)
  assert.equal(handler.getRootDomainName('bbc.co.uk'), 'bbc.co.uk');
  assert.equal(handler.getRootDomainName('news.bbc.co.uk'), 'bbc.co.uk');
  assert.equal(handler.getRootDomainName('service.gov.uk'), 'service.gov.uk');
  assert.equal(handler.getRootDomainName('org.au'), 'org.au');
});

test('PermissionHandler - checkPermissions calls permissions.contains with formatted origin', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  stubs.permissions.contains.resolves(true);

  const handler = new PermissionHandler(detector);
  const result = await handler.checkPermissions('https://sub.example.com/page');

  assert.equal(result, true);
  assert.equal(stubs.permissions.contains.calledOnce, true);
  assert.deepEqual(stubs.permissions.contains.firstCall.args[0], {
    origins: ['https://sub.example.com/*', 'https://*.example.com/*'],
  });
});

test('PermissionHandler - checkPermissions with <all_urls> passes match pattern', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  stubs.permissions.contains.resolves(true);

  const handler = new PermissionHandler(detector);
  const result = await handler.checkPermissions('<all_urls>');

  assert.equal(result, true);
  assert.equal(stubs.permissions.contains.calledOnce, true);
  assert.deepEqual(stubs.permissions.contains.firstCall.args[0], {
    origins: ['<all_urls>'],
  });
});

test('PermissionHandler - requestPermission calls permissions.request with formatted origin', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  stubs.permissions.request.resolves(true);

  const handler = new PermissionHandler(detector);
  const result = await handler.requestPermission(
    'https://sub.example.com/page'
  );

  assert.equal(result, true);
  assert.equal(stubs.permissions.request.calledOnce, true);
  assert.deepEqual(stubs.permissions.request.firstCall.args[0], {
    origins: ['https://sub.example.com/*', 'https://*.example.com/*'],
  });
});

test('PermissionHandler - requestPermission with <all_urls> passes match pattern', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  stubs.permissions.request.resolves(true);

  const handler = new PermissionHandler(detector);
  const result = await handler.requestPermission('<all_urls>');

  assert.equal(result, true);
  assert.equal(stubs.permissions.request.calledOnce, true);
  assert.deepEqual(stubs.permissions.request.firstCall.args[0], {
    origins: ['<all_urls>'],
  });
});

test('Devtools PermissionHandler - sends messages through runtime.sendMessage', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  stubs.runtime.sendMessage.resolves(true);

  const handler = new DevtoolsPermissionHandler(detector);
  const result = await handler.checkPermissions('https://example.com');

  assert.equal(result, true);
  assert.equal(stubs.runtime.sendMessage.calledOnce, true);
  assert.deepEqual(stubs.runtime.sendMessage.firstCall.args[0], {
    type: 'permissionsContains',
    params: 'https://example.com',
  });
});

test('Devtools PermissionHandler - canHavePermissions and requestPermission', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  const devtoolsHandler = new DevtoolsPermissionHandler(detector);

  assert.equal(devtoolsHandler.canHavePermissions('https://example.com'), true);
  assert.equal(devtoolsHandler.canHavePermissions('about:debugging'), false);
  assert.equal(devtoolsHandler.canHavePermissions('edge://flags'), false);

  stubs.runtime.sendMessage.resolves(true);
  const reqRes = await devtoolsHandler.requestPermission('https://example.com');
  assert.equal(reqRes, true);
  assert.deepEqual(stubs.runtime.sendMessage.firstCall.args[0], {
    type: 'permissionsRequest',
    params: 'https://example.com',
  });
});

test('PermissionHandler - checkPermissions defaults to true when permissions API is unavailable', async () => {
  const { detector, stubs } = createSinonBrowserMock();
  delete stubs.permissions;
  const stdHandler = new PermissionHandler(detector);
  assert.equal(await stdHandler.checkPermissions('https://example.com'), true);
});
