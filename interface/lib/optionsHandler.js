import { ExportFormats } from './data/exportFormats.js';
import { Options } from './data/options.js';
import { Themes } from './data/themes.js';
import { EventEmitter } from './eventEmitter.js';
import { GUID } from './guid.js';

const optionsKey = 'all_options';

/**
 * Abstract class used to implement basic common Storage API handling.
 */
export class OptionsHandler extends EventEmitter {
  /**
   * Constructs an OptionHandler.
   * @param {BrowserDetector} browserDetector
   * @param {GenericStorageHandler} genericStorageHandler
   */
  constructor(browserDetector, genericStorageHandler) {
    super();
    console.log('constructing an optionsHandler');
    this.browserDetector = browserDetector;
    this.storageHandler = genericStorageHandler;
    this.isReady = false;
    this.options = null;
    this.guid = GUID.get();

    this.backgroundPageConnection = this.browserDetector
      .getApi()
      .runtime.connect({ name: this.guid });
    this.backgroundPageConnection.onMessage.addListener(this.onMessage);
    this.backgroundPageConnection.postMessage({
      type: 'init_optionsHandler',
    });
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
   * Gets whether the devtools panel is enabled or not.
   * @return {boolean} True if the devtools panel is enabled, otherwise false.
   */
  getDevtoolsEnabled() {
    return this.options.devtoolsEnabled;
  }
  /**
   * Sets whether the devtools panel is enabled or not.
   * @param {boolean} devtoolsEnabled True if the devtools panel is enabled,
   *     otherwise false.
   */
  setDevtoolsEnabled(devtoolsEnabled) {
    this.options.devtoolsEnabled = devtoolsEnabled;
    this.saveOptions();
  }

  /**
   * Gets the export format used by the export button.
   * @return {ExportFormats} One of the supported export format.
   */
  getExportFormat() {
    let exportFormat = this.options.exportFormat;
    if (!this.isExportFormatValid(exportFormat)) {
      console.error(
        "Tried to load an exportFormat that doesn't exists",
        exportFormat,
      );
      exportFormat = ExportFormats.Ask;
      this.setExportFormat(exportFormat);
    }
    return exportFormat;
  }
  /**
   * Sets the export format used by the export button.
   * @param {ExportFormats} exportFormat One of the supported export format.
   */
  setExportFormat(exportFormat) {
    if (!this.isExportFormatValid(exportFormat)) {
      console.error(
        "Tried to save an exportFormat that doesn't exists",
        exportFormat,
      );
      return;
    }
    this.options.exportFormat = exportFormat;
    this.saveOptions();
  }
  /**
   *
   * @param {ExportFormats} exportFormat
   * @return {boolean} True if it is valid, otherwise false.
   */
  isExportFormatValid(exportFormat) {
    for (const allowedFormat in ExportFormats) {
      if (Object.prototype.hasOwnProperty.call(ExportFormats, allowedFormat)) {
        if (exportFormat === ExportFormats[allowedFormat]) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Gets the theme of the extension.
   * @return {Themes} One of the supported theme option.
   */
  getTheme() {
    let theme = this.options.theme;
    if (!this.isThemeValid(theme)) {
      console.error("Tried to load a theme that doesn't exists", theme);
      theme = Themes.Auto;
      this.setTheme(theme);
    }
    return theme;
  }
  /**
   * Sets the theme of the extension.
   * @param {Themes} theme One of the supported theme option.
   */
  setTheme(theme) {
    if (!this.isThemeValid(theme)) {
      console.error("Tried to save a theme that doesn't exists", theme);
      return;
    }
    this.options.theme = theme;
    this.saveOptions();
  }
  /**
   * Checks if a value is a valid theme.
   * @param {Themes} theme Value to validate.
   * @return {boolean} True if it is valid, otherwise false.
   */
  isThemeValid(theme) {
    for (const allowedTheme in Themes) {
      if (Object.prototype.hasOwnProperty.call(Themes, allowedTheme)) {
        if (theme === Themes[allowedTheme]) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Loads all the options. This is done at load time, but can be called
   * manually to reload the options.
   */
  async loadOptions() {
    console.log('Loading options');
    this.options = await this.storageHandler.getLocal(optionsKey);
    if (this.options == null) {
      console.log('No options found, creating new one');
      this.options = new Options();
      await this.saveOptions();
    }
  }

  /**
   * Saves all the options. This is also called when setting a single option,
   * so you don't need to manually call this after setting something.
   */
  async saveOptions() {
    console.log('Saving options');
    await this.storageHandler.setLocal(optionsKey, this.options);
    this.notifyBackgroundOfChanges();
  }

  /**
   * Notifies the background script that the options changed.
   */
  notifyBackgroundOfChanges() {
    this.sendMessage('optionsChanged', { from: this.guid });
  }

  /**
   * Sends a message to the background script.
   * @param {string} type The type of the message.
   * @param {object} params The payload of the message
   * @param {function} callback
   * @param {function} errorCallback
   */
  sendMessage(type, params, callback, errorCallback) {
    if (this.browserDetector.supportsPromises()) {
      this.browserDetector
        .getApi()
        .runtime.sendMessage({ type: type, params: params })
        .then(callback, errorCallback);
    } else {
      this.browserDetector
        .getApi()
        .runtime.sendMessage({ type: type, params: params }, callback);
    }
  }

  /**
   * Handles the reception of messages from the background script.
   * @param {object} request
   */
  onMessage = async (request) => {
    console.log(
      '[options] background message received: ' + (request.type || 'unknown'),
    );
    switch (request.type) {
      case 'optionsChanged': {
        if (request.data.from == this.guid) {
          return;
        }
        const oldOptions = this.options;
        await this.loadOptions();
        this.emit('optionsChanged', oldOptions);
        return;
      }
    }
  };
}
