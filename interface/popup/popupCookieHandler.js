
function CookieHandler() {
    'use strict';
    GenericCookieHandler.call(this);

    var self = this;
    var isInit = false;

    if (window.browser) {
        browser.tabs.query({ active: true, currentWindow: true }).then(init);
    } else {
        chrome.tabs.query({ active: true, currentWindow: true }, init);
    }

    function init(tabInfo) {
        self.currentTabId = tabInfo[0].id;
        self.currentTab = tabInfo[0];

        if (window.browser) {
            browser.cookies.onChanged.addListener(onCookiesChanged);
            browser.tabs.onUpdated.addListener(onTabsChanged);
            browser.tabs.onActivated.addListener(onTabActivated);
        } else {
            chrome.cookies.onChanged.addListener(onCookiesChanged);
            chrome.tabs.onUpdated.addListener(onTabsChanged);
            chrome.tabs.onActivated.addListener(onTabActivated);
        }

        isInit = true;
        self.emit('ready');
    }

    function onCookiesChanged(changeInfo) {
        var domain = changeInfo.cookie.domain.substring(1);
        if (self.currentTab.url.indexOf(domain) !== -1 && changeInfo.cookie.storeId === (self.currentTab.cookieStoreId || '0')) {
            self.emit('cookiesChanged');
        }
    }
    function onTabsChanged(tabId, changeInfo, tab) {
        if (tabId == self.currentTabId && (changeInfo.url || changeInfo.status === 'complete')) {
            console.log('tabChanged!');
            if (window.browser) {
                browser.tabs.query({ active: true, currentWindow: true }).then(updateCurrentTab);
            } else {
                chrome.tabs.query({ active: true, currentWindow: true }, updateCurrentTab);
            }
        }
    }

    function onTabActivated(activeInfo) {
        if (window.browser) {
            browser.tabs.query({ active: true, currentWindow: true }).then(updateCurrentTab);
        } else {
            chrome.tabs.query({ active: true, currentWindow: true }, updateCurrentTab);
        }
    }

    function updateCurrentTab(tabInfo) {
        var newTab = tabInfo[0].id !== self.currentTabId || tabInfo[0].url !== self.currentTab.url;
        self.currentTabId = tabInfo[0].id;
        self.currentTab = tabInfo[0];
        
        if (newTab && isInit) {
            self.emit('cookiesChanged');
        }
    }
}