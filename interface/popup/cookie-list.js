(function () {
    'use strict';

    let containerCookie;
    var currentTab;
    var loadedCookies;
    var currentTabId;

    var cookieHandler = new CookieHandler();

    document.addEventListener('DOMContentLoaded', function () {
        containerCookie = document.getElementById('cookie-container');

        function expandCookie(e) {
            var parent = e.target.closest('li');
            toggleSlide(parent.querySelector('.expando'));
            parent.querySelector('.header').classList.toggle('active');
        }

        function deleteButton(e) {
            e.preventDefault();
            console.log('removing cookie...');
            var listElement = e.target.closest('li');
            removeCookie(listElement.dataset.name);
            return false;
        }

        function saveCookie(form) {
            console.log('saving cookie...');
            var name = form.querySelector('input[name="name"]').value;
            var value = form.querySelector('textarea[name="value"]').value;
            var cookie = loadedCookies[form.dataset.id];
            var oldName;

            if (cookie) {
                oldName = cookie.name;
            } else {
                cookie = {};
                oldName = name;
            }

            cookie.name = name;
            cookie.value = value;
            cookieHandler.removeCookie(oldName, getCurrentTabUrl(), function () {
                cookieHandler.saveCookie(cookie, getCurrentTabUrl());
            });

            if (form.classList.contains('create')) {
                document.getElementById('return-list').click();
            }
            return false;
        }

        if (containerCookie) {
            containerCookie.addEventListener('click', e => {
                var target = e.target;
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
                    return saveCookie(e.target.closest('li').querySelector('form'));
                }
            })
        }

        document.getElementById('create-cookie').addEventListener('click', e => {
            containerCookie.innerHTML = '';
            let pageTitle = document.getElementById('pageTitle');
            if (pageTitle) {
                pageTitle.innerHTML = 'Cookie Editor - Create a Cookie';
            }

            containerCookie.innerHTML = createHtmlFormCookie('', '', '');

            document.getElementById('button-bar-default').classList.remove('active');
            document.getElementById('button-bar-add').classList.add('active');
            return false;
        });

        document.getElementById('delete-all-cookies').addEventListener('click', e => {
            if (!loadedCookies.length) {
                return;
            }
            
            for (var i = 0; i < loadedCookies.length; i++) {
                removeCookie(loadedCookies[i].name);
            }
            loadedCookies = null;
        });

        document.getElementById('refresh-ui').addEventListener('click', e => {
            location.reload();
        });

        document.getElementById('return-list').addEventListener('click', e => {
            containerCookie.innerHTML = '';
            showCookiesForTab();
        });

        containerCookie.addEventListener('submit', e => {
            e.preventDefault();
            saveCookie(e.target);
            return false;
        });

        document.getElementById('save-create-cookie').addEventListener('click', e => {
            saveCookie(document.querySelector('form'));
        });

        initWindow();
        showCookiesForTab();

        if (chrome.runtime.getBrowserInfo) {
            chrome.runtime.getBrowserInfo(function (info) {
                var mainVersion = info.version.split('.')[0];
                if (mainVersion < 57) {
                    containerCookie.style.height = '600px';
                }
            });
        }
    });

    function showCookiesForTab() {
        if (!cookieHandler.currentTab) {
            return;
        }
        var domain = getDomainFromUrl(cookieHandler.currentTab.url);
        var subtitleLine = document.querySelector('.titles h2');
        if (subtitleLine) {
            subtitleLine.innerHTML = domain || cookieHandler.currentTab.url;
        }
        
        cookieHandler.getAllCookies(function (cookies) {
            cookies = cookies.sort(sortCookiesByName);
            loadedCookies = cookies;
            let pageTitle = document.getElementById('pageTitle');
            if (pageTitle) {
                pageTitle.innerHTML = 'Cookie Editor';
            }

            document.getElementById('button-bar-add').classList.remove('active');
            document.getElementById('button-bar-default').classList.add('active');

            if (cookies.length > 0) {
                var cookiesHtml = '';
                cookies.forEach(function (cookie, id) {
                    cookiesHtml += createHtmlForCookie(cookie.name, cookie.value, id);
                });

                containerCookie.innerHTML = `
                    <ul>
                        ${cookiesHtml}
                    </ul>
                `;
            } else {
                showNoCookies();
            }
        });
    }

    function showNoCookies() {
        var noCookiesText = `
        <p class="container">
            This page does not have any cookies
        </p>`;
        containerCookie.innerHTML = noCookiesText;
    }

    function createHtmlForCookie(name, value, id) {
        let formHtml = createHtmlFormCookie(name, value, id);
        return `
            <li data-name="${name}">
                <div class="header container">
                    <svg class="icon arrow"><use xlink:href="../sprites/solid.svg#angle-down"></use></svg>
                    ${name}
                    <div class="btns">
                        <button class="delete browser-style">
                            <svg class="icon"><use xlink:href="../sprites/solid.svg#trash"></use></svg>
                        </button>
                    </div>
                </div>
                <div class="expando">
                    <div class="wrapper">
                        <div class="action-btns">
                            <button class="delete"><svg class="icon"><use xlink:href="../sprites/solid.svg#trash"></use></svg></button>
                            <button class="save"><svg class="icon"><use xlink:href="../sprites/solid.svg#check"></use></svg></button>
                        </div>
                        ${formHtml}
                    </div>
                </div>
            </li>
        `;
    }

    function createHtmlFormCookie(name, value, id) {
        var formId = guid();
        return `
            <form data-id="${id}" class="form container ${!id ? `create` : ''}" id="${formId}">
                <div class="browser-style">
                    <label class="browser-style" for="name-${formId}">Name</label>
                    <input class="browser-style" name="name" type="text" value="${name}" id="name-${formId}" />
                </div>
                <div class="browser-style">
                    <label class="browser-style" for="value-${formId}">Value</label>
                    <textarea class="browser-style" name="value" id="name-${formId}">${value}</textarea>
                </div>
            </form>
        `;
    }

    function removeCookie(name, url, callback) {
        var removing = cookieHandler.removeCookie(name, url || getCurrentTabUrl(), function (e) {
            console.log('success', e);
            if (callback) {
                callback();
            }
        });
    }

    function onCookiesChanged(changeInfo) {
        showCookiesForTab();
        console.log('Cookies have changed!');
    }

    function onCookieHandlerReady() {
        showCookiesForTab();
    }

    function onTabsChanged(tabId, changeInfo, tab) {
        if (tabId == currentTabId && (changeInfo.url || changeInfo.status === 'complete')) {
            showCookiesForTab();
            console.log('Tab has changed!');
        }
    }

    function onTabActivated(activeInfo) {
        updateCurrentTab();
    }

    function sortCookiesByName(a, b) {
        var aName = a.name.toLowerCase();
        var bName = b.name.toLowerCase();
        return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
    }

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
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

    function sendMessage(type, params, callback, errorCallback) {
        if (window.browser) {
            var sending = browser.runtime.sendMessage({ type: type, params: params });
            sending.then(callback, errorCallback);  
        } else {
            chrome.runtime.sendMessage({ type: type, params: params }, callback);
        }
    }

    function getDomainFromUrl(url) {
        var matches = url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
        return matches && matches[1];
    }
}());

/** 
 * getHeight - for elements with display:none 
 * https://stackoverflow.com/a/29047447
 **/
function getHeight(el) {
    var elStyle = window.getComputedStyle(el);
    var elMaxHeight = elStyle.maxHeight;
    var elMaxHeightInt = elMaxHeight.replace('px', '').replace('%', '');
    var wantedHeight = 0;

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

    wantedHeight = el.offsetHeight;

    // reverting to the original values
    el.style.display = '';
    el.style.position = '';
    el.style.visibility = '';
    el.style.maxHeight = elMaxHeight;

    return wantedHeight;
}

function toggleSlide(el) {
    var elMaxHeight = 0;
    
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
        el.style['transition'] = 'max-height 0.2s ease-in-out';
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