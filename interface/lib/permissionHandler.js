import { BrowserDetector } from './browserDetector.js';

/**
 * interface/devtools/permissionHandler.js needs to be kept in sync to the functions in this file
 */
export function PermissionHandler() {
  'use strict';
  const browserDetector = new BrowserDetector();

  // Check if it is possible for a website to have permissions.
  // for example, on firefox, it is impossible to check for permission on internal pages (about:[...])
  this.canHavePermissions = function (url) {
    if (url.indexOf('about:') === 0 || url.indexOf('edge:') === 0) {
      return false;
    }
    return true;
  };

  this.checkPermissions = async function (url) {
    const testPermission = {
      origins: [url],
    };

    return await browserDetector.getApi().permissions.contains(testPermission);
  };

  this.requestPermission = async function (url) {
    const permission = {
      origins: [url],
    };
    return browserDetector.getApi().permissions.request(permission);
  };
}
