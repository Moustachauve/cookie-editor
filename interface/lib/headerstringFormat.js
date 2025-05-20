/**
 * This class is responsible for parsing and formatting cookies to the
 * Header string format.
 */
export class HeaderstringFormat {
  /**
   * Parses a string of cookie in the JSON format to a cookie object.
   * @param {string} cookieString Cookies in the JSON format.
   * @return {object} List of Cookies.
   */
  static parse(cookieString) {
    const cookies = [];
    const rawCookies = cookieString.split(';');
    for (let rawCookie of rawCookies) {
      rawCookie = rawCookie.trim();
      if (!rawCookie.length) {
        continue;
      }
      const eqPos = rawCookie.indexOf('=');
      if (eqPos === -1) {
        console.log('invalid cookie: ', rawCookie);
        continue;
      }
      cookies.push({
        name: rawCookie.substring(0, eqPos),
        value: rawCookie.substring(eqPos + 1),
      });
    }

    if (cookies.length === 0) {
      throw new Error('No cookies found.');
    }

    return cookies;
  }

  /**
   * Formats a list of cookies into a Header string formatted string.
   * @param {Cookie[]} cookies Cookies to format.
   * @return {string} Header string formatted cookie string.
   */
  static format(cookies) {
    const exportedCookies = [];
    for (const cookieId in cookies) {
      if (!Object.prototype.hasOwnProperty.call(cookies, cookieId)) {
        continue;
      }
      const exportedCookie = cookies[cookieId].cookie;
      const name = exportedCookie.name;
      const value = exportedCookie.value;
      exportedCookies.push(`${name}=${value}`);
    }
    return exportedCookies.join(';');
  }
}
