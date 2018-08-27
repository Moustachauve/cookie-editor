function BrowserDetector() {
    'use strict';
    let namespace = window.browser || window.chrome;
    let browserName;

    if (namespace === window.chrome) {
        browserName = 'chrome';
    }
    else if (namespace === window.browser) {
        let supportPromises = false;
        try {
            supportPromises = namespace.runtime.getPlatformInfo() instanceof Promise;
        }
        catch (e) {
        }

        if (supportPromises) {
            browserName = 'firefox';
        }
        else {
            browserName = 'edge';
        }
    }

    console.log(browserName);

    this.getApi = function () {
        return namespace;
    };

    this.isFirefox = function () {
        return browserName === 'firefox';
    };

    this.isChrome = function () {
        return browserName === 'chrome';
    };

    this.isEdge = function () {
        return browserName === 'edge';
    };
}