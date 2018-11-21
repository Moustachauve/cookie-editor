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
    const browserDetector = new BrowserDetector();

    const cookieHandler = new CookieHandler();

    document.addEventListener('DOMContentLoaded', function () {
        containerCookie = document.getElementById('cookie-container');
        notificationElement = document.getElementById('notification');
        pageTitleContainer = document.getElementById('pageTitle');

        function expandCookie(e) {
            const parent = e.target.closest('li');
            Animate.toggleSlide(parent.querySelector('.expando'));
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
                        if (browserDetector.isEdge()) {
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
                    if (browserDetector.isEdge()) {
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
        }

        document.getElementById('create-cookie').addEventListener('click', () => {
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

            document.getElementById('button-bar-add').classList.remove('active');
            document.getElementById('button-bar-import').classList.remove('active');
            document.getElementById('button-bar-default').classList.add('active');

            if (cookies.length > 0) {
                cookiesListHtml = document.createElement('ul');
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