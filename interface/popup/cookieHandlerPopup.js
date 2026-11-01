import { GenericCookieHandler } from '../lib/genericCookieHandler.js';

/**
 * implements Cookie API handling for the popup and other similar interfaces.
 */
export class CookieHandlerPopup extends GenericCookieHandler {
  /**
   * Constructs and initializes the cookie handler.
   * @param {BrowserDetector} browserDetector
   */
  constructor(browserDetector) {
    super(browserDetector);
    console.log('Constructing PopupCookieHandler');
    this.isReady = false;
    this.currentTabId = null;

    this.browserDetector
      .getApi()
      .tabs.query({ active: true, currentWindow: true })
      .then(tabInfo => {
        if (tabInfo && tabInfo.length > 0) {
          this.init(tabInfo);
        }
      })
      .catch(error => {
        console.error('Failed to query current tab on popup init:', error);
      });
  }

  /**
   * Initialise the cookie handler after getting our first contact with the
   * current tab.
   * @param {*} tabInfo Info about the current tab.
   */
  init = tabInfo => {
    if (!tabInfo || !tabInfo[0]) {
      return;
    }
    this.currentTabId = tabInfo[0].id;
    this.currentTab = tabInfo[0];
    const api = this.browserDetector.getApi();
    api.tabs.onUpdated.addListener(this.onTabsChanged);
    api.tabs.onActivated.addListener(this.onTabActivated);
    if (!this.browserDetector.isSafari()) {
      api.cookies.onChanged.addListener(this.onCookiesChanged);
    } else {
      // Safari requires a temporary cookie to be added before retrieving all cookies
      this.addTemporarySafariCookie();
    }

    this.emit('ready');
    this.isReady = true;
  };

  /**
   * Adds a temporary session-level cookie for Safari to ensure proper cookie retrieval.
   * The cookie is named with a 'z' prefix to sort it to the end of the list.
   */
  addTemporarySafariCookie = () => {
    try {
      const tempCookie = {
        url: this.currentTab.url,
        name: 'zcookie-editor',
        value:
          'Temporary cookie added to ensure Cookie Editor works correctly in Safari, please ignore it',
        path: '/',
      };
      this.browserDetector
        .getApi()
        .cookies.set(tempCookie)
        .catch(error => {
          console.warn('Failed to set temporary Safari cookie:', error);
        });
    } catch (error) {
      console.warn('Error adding temporary Safari cookie:', error);
    }
  };

  /**
   * Handles events that is triggered when a cookie changes.
   * @param {object} changeInfo An object containing details of the change that
   *     occurred.
   */
  onCookiesChanged = changeInfo => {
    const domain = changeInfo.cookie.domain.substring(1);
    if (
      this.currentTab &&
      this.currentTab.url.indexOf(domain) !== -1 &&
      changeInfo.cookie.storeId === (this.currentTab.cookieStoreId || '0')
    ) {
      this.emit('cookiesChanged', changeInfo);
    }
  };

  /**
   * Handles the event that is fired when a tab is updated.
   * @param {object} tabId Id of the tab that changed.
   * @param {object} changeInfo Properties of the tab that changed.
   * @param {object} _tab
   */
  onTabsChanged = async (tabId, changeInfo, _tab) => {
    if (
      tabId === this.currentTabId &&
      (changeInfo.url || changeInfo.status === 'complete')
    ) {
      console.log('tabChanged!');
      try {
        const tabInfo = await this.browserDetector
          .getApi()
          .tabs.query({ active: true, currentWindow: true });
        if (tabInfo && tabInfo.length > 0) {
          this.updateCurrentTab(tabInfo);
        }
      } catch (error) {
        console.error('Failed to query tab on tabsChanged:', error);
      }
    }
  };

  /**
   * Event handler for when a tab is being activated.
   * @param {object} activeInfo Info about the event.
   */
  onTabActivated = async activeInfo => {
    try {
      const tabInfo = await this.browserDetector
        .getApi()
        .tabs.query({ active: true, currentWindow: true });
      if (tabInfo && tabInfo.length > 0) {
        this.updateCurrentTab(tabInfo);
      }
    } catch (error) {
      console.error('Failed to query tab on tabActivated:', error);
    }
  };

  /**
   * Emits a signal that the current tab changed if needed.
   * @param {object} tabInfo Info about the new current tab.
   */
  updateCurrentTab = tabInfo => {
    if (!tabInfo || !tabInfo[0]) {
      return;
    }
    const newTab =
      tabInfo[0].id !== this.currentTabId ||
      !this.currentTab ||
      tabInfo[0].url !== this.currentTab.url;
    this.currentTabId = tabInfo[0].id;
    this.currentTab = tabInfo[0];

    if (newTab && this.isReady) {
      this.emit('cookiesChanged');
    }
  };
}
