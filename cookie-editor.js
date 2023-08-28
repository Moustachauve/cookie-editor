import { BrowserDetector } from './interface/lib/browserDetector.js';
import { PermissionHandler } from './interface/lib/permissionHandler.js';

(function () {
  console.log('starting background script');
  const connections = {};
  const browserDetector = new BrowserDetector();
  const permissionHandler = new PermissionHandler();

  browserDetector.getApi().runtime.onConnect.addListener(onConnect);
  browserDetector.getApi().runtime.onMessage.addListener(handleMessage);
  browserDetector.getApi().tabs.onUpdated.addListener(onTabsChanged);

  if (!browserDetector.isSafari()) {
    browserDetector.getApi().cookies.onChanged.addListener(onCookiesChanged);
  }

  isFirefoxAndroid(function (response) {
    if (response) {
      const popupOptions = {
        popup: '/interface/popup-android/cookie-list.html',
      };
      browserDetector.getApi().action.setPopup(popupOptions);
    }
  });
  isSafariIos(function (response) {
    if (response) {
      console.log('Setting up iOS popup');
      const popupOptions = {
        popup: '/interface/popup-ios/cookie-list.html',
      };
      browserDetector.getApi().action.setPopup(popupOptions);
    }
  });

  if (browserDetector.supportsSidePanel()) {
    browserDetector
      .getApi()
      .sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
      // eslint-disable-next-line prettier/prettier
      .catch((error) => {
        console.error(error);
      });
  }

  /**
   * Handles messages coming from the front end, mostly from the dev tools.
   * Devtools require special handling because not all APIs are available in
   * there, such as tab and permissions.
   * @param {object} request contains the message.
   * @param {MessageSender} _sender references the sender of the message, not
   *    used.
   * @param {function} sendResponse callback to respond to the sender.
   * @return {boolean} sometimes
   */
  function handleMessage(request, _sender, sendResponse) {
    console.log('message received: ' + (request.type || 'unknown'));
    switch (request.type) {
      case 'getTabs': {
        browserDetector.getApi().tabs.query({}, function (tabs) {
          sendResponse(tabs);
        });
        return true;
      }
      case 'getCurrentTab': {
        browserDetector
          .getApi()
          .tabs.query(
            { active: true, currentWindow: true },
            function (tabInfo) {
              sendResponse(tabInfo);
            },
          );
        return true;
      }
      case 'getAllCookies': {
        const getAllCookiesParams = {
          url: request.params.url,
        };
        if (browserDetector.isFirefox()) {
          browserDetector
            .getApi()
            .cookies.getAll(getAllCookiesParams)
            .then(sendResponse);
        } else {
          browserDetector
            .getApi()
            .cookies.getAll(getAllCookiesParams, sendResponse);
        }
        return true;
      }
      case 'saveCookie': {
        if (browserDetector.supportsPromises()) {
          browserDetector
            .getApi()
            .cookies.set(request.params.cookie)
            .then(
              (cookie) => {
                sendResponse(null, cookie);
              },
              (error) => {
                console.error('Failed to create cookie', error);
                sendResponse(error.message, null);
              },
            );
        } else {
          browserDetector
            .getApi()
            .cookies.set(request.params.cookie, (cookie) => {
              if (cookie) {
                sendResponse(null, cookie);
              } else {
                const error = browserDetector.getApi().runtime.lastError;
                console.error('Failed to create cookie', error);
                sendResponse(error.message, cookie);
              }
            });
        }
        return true;
      }
      case 'removeCookie': {
        const removeParams = {
          name: request.params.name,
          url: request.params.url,
        };
        if (browserDetector.isFirefox()) {
          browserDetector
            .getApi()
            .cookies.remove(removeParams)
            .then(sendResponse);
        } else {
          browserDetector.getApi().cookies.remove(removeParams, sendResponse);
        }
        return true;
      }
      case 'permissionsContains': {
        permissionHandler.checkPermissions(request.params).then(sendResponse);
        return true;
      }
      case 'permissionsRequest': {
        permissionHandler.requestPermission(request.params).then(sendResponse);
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
    const extensionListener = function (request, _sender) {
      console.log('port message received: ' + (request.type || 'unknown'));
      switch (request.type) {
        case 'init':
          console.log('Devtool connected on tab ' + request.tabId);
          connections[request.tabId] = port;
          return;
      }

      // other message handling.
    };

    // Listen to messages sent from the DevTools page.
    port.onMessage.addListener(extensionListener);

    port.onDisconnect.addListener(function (port) {
      port.onMessage.removeListener(extensionListener);
      const tabs = Object.keys(connections);
      let i = 0;
      const len = tabs.length;
      for (; i < len; i++) {
        if (connections[tabs[i]] === port) {
          console.log('Devtool disconnected on tab ' + tabs[i]);
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
    let i = 0;
    const len = tabs.length;
    for (; i < len; i++) {
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
   * @param {function} callback Responds true if it is Firefox on android,
   *     otherwise false.
   */
  function isFirefoxAndroid(callback) {
    if (!browserDetector.isFirefox()) {
      callback(false);
      return;
    }

    browserDetector
      .getApi()
      .runtime.getPlatformInfo()
      .then((info) => {
        callback(info.os === 'android');
      });
  }

  /**
   * Special function to detect if we are running on Safari on iOS.
   * @param {function} callback Responds true if it is Safari on iOS,
   *     otherwise false.
   */
  function isSafariIos(callback) {
    if (!browserDetector.isSafari()) {
      callback(false);
      return;
    }

    browserDetector
      .getApi()
      .runtime.getPlatformInfo()
      .then((info) => {
        callback(info.os === 'ios');
      });
  }
})();
