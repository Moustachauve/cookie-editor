
function GenericCookieHandler() {
    'use strict';
    Event.call(this);

    this.cookies = [];
    this.currentTab = null;
    const browserDetector = new BrowserDetector();

    this.getAllCookies = function(callback) {
        if (browserDetector.isFirefox()) {
            browserDetector.getApi().cookies.getAll({
                url: this.currentTab.url,
                storeId: this.currentTab.cookieStoreId
            }).then(callback, function (e) {
                console.error('Failed to retrieve cookies', e);
            });
        } else {
            browserDetector.getApi().cookies.getAll({
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
        
        if (browserDetector.isFirefox()) {
            browserDetector.getApi().cookies.set(newCookie).then(cookie => {
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
            browserDetector.getApi().cookies.set(newCookie, (cookie, a, b, c) => {
                if (cookie) {
                    if (callback) {
                        return callback(null, cookie);
                    }
                    return;
                } else {
                    let error = browserDetector.getApi().runtime.lastError;
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
        if (browserDetector.isFirefox()) {
            browserDetector.getApi().cookies.remove({
                name: name,
                url: url,
                storeId: this.currentTab.cookieStoreId
            }).then(callback, function (e) {
                console.error('Failed to remove cookies', e);
            });
        } else {
            browserDetector.getApi().cookies.remove({
                name: name,
                url: url,
                storeId: this.currentTab.cookieStoreId
            }, callback);
        }
    };
}