function CookieHandler() {
  'use strict';
  GenericCookieHandler.call(this);

  const self = this;
  let isInit = false;
  const browserDetector = new BrowserDetector();

  if (browserDetector.isFirefox()) {
    browserDetector
      .getApi()
      .tabs.query({ active: true, currentWindow: true })
      .then(init);
  } else {
    browserDetector
      .getApi()
      .tabs.query({ active: true, currentWindow: true }, init);
  }

  function init(tabInfo) {
    self.currentTabId = tabInfo[0].id;
    self.currentTab = tabInfo[0];

    if (browserDetector.isFirefox()) {
      browserDetector.getApi().cookies.onChanged.addListener(onCookiesChanged);
      browserDetector.getApi().tabs.onUpdated.addListener(onTabsChanged);
      browserDetector.getApi().tabs.onActivated.addListener(onTabActivated);
    } else {
      browserDetector.getApi().tabs.onUpdated.addListener(onTabsChanged);
      browserDetector.getApi().tabs.onActivated.addListener(onTabActivated);
      if (!browserDetector.isSafari()) {
        browserDetector
          .getApi()
          .cookies.onChanged.addListener(onCookiesChanged);
      }
    }

    isInit = true;
    self.emit('ready');
  }

  function onCookiesChanged(changeInfo) {
    const domain = changeInfo.cookie.domain.substring(1);
    if (
      self.currentTab.url.indexOf(domain) !== -1 &&
      changeInfo.cookie.storeId === (self.currentTab.cookieStoreId || '0')
    ) {
      self.emit('cookiesChanged', changeInfo);
    }
  }
  function onTabsChanged(tabId, changeInfo, tab) {
    if (
      tabId === self.currentTabId &&
      (changeInfo.url || changeInfo.status === 'complete')
    ) {
      console.log('tabChanged!');
      if (browserDetector.isFirefox()) {
        browserDetector
          .getApi()
          .tabs.query({ active: true, currentWindow: true })
          .then(updateCurrentTab);
      } else {
        browserDetector
          .getApi()
          .tabs.query({ active: true, currentWindow: true }, updateCurrentTab);
      }
    }
  }

  function onTabActivated(activeInfo) {
    if (browserDetector.isFirefox()) {
      browserDetector
        .getApi()
        .tabs.query({ active: true, currentWindow: true })
        .then(updateCurrentTab);
    } else {
      browserDetector
        .getApi()
        .tabs.query({ active: true, currentWindow: true }, updateCurrentTab);
    }
  }

  function updateCurrentTab(tabInfo) {
    const newTab =
      tabInfo[0].id !== self.currentTabId ||
      tabInfo[0].url !== self.currentTab.url;
    self.currentTabId = tabInfo[0].id;
    self.currentTab = tabInfo[0];

    if (newTab && isInit) {
      self.emit('cookiesChanged');
    }
  }
}
