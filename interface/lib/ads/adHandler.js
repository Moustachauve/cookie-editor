import { ActiveAds } from './activeAds.js';

const secondsInOneDay = Object.freeze(
  new Date().getTime() + 1 * 24 * 60 * 60 * 1000,
);

/**
 * class used to handle all the ad logic.
 */
export class AdHandler {
  /**
   * Constructs an AdHandler.
   * @param {BrowserDetector} browserDetector
   * @param {GenericStorageHandler} storageHandler
   */
  constructor(browserDetector, storageHandler) {
    this.browserDetector = browserDetector;
    this.storageHandler = storageHandler;
  }

  /**
   * Checks if an ad is valid to display to the user. To be valid, an ad needs
   * to be available for the user's browser and respect the choice of the user
   * if they have marked it as not interested.
   * @param {object} selectedAd The ad to validate.
   */
  async isAdValid(selectedAd) {
    // TODO: implement start/end date.
    if (
      selectedAd.supportedBrowsers != 'any' &&
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
    if (secondsInOneDay * selectedAd.refreshDays > dismissedAd.date) {
      console.log('Not showing ad ' + selectedAd.id + ', it was dismissed.');
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

    const lastDismissedAd = await this.storageHandler.getLocal(
      this.getLastDismissKey(),
    );
    // No data means it was never dismissed
    if (lastDismissedAd === null) {
      return true;
    }
    // Don't show more ad if one was dismissed in less than 24hrs
    if (secondsInOneDay > lastDismissedAd.date) {
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
    const adIsValid = this.isAdValid(selectedAd);
    if (!adIsValid) {
      console.log(selectedAd.id, 'ad is not valid to display');
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
