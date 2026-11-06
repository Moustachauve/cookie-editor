/**
 * This class is responsible for parsing and formatting cookies to the
 * HAR format.
 */

/*const USE_REQUEST = true;
const USE_RESPONSE = false;*/
const ADD_URL = false;

function addUrl(entry) {
  const domain = new URL(entry.request.url);

  for (const cookie in entry.request.cookies) {
    cookie.domain = domain.domain;
  }
}

export class HarFormat {
  /**
   * Parses a string of cookie in the HAR format to a cookie object.
   * @param {string} cookieString Cookies in the HAR format.
   * @return {object} List of Cookies.
   */
  static parse(cookieString) {
    const reqLog JSON.parse(cookieString);
    let cookies = null;

    for (const entry in reqLog.log.entries) {
      if (ADD_URL) {
        addUrl(entry);
      }

      if (!cookies) {
        cookies = entry.cookies;
      } else {
        cookies.push(...entry.request.cookies);
      }
    }

    return cookies;
  }

  /**
   * Formats a list of cookies into a HAR formatted string.
   * @param {Cookie[]} cookies Cookies to format.
   * @return {string} HAR formatted cookie string.
   */
  static format(cookies) {
    throw new Error("Exporting as HAR is not available currently...");
    /*const exportedCookies = [];
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
    return JSON.stringify(exportedCookies, null, 4);*/
  }
}
