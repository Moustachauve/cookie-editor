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
        var oldCookie = this.cookie;
        this.cookie = cookie;

        if (this.cookie.name !== oldCookie.name) {
            this.updateName();
        }
        if (this.cookie.value !== oldCookie.value) {
            this.updateName();
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
        this.baseHtml.setAttribute('data-name', this.cookie.name);
        this.baseHtml.querySelector('#name-' + this.guid).value = this.cookie.name;
    }
    updateValue() {
        this.baseHtml.querySelector('#name-' + this.guid).value = this.cookie.value;
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