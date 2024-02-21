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
    refreshDays: 90,
    startDate: new Date('2023/09/01'),
    endDate: new Date('2024/02/29'),
  }),

  new Ad({
    id: 'tab-for-cause2',
    text: 'Have 47+ tabs open? Try Tab for a Cause to raise money for non-profits',
    tooltip:
      "Raise money for charity every time you open a new browser tab. It's free and incredibly easy. Transform your tabs into a force for good in 30 seconds.",
    url: 'https://tab.gladly.io/cookieeditor/',
    supportedBrowsers: [Browsers.Chrome, Browsers.Edge, Browsers.Safari],
    refreshDays: 90,
    startDate: new Date('2023/04/01'),
    endDate: new Date('2025/09/01'),
  }),

  new Ad({
    id: 'skillshare',
    text: 'Skillshare | Explore your creativity with thousands of hands‑on classes.',
    tooltip: 'Join Skillshare Today and Get 30% Off Annual Membership.',
    url: 'https://skillshare.eqcm.net/Mmo4oM',
    supportedBrowsers: Browsers.Any,
    refreshDays: 110,
    startDate: new Date('2023/10/21'),
    endDate: new Date('2025/05/01'),
  }),

  new Ad({
    id: 'nordvpn',
    text: 'With NordVPN, you can browse like no one’s watching — because no one is.',
    tooltip:
      'Get NordVPN now to protect yourself online every day, wherever you are. Securely access apps, websites, and entertainment.',
    url: 'https://go.nordvpn.net/aff_c?offer_id=15&aff_id=93111&url_id=902',
    supportedBrowsers: Browsers.Any,
    refreshDays: 120,
    startDate: new Date('2023/11/15'),
    endDate: new Date('2024/03/15'),
  }),

  new Ad({
    id: 'nordvpn-deal',
    text: "Don't miss a chance and grab a limited NordVPN deal!",
    tooltip:
      'Get NordVPN now to protect yourself online every day, wherever you are. Securely access apps, websites, and entertainment.',
    url: 'https://go.nordvpn.net/aff_c?offer_id=15&aff_id=93111&url_id=902',
    supportedBrowsers: Browsers.Any,
    refreshDays: 120,
    startDate: new Date('2024/03/16'),
    endDate: new Date('2024/12/31'),
  }),

  new Ad({
    id: 'aura',
    text: 'Aura | #1 Rated Identity Theft Protection - Try Aura 14-days free.',
    tooltip:
      'Aura protects your identity, finances and sensitive data. All plans include a $1M insurance policy that covers eligible losses.',
    url: 'https://aurainc.sjv.io/c/4869326/1835216/12398',
    supportedBrowsers: Browsers.Any,
    refreshDays: 130,
    startDate: new Date('2023/10/07'),
    endDate: new Date('2025/02/01'),
  }),

  new Ad({
    id: 'incogni',
    text: 'Delete your personal data today with Incogni',
    tooltip:
      'Thousands of companies are collecting, aggregating, and trading your personal data without you knowing anything about it. Incogni makes them remove it so your data stays secure and private.',
    url: 'https://get.incogni.io/aff_c?offer_id=1150&aff_id=25909',
    supportedBrowsers: Browsers.Any,
    refreshDays: 140,
    startDate: new Date('2023/10/07'),
    endDate: new Date('2024/12/01'),
  }),

  new Ad({
    id: 'incogni-code',
    text: 'Incogni | Want to stop robocalls and spam emails today?',
    tooltip:
      'Thousands of companies are collecting, aggregating, and trading your personal data without you knowing anything about it. Incogni makes them remove it so your data stays secure and private.',
    url: 'https://get.incogni.io/aff_c?offer_id=1150&aff_id=25909',
    supportedBrowsers: Browsers.Any,
    refreshDays: 140,
    startDate: new Date('2024/03/07'),
    endDate: new Date('2024/12/01'),
  }),

  new Ad({
    id: 'namecheap',
    text: 'Namecheap | Get a .COM for just $5.98!',
    tooltip: 'All domains for great prices. Prices are succeptible to change.',
    url: 'https://namecheap.pxf.io/zNkAPe',
    supportedBrowsers: Browsers.Any,
    refreshDays: 130,
    startDate: new Date('2024/03/14'),
    endDate: new Date('2025/03/14'),
  }),

  new Ad({
    id: 'curiosity-box',
    text: 'Try the Curiosity Box by VSauce and get a FREE Lightyear Bottle!',
    tooltip: "The world's best science toys by science legend, VSauce.",
    url: 'https://the-curiosity-box.pxf.io/DKrYOo',
    supportedBrowsers: Browsers.Any,
    refreshDays: 100,
    startDate: new Date('2024/03/14'),
    endDate: new Date('2025/03/14'),
  }),
]);
