(function () {
    'use strict';

    var currentTab;
    var loadedCookies;
    var currentTabId;

    var cookieHandler = new CookieHandler();

    $(function () {
        $('#cookie-container').on('click', 'li .header', function () {
            var $this = $(this);
            $this.parent().find('.expando').stop().slideToggle('fast');
            $this.stop().toggleClass('active');
        }); 

        $('#cookie-container').on('click', 'li .header .delete, li .expando .delete', function (e) {
            e.preventDefault();
            console.log('removing cookie...');
            var listElement = $(this).parent().parent().parent();
            removeCookie(listElement.data('name'));
            //listElement.slideUp('fast');
            return false;
        });

        $('#cookie-container').on('click', 'li .expando .save', function (e) {
            e.preventDefault();
            console.log('saving cookie...');
            var listElement = $(this).parent().parent().find('form').submit();
            return false;
        });

        $('#create-cookie').click(function (e) {
            $('#cookie-container').html('');
            $('#pageTitle h1').text('Cookie Editor - Create a Cookie');

            var form = createHtmlFormCookie('', '', '');
            form.addClass('create');
            $('#cookie-container').append(form);

            $('.button-bar').removeClass('active');
            $('.button-bar#button-bar-add').addClass('active');
            return false;
        });

        $('#delete-all-cookies').click(function (e) {
            if (!loadedCookies.length) {
                return;
            }
            
            for (var i = 0; i < loadedCookies.length; i++) {
                removeCookie(loadedCookies[i].name);
            }
            loadedCookies = null;
            //$('#cookie-container li').slideUp('fast');
        });

        $('#refresh-ui').click(function() {
            location.reload();
        });

        $('#return-list').click(function() {
            $('#cookie-container').html('');
            showCookiesForTab();
        });

        $('#cookie-container').on('submit', '.form', function (e) {
            e.preventDefault();
            var form = $(this);
            var name = form.find('input[name="name"]').val();
            var value = form.find('textarea[name="value"]').val();
            var cookie = loadedCookies[form.data('id')];
            var oldName;

            if (cookie) {
                oldName = cookie.name;
            } else {
                cookie = {};
                oldName = name;
            }

            cookie.name = name;
            cookie.value = value;
            cookieHandler.removeCookie(oldName, getCurrentTabUrl(), function() {
                cookieHandler.saveCookie(cookie, getCurrentTabUrl());
            });

            if ($(this).hasClass('create')) {
                $('#return-list').click();
            } 
            return false;
        });

        $('#save-create-cookie').click(function() {
            $('.form.create').submit();
        });
    });

    function showCookiesForTab() {
        cookieHandler.getAllCookies(function (cookies) {
            cookies = cookies.sort(sortCookiesByName);
            loadedCookies = cookies;
            $('#pageTitle h1').text('Cookie Editor');
            $('.button-bar').removeClass('active');
            $('.button-bar#button-bar-default').addClass('active');

            if (cookies.length > 0) {
                var list = $('<ul>');

                cookies.forEach(function (cookie, id) {
                    list.append(createHtmlForCookie(cookie.name, cookie.value, id));
                });

                $('#cookie-container').html(list);
            } else {
                showNoCookies();
            }
        });
    }

    function showNoCookies() {
        var noCookiesText = $("<p>");
        noCookiesText.addClass('container');
        noCookiesText.text('This page does not have any cookies');
        $('#cookie-container').html(noCookiesText);
    }

    function createHtmlForCookie(name, value, id) {
        var element = $("<li>");
        element.data('name', name);

        var header = $('<div>').addClass('header container').text(name);
        header.prepend('<i class="fa fa-angle-down"></i>');

        var headerBtns = $('<div>').addClass('btns');
        headerBtns.append($('<button>').addClass('delete browser-style').html('<i class="fa fa-trash"></i>'));
        header.append(headerBtns);
        element.append(header);

        var expandoZone = $('<div>').addClass('expando').css('display', 'none');

        var actionBtns = $('<div>').addClass('action-btns');
        actionBtns.append($('<button>').addClass('delete').html('<i class="fa fa-trash"></i>'));
        actionBtns.append($('<button>').addClass('save').html('<i class="fa fa-check"></i>'));
        expandoZone.append(actionBtns);

        expandoZone.append(createHtmlFormCookie(name, value, id));

        element.append(expandoZone);

        return element;
    }

    function createHtmlFormCookie(name, value, id) {
        var formId = guid();
        var formContainer = $('<form>').addClass('form container').attr('id', formId).data('id', id);

        var inputNameContainer = $('<div>').addClass('browser-style');
        inputNameContainer.append($('<label>').addClass('browser-style').text('Name').attr('for', 'name-' + formId));
        inputNameContainer.append($('<input>').addClass('browser-style').attr('name', 'name').attr('type', 'text').attr('value', name).attr('id', 'name-' + formId));
        formContainer.append(inputNameContainer);

        var inputValueContainer = $('<div>').addClass('browser-style');
        inputValueContainer.append($('<label>').addClass('browser-style').text('Value').attr('for', 'value-' + formId));
        inputValueContainer.append($('<textarea>').addClass('browser-style').attr('name', 'value').text(value).attr('id', 'value-' + formId));
        formContainer.append(inputValueContainer);

        return formContainer;
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
        //chrome.cookies.onChanged.addListener(onCookiesChanged);
        //chrome.tabs.onUpdated.addListener(onTabsChanged);
        //chrome.tabs.onActivated.addListener(onTabActivated);
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

    if (chrome.runtime.getBrowserInfo) {
        chrome.runtime.getBrowserInfo(function (info) {
            var mainVersion = info.version.split('.')[0];
            if (mainVersion < 57) {
                $('#cookie-container').css('height', '600px');
            }
        });
    }

    initWindow(); 
}());
