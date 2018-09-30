class Cookie {
    constructor (id, cookie) {
        this.id = id;
        this.cookie = cookie;
        this.guid = Cookie.guid();
        this.baseHtml = false;
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

        if (this.cookie.name !== oldCookieName) {
            this.updateName();
        }
        if (this.cookie.value !== oldCookieValue) {
            this.updateValue();
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