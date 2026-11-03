import i18n from './i18n.js';

/**
 * Initialize i18n, replace text in all elements with data-i18n attribute
 */
export function initI18n() {
  // Replace elements with data-i18n attribute
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = i18n.t(key);
    if (translation) {
      element.textContent = translation;
    }
  });

  // Replace placeholder in elements with data-i18n-placeholder attribute
  const placeholderElements = document.querySelectorAll(
    '[data-i18n-placeholder]'
  );
  placeholderElements.forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    const translation = i18n.t(key);
    if (translation) {
      element.placeholder = translation;
    }
  });

  // Replace text in option elements
  const optionElements = document.querySelectorAll('option[data-i18n]');
  optionElements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = i18n.t(key);
    if (translation) {
      element.textContent = translation;
    }
  });

  // Replace title attribute
  const titleElements = document.querySelectorAll('[data-i18n-title]');
  titleElements.forEach(element => {
    const key = element.getAttribute('data-i18n-title');
    const translation = i18n.t(key);
    if (translation) {
      element.title = translation;
    }
  });

  // Replace aria-label attribute
  const ariaLabelElements = document.querySelectorAll('[data-i18n-aria-label]');
  ariaLabelElements.forEach(element => {
    const key = element.getAttribute('data-i18n-aria-label');
    const translation = i18n.t(key);
    if (translation) {
      element.setAttribute('aria-label', translation);
    }
  });

  // Replace page title
  const titleElement = document.querySelector('title[data-i18n]');
  if (titleElement) {
    const key = titleElement.getAttribute('data-i18n');
    const translation = i18n.t(key);
    if (translation) {
      document.title = translation;
    }
  }
}

export default initI18n;
