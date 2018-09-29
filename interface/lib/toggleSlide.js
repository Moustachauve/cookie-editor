function toggleSlide(el, callback = null) {
    let elMaxHeight = 0;

    if (callback) {
        el.addEventListener('transitionend', function() {
            callback();
        }, {
            'passive': true,
            'once': true,
        });
    }

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
        el.style.transition = 'max-height 0.25s ease-in-out';
        el.style.overflowY = 'hidden';
        //el.style.maxHeight = '0';
        el.setAttribute('data-max-height', elMaxHeight);

        var nextMaxHeight;
        if (el.offsetHeight > 0) {
            nextMaxHeight = 0;
            el.style.maxHeight = elMaxHeight;
        } else {
            nextMaxHeight = elMaxHeight;
            el.style.maxHeight = 0;
        }
        // we use setTimeout to modify maxHeight later than display (to we have the transition effect)
        setTimeout(function () {
            el.style.maxHeight = nextMaxHeight;
        }, 10);
    }
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