const activeSlideAnimations = new WeakMap();
const lastSlideHeights = new WeakMap();
const activePageAnimations = new WeakMap();

/**
 * Handles the different animations used in the interface.
 */
export class Animate {
  /**
   * Toggles between the expanded and collapsed states of an element through a
   * sliding animation.
   * @param {Element} el Element to animate.
   * @param {?function} [callback=null] Called after the animation is done.
   */
  static toggleSlide(el, callback = null) {
    const active = activeSlideAnimations.get(el);
    const expanding = active ? !active.expanding : this.isHidden(el);
    const startHeight = this.isHidden(el) ? 0 : el.offsetHeight;

    if (active) {
      active.animation.onfinish = null;
      active.animation.oncancel = null;
      active.animation.cancel();
      activeSlideAnimations.delete(el);
    }

    if (expanding) {
      if (this.isHidden(el)) {
        el.style.display = 'flex';
        if (el.style.maxHeight) {
          el.style.maxHeight = '';
        }
      }

      const endHeight = el.offsetHeight;
      lastSlideHeights.set(el, endHeight);

      if (!this.shouldAnimate(el) || startHeight === endHeight) {
        if (callback) {
          callback();
        }
        return;
      }

      const animation = el.animate(
        [
          { height: `${startHeight}px`, overflowY: 'hidden' },
          { height: `${endHeight}px`, overflowY: 'hidden' },
        ],
        {
          duration: 250,
          easing: 'ease-in-out',
        }
      );

      activeSlideAnimations.set(el, { animation, expanding: true });
      animation.onfinish = () => {
        activeSlideAnimations.delete(el);
        lastSlideHeights.set(el, el.offsetHeight);
        if (callback) {
          callback();
        }
      };
      animation.oncancel = () => {
        activeSlideAnimations.delete(el);
      };
      return;
    }

    lastSlideHeights.set(el, 0);
    const finishCollapse = () => {
      el.style.display = 'none';
      if (callback) {
        callback();
      }
    };

    if (!this.shouldAnimate(el) || startHeight === 0) {
      finishCollapse();
      return;
    }

    const animation = el.animate(
      [
        { height: `${startHeight}px`, overflowY: 'hidden' },
        { height: '0px', overflowY: 'hidden' },
      ],
      {
        duration: 250,
        easing: 'ease-in-out',
      }
    );

    activeSlideAnimations.set(el, { animation, expanding: false });
    animation.onfinish = () => {
      activeSlideAnimations.delete(el);
      finishCollapse();
    };
    animation.oncancel = () => {
      activeSlideAnimations.delete(el);
    };
  }

  /**
   * Animates the change of size of an expanded slide element.
   * @param {Element} el Slide element to recalculate the size.
   * @param {?function} [callback=null] Called after the animation is done.
   * @param {?number} [startHeight=null] Optional height in pixels measured
   *     before the DOM content change.
   */
  static resizeSlide(el, callback = null, startHeight = null) {
    const active = activeSlideAnimations.get(el);
    const fromHeight =
      startHeight !== null
        ? startHeight
        : active
          ? el.offsetHeight
          : (lastSlideHeights.get(el) ?? el.offsetHeight);

    if (active) {
      active.animation.onfinish = null;
      active.animation.oncancel = null;
      active.animation.cancel();
      activeSlideAnimations.delete(el);
    }

    const toHeight = el.offsetHeight;
    lastSlideHeights.set(el, toHeight);

    if (!this.shouldAnimate(el) || fromHeight === toHeight) {
      if (callback) {
        callback();
      }
      return;
    }

    const animation = el.animate(
      [
        { height: `${fromHeight}px`, overflowY: 'hidden' },
        { height: `${toHeight}px`, overflowY: 'hidden' },
      ],
      {
        duration: 250,
        easing: 'ease-in-out',
      }
    );

    activeSlideAnimations.set(el, { animation, expanding: true });
    animation.onfinish = () => {
      activeSlideAnimations.delete(el);
      lastSlideHeights.set(el, el.offsetHeight);
      if (callback) {
        callback();
      }
    };
    animation.oncancel = () => {
      activeSlideAnimations.delete(el);
    };
  }

  /**
   * Animates a change of page content.
   * @param {Element} container Parent container of the page.
   * @param {?Element} oldPage Page that needs to get removed from the
   *     container.
   * @param {Element} newPage Page that will be inserted in the container.
   * @param {string} [direction='left'] Which direction to slide the old page
   *     towards.
   * @param {?function} [callback=null] Called after the animation is done.
   * @param {boolean} [animationsEnabled=true] If the animations are enabled or
   *     not.
   */
  static transitionPage(
    container,
    oldPage,
    newPage,
    direction = 'left',
    callback = null,
    animationsEnabled = true
  ) {
    const active = activePageAnimations.get(container);
    if (active) {
      active.animations.forEach(anim => {
        anim.onfinish = null;
        anim.oncancel = null;
        anim.cancel();
      });
      active.cleanup();
      activePageAnimations.delete(container);
      oldPage = container.firstElementChild;
    }

    if (!animationsEnabled || !this.shouldAnimate(container)) {
      if (oldPage) {
        oldPage.remove();
      }
      container.appendChild(newPage);
      if (callback) {
        callback();
      }
      return;
    }

    const oldPageHeight = oldPage
      ? Math.max(oldPage.offsetHeight, container.offsetHeight)
      : 0;
    const previousScrollTop = container.scrollTop;

    container.style.pointerEvents = 'none';
    container.style.position = 'relative';
    container.style.contain = 'layout paint';
    container.style.overflowX = 'clip';
    container.style.overflowY = 'clip';

    if (oldPage) {
      oldPage.style.position = 'absolute';
      oldPage.style.top = `${-previousScrollTop}px`;
      oldPage.style.left = '0';
      oldPage.style.width = '100%';
    }

    container.appendChild(newPage);
    if (previousScrollTop > 0) {
      container.scrollTop = 0;
    }

    const enterFrom =
      direction === 'left'
        ? 'translate3d(100%, 0, 0)'
        : 'translate3d(-100%, 0, 0)';
    const exitTo =
      direction === 'left'
        ? 'translate3d(-100%, 0, 0)'
        : 'translate3d(100%, 0, 0)';

    const timing = {
      duration: 300,
      easing: 'ease-in-out',
    };

    const animations = [];
    if (oldPage) {
      animations.push(
        oldPage.animate(
          [{ transform: 'translate3d(0, 0, 0)' }, { transform: exitTo }],
          timing
        )
      );
    }
    const primaryAnimation = newPage.animate(
      [{ transform: enterFrom }, { transform: 'translate3d(0, 0, 0)' }],
      timing
    );
    animations.push(primaryAnimation);

    if (window.isPopup) {
      const startHeight = Math.min(oldPageHeight, 400);
      const endHeight = Math.min(
        Math.max(newPage.offsetHeight, container.offsetHeight),
        400
      );
      animations.push(
        container.animate(
          [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
          timing
        )
      );
    }

    const cleanup = () => {
      container.style.pointerEvents = '';
      container.style.position = '';
      container.style.contain = '';
      container.style.height = '';
      container.style.overflowX = '';
      container.style.overflowY = 'auto';
      if (oldPage) {
        oldPage.style.position = '';
        oldPage.style.top = '';
        oldPage.style.left = '';
        oldPage.style.width = '';
        oldPage.remove();
      }
    };

    activePageAnimations.set(container, { animations, cleanup });
    primaryAnimation.onfinish = () => {
      activePageAnimations.delete(container);
      cleanup();
      if (callback) {
        callback();
      }
    };
    primaryAnimation.oncancel = () => {
      activePageAnimations.delete(container);
    };
  }

  /**
   * Determines whether animations should run for an element, respecting both
   * the `.notransition` class and the OS `prefers-reduced-motion` preference,
   * as well as Web Animations API availability.
   * @param {Element} [el=document.body] The element to check.
   * @return {boolean} True if animations should run.
   */
  static shouldAnimate(el = document.body) {
    if (!el || typeof el.animate !== 'function') {
      return false;
    }
    if (
      document.body?.classList.contains('notransition') ||
      el.closest?.('.notransition')
    ) {
      return false;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      return false;
    }
    return true;
  }

  /**
   * Determines whether or not an element is hidden.
   * @param {Element} el The element to check.
   * @return {boolean} True if the element is hidden, otherwise false.
   */
  static isHidden(el) {
    if (!el) {
      return true;
    }
    if (
      el.style.display === 'none' ||
      window.getComputedStyle(el).display === 'none'
    ) {
      return true;
    }
    const maxHeight = el.style.maxHeight.replace('px', '').replace('%', '');
    return maxHeight === '0';
  }
}
