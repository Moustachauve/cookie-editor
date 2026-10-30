import { GenericCookieHandler } from '../lib/genericCookieHandler.js';

/**
 * implements Cookie API handling for the devtools.
 * Devtools needs a separate behavior because they don't have access to the same
 * APIs as the popup, for example.
 */
export class CookieHandlerDevtools extends GenericCookieHandler {
  /**
   * Constructs and initializes the cookie handler.
   * @param {BrowserDetector} browserDetector
   */
  constructor(browserDetector) {
    super(browserDetector);
    this.isReady = false;
    console.log('Constructing DevToolsCookieHandler');
    this.backgroundPageConnection = this.browserDetector
      .getApi()
      .runtime.connect({ name: 'panel' });
    this.updateCurrentTab().then(this.init);
  }

  /**
   * Initialise the cookie handler after making first contact with the main
   * background script.
   */
  init = () => {
    console.log('Devtool init');
    this.backgroundPageConnection.onMessage.addListener(this.onMessage);
    this.backgroundPageConnection.postMessage({
      type: 'init_cookieHandler',
      tabId: this.browserDetector.getApi().devtools.inspectedWindow.tabId,
    });

    console.log('Devtool ready');
    this.emit('ready');
    this.isReady = true;
  };

  /**
   * Gets all the cookies for the current tab.
   * @return {Promise}
   */
  async getAllCookies() {
    const params = {
      url: this.currentTab.url,
      tabId: this.currentTab.id,
    };
    if (this.currentTab.cookieStoreId) {
      params.storeId = this.currentTab.cookieStoreId;
    }
    const response = await this.sendMessage('getAllCookies', params);
    if (response && response.success === false) {
      throw new Error(response.error || 'Failed to get cookies');
    }
    return response;
  }

  /**
   * Saves a cookie. This can either create a new cookie or modify an existing
   * one.
   * @param {Cookie} cookie Cookie's data.
   * @param {string} url The url to attach the cookie to.
   * @return {Promise}
   */
  async saveCookie(cookie, url) {
    const response = await this.sendMessage('saveCookie', {
      cookie: this.prepareCookie(cookie, url),
      tabId: this.currentTab.id,
    });
    if (response && response.success === false) {
      throw new Error(response.error || 'Failed to save cookie');
    }
    return response?.cookie ?? response;
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
    if (this.browserDetector.isSafari() && !isRecursive) {
      return super.removeCookie(name, url, partitionKey, isRecursive, storeId);
    }

    const params = {
      name: name,
      url: url,
    };
    const resolvedStoreId = storeId || this.currentTab.cookieStoreId;
    if (resolvedStoreId) {
      params.storeId = resolvedStoreId;
    }
    if (partitionKey) {
      params.partitionKey = partitionKey;
    }
    const response = await this.sendMessage('removeCookie', params);
    if (response && response.success === false) {
      throw new Error(response.error || 'Failed to remove cookie');
    }
    return response;
  }

  /**
   * Handles the reception of messages from the background script.
   * @param {object} request
   */
  onMessage = request => {
    console.log(
      '[cookieHandler] background message received: ' +
        (request.type || 'unknown')
    );
    switch (request.type) {
      case 'cookiesChanged':
        this.onCookiesChanged(request.data);
        return;

      case 'tabsChanged':
        this.onTabsChanged(request.data);
        return;
    }
  };

  /**
   * Handles events that is triggered when a cookie changes.
   * @param {object} changeInfo An object containing details of the change that
   *     occurred.
   */
  onCookiesChanged = changeInfo => {
    const domain = changeInfo.cookie.domain.substring(1);
    if (this.currentTab.url.indexOf(domain) !== -1) {
      this.emit('cookiesChanged', changeInfo);
    }
  };

  /**
   * Handles the event that is fired when a tab is updated.
   * @param {object} changeInfo Properties of the tab that changed.
   */
  onTabsChanged = changeInfo => {
    console.log('devtools: tab changed', changeInfo);
    if (changeInfo.url || changeInfo.status === 'complete') {
      console.log('tabChanged!');
      this.updateCurrentTab();
    }
  };

  /**
   * Retrieves the informations of the current tab from the background script.
   */
  updateCurrentTab = async () => {
    try {
      const tabInfo = await this.sendMessage('getCurrentTab', null);
      if (!tabInfo || !tabInfo[0]) {
        return;
      }
      const newTab =
        tabInfo[0].id !== this.currentTabId ||
        tabInfo[0].url !== this.currentTab.url;
      this.currentTabId = tabInfo[0].id;
      this.currentTab = tabInfo[0];
      if (newTab && this.isReady) {
        this.emit('cookiesChanged');
      }
    } catch (e) {
      console.log('failed to update current tab', e);
    }
  };

  /**
   * Sends a message to the background script.
   * @param {string} type The type of the message.
   * @param {object} params The payload of the message
   * @return {Promise}
   */
  sendMessage(type, params) {
    return this.browserDetector
      .getApi()
      .runtime.sendMessage({ type: type, params: params });
  }
}
