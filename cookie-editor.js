chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        switch (request.type) {
            case 'getTabs':
                chrome.tabs.query({}, function(tabs) {
                    sendResponse(tabs);
                });
                return true;
            case 'getCurrentTab':
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabInfo) {
                    sendResponse(tabInfo);
                });
                return true;
            case 'getAllCookies':
                chrome.cookies.getAll({ url: request.url }, function (cookies) {
                    sendResponse(cookies);
                });
                return true;
        }
    }
);