import { BrowserDetector } from './interface/lib/browserDetector.js';
import { Browsers } from './interface/lib/browsers.js';
import { GenericCookieHandler } from './interface/lib/genericCookieHandler.js';
import { PermissionHandler } from './interface/lib/permissionHandler.js';

(async function () {
  console.log('starting background script');
  // TODO: Separate connections from CookieHandler and OptionsHandler.
  // It would also be cool to separate their whole behavior in separate class
  // that extends a generic one.
  const connections = {};
  const browserDetector = new BrowserDetector();
  const permissionHandler = new PermissionHandler(browserDetector);

  // Setting up event listeners synchronously at startup for service worker lifecycle
  browserDetector.getApi().runtime.onConnect.addListener(onConnect);
  browserDetector.getApi().runtime.onMessage.addListener(handleMessage);
  browserDetector.getApi().tabs.onUpdated.addListener(onTabsChanged);

  if (!browserDetector.isSafari()) {
    browserDetector.getApi().cookies.onChanged.addListener(onCookiesChanged);
  }

  if (await isFirefoxAndroid()) {
    const popupOptions = {
      popup: '/interface/popup-mobile/cookie-list.html',
    };
    browserDetector.getApi().action.setPopup(popupOptions);
  }

  if (await isSafariIos()) {
    // If we detect the user is on iOS, mark the browser
    // as Safari in case it was edge or something else.
    browserDetector.overrideBrowserName(Browsers.Safari);
    console.log('Setting up iOS popup');
    const popupOptions = {
      popup: '/interface/popup-mobile/cookie-list.html',
    };
    browserDetector.getApi().action.setPopup(popupOptions);
  }

  if (browserDetector.supportsSidePanel()) {
    browserDetector
      .getApi()
      .sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
      // eslint-disable-next-line prettier/prettier
      .catch(error => {
        console.error(error);
      });
  }

  /**
   * Handles messages coming from the front end, mostly from the dev tools.
   * Devtools require special handling because not all APIs are available in
   * there, such as tab and permissions.
   * @param {object} request contains the message.
   * @param {MessageSender} sender references the sender of the message, not
   *    used.
   * @param {function} sendResponse callback to respond to the sender.
   * @return {boolean} sometimes
   */
  function handleMessage(request, sender, sendResponse) {
    console.log('message received: ' + (request.type || 'unknown'));
    switch (request.type) {
      case 'getTabs': {
        browserDetector
          .getApi()
          .tabs.query({})
          .then(sendResponse, error => {
            console.error('Failed to get tabs', error);
            sendResponse({
              success: false,
              error: error?.message || String(error),
            });
          });
        return true;
      }
      case 'getCurrentTab': {
        browserDetector
          .getApi()
          .tabs.query({ active: true, currentWindow: true })
          .then(sendResponse, error => {
            console.error('Failed to get current tab', error);
            sendResponse({
              success: false,
              error: error?.message || String(error),
            });
          });
        return true;
      }
      case 'getAllCookies': {
        const getAllCookiesParams = {
          url: request.params.url,
        };
        if (request.params.storeId) {
          getAllCookiesParams.storeId = request.params.storeId;
        }
        GenericCookieHandler.getAllWithPartitions(
          browserDetector,
          getAllCookiesParams
        ).then(sendResponse, error => {
          console.error('Failed to get all cookies', error);
          sendResponse({
            success: false,
            error: error?.message || String(error),
          });
        });
        return true;
      }
      case 'saveCookie': {
        browserDetector
          .getApi()
          .cookies.set(request.params.cookie)
          .then(
            cookie => {
              sendResponse({ success: true, cookie });
            },
            error => {
              console.error('Failed to create cookie', error);
              sendResponse({
                success: false,
                error: error?.message || String(error),
              });
            }
          );
        return true;
      }
      case 'removeCookie': {
        const removeParams = {
          name: request.params.name,
          url: request.params.url,
        };
        if (request.params.storeId) {
          removeParams.storeId = request.params.storeId;
        }
        if (request.params.partitionKey && !browserDetector.isSafari()) {
          removeParams.partitionKey = request.params.partitionKey;
        }
        browserDetector
          .getApi()
          .cookies.remove(removeParams)
          .then(sendResponse, error => {
            console.error('Failed to remove cookie', error);
            sendResponse({
              success: false,
              error: error?.message || String(error),
            });
          });
        return true;
      }
      case 'permissionsContains': {
        permissionHandler
          .checkPermissions(request.params)
          .then(sendResponse, error => {
            console.error('Failed to check permissions', error);
            sendResponse({
              success: false,
              error: error?.message || String(error),
            });
          });
        return true;
      }
      case 'permissionsRequest': {
        permissionHandler
          .requestPermission(request.params)
          .then(sendResponse, error => {
            console.error('Failed to request permission', error);
            sendResponse({
              success: false,
              error: error?.message || String(error),
            });
          });
        return true;
      }
      case 'optionsChanged': {
        sendMessageToAllTabs('optionsChanged', {
          from: request.params.from,
        });
        return true;
      }
    }
  }

  /**
   * Handles connections from clients to this script.
   * @param {Port} port An object which allows two way communication with other
   *    pages.
   */
  function onConnect(port) {
    const extensionListener = function (request, port) {
      console.log('port message received: ' + (request.type || 'unknown'));
      switch (request.type) {
        case 'init_cookieHandler':
          console.log(
            'Devtool cookieHandler connected on tab ' + request.tabId
          );
          connections[request.tabId] = port;
          return;
        case 'init_optionsHandler':
          console.log('optionsHandler connected: ' + port.name);
          connections[port.name] = port;
          return;
      }

      // other message handling.
    };

    // Listen to messages sent from the DevTools page.
    port.onMessage.addListener(extensionListener);

    port.onDisconnect.addListener(function (port) {
      port.onMessage.removeListener(extensionListener);
      const tabs = Object.keys(connections);
      for (let i = 0; i < tabs.length; i++) {
        if (connections[tabs[i]] === port) {
          console.log('script disconnected on tab ' + tabs[i]);
          delete connections[tabs[i]];
          break;
        }
      }
    });
  }

  /**
   * Sends a message to a script running in a specific tab.
   * @param {number} tabId Id of the tab to send the message to.
   * @param {string} type Type of message, used by the client to parse the data.
   * @param {any} data Data to send to the client.
   */
  function sendMessageToTab(tabId, type, data) {
    if (tabId in connections) {
      connections[tabId].postMessage({
        type: type,
        data: data,
      });
    }
  }

  /**
   * Sends a message to all the tabs connected.
   * @param {string} type Type of message, used by the client to parse the data.
   * @param {any} data Data to send to the client.
   */
  function sendMessageToAllTabs(type, data) {
    const tabs = Object.keys(connections);
    for (let i = 0; i < tabs.length; i++) {
      sendMessageToTab(tabs[i], type, data);
    }
  }

  /**
   * Handles events that is triggered when a cookie changes.
   * @param {object} changeInfo An object containing details of the change that
   *     occurred.
   */
  function onCookiesChanged(changeInfo) {
    console.log('cookies changed, notifying all devtools');
    sendMessageToAllTabs('cookiesChanged', changeInfo);
  }

  /**
   * Handles the event that is fired when a tab is updated.
   * @param {number} tabId The id of the tab that changed.
   * @param {object} changeInfo Properties of the tab that changed.
   * @param {object} _tab The new state of the tab.
   */
  function onTabsChanged(tabId, changeInfo, _tab) {
    console.log('tabs changed', tabId, changeInfo, _tab);
    sendMessageToTab(tabId, 'tabsChanged', changeInfo);
  }

  /**
   * Special function to detect if we are running on Firefox for Android.
   * @return {Promise<boolean>} Responds true if it is Firefox on android,
   *     otherwise false.
   */
  async function isFirefoxAndroid() {
    if (!browserDetector.isFirefox()) {
      return false;
    }

    try {
      const info = await browserDetector.getApi().runtime.getPlatformInfo();
      return info.os === 'android';
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  /**
   * Special function to detect if we are running on Safari on iOS.
   *
   * Any browser running on iOS would be considered Safari since they
   * all are wrappers.
   *
   * @return {Promise<boolean>} Responds true if it is Safari on iOS,
   *     otherwise false.
   */
  async function isSafariIos() {
    try {
      const info = await browserDetector.getApi().runtime.getPlatformInfo();
      console.log('check for safari on ios: ', info.os);
      return info.os === 'ios';
    } catch (e) {
      console.error(e);
      return false;
    }
  }
})();
