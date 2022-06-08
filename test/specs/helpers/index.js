/**
 * Quick and dirty logger to get info out of SauceLabs tests.
 */
var LogLevels = {INFO: 'info', ERROR: 'error', NONE: 'none'};
var LogLevel = LogLevels.NONE; // Set this to ERROR or NONE when not debugging.
var LOG = {};
LOG.info = function() {
  if (LogLevel === LogLevels.INFO) {
    console.log.apply(null, arguments); // eslint-disable-line prefer-rest-params
  }
};

/**
 * Check if an element is not focusable.
 * Note: This will be injected into the global scope by the test runner.
 * See the files array in karma.conf.js.
 * @param {HTMLElement} el
 * @return {Boolean}
 */
function isUnfocusable(el) { // eslint-disable-line no-unused-vars
  var oldActiveElement = document.activeElement;
  el.focus();
  if (document.activeElement !== oldActiveElement) {
    LOG.info('document.activeElement !== oldActiveElement');
    return false;
  }
  if (document.activeElement === el) {
    LOG.info('document.activeElement === el');
    return false;
  }
  // Can't use tabIndex property here because Edge says a <div> has
  // a tabIndex of 0 by default, even though calling focus() on it does
  // not actually focus it.
  if (el.hasAttribute('tabindex') && el.getAttribute('tabindex') === '0') {
    LOG.info('el.getAttribute(tabindex) === 0');
    return false;
  }
  return true;
}
