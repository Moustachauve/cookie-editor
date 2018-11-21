class Cookie {
    constructor (id, cookie, showAdvancedForm) {
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

        var oldCookieName = this.baseHtml.querySelector('#name-' + this.guid).value;
        var oldCookieValue = this.baseHtml.querySelector('#value-' + this.guid).value;
        var oldCookieDomain = this.baseHtml.querySelector('#domain-' + this.guid).value;
        var oldCookiePath = this.baseHtml.querySelector('#path-' + this.guid).value;
        var oldCookieExpiration = this.baseHtml.querySelector('#expiration-' + this.guid).value;
        var oldCookieSameSite = this.baseHtml.querySelector('#sameSite-' + this.guid).value;
        var oldCookieHostOnly = this.baseHtml.querySelector('#hostOnly-' + this.guid).checked;
        var oldCookieSession = this.baseHtml.querySelector('#session-' + this.guid).checked;
        var oldCookieSecure = this.baseHtml.querySelector('#secure-' + this.guid).checked;
        var oldCookieHttpOnly = this.baseHtml.querySelector('#httpOnly-' + this.guid).checked;

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
        var template = document.importNode(document.getElementById('tmp-cookie').content, true);
        this.baseHtml = template.querySelector('li');
        this.baseHtml.setAttribute('data-name', this.cookie.name);
        this.baseHtml.id = this.id;
        var form = this.baseHtml.querySelector('form');
        form.setAttribute('data-id', this.id);
        form.id = this.guid;
        if (!this.id) {
            form.classList.add('create');
        }

        var headerName = this.baseHtml.querySelector('.header-name');
        headerName.textContent = this.cookie.name;

        var labelName = form.querySelector('.label-name');
        labelName.setAttribute('for', 'name-' + this.guid);
        var inputName = form.querySelector('.input-name');
        inputName.id = 'name-' + this.guid;
        inputName.value = this.cookie.name;

        var labelValue = form.querySelector('.label-value');
        labelValue.setAttribute('for', 'value-' + this.guid);
        var inputValue = form.querySelector('.input-value');
        inputValue.id = 'value-' + this.guid;
        inputValue.value = this.cookie.value;

        var labelDomain = form.querySelector('.label-domain');
        labelDomain.setAttribute('for', 'domain-' + this.guid);
        var inputDomain = form.querySelector('.input-domain');
        inputDomain.id = 'domain-' + this.guid;
        inputDomain.value = this.cookie.domain;

        var labelPath = form.querySelector('.label-path');
        labelPath.setAttribute('for', 'path-' + this.guid);
        var inputPath = form.querySelector('.input-path');
        inputPath.id = 'path-' + this.guid;
        inputPath.value = this.cookie.path;

        var labelExpiration = form.querySelector('.label-expiration');
        labelExpiration.setAttribute('for', 'expiration-' + this.guid);
        var inputExpiration = form.querySelector('.input-expiration');
        inputExpiration.id = 'expiration-' + this.guid;
        inputExpiration.value = this.cookie.expirationDate ? new Date(this.cookie.expirationDate * 1000) : '';

        var labelSameSite = form.querySelector('.label-sameSite');
        labelSameSite.setAttribute('for', 'sameSite-' + this.guid);
        var inputSameSite = form.querySelector('.input-sameSite');
        inputSameSite.id = 'sameSite-' + this.guid;
        inputSameSite.value = this.cookie.sameSite;

        var labelHostOnly = form.querySelector('.label-hostOnly');
        labelHostOnly.setAttribute('for', 'hostOnly-' + this.guid);
        var inputHostOnly = form.querySelector('.input-hostOnly');
        inputHostOnly.id = 'hostOnly-' + this.guid;
        inputHostOnly.checked = this.cookie.hostOnly;

        inputDomain.disabled = this.cookie.hostOnly;

        var labelSession = form.querySelector('.label-session');
        labelSession.setAttribute('for', 'session-' + this.guid);
        var inputSession = form.querySelector('.input-session');
        inputSession.id = 'session-' + this.guid;
        inputSession.checked = !this.cookie.expirationDate;

        inputExpiration.disabled = !this.cookie.expirationDate;

        var labelSecure = form.querySelector('.label-secure');
        labelSecure.setAttribute('for', 'secure-' + this.guid);
        var inputSecure = form.querySelector('.input-secure');
        inputSecure.id = 'secure-' + this.guid;
        inputSecure.checked = this.cookie.secure;

        var labelHttpOnly = form.querySelector('.label-httpOnly');
        labelHttpOnly.setAttribute('for', 'httpOnly-' + this.guid);
        var inputHttpOnly = form.querySelector('.input-httpOnly');
        inputHttpOnly.id = 'httpOnly-' + this.guid;
        inputHttpOnly.checked = this.cookie.httpOnly;

        inputHostOnly.addEventListener('change', function () {
            inputDomain.disabled = this.checked;
        });
        inputSession.addEventListener('change', function () {
            inputExpiration.disabled = this.checked;
        });

        var advancedToggleButton = form.querySelector('.advanced-toggle');
        var advancedForm = form.querySelector('.advanced-form');
        advancedToggleButton.addEventListener('click', function() {
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
        var nameInput = this.baseHtml.querySelector('#name-' + this.guid);
        var header = this.baseHtml.querySelector('.header');
        this.baseHtml.setAttribute('data-name', this.cookie.name);
        nameInput.value = this.cookie.name;
        
        this.animateChangeOnNode(header);
        this.animateChangeOnNode(nameInput);
    }

    updateValue() {
        var valueInput = this.baseHtml.querySelector('#value-' + this.guid);
        var header = this.baseHtml.querySelector('.header');
        valueInput.value = this.cookie.value;

        this.animateChangeOnNode(header);
        this.animateChangeOnNode(valueInput);
    }

    updateDomain() {
        var valueInput = this.baseHtml.querySelector('#domain-' + this.guid);
        var header = this.baseHtml.querySelector('.header');
        valueInput.value = this.cookie.domain;

        this.animateChangeOnNode(header);
        this.animateChangeOnNode(valueInput);
    }

    updatePath() {
        var valueInput = this.baseHtml.querySelector('#path-' + this.guid);
        var header = this.baseHtml.querySelector('.header');
        valueInput.value = this.cookie.path;

        this.animateChangeOnNode(header);
        this.animateChangeOnNode(valueInput);
    }

    updateExpiration() {
        var valueInput = this.baseHtml.querySelector('#expiration-' + this.guid);
        var header = this.baseHtml.querySelector('.header');
        valueInput.value = this.cookie.expirationDate ? new Date(this.cookie.expirationDate * 1000) : '';

        this.animateChangeOnNode(header);
        this.animateChangeOnNode(valueInput);
    }

    updateSameSite() {
        var valueInput = this.baseHtml.querySelector('#sameSite-' + this.guid);
        var header = this.baseHtml.querySelector('.header');
        valueInput.value = this.cookie.sameSite;

        this.animateChangeOnNode(header);
        this.animateChangeOnNode(valueInput);
    }

    updateHostOnly() {
        var valueInput = this.baseHtml.querySelector('#hostOnly-' + this.guid);
        var domainInput = this.baseHtml.querySelector('#domain-' + this.guid);
        var header = this.baseHtml.querySelector('.header');
        valueInput.checked = this.cookie.hostOnly;

        domainInput.disabled = this.cookie.hostOnly;

        this.animateChangeOnNode(header);
        this.animateChangeOnNode(valueInput);
    }

    updateSession() {
        var valueInput = this.baseHtml.querySelector('#session-' + this.guid);
        var expirationInput = this.baseHtml.querySelector('#expiration-' + this.guid);
        var header = this.baseHtml.querySelector('.header');
        valueInput.checked = !this.cookie.expirationDate;

        expirationInput.disabled = !this.cookie.expirationDate;

        this.animateChangeOnNode(header);
        this.animateChangeOnNode(valueInput);
    }

    updateSecure() {
        var valueInput = this.baseHtml.querySelector('#secure-' + this.guid);
        var header = this.baseHtml.querySelector('.header');
        valueInput.checked = this.cookie.secure;

        this.animateChangeOnNode(header);
        this.animateChangeOnNode(valueInput);
    }

    updateHttpOnly() {
        var valueInput = this.baseHtml.querySelector('#httpOnly-' + this.guid);
        var header = this.baseHtml.querySelector('.header');
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
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    static hashCode(cookie) {
        var cookieString = cookie.name + cookie.domain;
        var hash = 0, i, chr;
        if (cookieString.length === 0) return hash;
        for (i = 0; i < cookieString.length; i++) {
            chr   = cookieString.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
}