class Cookie {
  constructor(id, cookie, showAdvancedForm) {
    this.id = id;
    this.cookie = cookie;
    this.guid = Cookie.guid();
    this.baseHtml = false;
    this.showAdvancedForm = showAdvancedForm;
  }

  get isGenerated() {
    return this.baseHtml !== false;
  }

  get html() {
    if (!this.isGenerated) {
      this.generateHtml();
    }

    return this.baseHtml;
  }

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

  generateHtml() {
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
    inputExpiration.value = this.cookie.expirationDate
      ? new Date(this.cookie.expirationDate * 1000)
      : '';

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

    inputHostOnly.addEventListener('change', function () {
      inputDomain.disabled = this.checked;
    });
    inputSession.addEventListener('change', function () {
      inputExpiration.disabled = this.checked;
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

    if (this.showAdvancedForm) {
      advancedForm.classList.add('show');
      advancedToggleButton.textContent = 'Hide Advanced';
    }
  }

  updateName() {
    const nameInput = this.baseHtml.querySelector('#name-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    this.baseHtml.setAttribute('data-name', this.cookie.name);
    nameInput.value = this.cookie.name;

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(nameInput);
  }

  updateValue() {
    const valueInput = this.baseHtml.querySelector('#value-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    valueInput.value = this.cookie.value;

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

  updateDomain() {
    const valueInput = this.baseHtml.querySelector('#domain-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    valueInput.value = this.cookie.domain;

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

  updatePath() {
    const valueInput = this.baseHtml.querySelector('#path-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    valueInput.value = this.cookie.path;

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

  updateExpiration() {
    const valueInput = this.baseHtml.querySelector('#expiration-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    valueInput.value = this.cookie.expirationDate
      ? new Date(this.cookie.expirationDate * 1000)
      : '';

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

  updateSameSite() {
    const valueInput = this.baseHtml.querySelector('#sameSite-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    valueInput.value = this.cookie.sameSite;

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

  updateHostOnly() {
    const valueInput = this.baseHtml.querySelector('#hostOnly-' + this.guid);
    const domainInput = this.baseHtml.querySelector('#domain-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    valueInput.checked = this.cookie.hostOnly;

    domainInput.disabled = this.cookie.hostOnly;

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

  updateSession() {
    const valueInput = this.baseHtml.querySelector('#session-' + this.guid);
    const expirationInput = this.baseHtml.querySelector(
      '#expiration-' + this.guid,
    );
    const header = this.baseHtml.querySelector('.header');
    valueInput.checked = !this.cookie.expirationDate;

    expirationInput.disabled = !this.cookie.expirationDate;

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

  updateSecure() {
    const valueInput = this.baseHtml.querySelector('#secure-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    valueInput.checked = this.cookie.secure;

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

  updateHttpOnly() {
    const valueInput = this.baseHtml.querySelector('#httpOnly-' + this.guid);
    const header = this.baseHtml.querySelector('.header');
    valueInput.checked = this.cookie.httpOnly;

    this.animateChangeOnNode(header);
    this.animateChangeOnNode(valueInput);
  }

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

  animateChangeOnNode(node) {
    node.classList.remove('anim-value-changed');
    setTimeout(() => {
      node.classList.add('anim-value-changed');
    }, 20);
  }

  showSuccessAnimation() {
    if (this.baseHtml) {
      this.animateSuccessOnNode(this.baseHtml);
    }
  }

  animateSuccessOnNode(node) {
    node.classList.remove('anim-success');
    setTimeout(() => {
      node.classList.add('anim-success');
    }, 20);
  }

  static guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return (
      s4() +
      s4() +
      '-' +
      s4() +
      '-' +
      s4() +
      '-' +
      s4() +
      '-' +
      s4() +
      s4() +
      s4()
    );
  }

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
