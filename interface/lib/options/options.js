import { ExportFormats } from './exportFormats.js';
import { ExtraInfos } from './extraInfos.js';
import { Themes } from './themes.js';

/**
 * The Options class contains all the different options for Cookie-Editor.
 */
export class Options {
  /**
   * Constructs the options.
   */
  constructor() {
    this.advancedCookies = false;
    this.devtoolsEnabled = true;
    this.animationsEnabled = true;
    this.exportFormat = ExportFormats.Ask;
    this.extraInfo = ExtraInfos.Nothing;
    this.theme = Themes.Auto;
    this.buttonBarTop = false;
    this.adsEnabled = true;
  }
}
