(function () {
    'use strict';

    const connections = {};
    const browserDetector = new BrowserDetector();

    if (browserDetector.isFirefox()) {
        browserDetector.getApi().runtime.onConnect.addListener(onConnect);
        browserDetector.getApi().runtime.onMessage.addListener(handleMessage);
        browserDetector.getApi().cookies.onChanged.addListener(onCookiesChanged);
        browserDetector.getApi().tabs.onUpdated.addListener(onTabsChanged);
    } else {
        browserDetector.getApi().runtime.onConnect.addListener(onConnect);
        browserDetector.getApi().runtime.onMessage.addListener(handleMessage);
        browserDetector.getApi().tabs.onUpdated.addListener(onTabsChanged);
        if (!browserDetector.isEdge()) {
            browserDetector.getApi().cookies.onChanged.addListener(onCookiesChanged);
        }
    }
    
    isFirefoxAndroid(function(response) {
        const popupOptions = {};
        if (response) {
            popupOptions.popup = '/interface/popup-android/cookie-list.html';
        } else {
            popupOptions.popup = '/interface/popup/cookie-list.html';
        }
        if (browserDetector.isFirefox()) {
            browserDetector.getApi().browserAction.setPopup(popupOptions);
        } else {
            browserDetector.getApi().browserAction.setPopup(popupOptions);
        }
    });

    function handleMessage(request, sender, sendResponse) {
        console.log('message received: ' + (request.type || 'unknown'));
        switch (request.type) {
            case 'getTabs':
                browserDetector.getApi().tabs.query({}, function (tabs) {
                    sendResponse(tabs);
                });
                return true;

            case 'getCurrentTab':
                browserDetector.getApi().tabs.query({ active: true, currentWindow: true }, function (tabInfo) {
                    sendResponse(tabInfo);
                });
                return true;

            case 'getAllCookies':
                const getAllCookiesParams = {
                    url: request.params.url
                };
                if (browserDetector.isFirefox()) {
                    browserDetector.getApi().cookies.getAll(getAllCookiesParams).then(sendResponse);
                } else {
                    browserDetector.getApi().cookies.getAll(getAllCookiesParams, sendResponse);
                }
                return true;

            case 'saveCookie':
                if (browserDetector.isFirefox()) {
                    browserDetector.getApi().cookies.set(request.params.cookie).then(cookie => {
                        sendResponse(null, cookie);
                    }, error => {
                        console.error('Failed to create cookie', error);
                        sendResponse(error.message, null);
                    });
                } else {
                    browserDetector.getApi().cookies.set(request.params.cookie, cookie => {
                        if (cookie) {
                            sendResponse(null, cookie);
                        } else {
                            let error = browserDetector.getApi().runtime.lastError;
                            console.error('Failed to create cookie', error);
                            sendResponse(error.message, cookie);
                        }
                    });
                }
                return true;

            case 'removeCookie':
                const removeParams = {
                    name: request.params.name,
                    url: request.params.url
                };
                if (browserDetector.isFirefox()) {
                    browserDetector.getApi().cookies.remove(removeParams).then(sendResponse);
                } else {
                    browserDetector.getApi().cookies.remove(removeParams, sendResponse);
                }
                return true;
        }
    }

    function onConnect(port) {
        const extensionListener = function (request, sender, sendResponse) {
            console.log('port message received: ' + (request.type || 'unknown'));
            switch (request.type) {
                case 'init':
                    console.log('Devtool connected on tab ' + request.tabId);
                    connections[request.tabId] = port;
                    return;
            }

            // other message handling
        };

        // Listen to messages sent from the DevTools page
        port.onMessage.addListener(extensionListener);

        port.onDisconnect.addListener(function(port) {
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

    function sendMessageToTab(tabId, type, data) {
        if (tabId in connections) {
            connections[tabId].postMessage({
                type: type,
                data: data
            });
        }
    }

    function sendMessageToAllTabs(type, data) {
        const tabs = Object.keys(connections);
        let i = 0;
        const len = tabs.length;
        for (; i < len; i++) {
            sendMessageToTab(tabs[i], type, data);
        }
    }

    function onCookiesChanged(changeInfo) {
        console.log('cookies changed, notifying all devtools');
        sendMessageToAllTabs('cookiesChanged', changeInfo);
    }

    function onTabsChanged(tabId, changeInfo, tab) {
        sendMessageToTab(tabId, 'tabsChanged', changeInfo);
    }

    function isFirefoxAndroid(callback) {
        if (!browserDetector.isFirefox()) {
            return callback(false);
        }

        return browserDetector.getApi().runtime.getPlatformInfo().then((info) => {
            callback(info.os === 'android');
        });
    }

}());