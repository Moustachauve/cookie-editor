(function () {
    'use strict';

    let containerCookie;
    let cookiesListHtml;
    let pageTitleContainer;
    let notificationElement;
    let loadedCookies = {};

    let notificationQueue = [];
    let notificationTimeout;
    const browserDetector = new BrowserDetector();

    const cookieHandler = new CookieHandler();

    document.addEventListener('DOMContentLoaded', function () {
        containerCookie = document.getElementById('cookie-container');
        notificationElement = document.getElementById('notification');
        pageTitleContainer = document.getElementById('pageTitle');

        function expandCookie(e) {
            const parent = e.target.closest('li');
            toggleSlide(parent.querySelector('.expando'));
            parent.querySelector('.header').classList.toggle('active');
        }

        function deleteButton(e) {
            e.preventDefault();
            console.log('removing cookie...');
            const listElement = e.target.closest('li');
            removeCookie(listElement.dataset.name);
            return false;
        }

        function saveCookieForm(form) {
            const id = form.dataset.id;
            const name = form.querySelector('input[name="name"]').value;
            const value = form.querySelector('textarea[name="value"]').value;
            saveCookie(id, name, value);

            if (form.classList.contains('create')) {
                returnToList();
            }

            return false;
        }

        function saveCookie(id, name, value) {
            console.log('saving cookie...');

            let cookieContainer = loadedCookies[id];
            let cookie = cookieContainer ? cookieContainer.cookie : null;
            let oldName;

            if (cookie) {
                oldName = cookie.name;
            } else {
                cookie = {};
                oldName = name;
            }

            cookie.name = name;
            cookie.value = value;
            if (oldName !== name) {
                cookieHandler.removeCookie(oldName, getCurrentTabUrl(), function () {
                    cookieHandler.saveCookie(cookie, getCurrentTabUrl(), function(error, cookie) {
                        if (error) {
                            sendNotification(error);
                            return;
                        }
                        if (browserDetector.isEdge()) {
                            onCookiesChanged();
                        }
                        cookieContainer.showSuccessAnimation();
                    });
                });
            } else {
                // Should probably put in a function to prevent duplication
                cookieHandler.saveCookie(cookie, getCurrentTabUrl(), function(error, cookie) {
                    if (error) {
                        sendNotification(error);
                        return;
                    }
                    if (browserDetector.isEdge()) {
                        onCookiesChanged();
                    }

                    cookieContainer.showSuccessAnimation();
                });
            }
        }

        function returnToList() {
            clearChildren(containerCookie);
            showCookiesForTab();
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
        }

        document.getElementById('create-cookie').addEventListener('click', () => {
            setPageTitle('Cookie Editor - Create a Cookie');
            clearChildren(containerCookie);
            containerCookie.insertAdjacentHTML('afterbegin', createHtmlFormCookie());

            document.getElementById('button-bar-default').classList.remove('active');
            document.getElementById('button-bar-add').classList.add('active');
            return false;
        });

        document.getElementById('delete-all-cookies').addEventListener('click', () => {
            let buttonIcon = document.getElementById('delete-all-cookies').querySelector('use');
            if (buttonIcon.getAttribute("xlink:href") === "../sprites/solid.svg#check") {
                return;
            }
            if (loadedCookies && Object.keys(loadedCookies).length) {
                for (var cookieId in loadedCookies) {
                    removeCookie(loadedCookies[cookieId].cookie.name);
                }
                loadedCookies = {};
            }
            sendNotification('All cookies were deleted');
            buttonIcon.setAttribute("xlink:href", "../sprites/solid.svg#check");
            setTimeout(() => {
                buttonIcon.setAttribute("xlink:href", "../sprites/solid.svg#trash");
            }, 1500);
        });

        document.getElementById('export-cookies').addEventListener('click', () => {
            let buttonIcon = document.getElementById('export-cookies').querySelector('use');
            if (buttonIcon.getAttribute("xlink:href") === "../sprites/solid.svg#check") {
                return;
            }

            buttonIcon.setAttribute("xlink:href", "../sprites/solid.svg#check"); 

            var exportedCookies = [];
            for (var cookieId in loadedCookies) {
                var exportedCookie = loadedCookies[cookieId].cookie;
                exportedCookie.storeId = null;
                exportedCookies.push(exportedCookie);
            }

            copyText(JSON.stringify(exportedCookies, null, 4));

            sendNotification('Cookies exported to clipboard');
            setTimeout(() => {
                buttonIcon.setAttribute("xlink:href", "../sprites/solid.svg#file-export");
            }, 1500);
        });

        document.getElementById('import-cookies').addEventListener('click', () => {
            setPageTitle('Cookie Editor - Import Cookies');
            clearChildren(containerCookie);
            containerCookie.insertAdjacentHTML('afterbegin', createHtmlFormImport());

            document.getElementById('button-bar-default').classList.remove('active');
            document.getElementById('button-bar-import').classList.add('active');
            return false;
        });

        document.getElementById('return-list-add').addEventListener('click', () => {
            returnToList();
        });
        document.getElementById('return-list-import').addEventListener('click', () => {
            returnToList();
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
            if (buttonIcon.getAttribute("xlink:href") !== "../sprites/solid.svg#file-import") {
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
                console.log("Couldn't parse Json", error);
                sendNotification("Could not parse the Json value");
                buttonIcon.setAttribute("xlink:href", "../sprites/solid.svg#times");
                setTimeout(() => {
                    buttonIcon.setAttribute("xlink:href", "../sprites/solid.svg#file-export");
                }, 1500);
                return;
            }

            if (!isArray(cookies)) {
                console.log("Invalid Json");
                sendNotification("The Json is not valid");
                buttonIcon.setAttribute("xlink:href", "../sprites/solid.svg#times");
                setTimeout(() => {
                    buttonIcon.setAttribute("xlink:href", "../sprites/solid.svg#file-export");
                }, 1500);
                return;
            }

            cookies.forEach(cookie => {
                // Make sure we are using the right store ID. This is in case we are importing from a basic store ID and the
                // current user is using custom containers
                cookie.storeId = cookieHandler.currentTab.cookieStoreId;

                cookieHandler.saveCookie(cookie, getCurrentTabUrl(), function(error, cookie) {
                    if (error) {
                        sendNotification(error);
                    }
                });
            });

            sendNotification('Cookies were created');
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
    });

    // == End document ready == //

    function showCookiesForTab() {
        if (!cookieHandler.currentTab) {
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

            document.getElementById('button-bar-add').classList.remove('active');
            document.getElementById('button-bar-import').classList.remove('active');
            document.getElementById('button-bar-default').classList.add('active');

            if (cookies.length > 0) {
                cookiesListHtml = document.createElement('ul');
                cookies.forEach(function (cookie) {
                    var id = Cookie.hashCode(cookie);
                    loadedCookies[id] = new Cookie(id, cookie);
                    cookiesListHtml.appendChild(loadedCookies[id].html);
                });

                clearChildren(containerCookie);
                containerCookie.appendChild(cookiesListHtml);
            } else {
                showNoCookies();
            }
        });
    }

    function showNoCookies() {
        clearChildren(containerCookie);
        cookiesListHtml = null;
        containerCookie.insertAdjacentHTML('afterbegin', `
            <p class="container" id="no-cookies">
                This page does not have any cookies
            </p>
        `);
    }

    function createHtmlForCookie(name, value, id) {
        var cookie = new Cookie(id, {
            'name': name,
            'value': value
        });

        return cookie.html;
    }

    function createHtmlFormCookie() {
        return `
            <form data-id="" class="form container create">
                <div>
                    <label for="name-create">Name</label>
                    <input name="name" type="text" value="" id="name-create" />
                </div>
                <div>
                    <label for="value-create">Value</label>
                    <textarea name="value" id="value-create"></textarea>
                </div>
            </form>
        `;
    }

    function createHtmlFormImport() {
        return `
            <form class="form container import">
                <div>
                    <label for="content-import">Json</label>
                    <textarea class="json" name="content" id="content-import" placeholder="Paste your Json here"></textarea>
                </div>
            </form>
        `;
    }

    function removeCookie(name, url, callback) {
        cookieHandler.removeCookie(name, url || getCurrentTabUrl(), function (e) {
            console.log('removed successfuly', e);
            if (callback) {
                callback();
            }
        });

        if (browserDetector.isEdge()) {
            onCookiesChanged();
        }
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
                delete loadedCookies[id];
            }
            var element = document.getElementById(id);
            if (element) {
                element.remove();

                if (!Object.keys(loadedCookies).length) {
                    showNoCookies();
                }
            }
            return;
        }

        if (loadedCookies[id]) {
            loadedCookies[id].updateHtml(changeInfo.cookie);
            return;
        }

        var newCookie = new Cookie(id, changeInfo.cookie);
        loadedCookies[id] = newCookie;
        if (!cookiesListHtml) {
            clearChildren(containerCookie);
            cookiesListHtml = document.createElement('ul');
            containerCookie.appendChild(cookiesListHtml);
        }

        cookiesListHtml.appendChild(newCookie.html);
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

        notificationElement.querySelector('span').textContent = notificationQueue.shift();
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
        notificationElement.classList.remove('fadeInUp');
        notificationElement.classList.add('fadeOutDown');
    }

    function setPageTitle(title) {
        if (!pageTitleContainer) {
            return;
        }
        
        pageTitleContainer.querySelector('h1').textContent = title;
    }

    /**
     * getHeight - for elements with display:none
     * https://stackoverflow.com/a/29047447
     **/
    function getHeight(el) {
        const elStyle = window.getComputedStyle(el);
        const elMaxHeight = elStyle.maxHeight;
        const elMaxHeightInt = elMaxHeight.replace('px', '').replace('%', '');

        // if its not hidden we just return normal height
        if (elMaxHeightInt !== '0') {
            return el.offsetHeight;
        }

        // the element is hidden so:
        // making the el block so we can meassure its height but still be hidden
        el.style.position = 'absolute';
        el.style.visibility = 'hidden';
        el.style.display = 'block';
        el.style.maxHeight = 'none';

        let wantedHeight = el.offsetHeight;

        // reverting to the original values
        el.style.display = '';
        el.style.position = '';
        el.style.visibility = '';
        el.style.maxHeight = elMaxHeight;

        return wantedHeight;
    }

    function toggleSlide(el) {
        let elMaxHeight = 0;

        if (el.getAttribute('data-max-height')) {
            // we've already used this before, so everything is setup
            if (el.style.maxHeight.replace('px', '').replace('%', '') === '0') {
                el.style.maxHeight = el.getAttribute('data-max-height');
            } else {
                elMaxHeight = getHeight(el) + 'px';
                el.setAttribute('data-max-height', elMaxHeight);
                el.style.maxHeight = '0';
            }
        } else {
            elMaxHeight = getHeight(el) + 'px';
            el.style.transition = 'max-height 0.2s ease-in-out';
            el.style.overflowY = 'hidden';
            el.style.maxHeight = '0';
            el.setAttribute('data-max-height', elMaxHeight);
            el.style.display = 'flex';

            // we use setTimeout to modify maxHeight later than display (to we have the transition effect)
            setTimeout(function () {
                el.style.maxHeight = elMaxHeight;
            }, 10);
        }
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
}());

// This should be handled better, like with a gulp script, in the future.
// Make sure this is NOT commented before releasing a new version
//console.log = function() {};