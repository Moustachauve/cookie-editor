import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';

import sinon from 'sinon';

import { Animate } from '../interface/lib/animate.js';
import { setupDom } from './mocks/sinonBrowserMock.js';

let teardownDom = null;

/**
 * Installs a controllable mock `Element.prototype.animate` on the current JSDOM
 * `Element` prototype and records created animation instances.
 * @return {Array<object>} Array of recorded animation instances.
 */
function installAnimateStub() {
  const animations = [];
  globalThis.Element.prototype.animate = sinon
    .stub()
    .callsFake((keyframes, options) => {
      const anim = {
        keyframes,
        options,
        cancelled: false,
        onfinish: null,
        oncancel: null,
        finish() {
          if (anim.onfinish) {
            anim.onfinish();
          }
        },
        cancel() {
          anim.cancelled = true;
          if (anim.oncancel) {
            anim.oncancel();
          }
        },
      };
      animations.push(anim);
      return anim;
    });
  return animations;
}

/**
 * Defines a configurable `offsetHeight` getter on a DOM element.
 * @param {Element} el Target element.
 * @param {function(): number|number} heightOrGetter Height value or getter.
 */
function setElementHeight(el, heightOrGetter) {
  Object.defineProperty(el, 'offsetHeight', {
    configurable: true,
    get:
      typeof heightOrGetter === 'function'
        ? heightOrGetter
        : () => heightOrGetter,
  });
}

beforeEach(() => {
  const { teardown } = setupDom();
  teardownDom = teardown;
});

afterEach(() => {
  sinon.restore();
  if (teardownDom) {
    teardownDom();
    teardownDom = null;
  }
});

test('Animate.shouldAnimate - respects Web Animations API, notransition class, and prefers-reduced-motion', () => {
  const el = document.createElement('div');
  document.body.appendChild(el);

  // Without Element.prototype.animate in JSDOM, shouldAnimate is false
  assert.equal(Animate.shouldAnimate(el), false);

  installAnimateStub();
  assert.equal(Animate.shouldAnimate(el), true);

  // Body .notransition disables animations
  document.body.classList.add('notransition');
  assert.equal(Animate.shouldAnimate(el), false);
  document.body.classList.remove('notransition');

  // OS prefers-reduced-motion: reduce disables animations
  globalThis.window.matchMedia = sinon.stub().callsFake(query => ({
    matches: query === '(prefers-reduced-motion: reduce)',
  }));
  assert.equal(Animate.shouldAnimate(el), false);
});

test('Animate.isHidden - detects display:none and max-height:0 states', () => {
  assert.equal(Animate.isHidden(null), true);

  const el = document.createElement('div');
  document.body.appendChild(el);
  assert.equal(Animate.isHidden(el), false);

  el.style.display = 'none';
  assert.equal(Animate.isHidden(el), true);

  el.style.display = 'flex';
  el.style.maxHeight = '0px';
  assert.equal(Animate.isHidden(el), true);

  el.style.maxHeight = '';
  assert.equal(Animate.isHidden(el), false);
});

test('Animate.toggleSlide - expands a hidden element and collapses it on second toggle', () => {
  const animations = installAnimateStub();
  const el = document.createElement('div');
  el.style.display = 'none';
  document.body.appendChild(el);
  setElementHeight(el, () => (el.style.display === 'none' ? 0 : 180));

  const expandCb = sinon.spy();
  Animate.toggleSlide(el, expandCb);

  assert.equal(el.style.display, 'flex');
  assert.equal(animations.length, 1);
  assert.deepEqual(animations[0].keyframes, [
    { height: '0px', overflowY: 'hidden' },
    { height: '180px', overflowY: 'hidden' },
  ]);
  assert.equal(expandCb.called, false);

  animations[0].finish();
  assert.equal(expandCb.calledOnce, true);
  assert.equal(el.style.display, 'flex');

  // Second call collapses the visible element
  const collapseCb = sinon.spy();
  Animate.toggleSlide(el, collapseCb);

  assert.equal(animations.length, 2);
  assert.deepEqual(animations[1].keyframes, [
    { height: '180px', overflowY: 'hidden' },
    { height: '0px', overflowY: 'hidden' },
  ]);
  // Display remains flex while collapsing until animation finishes
  assert.equal(el.style.display, 'flex');

  animations[1].finish();
  assert.equal(el.style.display, 'none');
  assert.equal(collapseCb.calledOnce, true);
});

test('Animate.toggleSlide - reverses smoothly from mid-flight height when interrupted', () => {
  const animations = installAnimateStub();
  const el = document.createElement('div');
  el.style.display = 'none';
  document.body.appendChild(el);

  let currentHeight = 180;
  setElementHeight(el, () => (el.style.display === 'none' ? 0 : currentHeight));

  // Start expanding (0 -> 180)
  const firstCb = sinon.spy();
  Animate.toggleSlide(el, firstCb);
  assert.equal(animations.length, 1);

  // Interrupt mid-flight at 95px to collapse (95 -> 0)
  currentHeight = 95;
  const secondCb = sinon.spy();
  Animate.toggleSlide(el, secondCb);

  assert.equal(animations[0].cancelled, true);
  assert.equal(firstCb.called, false);
  assert.equal(animations.length, 2);
  assert.deepEqual(animations[1].keyframes, [
    { height: '95px', overflowY: 'hidden' },
    { height: '0px', overflowY: 'hidden' },
  ]);

  // Interrupt again mid-collapse at 40px to re-expand (40 -> 180)
  let inFlight = true;
  setElementHeight(el, () => (inFlight ? 40 : 180));
  const secondAnim = animations[1];
  secondAnim.cancel = () => {
    secondAnim.cancelled = true;
    inFlight = false;
  };

  const thirdCb = sinon.spy();
  Animate.toggleSlide(el, thirdCb);

  assert.equal(animations[1].cancelled, true);
  assert.equal(secondCb.called, false);
  assert.equal(animations.length, 3);
  assert.deepEqual(animations[2].keyframes, [
    { height: '40px', overflowY: 'hidden' },
    { height: '180px', overflowY: 'hidden' },
  ]);

  animations[2].finish();
  assert.equal(thirdCb.calledOnce, true);
  assert.equal(el.style.display, 'flex');
});

test('Animate.toggleSlide - finishes synchronously without animating when notransition is active', () => {
  const animations = installAnimateStub();
  document.body.classList.add('notransition');

  const el = document.createElement('div');
  el.style.display = 'none';
  document.body.appendChild(el);
  setElementHeight(el, 150);

  const expandCb = sinon.spy();
  Animate.toggleSlide(el, expandCb);
  assert.equal(el.style.display, 'flex');
  assert.equal(expandCb.calledOnce, true);
  assert.equal(animations.length, 0);

  const collapseCb = sinon.spy();
  Animate.toggleSlide(el, collapseCb);
  assert.equal(el.style.display, 'none');
  assert.equal(collapseCb.calledOnce, true);
  assert.equal(animations.length, 0);
});

test('Animate.resizeSlide - animates height changes in both directions', () => {
  const animations = installAnimateStub();
  const el = document.createElement('div');
  document.body.appendChild(el);

  setElementHeight(el, 340);
  const expandCb = sinon.spy();
  Animate.resizeSlide(el, expandCb, 180);

  assert.equal(animations.length, 1);
  assert.deepEqual(animations[0].keyframes, [
    { height: '180px', overflowY: 'hidden' },
    { height: '340px', overflowY: 'hidden' },
  ]);
  animations[0].finish();
  assert.equal(expandCb.calledOnce, true);

  // Collapsing back to 180 uses last recorded height when startHeight is omitted
  setElementHeight(el, 180);
  const collapseCb = sinon.spy();
  Animate.resizeSlide(el, collapseCb);

  assert.equal(animations.length, 2);
  assert.deepEqual(animations[1].keyframes, [
    { height: '340px', overflowY: 'hidden' },
    { height: '180px', overflowY: 'hidden' },
  ]);
  animations[1].finish();
  assert.equal(collapseCb.calledOnce, true);
});

test('Animate.transitionPage - slides pages without widening container, clamps popup height to 400px, and cleans up on finish', () => {
  const animations = installAnimateStub();
  globalThis.window.isPopup = true;

  const container = document.createElement('div');
  const oldPage = document.createElement('ul');
  const newPage = document.createElement('form');
  container.appendChild(oldPage);
  document.body.appendChild(container);

  // oldPage is taller than the 400px popup cap; start height should clamp to 400px
  setElementHeight(oldPage, 720);
  setElementHeight(newPage, 160);
  container.scrollTop = 120;

  const doneCb = sinon.spy();
  Animate.transitionPage(container, oldPage, newPage, 'left', doneCb, true);

  assert.equal(animations.length, 3);
  assert.equal(container.children.length, 2);
  assert.equal(container.firstElementChild, oldPage);
  assert.equal(container.lastElementChild, newPage);
  assert.equal(container.style.width, '');
  assert.equal(container.style.position, 'relative');
  assert.equal(oldPage.style.position, 'absolute');
  assert.equal(oldPage.style.top, '-120px');
  assert.equal(container.scrollTop, 0);
  assert.deepEqual(animations[0].keyframes, [
    { transform: 'translate3d(0, 0, 0)' },
    { transform: 'translate3d(-100%, 0, 0)' },
  ]);
  assert.deepEqual(animations[1].keyframes, [
    { transform: 'translate3d(100%, 0, 0)' },
    { transform: 'translate3d(0, 0, 0)' },
  ]);
  assert.deepEqual(animations[2].keyframes, [
    { height: '400px' },
    { height: '160px' },
  ]);

  animations[1].finish();

  assert.equal(doneCb.calledOnce, true);
  assert.equal(container.children.length, 1);
  assert.equal(container.firstElementChild, newPage);
  assert.equal(container.style.width, '');
  assert.equal(container.style.position, '');
  assert.equal(container.style.height, '');
});

test('Animate.transitionPage - cancels in-flight page transition when a new transition starts', () => {
  const animations = installAnimateStub();
  const container = document.createElement('div');
  const page1 = document.createElement('div');
  const page2 = document.createElement('div');
  const page3 = document.createElement('div');
  container.appendChild(page1);
  document.body.appendChild(container);

  const cb1 = sinon.spy();
  const cb2 = sinon.spy();

  Animate.transitionPage(container, page1, page2, 'left', cb1, true);
  assert.equal(animations.length, 2);
  assert.equal(container.children.length, 2);

  // Trigger second transition before the first finishes, passing container.firstChild
  // as callers in cookie-list.js do
  Animate.transitionPage(
    container,
    container.firstChild,
    page3,
    'right',
    cb2,
    true
  );
  assert.equal(animations[0].cancelled, true);
  assert.equal(animations[1].cancelled, true);
  assert.equal(cb1.called, false);
  assert.equal(page1.parentNode, null);
  assert.equal(container.children.length, 2);

  animations[3].finish();
  assert.equal(cb2.calledOnce, true);
  assert.equal(container.children.length, 1);
  assert.equal(container.firstElementChild, page3);
  assert.equal(page2.parentNode, null);
});
