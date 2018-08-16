
function GenericCookieHandler() {
    'use strict';
    Event.call(this);

    this.cookies = [];
    this.currentTabId = null;
    this.currentTab = null;

    this.getAllCookies = function(callback) {
        if (window.browser) {
            browser.cookies.getAll({
                url: this.currentTab.url,
                storeId: this.currentTab.cookieStoreId
            }).then(callback, function (e) {
                console.error('Failed to retrieve cookies', e);
            });
        } else {
            chrome.cookies.getAll({
                url: this.currentTab.url,
                storeId: this.currentTab.cookieStoreId
            }, callback);
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
            storeId: this.currentTab.cookieStoreId
        };

        if (cookie.hostOnly) {
            newCookie.domain = null;
        }
        
        if (window.browser) {
            browser.cookies.set(newCookie).then(cookie => {
                callback(null, cookie);
            }, error => {
                console.error('Failed to create cookie', error);
                callback(error.message, null);
            });
        } else {
            chrome.cookies.set(newCookie, cookie => {
                if (cookie) {
                    return callback(null, cookie);
                } else {
                    let error = chrome.runtime.lastError;
                    console.error('Failed to create cookie', error);
                    return callback(error.message, cookie);
                }
            });
        }
    };

    this.removeCookie = function(name, url, callback) {
        if (window.browser) {
            browser.cookies.remove({
                name: name,
                url: url,
                storeId: this.currentTab.cookieStoreId
            }).then(callback, function (e) {
                console.error('Failed to remove cookies', e);
            });
        } else {
            chrome.cookies.remove({
                name: name,
                url: url,
                storeId: this.currentTab.cookieStoreId
            }, callback);
        }
    };
}