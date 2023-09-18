/**
 * The data class that contains ad informations.
 */
export class Ad {
  /**
   * Constructs an ad.
   * @param {string} id Unique string identifier for a specific ad.
   * @param {string} text Text to display for the ad.
   * @param {string} tooltip Text to display when a user hover the text.
   * @param {string} url Url to redirect the user when they click this ad.
   * @param {Browsers[]} supportedBrowsers List of supported browsers to show
   *     this ad to.
   * @param {int} refreshDays How many days to wait before showing the ad again.
   * @param {int|null} startDate Timestamp Date before which the ad will not
   *     show to any user yet.
   * @param {int|null} endDate Timestamp Date after which the ad will no
   *     longer show to any user.
   */
  constructor({
    id,
    text,
    tooltip,
    url,
    supportedBrowsers,
    refreshDays,
    startDate,
    endDate,
  }) {
    this.id = id;
    this.text = text;
    this.tooltip = tooltip;
    this.url = url;
    this.supportedBrowsers = supportedBrowsers;
    this.refreshDays = refreshDays;
    this.startDate = startDate;
    this.endDate = endDate;
  }
}
