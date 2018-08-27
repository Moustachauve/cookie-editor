
function GenericCookieHandler() {
    'use strict';
    Event.call(this);

    this.cookies = [];
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
        const newCookie = {
            domain: cookie.domain || '',
            name: cookie.name || '',
            value: cookie.value || '',
            path: cookie.path || null,
            secure: cookie.secure || null,
            httpOnly: cookie.httpOnly || null,
            expirationDate: cookie.expirationDate || null,
            storeId: cookie.storeId || this.currentTab.cookieStoreId || null,
            url: url
        };

        if (cookie.hostOnly) {
            newCookie.domain = null;
        }
        
        if (window.browser) {
            browser.cookies.set(newCookie).then(cookie => {
                if (callback) {
                    callback(null, cookie);
                }
            }, error => {
                console.error('Failed to create cookie', error);
                if (callback) {
                    callback(error.message, null);
                }
            });
        } else {
            chrome.cookies.set(newCookie, cookie => {
                if (cookie) {
                    if (callback) {
                        return callback(null, cookie);
                    }
                    return;
                } else {
                    let error = chrome.runtime.lastError;
                    console.error('Failed to create cookie', error);
                    if (callback) {
                        return callback(error.message, cookie);
                    }
                    return;
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