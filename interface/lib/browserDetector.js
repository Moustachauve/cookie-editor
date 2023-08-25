import { Env } from './env.js';

/**
 * Detects information about the browser being used.
 */
export class BrowserDetector {
  /**
   * Constructs the BrowserDetector.
   */
  constructor() {
    this.namespace = chrome || window.browser || window.chrome;
    this.supportPromises = false;
    this.supportSidePanel = false;

    try {
      this.supportPromises =
        this.namespace.runtime.getPlatformInfo() instanceof Promise;
      console.info('Promises support: ', this.supportPromises);
    } catch (e) {
      /* empty */
    }

    try {
      this.supportSidePanel = typeof this.getApi().sidePanel !== 'undefined';
      console.info('SidePanel support: ', this.supportSidePanel);
    } catch (e) {
      /* empty */
    }

    if (Env.browserName === '@@browser_name') {
      Env.browserName = 'firefox';
      console.warn('undefined browser name, using chrome as fallback');
    }

    console.log(Env.browserName);
  }

  /**
   * Get the main API container specific to the current browser.
   * @return {chrome|browser}
   */
  getApi() {
    return this.namespace;
  }

  /**
   * Checks if the current browser is Firefox.
   * @return {boolean} true if the current browser is Firefox, otherwise false.
   */
  isFirefox() {
    return Env.browserName === 'firefox';
  }

  /**
   * Checks if the current browser is Chrome.
   * @return {boolean} true if the current browser is Chrome, otherwise false.
   */
  isChrome() {
    return Env.browserName === 'chrome';
  }

  /**
   * Checks if the current browser is Edge.
   * @return {boolean} true if the current browser is Edge, otherwise false.
   */
  isEdge() {
    return Env.browserName === 'edge';
  }

  /**
   * Checks if the current browser is Safari.
   * @return {boolean} true if the current browser is Safari, otherwise false.
   */
  isSafari() {
    return Env.browserName === 'safari';
  }

  /**
   * Checks if the current browser's API supports promises.
   * @return {boolean} true if the current browser's API supports promises,
   *     otherwise false.
   */
  supportsPromises() {
    return this.supportPromises;
  }

  /**
   * Checks if the current browser supports the Sidepanel API.
   * @return {boolean} true if the current browser supports the Sidepanel API,
   *     otherwise false.
   */
  supportsSidePanel() {
    return this.supportSidePanel;
  }

  /**
   * Gets the current browser name.
   * @return {string} The browser name.
   */
  getBrowserName() {
    return Env.browserName;
  }
}
