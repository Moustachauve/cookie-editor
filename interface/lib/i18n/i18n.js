import en from './locales/en.js';
import zh from './locales/zh.js';

/**
 * Internationalization class for handling multi-language support
 */
class I18n {
  /**
   * Constructor
   */
  constructor() {
    this.locales = {
      en,
      zh,
    };
    this.currentLocale = this.getUserLocale();
  }

  /**
   * Get user's browser language setting
   * @return {string} User's language code
   */
  getUserLocale() {
    // Try to get language from browser settings
    const browserLocale = navigator.language || navigator.userLanguage;
    const languageCode = browserLocale.split('-')[0];

    // Check if the language is supported
    if (this.locales[languageCode]) {
      return languageCode;
    }

    // Default to English
    return 'en';
  }

  /**
   * Set current language
   * @param {string} locale Language code
   * @return {boolean} Whether the language was set successfully
   */
  setLocale(locale) {
    if (this.locales[locale]) {
      this.currentLocale = locale;
      return true;
    }
    return false;
  }

  /**
   * Get translated text
   * @param {string} key Translation key
   * @param {string} defaultValue Default value
   * @return {string} Translated text
   */
  t(key, defaultValue = key) {
    const locale = this.locales[this.currentLocale];
    return locale[key] || defaultValue;
  }

  /**
   * Get supported languages
   * @return {string[]} List of supported language codes
   */
  getSupportedLocales() {
    return Object.keys(this.locales);
  }

  /**
   * Get current language
   * @return {string} Current language code
   */
  getCurrentLocale() {
    return this.currentLocale;
  }
}

// Export singleton instance
const i18n = new I18n();
export default i18n;
