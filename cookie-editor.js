function sendMessage() {
    if (window.browser) {
        var sending = browser.tabs.sendMessage({ type: type, params: params });
        sending.then(callback, errorCallback);
    } else {
        chrome.runtime.sendMessage({ type: type, params: params }, callback);
    }
}

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
                browser.cookie.set(request.params.cookie).then(sendResponse);
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

function onCookiesChanged(changeInfo) {

}

function onTabsChanged(tabId, changeInfo, tab) {

}

function onTabActivated(tabInfo) {

}


if (window.browser) {
    browser.runtime.onMessage.addListener(handleMessage);
    browser.cookies.onChanged.addListener(onCookiesChanged);
    browser.tabs.onUpdated.addListener(onTabsChanged);
    browser.tabs.onActivated.addListener(onTabActivated);
} else {
    chrome.runtime.onMessage.addListener(handleMessage);
    chrome.cookies.onChanged.addListener(onCookiesChanged);
    chrome.tabs.onUpdated.addListener(onTabsChanged);
    chrome.tabs.onActivated.addListener(onTabActivated);
}