(function () {
    'use strict';

    let containerCookie;
    let cookiesListHtml;
    let pageTitleContainer;
    let notificationElement;
    let loadedCookies = {};
    let disableButtons = false;

    let showAllAdvanced;

    let notificationQueue = [];
    let notificationTimeout;

    const secondsInOneDay = new Date().getTime() + (1 * 24 * 60 * 60 * 1000)
    const browserDetector = new BrowserDetector();

    const cookieHandler = new CookieHandler();
    const storageHandler = new GenericStorageHandler();

    let sponsors = [
        {
            id: "cookie-editor",
            text: "Enjoying Cookie-Editor? Buy me a coffee!",
            tooltip: "Cookie-Editor is always free. Help its development by sponsoring me.",
            url: "https://github.com/sponsors/Moustachauve",
            refresh_days: 80,
            supported_browsers: "all"
        },
    ]

    document.addEventListener('DOMContentLoaded', function () {
        containerCookie = document.getElementById('cookie-container');
        notificationElement = document.getElementById('notification');
        pageTitleContainer = document.getElementById('pageTitle');

        function expandCookie(e) {
            const parent = e.target.closest('li');
            const header = parent.querySelector('.header');
            const expando = parent.querySelector('.expando');

            Animate.toggleSlide(expando);
            header.classList.toggle('active');
            header.ariaExpanded = header.classList.contains('active');
            expando.ariaHidden = !header.classList.contains('active');
        }

        function deleteButton(e) {
            e.preventDefault();
            console.log('removing cookie...');
            const listElement = e.target.closest('li');
            removeCookie(listElement.dataset.name);
            return false;
        }

        function saveCookieForm(form) {
            let isCreateForm = form.classList.contains('create');

            const id = form.dataset.id;
            const name = form.querySelector('input[name="name"]').value;
            const value = form.querySelector('textarea[name="value"]').value;

            let domain;
            let path;
            let expiration;
            let sameSite;
            let hostOnly;
            let session;
            let secure;
            let httpOnly;

            if (!isCreateForm) {
                domain = form.querySelector('input[name="domain"]').value;
                path = form.querySelector('input[name="path"]').value;
                expiration = form.querySelector('input[name="expiration"]').value;
                sameSite = form.querySelector('select[name="sameSite"]').value;
                hostOnly = form.querySelector('input[name="hostOnly"]').checked;
                session = form.querySelector('input[name="session"]').checked;
                secure = form.querySelector('input[name="secure"]').checked;
                httpOnly = form.querySelector('input[name="httpOnly"]').checked;
            }
            saveCookie(
                id,
                name,
                value,
                domain,
                path,
                expiration,
                sameSite,
                hostOnly,
                session,
                secure,
                httpOnly
            );

            if (form.classList.contains('create')) {
                showCookiesForTab();
            }

            return false;
        }

        function saveCookie(id, name, value, domain, path, expiration, sameSite, hostOnly, session, secure, httpOnly) {
            console.log('saving cookie...');

            let cookieContainer = loadedCookies[id];
            let cookie = cookieContainer ? cookieContainer.cookie : null;
            let oldName;
            let oldHostOnly;

            if (cookie) {
                oldName = cookie.name;
                oldHostOnly = cookie.hostOnly;
            } else {
                cookie = {};
                oldName = name;
                oldHostOnly = hostOnly;
            }

            cookie.name = name;
            cookie.value = value;

            if (domain !== undefined)
                cookie.domain = domain;
            if (path !== undefined)
                cookie.path = path;
            if (sameSite !== undefined)
                cookie.sameSite = sameSite;
            if (hostOnly !== undefined)
                cookie.hostOnly = hostOnly;
            if (session !== undefined)
                cookie.session = session;
            if (secure !== undefined)
                cookie.secure = secure;
            if (httpOnly !== undefined)
                cookie.httpOnly = httpOnly;

            if (cookie.session) {
                cookie.expirationDate = null;
            } else {
                cookie.expirationDate = new Date(expiration).getTime() / 1000;
                if (!cookie.expirationDate) {
                    cookie.session = true;
                }
            }

            if (oldName !== name || oldHostOnly !== hostOnly) {
                cookieHandler.removeCookie(oldName, getCurrentTabUrl(), function () {
                    cookieHandler.saveCookie(cookie, getCurrentTabUrl(), function(error, cookie) {
                        if (error) {
                            sendNotification(error);
                            return;
                        }
                        if (browserDetector.isSafari()) {
                            onCookiesChanged();
                        }
                        if (cookieContainer) {
                            cookieContainer.showSuccessAnimation();
                        }
                    });
                });
            } else {
                // Should probably put in a function to prevent duplication
                cookieHandler.saveCookie(cookie, getCurrentTabUrl(), function(error, cookie) {
                    if (error) {
                        sendNotification(error);
                        return;
                    }
                    if (browserDetector.isSafari()) {
                        onCookiesChanged();
                    }

                    if (cookieContainer) {
                        cookieContainer.showSuccessAnimation();
                    }
                });
            }
        }

        if (containerCookie) {
            containerCookie.addEventListener('click', e => {
                let target = e.target;
                if (target.nodeName === 'path') {
                    target = target.parentNode;
                }
                if (target.nodeName === 'svg') {
                    target = target.parentNode;
                }

                if (target.classList.contains('header')) {
                    return expandCookie(e);
                }
                if (target.classList.contains('delete')) {
                    return deleteButton(e);
                }
                if (target.classList.contains('save')) {
                    return saveCookieForm(e.target.closest('li').querySelector('form'));
                }
            });
            document.addEventListener('keydown', e => {
                if (e.code === 'Space' || e.code === 'Enter') {
                    let target = e.target;
                    if (target.classList.contains('header')) {
                        e.preventDefault();
                        return expandCookie(e);
                    }
                }
            });
        }

        document.getElementById('create-cookie').addEventListener('click', () => {
            hideExportMenu();
            if (disableButtons) {
                return;
            }

            setPageTitle('Cookie Editor - Create a Cookie');

            disableButtons = true;
            console.log('strart transition');
            Animate.transitionPage(containerCookie, containerCookie.firstChild, createHtmlFormCookie(), 'left', () => {
                disableButtons = false;
            });
            console.log('after transition');

            document.getElementById('button-bar-default').classList.remove('active');
            document.getElementById('button-bar-add').classList.add('active');
            document.getElementById('name-create').focus();
            return false;
        });

        document.getElementById('delete-all-cookies').addEventListener('click', () => {
            hideExportMenu();
            let buttonIcon = document.getElementById('delete-all-cookies').querySelector('use');
            if (buttonIcon.getAttribute("href") === "../sprites/solid.svg#check") {
                return;
            }
            if (loadedCookies && Object.keys(loadedCookies).length) {
                for (var cookieId in loadedCookies) {
                    removeCookie(loadedCookies[cookieId].cookie.name);
                }
            }
            sendNotification('All cookies were deleted');
            buttonIcon.setAttribute("href", "../sprites/solid.svg#check");
            setTimeout(() => {
                buttonIcon.setAttribute("href", "../sprites/solid.svg#trash");
            }, 1500);
        });

        document.getElementById('export-cookies').addEventListener('click', () => {
            if (disableButtons) {
                hideExportMenu();
                return;
            }
            toggleExportMenu();
        });

        document.getElementById('import-cookies').addEventListener('click', () => {
            hideExportMenu();
            if (disableButtons) {
                return;
            }

            setPageTitle('Cookie Editor - Import Cookies');

            disableButtons = true;
            Animate.transitionPage(containerCookie, containerCookie.firstChild, createHtmlFormImport(), 'left', () => {
                disableButtons = false;
            });

            document.getElementById('button-bar-default').classList.remove('active');
            document.getElementById('button-bar-import').classList.add('active');

            document.getElementById('content-import').focus();
            return false;
        });

        document.getElementById('return-list-add').addEventListener('click', () => {
            showCookiesForTab();
        });
        document.getElementById('return-list-import').addEventListener('click', () => {
            showCookiesForTab();
        });

        containerCookie.addEventListener('submit', e => {
            e.preventDefault();
            saveCookieForm(e.target);
            return false;
        });

        document.getElementById('save-create-cookie').addEventListener('click', () => {
            saveCookieForm(document.querySelector('form'));
        });

        document.getElementById('save-import-cookie').addEventListener('click', e => {
            let buttonIcon = document.getElementById('save-import-cookie').querySelector('use');
            if (buttonIcon.getAttribute("href") !== "../sprites/solid.svg#file-import") {
                return;
            }

            let json = document.querySelector('textarea').value;
            if (!json) {
                return;
            }
            let cookies;
            try {
                cookies = JSON.parse(json);
            } catch (error) {
                try {
                    let cookiesTmp = [];
                    // Json failed, let's try netscape format.
                    let lines = json.split('\n');
                    for (var line of lines) {
                        line = line.trim();
                        if (!line.length || line[0] == '#') {
                            continue;
                        }

                        const elements = line.split("\t");
                        if (elements.length != 7) {
                            throw new Error('Invalid netscape format')
                        }
                        cookiesTmp.push({
                            domain: elements[0],
                            path: elements[2],
                            secure: (elements[3].toLowerCase() === 'true'),
                            expiration: elements[4],
                            name: elements[5],
                            value: elements[6]
                        });
                    }
                    cookies = cookiesTmp;
                } catch (error) {
                    console.log("Couldn't parse Data", error);
                    sendNotification("Could not parse the value");
                    buttonIcon.setAttribute("href", "../sprites/solid.svg#times");
                    setTimeout(() => {
                        buttonIcon.setAttribute("href", "../sprites/solid.svg#file-import");
                    }, 1500);
                    return;
                }
            }

            if (!isArray(cookies)) {
                console.log("Invalid Json/Netscape");
                sendNotification("The input is not valid Json/Netscape format");
                buttonIcon.setAttribute("href", "../sprites/solid.svg#times");
                setTimeout(() => {
                    buttonIcon.setAttribute("href", "../sprites/solid.svg#file-import");
                }, 1500);
                return;
            }

            for (let cookie of cookies) {
                // Make sure we are using the right store ID. This is in case we are importing from a basic store ID and the
                // current user is using custom containers
                cookie.storeId = cookieHandler.currentTab.cookieStoreId;

                if (cookie.sameSite && cookie.sameSite === 'unspecified') {
                    cookie.sameSite = null;
                }

                try {
                    cookieHandler.saveCookie(cookie, getCurrentTabUrl(), function (error, cookie) {
                        if (error) {
                            sendNotification(error);
                        }
                    });
                } catch (error) {
                    console.error(error)
                    sendNotification(error);
                }
            }

            sendNotification(`Cookies were imported`);
            showCookiesForTab();
        });

        document.querySelector('#advanced-toggle-all input').addEventListener('change', function() {
            showAllAdvanced = this.checked;
            browserDetector.getApi().storage.local.set({showAllAdvanced: showAllAdvanced});
            showCookiesForTab();
        });

        notificationElement.addEventListener('animationend', e => {
            if (notificationElement.classList.contains('fadeInUp')) {
                return;
            }

            triggerNotification();
        });

        document.getElementById('notification-dismiss').addEventListener('click', e => {
            hideNotification();
        });

        initWindow();
        showCookiesForTab();
        adjustWidthIfSmaller();

        if (chrome && chrome.runtime && chrome.runtime.getBrowserInfo) {
            chrome.runtime.getBrowserInfo(function (info) {
                const mainVersion = info.version.split('.')[0];
                if (mainVersion < 57) {
                    containerCookie.style.height = '600px';
                }
            });
        }

        // Bugfix/hotfix for Chrome 84. Let's remove this once Chrome 90 or later is released
        if (browserDetector.isChrome()) {
            console.log('chrome 84 hotfix');
            document.querySelectorAll('svg').forEach(x => {x.innerHTML = x.innerHTML});
        }
    });

    // == End document ready == //

    function showCookiesForTab() {
        if (!cookieHandler.currentTab) {
            return;
        }
        if (disableButtons) {
            return;
        }
        if (showAllAdvanced === undefined) {
            if (browserDetector.isFirefox()) {
                browserDetector.getApi().storage.local.get('showAllAdvanced').then(function (onGot) {
                    showAllAdvanced = onGot.showAllAdvanced || false;
                    document.querySelector('#advanced-toggle-all input').checked = showAllAdvanced;
                    return showCookiesForTab();
                });
            } else {
                browserDetector.getApi().storage.local.get('showAllAdvanced', function (onGot) {
                    showAllAdvanced = onGot.showAllAdvanced || false;
                    document.querySelector('#advanced-toggle-all input').checked = showAllAdvanced;
                    return showCookiesForTab();
                });
            }
            return;
        }

        const domain = getDomainFromUrl(cookieHandler.currentTab.url);
        const subtitleLine = document.querySelector('.titles h2');
        if (subtitleLine) {
            subtitleLine.textContent = domain || cookieHandler.currentTab.url;
        }

        cookieHandler.getAllCookies(function (cookies) {
            cookies = cookies.sort(sortCookiesByName);

            loadedCookies = {};

            setPageTitle('Cookie Editor');
            document.myThing = "I like potatoasts"

            document.getElementById('button-bar-add').classList.remove('active');
            document.getElementById('button-bar-import').classList.remove('active');
            document.getElementById('button-bar-default').classList.add('active');

            if (cookies.length > 0) {
                cookiesListHtml = document.createElement('ul');
                cookiesListHtml.appendChild(generateSearchBar());
                cookies.forEach(function (cookie) {
                    var id = Cookie.hashCode(cookie);
                    loadedCookies[id] = new Cookie(id, cookie, showAllAdvanced);
                    cookiesListHtml.appendChild(loadedCookies[id].html);
                });

                if (containerCookie.firstChild) {
                    disableButtons = true;
                    Animate.transitionPage(containerCookie, containerCookie.firstChild, cookiesListHtml, 'right', () => {
                        disableButtons = false;
                    });
                } else {
                    containerCookie.appendChild(cookiesListHtml);
                }
            } else {
                showNoCookies();
            }

            // Bugfix/hotfix for Chrome 84. Let's remove this once Chrome 90 or later is released
            if (browserDetector.isChrome()) {
                console.log('chrome 84 hotfix');
                document.querySelectorAll('svg').forEach(x => {x.innerHTML = x.innerHTML});
            }
        });
    }

    function showNoCookies() {
        if (disableButtons) {
            return;
        }
        cookiesListHtml = null;
        let html = document.importNode(document.getElementById('tmp-empty').content, true).querySelector('p');
        if (containerCookie.firstChild) {
            if (containerCookie.firstChild.id === 'no-cookie') {
                return;
            }
            disableButtons = true;
            Animate.transitionPage(containerCookie, containerCookie.firstChild, html, 'right', () => {
                disableButtons = false;
            });
        } else {
            containerCookie.appendChild(html);
        }
    }

    function createHtmlForCookie(name, value, id) {
        var cookie = new Cookie(id, {
            'name': name,
            'value': value
        });

        return cookie.html;
    }

    function createHtmlFormCookie() {
        let template = document.importNode(document.getElementById('tmp-create').content, true);
        return template.querySelector('form');
    }

    function createHtmlFormImport() {
        let template = document.importNode(document.getElementById('tmp-import').content, true);
        return template.querySelector('form');
    }

    function toggleExportMenu() {
        if (document.getElementById("export-menu")) {
            hideExportMenu();
        } else {
            showExportMenu();
        }
    }

    function showExportMenu() {
        let template = document.importNode(document.getElementById('tmp-export-options').content, true);
        containerCookie.appendChild(template.getElementById('export-menu'));
        
        document.getElementById("export-json").focus();
        document.getElementById("export-json").addEventListener("click", (event) => {
            exportToJson();
        });
        document.getElementById("export-netscape").addEventListener("click", (event) => {
            exportToNetscape();
        });
    }

    function hideExportMenu() {
        const exportMenu = document.getElementById('export-menu');
        if (exportMenu) {
            containerCookie.removeChild(exportMenu);
            document.activeElement.blur()
        }
    }

    function exportToJson() {
        hideExportMenu();
        let buttonIcon = document.getElementById('export-cookies').querySelector('use');
        if (buttonIcon.getAttribute("href") === "../sprites/solid.svg#check") {
            return;
        }

        buttonIcon.setAttribute("href", "../sprites/solid.svg#check");

        var exportedCookies = [];
        for (var cookieId in loadedCookies) {
            var exportedCookie = loadedCookies[cookieId].cookie;
            exportedCookie.storeId = null;
            if (exportedCookie.sameSite === 'unspecified') {
                exportedCookie.sameSite = null;
            }
            exportedCookies.push(exportedCookie);
        }

        copyText(JSON.stringify(exportedCookies, null, 4));

        sendNotification('Cookies exported to clipboard as JSON');
        setTimeout(() => {
            buttonIcon.setAttribute("href", "../sprites/solid.svg#file-export");
        }, 1500);
    }

    function exportToNetscape() {
        hideExportMenu();
        let buttonIcon = document.getElementById('export-cookies').querySelector('use');
        if (buttonIcon.getAttribute("href") === "../sprites/solid.svg#check") {
            return;
        }

        buttonIcon.setAttribute("href", "../sprites/solid.svg#check");

        var netscapeCookies = '# Netscape HTTP Cookie File';
        netscapeCookies += '\n# http://curl.haxx.se/rfc/cookie_spec.html'
        netscapeCookies += '\n# This file was generated by Cookie-Editor'
        for (var cookieId in loadedCookies) {
            let cookie = loadedCookies[cookieId].cookie;
            let secure = cookie.secure.toString().toUpperCase();
            let expiration = 0;

            if (cookie.session) {
                // Create sessions with a 1 day TTL to avoid the cookie being discarded when imported back.
                // This is a compromise due to the Netscape format. It is short enough but not too short.
                expiration = Math.trunc(new Date(Date.now() + 86400 * 1000).getTime() / 1000);
            } else if (!cookie.session && !!cookie.expirationDate) {
                expiration = Math.trunc(cookie.expirationDate);
            }
            
            netscapeCookies += `\n${cookie.domain}	TRUE	${cookie.path}	${secure}	${expiration}	${cookie.name}	${cookie.value}`;
        }

        copyText(netscapeCookies);

        sendNotification('Cookies exported to clipboard as Netscape format');
        setTimeout(() => {
            buttonIcon.setAttribute("href", "../sprites/solid.svg#file-export");
        }, 1500);
    }

    function removeCookie(name, url, callback) {
        cookieHandler.removeCookie(name, url || getCurrentTabUrl(), function (e) {
            console.log('removed successfuly', e);
            if (callback) {
                callback();
            }
            if (browserDetector.isSafari()) {
                onCookiesChanged();
            }
        });
    }

    function onCookiesChanged(changeInfo) {
        if (!changeInfo) {
            showCookiesForTab();
            return;
        }

        console.log('Cookies have changed!', changeInfo.removed, changeInfo.cause);
        var id = Cookie.hashCode(changeInfo.cookie);

        if (changeInfo.cause === 'overwrite') {
            return;
        }

        if (changeInfo.removed) {
            if (loadedCookies[id]) {
                loadedCookies[id].removeHtml(() => {
                    if (!Object.keys(loadedCookies).length) {
                        showNoCookies();
                    }
                });
                delete loadedCookies[id];
            }
            return;
        }

        if (loadedCookies[id]) {
            loadedCookies[id].updateHtml(changeInfo.cookie);
            return;
        }

        var newCookie = new Cookie(id, changeInfo.cookie);
        loadedCookies[id] = newCookie;

        if (!cookiesListHtml && document.getElementById('no-cookies')) {
            clearChildren(containerCookie);
            cookiesListHtml = document.createElement('ul');
            cookiesListHtml.appendChild(generateSearchBar());
            containerCookie.appendChild(cookiesListHtml);
        }

        if (cookiesListHtml) {
            cookiesListHtml.appendChild(newCookie.html);
        }
    }

    function onCookieHandlerReady() {
        showCookiesForTab();
    }

    function sortCookiesByName(a, b) {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
    }

    function initWindow(tab) {
        cookieHandler.on('cookiesChanged', onCookiesChanged);
        cookieHandler.on('ready', onCookieHandlerReady);
        handleSponsor();
    }

    function getCurrentTabUrl() {
        if (cookieHandler.currentTab) {
            return cookieHandler.currentTab.url;
        }
        return '';
    }

    function getDomainFromUrl(url) {
        const matches = url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
        return matches && matches[1];
    }

    function sendNotification(message) {
        notificationQueue.push(message);
        triggerNotification();
    }

    function generateSearchBar() {
        var searchBarContainer = document.importNode(document.getElementById('tmp-search-bar').content, true);
        searchBarContainer.getElementById('searchField').addEventListener('keyup', e => filterCookies(e.target, e.target.value));
        return searchBarContainer;
    }

    function triggerNotification() {
        if (!notificationQueue || !notificationQueue.length) {
            return;
        }
        if (notificationTimeout) {
            return;
        }
        if (notificationElement.classList.contains('fadeInUp')) {
            return;
        }

        showNotification();
    }

    function showNotification() {
        if (notificationTimeout) {
            return;
        }

        notificationElement.parentElement.style.display = 'block';
        notificationElement.querySelector('#notification-dismiss').style.display = 'block';
        notificationElement.querySelector('span').textContent = notificationQueue.shift();
        notificationElement.querySelector('span').setAttribute('role', 'alert');
        notificationElement.classList.add('fadeInUp');
        notificationElement.classList.remove('fadeOutDown');

        notificationTimeout = setTimeout(() => {
            hideNotification();
        }, 2500);
    }

    function hideNotification() {
        if (notificationTimeout) {
            clearTimeout(notificationTimeout);
            notificationTimeout = null;
        }

        notificationElement.querySelector('span').setAttribute('role', '');
        notificationElement.classList.remove('fadeInUp');
        notificationElement.classList.add('fadeOutDown');
        notificationElement.querySelector('#notification-dismiss').style.display = 'none';
    }

    function setPageTitle(title) {
        if (!pageTitleContainer) {
            return;
        }

        pageTitleContainer.querySelector('h1').textContent = title;
    }

    function copyText(text) {
        const fakeText = document.createElement('textarea');
        fakeText.classList.add('clipboardCopier');
        fakeText.textContent = text;
        document.body.appendChild(fakeText);
        fakeText.focus();
        fakeText.select();
        document.execCommand('Copy');
        document.body.removeChild(fakeText);
    }

    function isArray(value) {
        return value && typeof value === 'object' && value.constructor === Array;
    }

    function clearChildren(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    function adjustWidthIfSmaller() {
        // Firefox can have the window smaller if it is in the overflow menu
        if (!browserDetector.isFirefox()) {
            return;
        }

        let realWidth = document.documentElement.clientWidth;
        if (realWidth < 500) {
            console.log('Editor is smaller than 500px!');
            document.body.style.minWidth = '100%';
            document.body.style.width = realWidth + 'px';
        }
    }

    function filterCookies(target, filterText) {
        var cookies = cookiesListHtml.querySelectorAll('.cookie');
        filterText = filterText.toLowerCase();

        if (filterText) {
            target.classList.add('content');
        } else {
            target.classList.remove('content');
        }

        for (var i = 0; i < cookies.length; i++) {
            var cookieElement = cookies[i];
            const cookieName = cookieElement.children[0].getElementsByTagName('span')[0].textContent.toLocaleLowerCase();
            if (!filterText || cookieName.indexOf(filterText) > -1) {
                cookieElement.classList.remove('hide');
            } else {
                cookieElement.classList.add('hide');
            }
        }
    }

    function handleSponsor() {
        if (!sponsors) {
            return;
        }

        canShowAnySponsor((error, canShow) => {
            if (error) {
                console.error(error);
                return;
            }
            if (!canShow) {
                return;
            }
            
            showRandomSponsor();
        });
    }

    function showRandomSponsor() {
        if (!sponsors || !sponsors.length) {
            console.log("No sponsors left");
            return;
        }
        const randIndex = Math.floor(Math.random() * sponsors.length);
        let selectedSponsor = sponsors[randIndex];
        sponsors.splice(randIndex, 1);
        isSponsorValid(selectedSponsor, (error, isValid) => {
            if (error) {
                console.error(error);
                showRandomSponsor();
                return;
            }
            if (!isValid) {
                console.log(selectedSponsor.id, "sponsor is not valid to display");
                showRandomSponsor();
                return;
            }
            clearSponsor();
            let sponsorItemHtml = createHtmlSponsor(selectedSponsor);
            document.getElementById('sponsor-container').appendChild(sponsorItemHtml);
        });
    }

    function isSponsorValid(selectedSponsor, callback) {
        if (selectedSponsor.supported_browsers != 'all' &&
            !selectedSponsor.supported_browsers.includes(browserDetector.getBrowserName())) {
            callback(null, false);
            return;
        }

        storageHandler.getLocal(getSponsorDismissKey(selectedSponsor.id), (error, data) => {
            if (error) {
                callback(error, false);
                return;
            }
            // No data means it was never dismissed
            if (data === null) {
                callback(error, true);
                return;
            } 
            
            // Only show a sponsor if it has not been dismissed in less than |refresh_days| days
            if ((secondsInOneDay * selectedSponsor.refresh_days) > data.date) {
                console.log("Not showing sponsor " + selectedSponsor.id + ", it was dismissed.");
                callback(error, false);
                return;
            }
            callback(error, true);
        });
    }

    function canShowAnySponsor(callback) {
        storageHandler.getLocal(getLastDismissKey(), (error, data) => {
            if (error) {
                callback(error, false);
                return;
            }
            // No data means it was never dismissed
            if (data === null) {
                callback(error, true);
                return;
            }
            // Don't show more sponsor if one was dismissed in less than 24hrs
            if (secondsInOneDay > data.date) {
                console.log("Not showing sponsors, one was dismissed recently.");
                callback(error, false);
                return
            } 
            callback(error, true);
        })
    }

    function clearSponsor() {
        clearChildren(document.getElementById('sponsor-container'));
    }

    function createHtmlSponsor(sponsorObject) {
        let template = document.importNode(document.getElementById('tmp-sponsor-item').content, true);
        let link = template.querySelector('.sponsor-link a');
        link.textContent = sponsorObject.text;
        link.title = sponsorObject.tooltip;
        link.href = sponsorObject.url;

        template.querySelector('.dont-show').addEventListener('click', e => {
            clearSponsor();
            storageHandler.setLocal(getSponsorDismissKey(sponsorObject.id), createDismissObjV1())
            storageHandler.setLocal(getLastDismissKey(), createDismissObjV1())
        });
        template.querySelector('.later').addEventListener('click', e => {
            clearSponsor();
        });

        return template;
    }

    function getLastDismissKey() {
        return 'sponsorDismissLast';
    }

    function getSponsorDismissKey(id) {
        return 'sponsorDismiss.' + id;
    }

    function createDismissObjV1() {
        return {
            version: 1,
            date: Date.now(),
        };
    }
}());
