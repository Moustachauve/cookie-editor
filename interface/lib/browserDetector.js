function BrowserDetector() {
    'use strict';
    const env = new Env();
    let namespace = chrome || window.browser || window.chrome;
    let doesSupportSameSiteCookie = null;
    let isIos = false;
    let supportPromises = false;
    let supportSidePanel = false;

    this.getApi = function () {
        return namespace;
    };

    this.isFirefox = function () {
        return env.browserName === 'firefox';
    };

    this.isChrome = function () {
        return env.browserName === 'chrome';
    };

    this.isEdge = function () {
        return env.browserName === 'edge';
    };

    this.isSafari = function () {
        return env.browserName === 'safari';
    };

    this.supportsPromises = function () {
        return this.supportPromises;
    }

    this.supportsSidePanel = function () {
        return this.supportSidePanel;
    }

    this.getBrowserName = function () {
        return env.browserName;
    }

    this.supportSameSiteCookie = function () {
        if (doesSupportSameSiteCookie !== null) {
            return doesSupportSameSiteCookie;
        }

        const newCookie = {
            url: 'https://example.com/',
            name: 'testSameSite',
            value: 'someValue',
            sameSite: 'strict',
        };

        try {
            if (this.isFirefox()) {
                this.getApi().cookies.set(newCookie).then(cookie => {
                    doesSupportSameSiteCookie = true;
                }, error => {
                    console.error('Failed to create cookie', error);
                    doesSupportSameSiteCookie = false;
                });
            } else {
                this.getApi().cookies.set(newCookie, (cookieResponse) => {
                    let error = this.getApi().runtime.lastError;
                    if (!cookieResponse || error) {
                        console.error('Failed to create cookie', error);
                        doesSupportSameSiteCookie = false;
                        return;
                    }
                    doesSupportSameSiteCookie = true;
                });
            }
        } catch(e) {
            doesSupportSameSiteCookie = false;
        }

        return doesSupportSameSiteCookie;
    }

    try {
        supportPromises = namespace.runtime.getPlatformInfo() instanceof Promise;
        console.info('Promises support: ', supportPromises);
    }
    catch (e) {
    }

    try {
        supportSidePanel = typeof this.getApi().sidePanel !== "undefined";
        console.info('SidePanel support: ', supportSidePanel);
    }
    catch (e) {
    }

    if (env.browserName === "@@browser_name") {
        env.browserName = "chrome";
        console.warn("undefined browser name, using chrome as fallback");
    }

    console.log(env.browserName);


    // We call it right away to make sure the value of doesSupportSameSiteCookie is initialized
    this.supportSameSiteCookie();
}
