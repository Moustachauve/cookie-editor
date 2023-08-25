import { BrowserDetector } from './browserDetector.js';
import { EventEmitter } from './eventEmitter.js';

/**
 * Abstract class used to implement basic common Storage API handling.
 */
export class GenericStorageHandler extends EventEmitter {
  /**
   * Constructs a GenericStorageHandler.
   */
  constructor() {
    super();
    this.browserDetector = new BrowserDetector();
  }

  /**
   * Gets a value from LocalStorage.
   * @param {string} key Key to identify the value in the LocalStorage.
   * @param {function} callback
   */
  getLocal(key, callback) {
    if (this.browserDetector.supportsPromises()) {
      this.browserDetector
        .getApi()
        .storage.local.get([key])
        .then(
          (data) => {
            if (callback) {
              callback(null, data[key] ?? null);
            }
          },
          (error) => {
            console.error('Failed to retrieve data', key, error);
            if (callback) {
              callback(error.message, null);
            }
          },
        );
    } else {
      this.browserDetector.getApi().storage.local.get([key], (data) => {
        const error = this.browserDetector.getApi().runtime.lastError;
        if (error) {
          console.error('Failed to get data', key, error);
          if (callback) {
            const errorMessage =
              (error ? error.message : '') || 'Unknown error';
            return callback(errorMessage, data);
          }
          return;
        }

        if (callback) {
          return callback(null, data[key] ?? null);
        }
      });
    }
  }

  /**
   * Sets a value in the LocalStorage.
   * @param {string} key Key to identify the value in the LocalStorage.
   * @param {any} data Data to store in the LocalStorage
   * @param {function} callback
   */
  setLocal(key, data, callback) {
    const dataObj = {};
    dataObj[key] = data;

    if (this.browserDetector.supportsPromises()) {
      this.browserDetector
        .getApi()
        .storage.local.set(dataObj)
        .then(
          () => {
            if (callback) {
              callback();
            }
          },
          (error) => {
            console.error('Failed to set data', key, data, error);
            if (callback) {
              callback(error.message);
            }
          },
        );
    } else {
      this.browserDetector.getApi().storage.local.set(dataObj, () => {
        const error = this.browserDetector.getApi().runtime.lastError;
        if (error) {
          console.error('Failed to set data', key, data, error);
          if (callback) {
            const errorMessage =
              (error ? error.message : '') || 'Unknown error';
            return callback(errorMessage);
          }
          return;
        }

        if (callback) {
          return callback(null);
        }
      });
    }
  }
}
