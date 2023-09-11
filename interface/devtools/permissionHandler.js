/**
 * Handles tasks related to the permission API.
 *
 * interface/lib/permissionHandler.js needs to be kept in sync to the functions in this file
 * TODO: Implement this in a way to only override specific functions.
 */
export class PermissionHandler {
  /**
   * Constructs the permission handler.
   * @param {BrowserDetector} browserDetector
   */
  constructor(browserDetector) {
    this.browserDetector = browserDetector;
  }

  /**
   * Check if it is possible for a website to have permissions. for example,
   * on firefox, it is impossible to check for permission on internal pages
   * (for example, about:[...]).
   * @param {string} url Url to check.
   * @return {boolean} true if it is possible to check, otherwise false.
   */
  canHavePermissions(url) {
    if (url.indexOf('about:') === 0 || url.indexOf('edge:') === 0) {
      return false;
    }
    return true;
  }

  /**
   * Checks if the extension has permissions to manipulate cookies for a
   * specific url.
   * @param {string} url Url to check
   * @return {Promise}
   */
  async checkPermissions(url) {
    return await this.sendMessage('permissionsContains', url);
  }

  /**
   * Requests permissions to manipulate cookies for a specific url.
   * @param {string} url Url to check
   * @return {Promise}
   */
  async requestPermission(url) {
    return await this.sendMessage('permissionsRequest', url);
  }

  /**
   * Sends a message to the background script.
   * @param {string} type Type of the message.
   * @param {object} params Payload of the message.
   * @return {Promise}
   */
  sendMessage(type, params) {
    const self = this;
    if (this.browserDetector.supportsPromises()) {
      return this.browserDetector
        .getApi()
        .runtime.sendMessage({ type: type, params: params });
    } else {
      return new Promise(function (resolve) {
        self.browserDetector
          .getApi()
          .runtime.sendMessage({ type: type, params: params }, resolve);
      });
    }
  }
}
