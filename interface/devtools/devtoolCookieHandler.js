
function CookieHandler() {
    'use strict';
    GenericCookieHandler.call(this);

    var self = this;
    var isInit = false;
    var backgroundPageConnection;

    updateCurrentTab(init);

    function init() {
        console.log('Devtool init');
        var tabId;
        if (window.browser) {
            backgroundPageConnection = browser.runtime.connect({name: "panel"});
            tabId = browser.devtools.inspectedWindow.tabId;
            //browser.cookies.onChanged.addListener(onCookiesChanged);
            //browser.tabs.onUpdated.addListener(onTabsChanged);
            //browser.tabs.onActivated.addListener(onTabActivated);
        } else {
            backgroundPageConnection = chrome.runtime.connect({name: "panel"});
            tabId = chrome.devtools.inspectedWindow.tabId;
        }

        backgroundPageConnection.onMessage.addListener(onMessage);

        backgroundPageConnection.postMessage({
            type: 'init',
            tabId: tabId
        });

        isInit = true;
        console.log('Devtool ready');
        self.emit('ready');
    }

    this.getAllCookies = function(callback) {
        sendMessage("getAllCookies", {
            url: this.currentTab.url,
            storeId: this.currentTab.cookieStoreId
        }, callback);
    };

    this.saveCookie = function(cookie, url, callback) {
        var newCookie = {
            domain: cookie.domain || '',
            name: cookie.name || '',
            value: cookie.value || '',
            path: cookie.path || null,
            secure: cookie.secure || null,
            httpOnly: cookie.httpOnly || null,
            expirationDate: cookie.expirationDate || null,
            storeId: cookie.storeId || this.currentTab.cookieStoreId || null,
            url: url,
        };
        
        sendMessage("saveCookie", {cookie: newCookie}, callback);
    };

    this.removeCookie = function(name, url, callback) {
        sendMessage("removeCookie", {
            name: name, 
            url: url,
            storeId: this.currentTab.cookieStoreId
        }, callback);
    };

    function onMessage(request) {
        console.log('background message received: ' + (request.type || 'unknown'));
        switch (request.type) {
            case 'cookiesChanged':
                onCookiesChanged(request.data);
                return;

            case 'tabsChanged':
                onTabsChanged(request.data);
                return;
        }
    }

    function onCookiesChanged(changeInfo) {
        var domain = changeInfo.cookie.domain.substring(1);
        if (self.currentTab.url.indexOf(domain) !== -1) {
            self.emit('cookiesChanged');
        }
    }
    function onTabsChanged(changeInfo) {
        if (changeInfo.url || changeInfo.status === 'complete') {
            console.log('tabChanged!');
            updateCurrentTab();
        }
    }

    function updateCurrentTab(callback) {
        sendMessage("getCurrentTab", null, function (tabInfo) {
            var newTab = tabInfo[0].id !== self.currentTabId || tabInfo[0].url !== self.currentTab.url;
            self.currentTabId = tabInfo[0].id;
            self.currentTab = tabInfo[0];
            if (newTab && isInit) {
                self.emit('cookiesChanged');
            }
            if (callback) {
                callback();
            }
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