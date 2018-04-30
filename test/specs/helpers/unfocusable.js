/**
 * Check if an element is not focusable.
 * Note: This will be injected into the global scope by the test runner.
 * See the files array in karma.conf.js.
 * @param {Element} el
 * @return {Boolean}
 */
function isUnfocusable(el) { // eslint-disable-line no-unused-vars
  var oldActiveElement = document.activeElement;
  el.focus();
  if (document.activeElement !== oldActiveElement) {
    return false;
  }
  if (document.activeElement === el) {
    return false;
  }
  if (el.tabIndex !== -1) {
    return false;
  }
  return true;
}
