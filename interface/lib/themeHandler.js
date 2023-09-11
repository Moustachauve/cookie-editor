import { Themes } from './data/themes.js';

/**
 * Class used to handle the theme of a page.
 */
export class ThemeHandler {
  /**
   * Constructs the ThemeHandler.
   * @param {optionHandler} optionHandler
   */
  constructor(optionHandler) {
    this.optionHandler = optionHandler;
    optionHandler.on('optionsChanged', this.onOptionsChanged);
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (event) => {
        console.log('theme changed!');
        this.updateTheme();
      });
  }

  /**
   * Handles which theme the page will be rendered with.
   */
  updateTheme() {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const selectedTheme = this.optionHandler.getTheme();
    switch (selectedTheme) {
      case Themes.Light:
      case Themes.Dark:
        document.body.dataset.theme = selectedTheme;
        break;
      default:
        if (prefersDarkScheme.matches) {
          document.body.dataset.theme = 'dark';
        } else {
          document.body.dataset.theme = 'light';
        }
        break;
    }
  }

  /**
   * Handles the changes required to the interface when the options are changed
   * by an external source.
   * @param {Option} oldOptions the options before changes.
   */
  onOptionsChanged = (oldOptions) => {
    if (oldOptions.theme != this.optionHandler.getTheme()) {
      this.updateTheme();
    }
  };
}
