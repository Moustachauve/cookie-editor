import { BrowserDetector } from '../lib/browserDetector.js';
import { GenericStorageHandler } from '../lib/genericStorageHandler.js';
import { OptionsHandler } from '../lib/optionsHandler.js';

(async function () {
  ('use strict');
  const browserDetector = new BrowserDetector();
  const storageHandler = new GenericStorageHandler(browserDetector);
  const optionHandler = new OptionsHandler(browserDetector, storageHandler);

  await optionHandler.loadOptions();
  optionHandler.on('optionsChanged', onOptionsChanged);
  handleDevtools();

  /**
   * Creates the devtools panel.
   */
  function createDevtools() {
    browserDetector
      .getApi()
      .devtools.panels.create(
        'Cookie Editor',
        '/icons/cookie-filled-small.svg',
        '/interface/devtools/cookie-list.html',
        function (panel) {},
      );
  }

  /**
   * Shows or hides the devtools depending on the options.
   */
  function handleDevtools() {
    if (optionHandler.getDevtoolsEnabled()) {
      createDevtools();
    }
  }

  /**
   * Handles the changes required to the devtools when the options are changed
   * by an external source.
   * @param {Option} oldOptions the options before changes.
   */
  function onOptionsChanged(oldOptions) {
    if (oldOptions.devtoolsEnabled != optionHandler.getDevtoolsEnabled()) {
      handleDevtools();
    }
  }
})();
