import { OptionsHandler } from '../lib/optionsHandler.js';

document.addEventListener('DOMContentLoaded', async (event) => {
  const optionHandler = new OptionsHandler();
  const advancedCookieInput = document.getElementById('advanced-cookie');
  const showDevtoolsInput = document.getElementById('devtool-show');
  const exportFormatInput = document.getElementById('export-format');
  const themeInput = document.getElementById('theme');

  await optionHandler.loadOptions();
  setFormValues();
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
    advancedCookieInput.addEventListener('change', (_event) => {
      optionHandler.setCookieAdvanced(advancedCookieInput.checked);
    });
    showDevtoolsInput.addEventListener('change', (_event) => {
      optionHandler.setDevtoolsEnabled(showDevtoolsInput.checked);
    });
    exportFormatInput.addEventListener('change', (_event) => {
      optionHandler.setExportFormat(exportFormatInput.value);
    });
    themeInput.addEventListener('change', (_event) => {
      optionHandler.setTheme(themeInput.value);
    });
  }
});
