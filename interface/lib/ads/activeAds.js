import { Browsers } from '../browsers.js';
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
    // Apple doesn't allow Github sponsors (external payment)
    supportedBrowsers: [
      Browsers.Chrome,
      Browsers.Edge,
      Browsers.Firefox,
      Browsers.Opera,
    ],
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
    supportedBrowsers: [Browsers.Chrome, Browsers.Edge, Browsers.Safari],
    refreshDays: 80,
    startDate: new Date('2023/09/01'),
    endDate: new Date('2024/09/01'),
  }),
]);
