import { Ad } from './ad.js';

/**
 * A list of all the currently active ads.
 */
export const ActiveAds = Object.freeze([
  new Ad({
    id: 'cookie-editor',
    text: 'Enjoying Cookie-Editor? Buy me a coffee!',
    tooltip:
      'Cookie-Editor is always free. Help its development by sponsoring me.',
    url: 'https://github.com/sponsors/Moustachauve',
    supportedBrowsers: 'all',
    refreshDays: 80,
    startDate: null,
    endDate: null,
  }),
  new Ad({
    id: 'tab-for-cause',
    text: 'Get Tab For A Cause: Raise money for charity',
    tooltip:
      "Raise money for charity every time you open a new browser tab. It's free and incredibly easy. Transform your tabs into a force for good in 30 seconds.",
    url: 'https://tab.gladly.io/cookieeditor/',
    // TODO: make this an array from an 'enum'.
    supportedBrowsers: 'chrome safari edge',
    refreshDays: 80,
    startDate: null,
    endDate: null,
  }),
]);
