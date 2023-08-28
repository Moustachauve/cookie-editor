import { GenericCookieHandler } from '../lib/genericCookieHandler.js';

/**
 * implements Cookie API handling for the devtools.
 * Devtools needs a separate behavior because they don't have access to the same
 * APIs as the popup, for example.
 */
export class CookieHandlerDevtools extends GenericCookieHandler {
  /**
   * Constructs and initializes the cookie handler.
   */
  constructor() {
    super();
    console.log('Constructing DevToolsCookieHandler');
    this.isInit = false;
    this.backgroundPageConnection = this.browserDetector
      .getApi()
      .runtime.connect({ name: 'panel' });
    this.updateCurrentTab(this.init);
  }

  /**
   * Initialise the cookie handler after making first contact with the main
   * background script.
   */
  init = () => {
    console.log('Devtool init');
    this.backgroundPageConnection.onMessage.addListener(this.onMessage);
    this.backgroundPageConnection.postMessage({
      type: 'init',
      tabId: this.browserDetector.getApi().devtools.inspectedWindow.tabId,
    });

    this.isInit = true;
    console.log('Devtool ready');
    this.emit('ready');
  };

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
    this.sendMessage('saveCookie', {cookie: this.prepareCookie(cookie, url)}, callback);
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
  onMessage = (request) => {
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
  onCookiesChanged = (changeInfo) => {
    const domain = changeInfo.cookie.domain.substring(1);
    if (this.currentTab.url.indexOf(domain) !== -1) {
      this.emit('cookiesChanged', changeInfo);
    }
  }

  /**
   * Handles the event that is fired when a tab is updated.
   * @param {object} changeInfo Properties of the tab that changed.
   */
  onTabsChanged = (changeInfo) => {
    console.log('devtools: tab changed', changeInfo);
    if (changeInfo.url || changeInfo.status === 'complete') {
      console.log('tabChanged!');
      this.updateCurrentTab();
    }
  }

  /**
   * Retrieves the informations of the current tab from the background script.
   * @param {*} callback
   */
  updateCurrentTab = (callback) => {
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
    }, function (e) {
      console.log('failed to update current tab', e);
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
    if (this.browserDetector.supportsPromises()) {
      this.browserDetector
        .getApi()
        .runtime.sendMessage({ type: type, params: params })
        .then(callback, errorCallback);
    } else {
      this.browserDetector
        .getApi()
        .runtime.sendMessage({ type: type, params: params }, callback);
    }
  }
}
