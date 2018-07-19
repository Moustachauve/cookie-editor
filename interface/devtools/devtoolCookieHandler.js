
function CookieHandler() {
    'use strict';
    GenericCookieHandler.call(this);

    var self = this;
    var isInit = false;

    updateCurrentTab(init);

    function init() {
        console.log('Devtool init');
        if (window.browser) {
            //browser.cookies.onChanged.addListener(onCookiesChanged);
            //browser.tabs.onUpdated.addListener(onTabsChanged);
            //browser.tabs.onActivated.addListener(onTabActivated);
        } else {
            //chrome.cookies.onChanged.addListener(onCookiesChanged);
            //chrome.tabs.onUpdated.addListener(onTabsChanged);
            //chrome.tabs.onActivated.addListener(onTabActivated);
        }

        isInit = true;
        console.log('Devtool ready');
        self.emit('ready');
    }

    this.getAllCookies = function(callback) {
        sendMessage("getAllCookies", {url: this.currentTab.url}, callback);
    };

    this.saveCookie = function(cookie, url, callback) {
        var newCookie = {
            domain: cookie.domain || '',
            name: cookie.name || '',
            value: cookie.value || '',
            path: cookie.path || null,
            secure: cookie.secure || null,
            httpOnly: cookie.httpOnly || null,
            sameSite: cookie.sameSite || null,
            expirationDate: cookie.expirationDate || null,
            storeId: cookie.storeId || null,
            url: url,
        };
        
        sendMessage("saveCookie", {cookie: newCookie}, callback);
    };

    this.removeCookie = function(name, url, callback) {
        sendMessage("removeCookie", {name: name, url: url}, callback);
    };

    function onCookiesChanged(changeInfo) {
        var domain = changeInfo.cookie.domain.substring(1);
        if (self.currentTab.url.indexOf(domain) !== -1) {
            self.emit('cookiesChanged');
        }
    }
    function onTabsChanged(tabId, changeInfo, tab) {
        if (tabId == self.currentTabId && (changeInfo.url || changeInfo.status === 'complete')) {
            console.log('tabChanged!');
            updateCurrentTab();
        }
    }

    function onTabActivated(activeInfo) {
        updateCurrentTab();
    }

    function updateCurrentTab(callback) {
        sendMessage("getCurrentTab", null, function (tabInfo) {
            var newTab = tabInfo[0].id !== self.currentTabId || tabInfo[0].url !== self.currentTab.url;
            self.currentTabId = tabInfo[0].id;
            self.currentTab = tabInfo[0];
            if (newTab && isInit) {
                self.emit('cookiesChanged');
            }
            callback();
        });
    }

    function sendMessage(type, params, callback, errorCallback) {
        if (window.browser) {
            var sending = browser.runtime.sendMessage({ type: type, params: params });
            sending.then(callback, errorCallback);  
        } else {
            chrome.runtime.sendMessage({ type: type, params: params }, callback);
        }
    }
}