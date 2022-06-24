class Animate
{
    static toggleSlide(el, callback = null) {
        let elMaxHeight = 0;
        let self = this;

        el.style.display = 'flex';

        el.addEventListener('transitionend', function() {
            if (callback) {
                callback();
            }

            if (self.isHidden(el)) {
                el.style.display = 'none';
            }

            // Hack to force firefox to resize the popup window after the animation is done
            document.body.style.height = '100%';
            setTimeout(function () {
                document.body.style.height = '';
            }, 10);
        }, {
            'once': true,
        });

        if (el.getAttribute('data-max-height')) {
            // we've already used this before, so everything is setup
            if (this.isHidden(el)) {
                //el.style.maxHeight = el.getAttribute('data-max-height');
                setTimeout(function () {
                    el.style.maxHeight = el.getAttribute('data-max-height');
                }, 10);
            } else {
                elMaxHeight = this.getHeight(el) + 'px';
                el.setAttribute('data-max-height', elMaxHeight);
                el.style.maxHeight = '0';
            }
        } else {
            elMaxHeight = this.getHeight(el) + 'px';
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

    static resizeSlide(el, callback = null) {
        if (callback) {
            el.addEventListener('transitionend', function () {
                callback();
            }, {
                    'once': true,
                });
        }
        let elMaxHeight = this.getHeight(el, true) + 'px';
        el.style.transition = 'max-height 0.25s ease-in-out';
        el.style.overflowY = 'hidden';
        //el.style.maxHeight = '0';
        el.setAttribute('data-max-height', elMaxHeight);

        var nextMaxHeight = elMaxHeight;
        el.style.maxHeight = el.offsetHeight;

        // we use setTimeout to modify maxHeight later than display (to we have the transition effect)
        setTimeout(function () {
            el.style.maxHeight = nextMaxHeight;
        }, 10);
    }

    static transitionPage(container, oldPage, newPage, direction = 'left', callback = null) {
        let animationTime = '0.3s';

        container.addEventListener('transitionend', () => {
            container.style.maxHeight = '';
            container.style.transition = '';
            container.style.display = '';
            container.style.width = '';
            container.style.transform = '';
            container.style.overflowY = 'auto';
            if (oldPage) {
                oldPage.remove();
            }
            callback();
        }, {
            'passive': true,
            'once': true,
        });

        container.style.overflowY = 'hidden';
        container.style.width = '200%';
        container.style.display = 'flex';

        if (oldPage) {
            oldPage.style.flex = '0 0 50%';
        }
        newPage.style.flex = '0 0 50%';

        if (direction === 'left') {
            container.appendChild(newPage);
        } else {
            container.insertBefore(newPage, container.firstChild);
            //container.prepend(newPage);
        }

        // This handle the resize of the window, only for the popup
        if (window.isPopup) {
            let newPageHeight = this.getHeight(newPage);
            let oldPageHeight = oldPage ? this.getHeight(oldPage) : 0;
            container.style.maxHeight = oldPageHeight + 'px';

            if (newPageHeight > 400) {
                newPageHeight = 400;
            }

            setTimeout(() => {
                var transition = `max-height ${animationTime} ease-in-out`;
                if (container.style.transition) {
                    transition = ', ' + transition;
                }
                container.style.transition += transition;
                setTimeout(() => {
                    container.style.maxHeight = newPageHeight + 'px';

                }, 1);
            }, 1);
        }

        if (direction === 'left') {
            var transition = `transform ${animationTime} ease-in-out`;
            if (container.style.transition) {
                transition = ', ' + transition;
            }
            container.style.transition += transition;
            setTimeout(() => {
                container.style.transform = "translateX(-50%)";
            }, 10);
        } else {
            container.style.transform = "translateX(-50%)";
            setTimeout(() => {
                var transition = `transform ${animationTime} ease-in-out`;
                if (container.style.transition) {
                    transition = ', ' + transition;
                }
                container.style.transition += transition;
                setTimeout(() => {
                    container.style.transform = "translateX(0)";
                }, 1);
            }, 1);
        }
    }

    /**
     * getHeight - for elements with display:none
     * https://stackoverflow.com/a/29047447
     **/
    static getHeight(el, ignoreMaxHeight) {
        const elStyle = window.getComputedStyle(el);
        const elMaxHeight = elStyle.maxHeight;
        const elMaxHeightInt = elMaxHeight.replace('px', '').replace('%', '');

        // if its not hidden we just return normal height
        if (!ignoreMaxHeight && elMaxHeightInt !== '0' && elMaxHeight !== 'none') {
            return el.offsetHeight;
        }

        var previousDisplay = el.style.display;

        // the element is hidden so:
        // making the el block so we can meassure its height but still be hidden
        el.style.position = 'absolute';
        el.style.visibility = 'hidden';
        el.style.display = 'block';
        el.style.maxHeight = 'none';

        let wantedHeight = el.offsetHeight;

        // reverting to the original values
        el.style.display = previousDisplay;
        el.style.position = '';
        el.style.visibility = '';
        el.style.maxHeight = elMaxHeight;

        return wantedHeight;
    }

    static isHidden(el) {
        return el.style.maxHeight.replace('px', '').replace('%', '') === '0'
    }
}
