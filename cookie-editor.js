(function () {
    'use strict';
    
    var connections = {};

    if (window.browser) {
        browser.runtime.onConnect.addListener(onConnect);
        browser.runtime.onMessage.addListener(handleMessage);
        browser.cookies.onChanged.addListener(onCookiesChanged);
        browser.tabs.onUpdated.addListener(onTabsChanged);
    } else {
        chrome.runtime.onConnect.addListener(onConnect);
        chrome.runtime.onMessage.addListener(handleMessage);
        chrome.cookies.onChanged.addListener(onCookiesChanged);
        chrome.tabs.onUpdated.addListener(onTabsChanged);
    }
    
    isFirefoxAndroid(function(response) {
        var popupOptions = {};
        if (response) {
            popupOptions.popup = '/interface/popup-android/cookie-list.html';
        } else {
            popupOptions.popup = '/interface/popup/cookie-list.html';
        }
        if (window.browser) {
            browser.browserAction.setPopup(popupOptions);
        } else {
            chrome.browserAction.setPopup(popupOptions);
        }
    });

    function handleMessage(request, sender, sendResponse) {
        console.log('message received: ' + (request.type || 'unknown'));
        switch (request.type) {
            case 'getTabs':
                chrome.tabs.query({}, function (tabs) {
                    sendResponse(tabs);
                });
                return true;

            case 'getCurrentTab':
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabInfo) {
                    sendResponse(tabInfo);
                });
                return true;

            case 'getAllCookies':
                var getAllCookiesParams = { 
                    url: request.params.url 
                };
                if (window.browser) {
                    browser.cookies.getAll(getAllCookiesParams).then(sendResponse);
                } else {
                    chrome.cookies.getAll(getAllCookiesParams, sendResponse);
                }
                return true;

            case 'saveCookie':
                if (window.browser) {
                    browser.cookies.set(request.params.cookie).then(sendResponse);
                } else {
                    chrome.cookies.set(request.params.cookie, sendResponse);
                }
                return true;

            case 'removeCookie':
                var removeParams = {
                    name: request.params.name, 
                    url: request.params.url
                };
                if (window.browser) {
                    browser.cookies.remove(removeParams).then(sendResponse);
                } else {
                    chrome.cookies.remove(removeParams, sendResponse);
                }
                return true;
        }
    }

    function onConnect(port) {
        var extensionListener = function (request, sender, sendResponse) {
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
            var tabs = Object.keys(connections);
            for (var i=0, len=tabs.length; i < len; i++) {
            if (connections[tabs[i]] == port) {
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
        var tabs = Object.keys(connections);
        for (var i=0, len=tabs.length; i < len; i++) {
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
        var getPlatformInfoCallback = function (info) {
            callback(info.os === 'android' && window.browser);
        };
        if (window.browser) {
            browser.runtime.getPlatformInfo().then(getPlatformInfoCallback);
        } else {
            chrome.runtime.getPlatformInfo().then(getPlatformInfoCallback);
        }
    }

}());