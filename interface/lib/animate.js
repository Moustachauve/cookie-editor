/**
 * Handles the different animations used in the interface.
 */
export class Animate {
  /**
   * Toggles between the two different states of a expanding element through a
   * sliding animation.
   * @param {Element} el Element to animate.
   * @param {function} callback Called after the animation is done.
   */
  static toggleSlide(el, callback = null) {
    let elMaxHeight = 0;
    const self = this;

    el.style.display = 'flex';

    el.addEventListener(
      'transitionend',
      function () {
        if (callback) {
          callback();
        }

        if (self.isHidden(el)) {
          el.style.display = 'none';
        }

        // Hack to force firefox to resize the popup window after the animation
        // is done
        document.body.style.height = '100%';
        setTimeout(function () {
          document.body.style.height = '';
        }, 10);
      },
      {
        once: true,
      },
    );

    if (el.getAttribute('data-max-height')) {
      // we've already used this before, so everything is setup
      if (this.isHidden(el)) {
        // el.style.maxHeight = el.getAttribute('data-max-height');
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
      // el.style.maxHeight = '0';
      el.setAttribute('data-max-height', elMaxHeight);

      let nextMaxHeight;
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
   * Animates the change of size of an element through a sliding animation.
   * @param {Element} el Slide element to recalculate the size.
   * @param {function} callback Called after the animation is done.
   */
  static resizeSlide(el, callback = null) {
    if (callback) {
      el.addEventListener(
        'transitionend',
        function () {
          callback();
        },
        {
          once: true,
        },
      );
    }
    const elMaxHeight = this.getHeight(el, true) + 'px';
    el.style.transition = 'max-height 0.25s ease-in-out';
    el.style.overflowY = 'hidden';
    // el.style.maxHeight = '0';
    el.setAttribute('data-max-height', elMaxHeight);

    const nextMaxHeight = elMaxHeight;
    el.style.maxHeight = el.offsetHeight;

    // we use setTimeout to modify maxHeight later than display (to we have the transition effect)
    setTimeout(function () {
      el.style.maxHeight = nextMaxHeight;
    }, 10);
  }

  /**
   * Animates a change of page content.
   * @param {Element} container Parent container of the page
   * @param {Element} oldPage Page that needs to get removed from the container.
   * @param {Element} newPage Page that will be inserted in the container.
   * @param {string} direction Which direction to slide the old page towards.
   * @param {function} callback Called after the animation is done.
   * @param {boolean} animationsEnabled If the animations are enabled or not.
   */
  static transitionPage(
    container,
    oldPage,
    newPage,
    direction = 'left',
    callback = null,
    animationsEnabled = true,
  ) {
    if (!animationsEnabled) {
      if (oldPage) {
        oldPage.remove();
      }
      container.appendChild(newPage);
      callback();
      return;
    }
    const animationTime = '0.3s';

    container.addEventListener(
      'transitionend',
      () => {
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
      },
      {
        passive: true,
        once: true,
      },
    );

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
      // container.prepend(newPage);
    }

    // This handle the resize of the window, only for the popup
    if (window.isPopup) {
      let newPageHeight = this.getHeight(newPage);
      const oldPageHeight = oldPage ? this.getHeight(oldPage) : 0;
      container.style.maxHeight = oldPageHeight + 'px';

      if (newPageHeight > 400) {
        newPageHeight = 400;
      }

      setTimeout(() => {
        let transition = `max-height ${animationTime} ease-in-out`;
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
      let transition = `transform ${animationTime} ease-in-out`;
      if (container.style.transition) {
        transition = ', ' + transition;
      }
      container.style.transition += transition;
      setTimeout(() => {
        container.style.transform = 'translateX(-50%)';
      }, 10);
    } else {
      container.style.transform = 'translateX(-50%)';
      setTimeout(() => {
        let transition = `transform ${animationTime} ease-in-out`;
        if (container.style.transition) {
          transition = ', ' + transition;
        }
        container.style.transition += transition;
        setTimeout(() => {
          container.style.transform = 'translateX(0)';
        }, 1);
      }, 1);
    }
  }

  /**
   * Calculates the height for elements with display:none.
   * https://stackoverflow.com/a/29047447
   * @param {Element} el Element to calculate the height.
   * @param {boolean} ignoreMaxHeight Whether the css property `max-height`
   *     should be ignored or not.
   * @return {number} The calculated height of the element, in pixel.
   */
  static getHeight(el, ignoreMaxHeight) {
    const elStyle = window.getComputedStyle(el);
    const elMaxHeight = elStyle.maxHeight;
    const elMaxHeightInt = elMaxHeight.replace('px', '').replace('%', '');

    // if its not hidden we just return normal height
    if (!ignoreMaxHeight && elMaxHeightInt !== '0' && elMaxHeight !== 'none') {
      return el.offsetHeight;
    }

    const previousDisplay = el.style.display;

    // the element is hidden so:
    // making the el block so we can meassure its height but still be hidden
    el.style.position = 'absolute';
    el.style.visibility = 'hidden';
    el.style.display = 'block';
    el.style.maxHeight = 'none';

    const wantedHeight = el.offsetHeight;

    // reverting to the original values
    el.style.display = previousDisplay;
    el.style.position = '';
    el.style.visibility = '';
    el.style.maxHeight = elMaxHeight;

    return wantedHeight;
  }

  /**
   * Determines whether or not an element is hidden.
   * @param {Element} el The element to check.
   * @return {boolean} True if the element is hidden, otherwise false.
   */
  static isHidden(el) {
    return el.style.maxHeight.replace('px', '').replace('%', '') === '0';
  }
}
