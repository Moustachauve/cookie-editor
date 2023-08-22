// interface/lib/permissionHandler.js needs to be kept in sync to the functions in this file
// TODO: Implement this in a way to only override specific functions.
function PermissionHandler() {
    'use strict';
    const browserDetector = new BrowserDetector();

    // Check if it is possible for a website to have permissions.
    // for example, on firefox, it is impossible to check for permission on internal pages (about:[...])
    this.canHavePermissions = function (url) {
        if (url.indexOf("about:") === 0 || url.indexOf("edge:") === 0) {
            return false;
        }
        return true;
    }

    this.checkPermissions = async function (url) {
        return await sendMessage("permissionsContains", url);
    }

    this.requestPermission = async function (url) {
        return await sendMessage("permissionsRequest", url);
    }


    function sendMessage(type, params) {
        if (browserDetector.supportsPromises()) {
            return browserDetector.getApi().runtime.sendMessage({type: type, params: params});
        } else {
            return new Promise(function(resolve) {
                browserDetector.getApi().runtime.sendMessage({ type: type, params: params }, resolve);
            });
        }
    }
}