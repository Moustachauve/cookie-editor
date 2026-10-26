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
      // eslint-disable-next-line camelcase
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
