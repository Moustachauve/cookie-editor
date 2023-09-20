/**
 * This class is responsible for parsing and formatting cookies to the
 * JSON format.
 */
export class JsonFormat {
  /**
   * Parses a string of cookie in the JSON format to a cookie object.
   * @param {string} cookieString Cookies in the JSON format.
   * @return {object} List of Cookies.
   */
  static parse(cookieString) {
    return JSON.parse(cookieString);
  }

  /**
   * Formats a list of cookies into a JSON formatted string.
   * @param {Cookie[]} cookies Cookies to format.
   * @return {string} JSON formatted cookie string.
   */
  static format(cookies) {
    const exportedCookies = [];
    for (const cookieId in cookies) {
      if (!Object.prototype.hasOwnProperty.call(cookies, cookieId)) {
        continue;
      }
      const exportedCookie = cookies[cookieId].cookie;
      exportedCookie.storeId = null;
      if (exportedCookie.sameSite === 'unspecified') {
        exportedCookie.sameSite = null;
      }
      exportedCookies.push(exportedCookie);
    }
    return JSON.stringify(exportedCookies, null, 4);
  }
}
