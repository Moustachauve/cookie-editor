import { EventEmitter } from './eventEmitter.js';

/**
 * Class used to implement basic common Cookie API handling.
 */
export class GenericCookieHandler extends EventEmitter {
  /**
   * Constructs a GenericCookieHandler.
   * @param {BrowserDetector} browserDetector
   */
  constructor(browserDetector) {
    super();
    this.cookies = [];
    this.currentTab = null;
    this.browserDetector = browserDetector;
  }

  /**
   * Queries cookies matching `filter` across all storage partitions when
   * supported.
   * @param {BrowserDetector} browserDetector
   * @param {object} [filter={}]
   * @return {Promise<Array>}
   */
  static async getAllWithPartitions(browserDetector, filter = {}) {
    const cookiesApi = browserDetector.getApi().cookies;
    if (!browserDetector.isSafari()) {
      return cookiesApi.getAll({
        ...filter,
        partitionKey: {},
      });
    }
    return cookiesApi.getAll(filter);
  }

  /**
   * Gets all cookie for the current tab.
   * @return {Promise}
   */
  async getAllCookies() {
    return GenericCookieHandler.getAllWithPartitions(this.browserDetector, {
      url: this.currentTab.url,
      storeId: this.currentTab.cookieStoreId,
    });
  }

  /**
   * Prepares a cookie to be saved. Cleans it up for certain browsers.
   * @param {object} cookie
   * @param {string} url
   * @return {object}
   */
  prepareCookie(cookie, url) {
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
    if (this.browserDetector.isSafari() && newCookie.domain) {
      newCookie.url = 'http://' + newCookie.domain;
    }
    if (this.browserDetector.isSafari() && !newCookie.path) {
      newCookie.path = '/';
    }

    if (
      cookie.hostOnly ||
      (this.browserDetector.isSafari() && !newCookie.domain)
    ) {
      newCookie.domain = null;
    }

    if (!this.browserDetector.isSafari()) {
      newCookie.sameSite = cookie.sameSite || undefined;

      if (newCookie.sameSite == 'no_restriction') {
        newCookie.secure = true;
      }

      if (cookie.partitionKey) {
        newCookie.partitionKey = cookie.partitionKey;
      }
    }

    return newCookie;
  }

  /**
   * Saves a cookie. This can either create a new cookie or modify an existing
   * one.
   * @param {Cookie} cookie Cookie's data.
   * @param {string} url The url to attach the cookie to.
   * @return {Promise}
   */
  async saveCookie(cookie, url) {
    cookie = this.prepareCookie(cookie, url);
    return this.browserDetector.getApi().cookies.set(cookie);
  }

  /**
   * Removes a cookie from the browser.
   * @param {string} name The name of the cookie to remove.
   * @param {string} url The url that the cookie is attached to.
   * @param {object} [partitionKey=null] Optional storage partition key.
   * @param {boolean} [isRecursive=false]
   * @return {Promise}
   */
  async removeCookie(name, url, partitionKey = null, isRecursive = false) {
    // Bad hack on safari because cookies needs to have the very exact same domain
    // to be able to delete it.
    // TODO: Check if this hack is needed on devtools.
    if (this.browserDetector.isSafari() && !isRecursive) {
      const cookies = await this.getAllCookies();
      for (const cookie of cookies) {
        if (cookie.name === name) {
          await this.removeCookie(name, 'http://' + cookie.domain, null, true);
        }
      }
    } else {
      const removeParams = {
        name: name,
        url: url,
        storeId: this.currentTab.cookieStoreId,
      };
      if (partitionKey && !this.browserDetector.isSafari()) {
        removeParams.partitionKey = partitionKey;
      }
      return this.browserDetector.getApi().cookies.remove(removeParams);
    }
  }

  /**
   * Gets all the cookies from the browser.
   * @return {Promise}
   */
  async getAllCookiesInBrowser() {
    return GenericCookieHandler.getAllWithPartitions(this.browserDetector, {});
  }
}
