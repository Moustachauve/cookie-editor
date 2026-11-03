/**
 * Helper class to interact with the user's clipboard.
 */
export class Clipboard {
  /**
   * Copies text to the user's clipboard.
   * @param {string} text Text to copy.
   */
  static async copy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for contexts where the Clipboard API is blocked by
      // Permissions Policy (such as Chromium DevTools extension panels) or
      // when transient user activation has expired.
      const fakeText = document.createElement('textarea');
      fakeText.classList.add('clipboardCopier');
      fakeText.textContent = text;
      document.body.appendChild(fakeText);
      fakeText.focus();
      fakeText.select();
      document.execCommand('Copy');
      document.body.removeChild(fakeText);
    }
  }
}
