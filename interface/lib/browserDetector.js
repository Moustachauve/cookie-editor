import { Env } from './env.js';

/**
 * Browser Detector
 */
export function BrowserDetector() {
  'use strict';
  const env = new Env();
  const namespace = chrome || window.browser || window.chrome;
  const isIos = false;
  let supportPromises = false;
  let supportSidePanel = false;

  this.getApi = function () {
    return namespace;
  };

  this.isFirefox = function () {
    return env.browserName === 'firefox';
  };

  this.isChrome = function () {
    return env.browserName === 'chrome';
  };

  this.isEdge = function () {
    return env.browserName === 'edge';
  };

  this.isSafari = function () {
    return env.browserName === 'safari';
  };

  this.supportsPromises = function () {
    return this.supportPromises;
  };

  this.supportsSidePanel = function () {
    return this.supportSidePanel;
  };

  this.getBrowserName = function () {
    return env.browserName;
  };

  try {
    supportPromises = namespace.runtime.getPlatformInfo() instanceof Promise;
    console.info('Promises support: ', supportPromises);
  } catch (e) {}

  try {
    supportSidePanel = typeof this.getApi().sidePanel !== 'undefined';
    console.info('SidePanel support: ', supportSidePanel);
  } catch (e) {}

  if (env.browserName === '@@browser_name') {
    env.browserName = 'firefox';
    console.warn('undefined browser name, using chrome as fallback');
  }

  console.log(env.browserName);
}
