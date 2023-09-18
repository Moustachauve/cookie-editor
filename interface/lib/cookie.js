import { Animate } from './animate.js';
import { GUID } from './guid.js';
import { ExtraInfos } from './options/extraInfos.js';

/**
 * Helper class to display a cookie.
 */
export class Cookie {
  /**
   * Creates a cookie object.
   * @param {string} id HTML id name for this cookie.
   * @param {object} cookie Cookie data.
   * @param {OptionsHandler} optionHandler
   */
  constructor(id, cookie, optionHandler) {
    this.id = id;
    this.cookie = cookie;
    this.guid = GUID.get();
    this.baseHtml = false;
    this.optionHandler = optionHandler;
  }

  /**
   * Whether the HTML for this cookie is already generated or not.
   */
  get isGenerated() {
    return this.baseHtml !== false;
  }

  /**
   * Gets the HTML to represent this cookie. This will generate it if it was
   * not already generated.
   */
  get html() {
    if (!this.isGenerated) {
      this.generateHtml();
    }

    return this.baseHtml;
  }

  /**
   * Updates the generated HTML code for a cookie. Used when a cookie changed
   * to avoid regenerating completely the HTML. This also allows to display to
   * the user that a cookie changed.
   * This will not do anything if the HTML is not yet generated.
   * @param {*} cookie Cookie data.
   */
  updateHtml(cookie) {
    if (!this.isGenerated) {
      return;
    }
    this.cookie = cookie;

    const oldCookieName = this.baseHtml.querySelector(
      '#name-' + this.guid,
    ).value;
    const oldCookieValue = this.baseHtml.querySelector(
      '#value-' + this.guid,
    ).value;
    const oldCookieDomain = this.baseHtml.querySelector(
      '#domain-' + this.guid,
    ).value;
    const oldCookiePath = this.baseHtml.querySelector(
      '#path-' + this.guid,
    ).value;
    const oldCookieSameSite = this.baseHtml.querySelector(
      '#sameSite-' + this.guid,
    ).value;
    const oldCookieHostOnly = this.baseHtml.querySelector(
      '#hostOnly-' + this.guid,
    ).checked;
    const oldCookieSession = this.baseHtml.querySelector(
      '#session-' + this.guid,
    ).checked;
    const oldCookieSecure = this.baseHtml.querySelector(
      '#secure-' + this.guid,
    ).checked;
    const oldCookieHttpOnly = this.baseHtml.querySelector(
      '#httpOnly-' + this.guid,
    ).checked;
    let oldCookieExpiration = this.baseHtml.querySelector(
      '#expiration-' + this.guid,
    ).value;
    oldCookieExpiration = new Date(oldCookieExpiration).getTime() / 1000;
    if (isNaN(oldCookieExpiration)) {
      oldCookieExpiration = undefined;
    }

    if (this.cookie.name !== oldCookieName) {
      this.updateName();
    }
    this.updateExtraInfo();
    if (this.cookie.value !== oldCookieValue) {
      this.updateValue();
    }
    if (this.cookie.domain !== oldCookieDomain) {
      this.updateDomain();
    }
    if (this.cookie.path !== oldCookiePath) {
      this.updatePath();
    }
    if (this.cookie.expirationDate !== oldCookieExpiration) {
      this.updateExpiration();
    }
    if (this.cookie.sameSite !== oldCookieSameSite) {
      this.updateSameSite();
    }
    if (this.cookie.hostOnly !== oldCookieHostOnly) {
      this.updateHostOnly();
    }
    if (this.cookie.session !== oldCookieSession) {
      this.updateSession();
    }
    if (this.cookie.secure !== oldCookieSecure) {
      this.updateSecure();
    }
    if (this.cookie.httpOnly !== oldCookieHttpOnly) {
      this.updateHttpOnly();
    }
  }

  /**
   * Generates the HTML representation of a cookie.
   */
  generateHtml() {
    const self = this;
    const template = document.importNode(
      document.getElementById('tmp-cookie').content,
      true,
    );
    this.baseHtml = template.querySelector('li');
    this.baseHtml.setAttribute('data-name', this.cookie.name);
    this.baseHtml.id = this.id;
    const form = this.baseHtml.querySelector('form');
    form.setAttribute('data-id', this.id);
    form.id = this.guid;
    if (!this.id) {
      form.classList.add('create');
    }

    const expandoId = 'exp_' + this.guid;
    const expando = this.baseHtml.querySelector('.expando');
    expando.id = expandoId;

    const header = this.baseHtml.querySelector('.header');
    header.setAttribute('aria-controls', expandoId);

    const headerName = this.baseHtml.querySelector('.header-name');
    headerName.textContent = this.cookie.name;

    const headerExtraInfo = this.baseHtml.querySelector('.header-extra-info');
    headerExtraInfo.textContent = this.getExtraInfoValue();
    headerExtraInfo.title = this.getExtraInfoTitle();

    const labelName = form.querySelector('.label-name');
    labelName.setAttribute('for', 'name-' + this.guid);
    const inputName = form.querySelector('.input-name');
    inputName.id = 'name-' + this.guid;
    inputName.value = this.cookie.name;

    const labelValue = form.querySelector('.label-value');
    labelValue.setAttribute('for', 'value-' + this.guid);
    const inputValue = form.querySelector('.input-value');
    inputValue.id = 'value-' + this.guid;
    inputValue.value = this.cookie.value;

    const labelDomain = form.querySelector('.label-domain');
    labelDomain.setAttribute('for', 'domain-' + this.guid);
    const inputDomain = form.querySelector('.input-domain');
    inputDomain.id = 'domain-' + this.guid;
    inputDomain.value = this.cookie.domain;

    const labelPath = form.querySelector('.label-path');
    labelPath.setAttribute('for', 'path-' + this.guid);
    const inputPath = form.querySelector('.input-path');
    inputPath.id = 'path-' + this.guid;
    inputPath.value = this.cookie.path;

    const labelExpiration = form.querySelector('.label-expiration');
    labelExpiration.setAttribute('for', 'expiration-' + this.guid);
    const inputExpiration = form.querySelector('.input-expiration');
    inputExpiration.id = 'expiration-' + this.guid;
    inputExpiration.value = this.formatExpirationForDisplay();

    const labelSameSite = form.querySelector('.label-sameSite');
    labelSameSite.setAttribute('for', 'sameSite-' + this.guid);
    const inputSameSite = form.querySelector('.input-sameSite');
    inputSameSite.id = 'sameSite-' + this.guid;
    inputSameSite.value = this.cookie.sameSite;

    const labelHostOnly = form.querySelector('.label-hostOnly');
    labelHostOnly.setAttribute('for', 'hostOnly-' + this.guid);
    const inputHostOnly = form.querySelector('.input-hostOnly');
    inputHostOnly.id = 'hostOnly-' + this.guid;
    inputHostOnly.checked = this.cookie.hostOnly;

    inputDomain.disabled = this.cookie.hostOnly;

    const labelSession = form.querySelector('.label-session');
    labelSession.setAttribute('for', 'session-' + this.guid);
    const inputSession = form.querySelector('.input-session');
    inputSession.id = 'session-' + this.guid;
    inputSession.checked = !this.cookie.expirationDate;

    inputExpiration.disabled = !this.cookie.expirationDate;

    const labelSecure = form.querySelector('.label-secure');
    labelSecure.setAttribute('for', 'secure-' + this.guid);
    const inputSecure = form.querySelector('.input-secure');
    inputSecure.id = 'secure-' + this.guid;
    inputSecure.checked = this.cookie.secure;

    const labelHttpOnly = form.querySelector('.label-httpOnly');
    labelHttpOnly.setAttribute('for', 'httpOnly-' + this.guid);
    const inputHttpOnly = form.querySelector('.input-httpOnly');
    inputHttpOnly.id = 'httpOnly-' + this.guid;
    inputHttpOnly.checked = this.cookie.httpOnly;

    inputHostOnly.addEventListener('change', function (e) {
      self.afterHostOnlyChanged(e.target.checked);
    });
    inputSession.addEventListener('change', function (e) {
      self.afterSessionChanged(e.target.checked);
    });

    const advancedToggleButton = form.querySelector('.advanced-toggle');
    const advancedForm = form.querySelector('.advanced-form');
    advancedToggleButton.addEventListener('click', function () {
      advancedForm.classList.toggle('show');
      if (advancedForm.classList.contains('show')) {
        advancedToggleButton.textContent = 'Hide Advanced';
      } else {
        advancedToggleButton.textContent = 'Show Advanced';
      }
      Animate.resizeSlide(form.parentElement.parentElement);
    });

    if (this.optionHandler.getCookieAdvanced()) {
      advancedForm.classList.add('show');
      advancedToggleButton.textContent = 'Hide Advanced';
    }
  }

  /**
   * Updates the name of the cookie in the HTML.
   */
  updateName() {
    const nameInput = this.baseHtml.querySelector('#name-' + this.guid);
    const headerName = this.baseHtml.querySelector('.header-name');
    const header = this.baseHtml.querySelector('.header');
    this.baseHtml.setAttribute('data-name', this.cookie.name);
    nameInput.value = this.cookie.name;
    headerName.textContent = this.cookie.name;

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(nameInput);
  }

  /**
   * Updates the extra info displayed next to the cookie name.
   */
  updateExtraInfo() {
    const header = this.baseHtml.querySelector('.header');
    const headerExtraInfo = this.baseHtml.querySelector('.header-extra-info');
    headerExtraInfo.textContent = this.getExtraInfoValue();
    headerExtraInfo.title = this.getExtraInfoTitle();

    this.animateChangeOnNode(header);
  }

  /**
   * Updates the value of the cookie in the HTML.
   */
  updateValue() {
    const valueInput = this.baseHtml.querySelector('#value-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    valueInput.value = this.cookie.value;

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

  /**
   * Updates the domain of the cookie in the HTML.
   */
  updateDomain() {
    const valueInput = this.baseHtml.querySelector('#domain-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    valueInput.value = this.cookie.domain;

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

  /**
   * Updates the path of the cookie in the HTML.
   */
  updatePath() {
    const valueInput = this.baseHtml.querySelector('#path-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    valueInput.value = this.cookie.path;

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

  /**
   * Updates the expiration of the cookie in the HTML.
   */
  updateExpiration() {
    const valueInput = this.baseHtml.querySelector('#expiration-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    valueInput.value = this.formatExpirationForDisplay();

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

  /**
   * Updates the SameSite field of the cookie in the HTML.
   */
  updateSameSite() {
    const valueInput = this.baseHtml.querySelector('#sameSite-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    valueInput.value = this.cookie.sameSite;

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

  /**
   * Updates the HostOnly field of the cookie in the HTML.
   */
  updateHostOnly() {
    const valueInput = this.baseHtml.querySelector('#hostOnly-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    valueInput.checked = this.cookie.hostOnly;
    this.afterHostOnlyChanged(this.cookie.hostOnly);

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

  /**
   * Actions to do whenever the HostOnly input changes.
   * @param {boolean} inputValue The value of the Session input.
   */
  afterHostOnlyChanged(inputValue) {
    const domainInput = this.baseHtml.querySelector('#domain-' + this.guid);
    domainInput.disabled = inputValue;
  }

  /**
   * Updates the Session field of the cookie in the HTML.
   */
  updateSession() {
    const valueInput = this.baseHtml.querySelector('#session-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    valueInput.checked = !this.cookie.expirationDate;
    this.afterSessionChanged();

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

  /**
   * Actions to do whenever the Session input changes.
   * @param {boolean} inputValue The value of the Session input.
   */
  afterSessionChanged(inputValue) {
    const expirationInput = this.baseHtml.querySelector(
      '#expiration-' + this.guid,
    );
    expirationInput.disabled = inputValue;
    if (inputValue) {
      expirationInput.value = 'No Expiration';
      return;
    }
    if (!this.cookie.expirationDate) {
      this.cookie.expirationDate =
        new Date(Date.now() + 1 * (60 * 60 * 1000)).getTime() / 1000;
    }
    expirationInput.value = this.formatExpirationForDisplay();
  }

  /**
   * Updates the Secure field of the cookie in the HTML.
   */
  updateSecure() {
    const valueInput = this.baseHtml.querySelector('#secure-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    valueInput.checked = this.cookie.secure;

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

  /**
   * Updates the HttpOnly field of the cookie in the HTML.
   */
  updateHttpOnly() {
    const valueInput = this.baseHtml.querySelector('#httpOnly-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    valueInput.checked = this.cookie.httpOnly;

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

  /**
   * Removes the cookie from the HTML.
   * @param {function} callback Gets called after the element's animation is
   *     done.
   */
  removeHtml(callback = null) {
    if (this.isRemoving) {
      return;
    }

    this.isRemoving = true;
    Animate.toggleSlide(this.baseHtml, () => {
      this.baseHtml.remove();
      this.baseHtml = null;
      this.isRemoving = false;
      if (callback) {
        callback();
      }
    });
  }

  /**
   * Animates changes to the HTML.
   * @param {Element} node Element to animate.
   */
  animateChangeOnNode(node) {
    node.classList.remove('anim-value-changed');
    setTimeout(() => {
      node.classList.add('anim-value-changed');
    }, 20);
  }

  /**
   * Shows a little success animation on the cookie HTML.
   */
  showSuccessAnimation() {
    if (this.baseHtml) {
      this.animateSuccessOnNode(this.baseHtml);
    }
  }

  /**
   * Executes a success animation on a node.
   * @param {Element} node Element to animate.
   */
  animateSuccessOnNode(node) {
    node.classList.remove('anim-success');
    setTimeout(() => {
      node.classList.add('anim-success');
    }, 20);
  }

  /**
   * Formats the expiration date of the cookie for display.
   * @return {string}
   */
  formatExpirationForDisplay() {
    return this.cookie.expirationDate
      ? new Date(this.cookie.expirationDate * 1000)
      : 'No Expiration';
  }

  /**
   * Formats the expiration date of the cookie for display in a shorter format.
   * @return {string}
   */
  formatExpirationForDisplayShort() {
    const date = new Date(this.cookie.expirationDate * 1000);
    date.setMilliseconds(0);
    return this.cookie.expirationDate
      ? date.toISOString().split('.')[0] + 'Z'
      : 'No Expiration';
  }

  /**
   * Formats a boolean for displaying extra infos
   * @param {string} name
   * @param {Boolean} boolValue
   * @return {string}
   */
  formatBoolForDisplayShort(name, boolValue) {
    const emoji = boolValue ? '☑' : '☐';
    return emoji + ' ' + name;
  }

  /**
   * Gets the extra info value for the prefered type.
   * @return {string}
   */
  getExtraInfoValue() {
    const extraInfoType = this.optionHandler.getExtraInfo();
    switch (extraInfoType) {
      case ExtraInfos.Value:
        return this.cookie.value;
      case ExtraInfos.Domain:
        return this.cookie.domain;
      case ExtraInfos.Path:
        return this.cookie.path;
      case ExtraInfos.Expiration:
        return this.formatExpirationForDisplayShort();
      case ExtraInfos.Samesite:
        return this.cookie.sameSite;
      case ExtraInfos.Hostonly:
        return this.formatBoolForDisplayShort(
          'Host Only',
          this.cookie.hostOnly,
        );
      case ExtraInfos.Session:
        return this.formatBoolForDisplayShort('Session', this.cookie.session);
      case ExtraInfos.Secure:
        return this.formatBoolForDisplayShort('Secure', this.cookie.secure);
      case ExtraInfos.Httponly:
        return this.formatBoolForDisplayShort(
          'Http Only',
          this.cookie.httpOnly,
        );
      case ExtraInfos.Nothing:
      default:
        return '';
    }
  }

  /**
   * Gets the extra info title for the prefered type. Used for when a user
   * hovers the value.
   * @return {string}
   */
  getExtraInfoTitle() {
    const extraInfoType = this.optionHandler.getExtraInfo();
    switch (extraInfoType) {
      case ExtraInfos.Value:
        return 'Value: ' + this.cookie.value;
      case ExtraInfos.Domain:
        return 'Domain: ' + this.cookie.domain;
      case ExtraInfos.Path:
        return 'Path: ' + this.cookie.path;
      case ExtraInfos.Expiration:
        return 'Expiration: ' + this.formatExpirationForDisplay();
      case ExtraInfos.Samesite:
        return 'Same Site: ' + this.cookie.sameSite;
      case ExtraInfos.Hostonly:
        return 'Host Only: ' + this.cookie.hostOnly;
      case ExtraInfos.Session:
        return 'Session: ' + this.cookie.session;
      case ExtraInfos.Secure:
        return 'Secure: ' + this.cookie.secure;
      case ExtraInfos.Httponly:
        return 'HTTP Only: ' + this.cookie.httpOnly;
      case ExtraInfos.Nothing:
      default:
        return '';
    }
  }

  /**
   * Generates a hashcode to represent a cookie based on its name and domain.
   * @param {object} cookie A cookie's data.
   * @return {string} A hashcode.
   */
  static hashCode(cookie) {
    const cookieString = cookie.name + cookie.domain;
    let hash = 0;
    let i;
    let chr;
    if (cookieString.length === 0) return hash;
    for (i = 0; i < cookieString.length; i++) {
      chr = cookieString.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
}
