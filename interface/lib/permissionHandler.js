import { BrowserDetector } from './browserDetector.js';

/**
 * interface/devtools/permissionHandler.js needs to be kept in sync to the functions in this file
 */
export class PermissionHandler {
  /**
   * Constructs a PermissionHandler.
   */
  constructor() {
    this.browserDetector = new BrowserDetector();
    // Urls that start with these values can't be requested for permission.
    this.impossibleUrls = ['about:', 'chrome:', 'edge:'];
  }

  /**
   * Check if it is possible for a website to have permissions. for example, on
   * firefox, it is impossible to check for permission on internal pages
   * (about:[...]).
   * @param {*} url Url to check.
   * @return {boolean} True if it's possible to request permission, otherwise
   *     false.
   */
  canHavePermissions(url) {
    for (const impossibleUrl of this.impossibleUrls) {
      if (url.indexOf(impossibleUrl) === 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if the extension has permissions to access the cookies for a
   * specific url.
   * @param {string} url Url to check.
   * @return {Promise}
   */
  async checkPermissions(url) {
    const testPermission = {
      origins: [url],
    };

    // If we don't have access to the permission API, assume we have
    // access. Safari devtools can't access the API.
    if (typeof this.browserDetector.getApi().permissions === 'undefined') {
      return true;
    }

    return await this.browserDetector
      .getApi()
      .permissions.contains(testPermission);
  }

  /**
   * Requests permissions to access the cookies for a specific url.
   * @param {string} url Url to request permissions.
   * @return {Promise}
   */
  async requestPermission(url) {
    const permission = {
      origins: [url],
    };
    return this.browserDetector.getApi().permissions.request(permission);
  }
}
