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

  new Ad({
    id: 'moosend',
    text: 'Turn email into your ally with Moosend’s email marketing tools!',
    tooltip:
      'Manage your audience, segment it and use the data you collected to deliver messages that will make them click and convert! Start your journey today.',
    url: 'https://trymoo.moosend.com/cookie-editor',
    supportedBrowsers: Browsers.Any,
    refreshDays: 100,
    startDate: new Date('2023/11/01'),
    endDate: new Date('2024/11/01'),
  }),

  new Ad({
    id: 'skillshare',
    text: 'Join Skillshare Today and Get 30% Off Annual Membership.',
    tooltip:
      'Get unlimited access to classes on illustration, photography, design, film, music, and more.',
    url: 'https://skillshare.eqcm.net/Mmo4oM',
    supportedBrowsers: Browsers.Any,
    refreshDays: 90,
    startDate: new Date('2023/10/21'),
    endDate: new Date('2024/12/01'),
  }),

  new Ad({
    id: 'nordvpn',
    text: 'With NordVPN, you can browse like no one’s watching — because no one is.',
    tooltip:
      'Get NordVPN now to protect yourself online every day, wherever you are. Securely access apps, websites, and entertainment.',
    url: 'https://go.nordvpn.net/aff_c?offer_id=15&aff_id=93111&url_id=902',
    supportedBrowsers: Browsers.Any,
    refreshDays: 105,
    startDate: new Date('2023/11/15'),
    endDate: new Date('2024/12/01'),
  }),

  new Ad({
    id: 'nordvpn-deal',
    text: 'Get 65% off the 2-year NordVPN plan + 3 months extra.',
    tooltip:
      'Stay safer online with the leading VPN service. Detect malware during download. Block trackers and intrusive ads.',
    url: 'https://go.nordvpn.net/aff_c?offer_id=15&aff_id=93111&url_id=902',
    supportedBrowsers: Browsers.Any,
    refreshDays: 105,
    startDate: new Date('2023/10/01'),
    endDate: new Date('2023/11/14'),
  }),

  new Ad({
    id: 'aura',
    text: 'Aura | Intelligent Digital Safety for the Whole Family',
    tooltip:
      'Aura protects your identity, finances and sensitive data. All plans include a $1M insurance policy that covers eligible losses. Try Aura 14-days free.',
    url: 'https://aurainc.sjv.io/c/4869326/1835216/12398',
    supportedBrowsers: Browsers.Any,
    refreshDays: 125,
    startDate: new Date('2023/10/07'),
    endDate: new Date('2024/12/01'),
  }),

  new Ad({
    id: 'incogni',
    text: 'Delete your personal data today with Incogni',
    tooltip:
      'Thousands of companies are collecting, aggregating, and trading your personal data without you knowing anything about it. Incogni makes them remove it so your data stays secure and private.',
    url: 'https://get.incogni.io/aff_c?offer_id=1150&aff_id=25909',
    supportedBrowsers: Browsers.Any,
    refreshDays: 125,
    startDate: new Date('2023/10/07'),
    endDate: new Date('2024/12/01'),
  }),
]);
