import { BrowserDetector } from './browserDetector.js';
import { Options } from './data/options.js';
import { GenericStorageHandler } from './genericStorageHandler.js';

const options_key = 'all_options';

/**
 * Abstract class used to implement basic common Storage API handling.
 */
export class OptionsHandler {
  /**
   * Constructs an OptionHandler
   */
  constructor() {
    this.browserDetector = new BrowserDetector();
    this.storageHandler = new GenericStorageHandler();
    this.options = null;
  }

  /**
   * Gets whether to show advanced cookies or not.
   * @return {boolean} True to show advanced cookies, otherwise false.
   */
  getCookieAdvanced() {
    return this.options.advancedCookies;
  }

  /**
   * Sets whether to show advanced cookies or not.
   * @param {boolean} isAdvanced True to show advanced cookies, otherwise false.
   */
  setCookieAdvanced(isAdvanced) {
    this.options.advancedCookies = isAdvanced;
    this.saveOptions();
  }

  /**
   * Loads all the options. This is done at load time, but can be called
   * manually to reload the options.
   */
  async loadOptions() {
    console.log('Saving options');
    const self = this;
    self.options = await this.storageHandler.getLocal(
      options_key,
      this.options,
    );
  }

  /**
   * Saves all the options. This is also called when setting a single option,
   * so you don't need to manually call this after setting something.
   */
  async saveOptions() {
    console.log('Saving options');
    await this.storageHandler.setLocal(options_key, this.options);
  }
}
