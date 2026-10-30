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
   * Resolves the cookie store ID for `tabId` on Safari via
   * `cookies.getAllCookieStores()`, falling back to the default store
   * (`stores[0]`) when no store explicitly lists `tabId`.
   * @param {BrowserDetector} browserDetector
   * @param {number} [tabId]
   * @return {Promise<string|undefined>}
   */
  static async getSafariTabStoreId(browserDetector, tabId) {
    const stores = await browserDetector.getApi().cookies.getAllCookieStores();
    if (stores.length === 0) {
      return undefined;
    }
    const matchingStore =
      tabId !== undefined
        ? stores.find(store => store.tabIds.includes(tabId))
        : undefined;
    return (matchingStore || stores[0]).id;
  }

  /**
   * Returns a copy of `cookie` with `storeId` resolved via
   * `getSafariTabStoreId` when running on Safari and `cookie.storeId` is not
   * set.
   * @param {BrowserDetector} browserDetector
   * @param {object} cookie
   * @param {number} [tabId]
   * @return {Promise<object>}
   */
  static async withSafariStoreId(browserDetector, cookie, tabId) {
    const resolvedCookie = { ...cookie };
    if (browserDetector.isSafari() && !resolvedCookie.storeId) {
      const storeId = await GenericCookieHandler.getSafariTabStoreId(
        browserDetector,
        tabId
      );
      if (storeId) {
        resolvedCookie.storeId = storeId;
      }
    }
    return resolvedCookie;
  }

  /**
   * Queries cookies matching `filter` across all storage partitions when
   * supported. On Safari, resolves real cookie store IDs via
   * `cookies.getAllCookieStores()` when `storeId` is not provided so
   * `cookies.getAll()` never receives an unresolved or undefined `storeId`.
   * @param {BrowserDetector} browserDetector
   * @param {object} [filter={}]
   * @param {number} [tabId] Optional tab ID used to narrow Safari cookie stores.
   * @return {Promise<Array>}
   */
  static async getAllWithPartitions(browserDetector, filter = {}, tabId) {
    const cookiesApi = browserDetector.getApi().cookies;
    if (!browserDetector.isSafari()) {
      return cookiesApi.getAll({
        ...filter,
        partitionKey: {},
      });
    }

    if (!filter.storeId) {
      if (tabId !== undefined) {
        const storeId = await GenericCookieHandler.getSafariTabStoreId(
          browserDetector,
          tabId
        );
        if (storeId) {
          return cookiesApi.getAll({
            ...filter,
            storeId,
          });
        }
      } else {
        const stores = await cookiesApi.getAllCookieStores();
        if (stores.length > 0) {
          const results = await Promise.all(
            stores.map(store =>
              cookiesApi.getAll({
                ...filter,
                storeId: store.id,
              })
            )
          );
          return results.flat();
        }
      }
    }

    return cookiesApi.getAll(filter);
  }

  /**
   * Gets all cookie for the current tab.
   * @return {Promise}
   */
  async getAllCookies() {
    const filter = {
      url: this.currentTab.url,
    };
    if (this.currentTab.cookieStoreId) {
      filter.storeId = this.currentTab.cookieStoreId;
    }
    return GenericCookieHandler.getAllWithPartitions(
      this.browserDetector,
      filter,
      this.currentTab.id
    );
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
      url: url,
    };
    const storeId = cookie.storeId || this.currentTab.cookieStoreId;
    if (storeId) {
      newCookie.storeId = storeId;
    }

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
    cookie = await GenericCookieHandler.withSafariStoreId(
      this.browserDetector,
      this.prepareCookie(cookie, url),
      this.currentTab.id
    );
    return this.browserDetector.getApi().cookies.set(cookie);
  }

  /**
   * Removes a cookie from the browser.
   * @param {string} name The name of the cookie to remove.
   * @param {string} url The url that the cookie is attached to.
   * @param {object} [partitionKey=null] Optional storage partition key.
   * @param {boolean} [isRecursive=false]
   * @param {string} [storeId] Optional cookie store ID.
   * @return {Promise}
   */
  async removeCookie(
    name,
    url,
    partitionKey = null,
    isRecursive = false,
    storeId = undefined
  ) {
    // Bad hack on safari because cookies needs to have the very exact same domain
    // to be able to delete it.
    if (this.browserDetector.isSafari() && !isRecursive) {
      const cookies = await this.getAllCookies();
      for (const cookie of cookies) {
        if (cookie.name === name) {
          await this.removeCookie(
            name,
            'http://' + cookie.domain,
            null,
            true,
            cookie.storeId
          );
        }
      }
    } else {
      const removeParams = {
        name: name,
        url: url,
      };
      const resolvedStoreId = storeId || this.currentTab.cookieStoreId;
      if (resolvedStoreId) {
        removeParams.storeId = resolvedStoreId;
      }
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
