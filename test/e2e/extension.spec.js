import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from './fixtures.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8')
);

/**
 * Disables popup animations in chrome.storage.local while preserving existing
 * option defaults and reloads the popup so transitions complete synchronously.
 * @param {object} popup Playwright page for the popup.
 * @return {Promise<void>}
 */
async function disablePopupAnimations(popup) {
  await popup.evaluate(async () => {
    const stored = await chrome.storage.local.get('all_options');
    await chrome.storage.local.set({
      all_options: {
        ...(stored.all_options || {}),
        animationsEnabled: false,
        adsEnabled: false,
      },
    });
  });
  await popup.reload();
}

test('MV3 service worker starts and popup displays extension version and empty state', async ({
  testServerUrl,
  openPopup,
}) => {
  const popup = await openPopup(`${testServerUrl}/`);

  await expect(popup.locator('#version')).toHaveText(`v${pkg.version}`);
  await expect(popup.locator('#pageTitle h1')).toContainText('Cookie-Editor');
  await expect(popup.locator('#no-cookies')).toContainText(
    'This page does not have any cookies.'
  );
});

test('Popup lists existing cookies sorted alphabetically and filters via search bar', async ({
  context,
  testServerUrl,
  openPopup,
}) => {
  await context.addCookies([
    {
      name: 'zebra_cookie',
      value: 'z_val',
      url: testServerUrl,
    },
    {
      name: 'alpha_cookie',
      value: 'a_val',
      url: testServerUrl,
    },
  ]);

  const popup = await openPopup(`${testServerUrl}/`);

  const cookieItems = popup.locator('#cookie-container li.cookie');
  await expect(cookieItems).toHaveCount(2);

  // Verify alphabetical sorting
  await expect(cookieItems.nth(0).locator('.header-name')).toHaveText(
    'alpha_cookie'
  );
  await expect(cookieItems.nth(1).locator('.header-name')).toHaveText(
    'zebra_cookie'
  );

  // Filter cookies using the search field
  const searchField = popup.locator('#searchField');
  await searchField.fill('zebra');
  await searchField.dispatchEvent('keyup');

  await expect(cookieItems.nth(0)).toHaveClass(/hide/);
  await expect(cookieItems.nth(1)).not.toHaveClass(/hide/);

  // Clear filter restores all cookies
  await searchField.fill('');
  await searchField.dispatchEvent('keyup');
  await expect(cookieItems.nth(0)).not.toHaveClass(/hide/);
});

test('Popup creates, edits, and deletes cookies in Chrome cookie jar', async ({
  context,
  testServerUrl,
  openPopup,
}) => {
  const popup = await openPopup(`${testServerUrl}/`);
  await expect(popup.locator('#no-cookies')).toBeVisible();
  await disablePopupAnimations(popup);

  // 1. Create a new cookie
  await popup.locator('#create-cookie').click();
  await popup.locator('#name-create').fill('created_in_popup');
  await popup.locator('#value-create').fill('initial_value');
  await popup.locator('#save-create-cookie').click();

  const cookieRow = popup.locator('li.cookie[data-name="created_in_popup"]');
  await expect(cookieRow).toBeVisible();

  const browserCookies = await context.cookies(testServerUrl);
  expect(browserCookies.find(c => c.name === 'created_in_popup')?.value).toBe(
    'initial_value'
  );

  // 2. Expand and edit the cookie value
  await cookieRow.locator('.header').click();
  const valueInput = cookieRow.locator('textarea[name="value"]');
  await valueInput.fill('updated_value_456');
  await cookieRow.locator('button.save').click();

  await expect
    .poll(async () => {
      const cookies = await context.cookies(testServerUrl);
      return cookies.find(c => c.name === 'created_in_popup')?.value;
    })
    .toBe('updated_value_456');

  // 3. Delete the cookie
  await cookieRow.locator('.header button.delete').click();

  await expect
    .poll(async () => {
      const cookies = await context.cookies(testServerUrl);
      return cookies.some(c => c.name === 'created_in_popup');
    })
    .toBe(false);
});

test('Popup imports cookies (JSON & Header string), exports cookies, and deletes all', async ({
  context,
  testServerUrl,
  openPopup,
}) => {
  const popup = await openPopup(`${testServerUrl}/`);
  await expect(popup.locator('#no-cookies')).toBeVisible();
  await disablePopupAnimations(popup);

  // 1. Import cookies using Header String format
  await popup.locator('#import-cookies').click();
  await popup
    .locator('#content-import')
    .fill('imported_one=val1; imported_two=val2');
  await popup.locator('#save-import-cookie').click();

  await expect(popup.locator('#notification span')).toHaveText(
    'Cookies were imported'
  );
  await expect(popup.locator('#cookie-container li.cookie')).toHaveCount(2);

  // 2. Import additional cookie using JSON format
  await popup.locator('#notification-dismiss').click();
  await popup.locator('#import-cookies').click();
  await popup
    .locator('#content-import')
    .fill(JSON.stringify([{ name: 'imported_json', value: 'json_val' }]));
  await popup.locator('#save-import-cookie').click();

  await expect(popup.locator('#cookie-container li.cookie')).toHaveCount(3);

  const cookiesAfterImport = await context.cookies(testServerUrl);
  expect(cookiesAfterImport.map(c => c.name).sort()).toEqual([
    'imported_json',
    'imported_one',
    'imported_two',
  ]);

  // 3. Export cookies via Export menu -> JSON
  await popup.locator('#notification-dismiss').click();
  await popup.locator('#export-cookies').click();
  await expect(popup.locator('#export-menu')).toBeVisible();
  await popup.locator('#export-json').click();
  await expect(popup.locator('#notification span')).toHaveText(
    'Cookies exported to clipboard as JSON'
  );

  // 4. Delete all cookies
  await popup.locator('#delete-all-cookies').click();
  await expect
    .poll(async () => (await context.cookies(testServerUrl)).length)
    .toBe(0);
});

test('Popup handles permission prompts and internal browser URLs', async ({
  testServerUrl,
  openPopup,
}) => {
  // 1. Internal URL shows permission-impossible view
  const internalPopup = await openPopup('chrome://extensions');
  await expect(internalPopup.locator('#permission-impossible')).toBeVisible();
  await internalPopup.close();

  // 2. Unpermitted site shows no-permission view and requesting permission loads cookies
  const unpermittedPopup = await openPopup(`${testServerUrl}/`, {
    hasPermission: false,
    grantOnRequest: true,
  });
  await expect(unpermittedPopup.locator('#no-permission')).toBeVisible();
  await unpermittedPopup.locator('#request-permission').click();
  await expect(unpermittedPopup.locator('#no-cookies')).toBeVisible();
});

test('Options page persists settings and updates popup theme, button bar, and extra info', async ({
  context,
  extensionId,
  testServerUrl,
  openPopup,
}) => {
  await context.addCookies([
    {
      name: 'opt_cookie',
      value: 'opt_value',
      url: testServerUrl,
    },
  ]);

  const optionsPage = await context.newPage();
  await optionsPage.goto(
    `chrome-extension://${extensionId}/interface/options/options.html`
  );

  // Wait for async loadOptions() + setFormValues() + setInputEvents() to complete
  await expect(optionsPage.locator('body')).toHaveAttribute(
    'data-theme',
    /(light|dark)/
  );

  // Toggle Dark theme, Button Bar on Top, Show Advanced, and Extra Info = Value
  // Use typeahead key press on <select> so Chromium dispatches a trusted (event.isTrusted) change event
  await optionsPage.locator('#theme').focus();
  await optionsPage.keyboard.press('d');

  await optionsPage.locator('#extra-info').focus();
  await optionsPage.keyboard.press('v');

  await optionsPage.locator('#advanced-cookie + .slider').click();
  await optionsPage.locator('#button-bar-top + .slider').click();

  await expect
    .poll(() =>
      optionsPage.evaluate(async () => {
        const stored = await chrome.storage.local.get('all_options');
        return stored.all_options;
      })
    )
    .toMatchObject({
      theme: 'dark',
      extraInfo: 'value',
      advancedCookies: true,
      buttonBarTop: true,
    });

  // Open popup and verify options are reflected
  const popup = await openPopup(`${testServerUrl}/`);
  await expect(popup.locator('body')).toHaveAttribute('data-theme', 'dark');
  await expect(popup.locator('body')).toHaveClass(/button-bar-top/);
  await expect(popup.locator('.header-extra-info').first()).toHaveText(
    'opt_value'
  );
  await expect(popup.locator('.advanced-form').first()).toHaveClass(/show/);
});

/**
 * Stubs https://example.com/**, opens the popup on https://example.com/app with
 * animations disabled, seeds the provided cookies via chrome.cookies.set, and
 * reloads the popup.
 * @param {object} context Playwright browser context.
 * @param {function} openPopup Fixture helper to open the popup for a tab URL.
 * @param {Array<object>} cookiesToSeed Cookies to pass to chrome.cookies.set.
 * @return {Promise<object>} Playwright page for the popup.
 */
async function openPopupWithSeededCookies(context, openPopup, cookiesToSeed) {
  await context.route('https://example.com/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><html><body><h1>HTTPS Test</h1></body></html>',
    })
  );
  const popup = await openPopup('https://example.com/app');
  await disablePopupAnimations(popup);
  await popup.evaluate(async cookies => {
    for (const cookie of cookies) {
      await chrome.cookies.set(cookie);
    }
  }, cookiesToSeed);
  await popup.reload();
  return popup;
}

/**
 * Finds a cookie list row by its textarea value.
 * @param {object} popup Playwright page for the popup.
 * @param {string} expectedVal Expected cookie value.
 * @return {Promise<object|null>} Matching row locator or null.
 */
async function findRowByValue(popup, expectedVal) {
  const cookieItems = popup.locator('#cookie-container li.cookie');
  const count = await cookieItems.count();
  for (let i = 0; i < count; i++) {
    const val = await cookieItems
      .nth(i)
      .locator('textarea[name="value"]')
      .inputValue();
    if (val === expectedVal) {
      return cookieItems.nth(i);
    }
  }
  return null;
}

test('Popup edits a partitioned (CHIPS) cookie without overwriting the same-named unpartitioned cookie', async ({
  context,
  openPopup,
}) => {
  const popup = await openPopupWithSeededCookies(context, openPopup, [
    {
      url: 'https://example.com/',
      name: 'rollout',
      value: 'rollout_unpartitioned',
      path: '/',
      secure: true,
    },
    {
      url: 'https://example.com/',
      name: 'rollout',
      value: 'rollout_partitioned',
      path: '/',
      secure: true,
      sameSite: 'no_restriction',
      partitionKey: { topLevelSite: 'https://example.com' },
    },
  ]);

  const cookieItems = popup.locator('#cookie-container li.cookie');
  await expect(cookieItems).toHaveCount(2);
  const ids = await cookieItems.evaluateAll(els => els.map(el => el.id));
  expect(new Set(ids).size).toBe(2);

  const partitionedRow = await findRowByValue(popup, 'rollout_partitioned');
  expect(partitionedRow).not.toBeNull();
  await partitionedRow.locator('.header').click();
  await partitionedRow
    .locator('textarea[name="value"]')
    .fill('rollout_partitioned_edited');
  await partitionedRow.locator('button.save').click();

  await expect
    .poll(async () =>
      popup.evaluate(async () => {
        const all = await chrome.cookies.getAll({
          url: 'https://example.com/app',
          partitionKey: {},
        });
        return all
          .filter(c => c.name === 'rollout')
          .map(c => ({
            value: c.value,
            partitioned: Boolean(c.partitionKey),
          }))
          .sort((a, b) => Number(a.partitioned) - Number(b.partitioned));
      })
    )
    .toEqual([
      { value: 'rollout_unpartitioned', partitioned: false },
      { value: 'rollout_partitioned_edited', partitioned: true },
    ]);
});

test('Popup deletes a root-path cookie while on a sub-path without deleting the sub-path cookie', async ({
  context,
  openPopup,
}) => {
  const popup = await openPopupWithSeededCookies(context, openPopup, [
    {
      url: 'https://example.com/',
      name: 'shared_path',
      value: 'root_path_val',
      path: '/',
      secure: true,
    },
    {
      url: 'https://example.com/app',
      name: 'shared_path',
      value: 'app_path_val',
      path: '/app',
      secure: true,
    },
  ]);

  const cookieItems = popup.locator('#cookie-container li.cookie');
  await expect(cookieItems).toHaveCount(2);

  const rootPathRow = await findRowByValue(popup, 'root_path_val');
  expect(rootPathRow).not.toBeNull();
  await rootPathRow.locator('.header button.delete').click();

  await expect
    .poll(async () =>
      popup.evaluate(async () => {
        const all = await chrome.cookies.getAll({
          url: 'https://example.com/app',
          partitionKey: {},
        });
        return all.filter(c => c.name === 'shared_path').map(c => c.value);
      })
    )
    .toEqual(['app_path_val']);
});

test('Popup deletes a partitioned (CHIPS) cookie from partitioned storage', async ({
  context,
  openPopup,
}) => {
  const popup = await openPopupWithSeededCookies(context, openPopup, [
    {
      url: 'https://example.com/',
      name: 'chips_only',
      value: 'chips_val',
      path: '/',
      secure: true,
      sameSite: 'no_restriction',
      partitionKey: { topLevelSite: 'https://example.com' },
    },
  ]);

  const partitionedRow = await findRowByValue(popup, 'chips_val');
  expect(partitionedRow).not.toBeNull();
  await partitionedRow.locator('.header button.delete').click();

  await expect
    .poll(async () =>
      popup.evaluate(async () => {
        const partList = await chrome.cookies.getAll({
          url: 'https://example.com/app',
          partitionKey: { topLevelSite: 'https://example.com' },
        });
        return partList.length;
      })
    )
    .toBe(0);
});
