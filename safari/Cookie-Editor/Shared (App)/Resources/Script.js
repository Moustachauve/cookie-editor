/* eslint-disable no-unused-vars */
/**
 * Shows the window in the main app that serves to sideload the extension.
 * @param {object} platform
 * @param {boolean} enabled
 * @param {boolean} useSettingsInsteadOfPreferences
 */
function show(platform, enabled, useSettingsInsteadOfPreferences) {
  document.body.classList.add(`platform-${platform}`);

  if (useSettingsInsteadOfPreferences) {
    document.getElementsByClassName('platform-mac state-on')[0].innerText =
      'Cookie-Editor’s extension is currently on. You can turn it off in the Extensions section of Safari Settings.';
    document.getElementsByClassName('platform-mac state-off')[0].innerText =
      'Cookie-Editor’s extension is currently off. You can turn it on in the Extensions section of Safari Settings.';
    document.getElementsByClassName('platform-mac state-unknown')[0].innerText =
      'You can turn on Cookie-Editor’s extension in the Extensions section of Safari Settings.';
    document.getElementsByClassName(
      'platform-mac open-preferences',
    )[0].innerText = 'Quit and Open Safari Settings…';
  }

  if (typeof enabled === 'boolean') {
    document.body.classList.toggle(`state-on`, enabled);
    document.body.classList.toggle(`state-off`, !enabled);
  } else {
    document.body.classList.remove(`state-on`);
    document.body.classList.remove(`state-off`);
  }
}

/**
 * Opens Safari's preference window.
 */
function openPreferences() {
  // eslint-disable-next-line no-undef
  webkit.messageHandlers.controller.postMessage('open-preferences');
}

document
  .querySelector('button.open-preferences')
  .addEventListener('click', openPreferences);
