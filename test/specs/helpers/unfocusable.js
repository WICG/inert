// This will be injected into the global scope by the test runner.
// See the files array in karma.conf.js
function isUnfocusable(el) {
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
