/**
 * interface/devtools/permissionHandler.js needs to be kept in sync to the functions in this file
 */
export class PermissionHandler {
  /**
   * Constructs a PermissionHandler.
   * @param {BrowserDetector} browserDetector
   */
  constructor(browserDetector) {
    this.browserDetector = browserDetector;
    // Urls that start with these values can't be requested for permission.
    this.impossibleUrls = [
      'about:',
      'moz-extension:',
      'chrome:',
      'chrome-extension:',
      'edge:',
      'safari-web-extension:',
    ];
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
    if (url === '') {
      return false;
    }
    for (const impossibleUrl of this.impossibleUrls) {
      if (url.indexOf(impossibleUrl) === 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Expands an URL or match pattern into the list of permission origins.
   * @param {string} url URL or match pattern to expand.
   * @return {string[]} Array of origin match patterns.
   */
  getPermissionOrigins(url) {
    if (url === '<all_urls>') {
      return ['<all_urls>'];
    }
    try {
      const { protocol, hostname } = new URL(url);
      const rootDomain = this.getRootDomainName(hostname);
      return [`${protocol}//${hostname}/*`, `${protocol}//*.${rootDomain}/*`];
    } catch (err) {
      console.error(err);
      return [url];
    }
  }

  /**
   * Checks if the extension has permissions to access the cookies for a
   * specific url.
   * @param {string} url Url to check.
   * @return {Promise}
   */
  async checkPermissions(url) {
    const testPermission = {
      origins: this.getPermissionOrigins(url),
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
      origins: this.getPermissionOrigins(url),
    };
    return this.browserDetector.getApi().permissions.request(permission);
  }

  /**
   * Gets the root domain of an URL
   * @param {string} domain
   * @return {string}
   */
  getRootDomainName(domain) {
    const parts = domain.split('.').reverse();
    const cnt = parts.length;
    if (cnt >= 3) {
      // see if the second level domain is a common SLD.
      if (parts[1].match(/^(com|edu|gov|net|mil|org|nom|co|name|info|biz)$/i)) {
        return parts[2] + '.' + parts[1] + '.' + parts[0];
      }
    }
    return parts[1] + '.' + parts[0];
  }
}
