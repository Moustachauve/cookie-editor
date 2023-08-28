import { GenericCookieHandler } from '../lib/genericCookieHandler.js';

/**
 * implements Cookie API handling for the devtools.
 * Devtools needs a separate behavior because they don't have access to the same
 * APIs as the popup, for example.
 */
export class CookieHandler extends GenericCookieHandler {
  /**
   * Constructs and initializes the cookie handler.
   */
  constructor() {
    super();
    this.isInit = false;
    this.updateCurrentTab(this.init);
  }

  /**
   * Initialise the cookie handler after making first contact with the main
   * background script.
   */
  init() {
    console.log('Devtool init');
    let tabId;
    const backgroundPageConnection = this.browserDetector
      .getApi()
      .runtime.connect({ name: 'panel' });
    this.tabId = this.browserDetector.getApi().devtools.inspectedWindow.tabId;
    backgroundPageConnection.onMessage.addListener(this.onMessage);

    backgroundPageConnection.postMessage({
      type: 'init',
      tabId: tabId,
    });

    this.isInit = true;
    console.log('Devtool ready');
    this.emit('ready');
  }

  /**
   * Gets all the cookies for the current tab.
   * @param {function} callback
   */
  getAllCookies(callback) {
    this.sendMessage(
      'getAllCookies',
      {
        url: this.currentTab.url,
        storeId: this.currentTab.cookieStoreId,
      },
      callback,
    );
  }

  /**
   * Saves a cookie. This can either create a new cookie or modify an existing
   * one.
   * @param {Cookie} cookie Cookie's data.
   * @param {string} url The url to attach the cookie to.
   * @param {function} callback
   */
  saveCookie(cookie, url, callback) {
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
      sameSite: cookie.sameSite || undefined,
    };

    this.sendMessage('saveCookie', { cookie: newCookie }, callback);
  }

  /**
   * Removes a cookie from the browser.
   * @param {string} name The name of the cookie to remove.
   * @param {string} url The url that the cookie is attached to.
   * @param {function} callback
   */
  removeCookie(name, url, callback) {
    this.sendMessage(
      'removeCookie',
      {
        name: name,
        url: url,
        storeId: this.currentTab.cookieStoreId,
      },
      callback,
    );
  }

  /**
   * Handles the reception of messages from the background script.
   * @param {object} request
   */
  onMessage(request) {
    console.log('background message received: ' + (request.type || 'unknown'));
    switch (request.type) {
      case 'cookiesChanged':
        this.onCookiesChanged(request.data);
        return;

      case 'tabsChanged':
        this.onTabsChanged(request.data);
        return;
    }
  }

  /**
   * Handles events that is triggered when a cookie changes.
   * @param {object} changeInfo An object containing details of the change that
   *     occurred.
   */
  onCookiesChanged(changeInfo) {
    const domain = changeInfo.cookie.domain.substring(1);
    if (this.currentTab.url.indexOf(domain) !== -1) {
      this.emit('cookiesChanged', changeInfo);
    }
  }

  /**
   * Handles the event that is fired when a tab is updated.
   * @param {object} changeInfo Properties of the tab that changed.
   */
  onTabsChanged(changeInfo) {
    if (changeInfo.url || changeInfo.status === 'complete') {
      console.log('tabChanged!');
      this.updateCurrentTab();
    }
  }

  /**
   * Retrieves the informations of the current tab from the background script.
   * @param {*} callback
   */
  updateCurrentTab(callback) {
    const self = this;
    this.sendMessage('getCurrentTab', null, function (tabInfo) {
      const newTab =
        tabInfo[0].id !== self.currentTabId ||
        tabInfo[0].url !== self.currentTab.url;
      self.currentTabId = tabInfo[0].id;
      self.currentTab = tabInfo[0];
      if (newTab && self.isInit) {
        self.emit('cookiesChanged');
      }
      if (callback) {
        callback();
      }
    });
  }

  /**
   * Sends a message to the background script.
   * @param {string} type The type of the message.
   * @param {object} params The payload of the message
   * @param {function} callback
   * @param {function} errorCallback
   */
  sendMessage(type, params, callback, errorCallback) {
    if (this.browserDetector.isFirefox()) {
      const sending = this.browserDetector
        .getApi()
        .runtime.sendMessage({ type: type, params: params });
      sending.then(callback, errorCallback);
    } else {
      this.browserDetector
        .getApi()
        .runtime.sendMessage({ type: type, params: params }, callback);
    }
  }
}
