import { Browsers } from '../browsers.js';
import { ActiveAds } from './activeAds.js';

const secondsInOneDay = Object.freeze(1 * 24 * 60 * 60 * 1000);

/**
 * class used to handle all the ad logic.
 */
export class AdHandler {
  /**
   * Constructs an AdHandler.
   * @param {BrowserDetector} browserDetector
   * @param {GenericStorageHandler} storageHandler
   * @param {OptionsHandler} optionHandler
   */
  constructor(browserDetector, storageHandler, optionHandler) {
    this.browserDetector = browserDetector;
    this.storageHandler = storageHandler;
    this.optionHandler = optionHandler;
  }

  /**
   * Checks if an ad is valid to display to the user. To be valid, an ad needs
   * to be available for the user's browser and respect the choice of the user
   * if they have marked it as not interested.
   * @param {object} selectedAd The ad to validate.
   */
  async isAdValid(selectedAd) {
    if (
      selectedAd.supportedBrowsers != Browsers.Any &&
      !selectedAd.supportedBrowsers.includes(
        this.browserDetector.getBrowserName(),
      )
    ) {
      return false;
    }

    const dismissedAd = await this.storageHandler.getLocal(
      this.getAdDismissKey(selectedAd.id),
    );
    // No data means it was never dismissed
    if (dismissedAd === null) {
      return true;
    }

    // Only show a ad if it has not been dismissed in less than |ad.refreshDays|
    // days
    if (
      secondsInOneDay * selectedAd.refreshDays + new Date().getTime() >
      dismissedAd.date
    ) {
      console.log('Not showing ad ' + selectedAd.id + ', it was dismissed.');
      return false;
    }
    return true;
  }

  /**
   * Checks if an ad timeframe is currently active.
   * @param {Ad} selectedAd
   * @return {boolean} True if the time is valid, otherwise false.
   */
  isAdTimeframeValid(selectedAd) {
    if (selectedAd.startDate === null && selectedAd.endDate === null) {
      return true;
    }
    const now = new Date().getTime();

    if (selectedAd.startDate !== null && selectedAd.startDate.getTime() > now) {
      console.log('ad is not started yet');
      return false;
    }
    if (selectedAd.endDate !== null && selectedAd.endDate.getTime() < now) {
      console.log('ad is already finished');
      return false;
    }

    return true;
  }

  /**
   * Makes sure to not spam the user with ads if they recently dismissed one.
   * @param {function} callback
   */
  async canShowAnyAd() {
    if (ActiveAds.length === 0) {
      return false;
    }
    if (!this.optionHandler.getAdsEnabled()) {
      return false;
    }

    const lastDismissedAd = await this.storageHandler.getLocal(
      this.getLastDismissKey(),
    );
    // No data means it was never dismissed
    if (lastDismissedAd === null) {
      return true;
    }
    // Don't show more ad if one was dismissed in less than 24hrs
    if (new Date().getTime() - secondsInOneDay < lastDismissedAd.date) {
      console.log('Not showing ads, one was dismissed recently.');
      return false;
    }
    return true;
  }

  /**
   * Gets a random valid ad that can be displayed to the user.
   * @param {Ad[]|null} [adList=null] List of ad to chose from. Used for
   *     recursion.
   * @return {Ad|false} Returns a valid ad if one is found, otherwise false.
   */
  async getRandomValidAd(adList = null) {
    if (adList === null) {
      adList = Array.from(ActiveAds);
    }
    if (!adList || !adList.length) {
      console.log('No ads left');
      return false;
    }
    const randIndex = Math.floor(Math.random() * adList.length);
    const selectedAd = adList[randIndex];
    adList.splice(randIndex, 1);
    const isAdValid = await this.isAdValid(selectedAd);
    if (!isAdValid) {
      console.log(selectedAd.id, 'ad is not valid to display.');
      return this.getRandomValidAd(adList);
    }
    if (!this.isAdTimeframeValid(selectedAd)) {
      console.log(selectedAd.id, 'ad is not in the current timeframe.');
      return this.getRandomValidAd(adList);
    }
    return selectedAd;
  }

  /**
   * Marks an ad as dismissed so it doesn't show up for a while.
   * @param {Ad} adObject
   */
  async markAdAsDismissed(adObject) {
    await this.storageHandler.setLocal(
      this.getAdDismissKey(adObject.id),
      this.createDismissObjV1(),
    );
    await this.storageHandler.setLocal(
      this.getLastDismissKey(),
      this.createDismissObjV1(),
    );
  }

  /**
   * Gets the key to get the last dismissed ad.
   * @return {string} The key.
   */
  getLastDismissKey() {
    return 'adDismissLast';
  }

  /**
   * Gets the key to get the time a specific ad was dismissed.
   * @param {string} id Id of the ad to check.
   * @return {string} The key.
   */
  getAdDismissKey(id) {
    return 'adDismiss.' + id;
  }

  /**
   * Creates the data to log the time a specific ad was dismissed.
   * @return {object} Data about the dismissal.
   */
  createDismissObjV1() {
    return {
      version: 1,
      date: Date.now(),
    };
  }
}
