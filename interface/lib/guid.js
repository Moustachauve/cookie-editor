/**
 * Class to handle GUIDs.
 */
export class GUID {
  /**
   * Generates a v4 UUID using a cryptographically strong random value
   * generator.
   * https://stackoverflow.com/a/2117523/1244026
   * @return {string} A string containing a randomly generated, 36 character
   *    long v4 UUID.
   */
  static get() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16),
    );
  }
}
