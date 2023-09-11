import { BrowserDetector } from '../lib/browserDetector.js';
import { GenericStorageHandler } from '../lib/genericStorageHandler.js';
import { OptionsHandler } from '../lib/optionsHandler.js';
import { ThemeHandler } from '../lib/themeHandler.js';

document.addEventListener('DOMContentLoaded', async (event) => {
  const browserDetector = new BrowserDetector();
  const storageHandler = new GenericStorageHandler(browserDetector);
  const optionHandler = new OptionsHandler(browserDetector, storageHandler);
  const themeHandler = new ThemeHandler(optionHandler);
  const advancedCookieInput = document.getElementById('advanced-cookie');
  const showDevtoolsInput = document.getElementById('devtool-show');
  const exportFormatInput = document.getElementById('export-format');
  const themeInput = document.getElementById('theme');

  await optionHandler.loadOptions();
  themeHandler.updateTheme();
  setFormValues();
  optionHandler.on('optionsChanged', setFormValues);
  setInputEvents();

  /**
   * Sets the value of the form based on the saved options.
   */
  function setFormValues() {
    console.log('Setting up the form');
    advancedCookieInput.checked = optionHandler.getCookieAdvanced();
    showDevtoolsInput.checked = optionHandler.getDevtoolsEnabled();
    exportFormatInput.value = optionHandler.getExportFormat();
    themeInput.value = optionHandler.getTheme();
  }

  /**
   * Sets the different input listeners to save the form changes.
   */
  function setInputEvents() {
    advancedCookieInput.addEventListener('change', (event) => {
      if (!event.isTrusted) {
        return;
      }
      optionHandler.setCookieAdvanced(advancedCookieInput.checked);
    });
    showDevtoolsInput.addEventListener('change', (event) => {
      if (!event.isTrusted) {
        return;
      }
      optionHandler.setDevtoolsEnabled(showDevtoolsInput.checked);
    });
    exportFormatInput.addEventListener('change', (event) => {
      if (!event.isTrusted) {
        return;
      }
      optionHandler.setExportFormat(exportFormatInput.value);
    });
    themeInput.addEventListener('change', (event) => {
      if (!event.isTrusted) {
        return;
      }
      optionHandler.setTheme(themeInput.value);
      themeHandler.updateTheme();
    });
  }
});
