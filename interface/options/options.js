import { OptionsHandler } from '../lib/optionsHandler.js';

document.addEventListener('DOMContentLoaded', async (event) => {
  const optionHandler = new OptionsHandler();
  const advancedCookieInput = document.getElementById('advanced-cookie');

  await optionHandler.loadOptions();
  setFormValues();

  advancedCookieInput.addEventListener('change', (event) => {
    optionHandler.setCookieAdvanced(advancedCookieInput.checked);
  });

  /**
   * Sets the value of the form based on the saved options.
   */
  function setFormValues() {
    console.log('Setting up the form');
    advancedCookieInput.checked = optionHandler.getCookieAdvanced();
  }
});
