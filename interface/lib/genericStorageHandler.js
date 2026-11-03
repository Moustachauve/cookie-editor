import { EventEmitter } from './eventEmitter.js';

/**
 * Abstract class used to implement basic common Storage API handling.
 */
export class GenericStorageHandler extends EventEmitter {
  /**
   * Constructs a GenericStorageHandler.
   * @param {BrowserDetector} browserDetector
   */
  constructor(browserDetector) {
    super();
    this.browserDetector = browserDetector;
  }

  /**
   * Gets a value from LocalStorage.
   * @param {string} key Key to identify the value in the LocalStorage.
   * @return {Promise}
   */
  async getLocal(key) {
    const data = await this.browserDetector.getApi().storage.local.get([key]);
    return data?.[key] ?? null;
  }

  /**
   * Sets a value in the LocalStorage.
   * @param {string} key Key to identify the value in the LocalStorage.
   * @param {any} data Data to store in the LocalStorage
   * @return {Promise}
   */
  async setLocal(key, data) {
    return this.browserDetector.getApi().storage.local.set({ [key]: data });
  }
}
