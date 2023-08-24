function GenericCookieHandler() {
  'use strict';
  Event.call(this);

  this.cookies = [];
  this.currentTab = null;
  const browserDetector = new BrowserDetector();

  this.getAllCookies = function (callback) {
    if (browserDetector.supportsPromises()) {
      browserDetector
        .getApi()
        .cookies.getAll({
          url: this.currentTab.url,
          storeId: this.currentTab.cookieStoreId,
        })
        .then(callback, function (e) {
          console.error('Failed to retrieve cookies', e);
        });
    } else {
      browserDetector.getApi().cookies.getAll(
        {
          url: this.currentTab.url,
          storeId: this.currentTab.cookieStoreId,
        },
        callback,
      );
    }
  };

  this.saveCookie = function (cookie, url, callback) {
    const newCookie = {
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

    // Bad hack on safari because cookies needs to have the very exact same domain
    // to be able to edit it.
    if (browserDetector.isSafari() && newCookie.domain) {
      newCookie.url = 'http://' + newCookie.domain;
    }

    if (cookie.hostOnly || (browserDetector.isSafari() && !newCookie.domain)) {
      newCookie.domain = null;
    }

    if (!browserDetector.isSafari()) {
      newCookie.sameSite = cookie.sameSite || undefined;

      if (newCookie.sameSite == 'no_restriction') {
        newCookie.secure = true;
      }
    }

    if (browserDetector.supportsPromises()) {
      browserDetector
        .getApi()
        .cookies.set(newCookie)
        .then(
          (cookie, a, b, c) => {
            if (callback) {
              callback(null, cookie);
            }
          },
          (error) => {
            console.error('Failed to create cookie', error);
            if (callback) {
              callback(error.message, null);
            }
          },
        );
    } else {
      browserDetector.getApi().cookies.set(newCookie, (cookieResponse) => {
        const error = browserDetector.getApi().runtime.lastError;
        if (!cookieResponse || error) {
          console.error('Failed to create cookie', error);
          if (callback) {
            const errorMessage =
              (error ? error.message : '') || 'Unknown error';
            return callback(errorMessage, cookieResponse);
          }
          return;
        }

        if (callback) {
          return callback(null, cookieResponse);
        }
      });
    }
  };

  this.removeCookie = function (name, url, callback, isRecursive = false) {
    // Bad hack on safari because cookies needs to have the very exact same domain
    // to be able to delete it.
    if (browserDetector.isSafari() && !isRecursive) {
      this.getAllCookies((cookies) => {
        for (const cookie of cookies) {
          if (cookie.name === name) {
            this.removeCookie(name, 'http://' + cookie.domain, callback, true);
          }
        }
      });
    } else if (browserDetector.supportsPromises()) {
      browserDetector
        .getApi()
        .cookies.remove({
          name: name,
          url: url,
          storeId: this.currentTab.cookieStoreId,
        })
        .then(callback, function (e) {
          console.error('Failed to remove cookies', e);
          if (callback) {
            callback();
          }
        });
    } else {
      browserDetector.getApi().cookies.remove(
        {
          name: name,
          url: url,
          storeId: this.currentTab.cookieStoreId,
        },
        (cookieResponse) => {
          const error = browserDetector.getApi().runtime.lastError;
          if (!cookieResponse || error) {
            console.error('Failed to remove cookie', error);
            if (callback) {
              const errorMessage =
                (error ? error.message : '') || 'Unknown error';
              return callback(errorMessage, cookieResponse);
            }
            return;
          }

          if (callback) {
            return callback(null, cookieResponse);
          }
        },
      );
    }
  };
}
