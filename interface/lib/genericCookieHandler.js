
function GenericCookieHandler() {
    'use strict';
    Event.call(this);

    this.cookies = [];
    this.currentTabId = null;
    this.currentTab = null;

    this.getAllCookies = function(callback) {
        if (window.browser) {
            browser.cookies.getAll({ url: this.currentTab.url }).then(callback);
        } else {
            chrome.cookies.getAll({ url: this.currentTab.url }, callback);
        }
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
            storeId: cookie.storeId || null,
            url: url,
        };
        
        if (window.browser) {
            browser.cookies.set(newCookie).then(callback);
        } else {
            chrome.cookies.set(newCookie, callback);
        }
    };

    this.removeCookie = function(name, url, callback) {
        if (window.browser) {
            browser.cookies.remove({name: name, url: url}).then(callback);
        } else {
            chrome.cookies.remove({name: name, url: url}, callback);
        }
    };
}