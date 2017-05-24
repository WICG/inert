(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, (function () { 'use strict';

/**
 * Determine if a DOM element matches a CSS selector
 *
 * @param {Element} elem
 * @param {String} selector
 * @return {Boolean}
 * @api public
 */

function matches(elem, selector) {
  // Vendor-specific implementations of `Element.prototype.matches()`.
  var proto = window.Element.prototype;
  var nativeMatches = proto.matches ||
      proto.mozMatchesSelector ||
      proto.msMatchesSelector ||
      proto.oMatchesSelector ||
      proto.webkitMatchesSelector;

  if (!elem || elem.nodeType !== 1) {
    return false;
  }

  var parentElem = elem.parentNode;

  // use native 'matches'
  if (nativeMatches) {
    return nativeMatches.call(elem, selector);
  }

  // native support for `matches` is missing and a fallback is required
  var nodes = parentElem.querySelectorAll(selector);
  var len = nodes.length;

  for (var i = 0; i < len; i++) {
    if (nodes[i] === elem) {
      return true;
    }
  }

  return false;
}

/**
 * Expose `matches`
 */

var index = matches;

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

/**
 *
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function (document) {
  /** @type {boolean} */
  var nativeShadowDOM = 'attachShadow' in Element.prototype;

  // https://dom.spec.whatwg.org/#dom-element-attachshadow
  /** @type {string} */
  var acceptsShadowRootSelector = ['article', 'aside', 'blockquote', 'body', 'div', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'main', 'nav', 'p', 'section', 'span'].join(',');

  /**
   * `InertRoot` manages a single inert subtree, i.e. a DOM subtree whose root element
   * has an `inert` attribute.
   * Its main functions are:
   * - make the rootElement untabbable.
   * - notify the manager of inerted nodes in the rootElement's shadowRoot.
   */

  var InertRoot = function () {
    /**
     * @param {!Element} rootElement The Element at the root of the inert subtree.
     * @param {?Function} onShadowRootMutation Callback invoked on shadow root mutations.
     */
    function InertRoot(rootElement, onShadowRootMutation) {
      classCallCheck(this, InertRoot);

      /** @type {Element} */
      this._rootElement = rootElement;

      /** @type {string} */
      this._rootTabindex = rootElement.getAttribute('tabindex') || null;

      // Make the subtree hidden from assistive technology
      rootElement.setAttribute('aria-hidden', 'true');

      // Make it untabbable.
      rootElement.tabIndex = -1;

      // Ensure we move the focus away from rootElement.
      // This will blur also focused elements contained
      // in the rootElement's shadowRoot.
      rootElement.blur();
      // If rootElement has distributed content, it might
      // be that the active element is contained into it.
      // We must blur it.
      if (rootElement.firstElementChild) {
        var active = document.activeElement;
        if (active === document.body) active = null;
        while (active) {
          if (rootElement.contains(active)) {
            active.blur();
            break;
          }
          // Keep searching in the shadowRoot.
          active = active.shadowRoot ? active.shadowRoot.activeElement : null;
        }
      }

      if (!nativeShadowDOM) return;
      // If element doesn't accept shadowRoot, check if it is a potential custom element
      // https://html.spec.whatwg.org/multipage/scripting.html#valid-custom-element-name
      if (!index(rootElement, acceptsShadowRootSelector)) {
        var potentialCustomElement = rootElement.tagName.indexOf('-') !== -1;
        if (!potentialCustomElement) return;
      }
      // We already failed inerting this shadow root.
      if (rootElement.__failedAttachShadow) return;

      // Ensure the rootElement has a shadowRoot in order to leverage the behavior of tabindex = -1,
      // which will remove the rootElement and its contents from the navigation order.
      // See Step 3 https://www.w3.org/TR/shadow-dom/#dfn-document-sequential-focus-navigation-order
      if (rootElement.shadowRoot) {
        // It might be that rootElement had inert children in its shadowRoot and this is the first
        // time we see them, hence we have to update their `inert` property.
        var inertChildren = Array.from(rootElement.shadowRoot.querySelectorAll('[inert]'));
        inertChildren.forEach(function (child) {
          return child.inert = true;
        });
      } else {
        // Detect if this is a closed shadowRoot with try/catch (sigh).
        var shadowRoot = null;
        try {
          shadowRoot = rootElement.attachShadow({
            mode: 'open'
          });
        } catch (e) {
          // Most likely a closed shadowRoot was already attached.
          rootElement.__failedAttachShadow = true;
          console.warn('Could not inert element shadowRoot', rootElement, e);
          return;
        }
        shadowRoot.appendChild(document.createElement('slot'));
        // NOTE: we allow attachShadow to be called again since we're using it
        // for polyfilling inert. We ensure the shadowRoot is empty and return it.
        rootElement.attachShadow = function () {
          shadowRoot.innerHTML = '';
          delete rootElement.attachShadow;
          return shadowRoot;
        };
      }
      if (onShadowRootMutation !== null) {
        // Give visibility on changing nodes in the shadowRoot.
        this._observer = new MutationObserver(onShadowRootMutation);
        this._observer.observe(rootElement.shadowRoot, {
          attributes: true,
          subtree: true,
          childList: true
        });
      }
    }

    /**
     * Call this whenever this object is about to become obsolete.  This unwinds all of the state
     * stored in this object and updates the state of all of the managed nodes.
     */


    createClass(InertRoot, [{
      key: 'destructor',
      value: function destructor() {
        if (this._observer) this._observer.disconnect();

        this._rootElement.removeAttribute('aria-hidden');
        if (this._rootTabindex) this._rootElement.setAttribute('tabindex', this._rootTabindex);else this._rootElement.removeAttribute('tabindex');

        this._observer = null;
        this._rootElement = null;
        this._rootTabindex = null;
      }
    }]);
    return InertRoot;
  }();

  /**
   * InertManager is a per-document singleton object which manages all inert roots and nodes.
   *
   * When an element becomes an inert root by having an `inert` attribute set and/or its `inert`
   * property set to `true`, the `setInert` method creates an `InertRoot` object for the element.
   * The `InertRoot` in turn registers itself as managing all of the element's focusable descendant
   * nodes via the `register()` method. The `InertManager` ensures that a single `InertNode`
   * instance is created for each such node, via the `_managedNodes` map.
   */


  var InertManager = function () {
    /**
     * @param {Document} document
     */
    function InertManager(document) {
      var _this = this;

      classCallCheck(this, InertManager);

      if (!document) throw new Error('Missing required argument; InertManager needs to wrap a document.');

      /** @type {Document} */
      this._document = document;

      /**
       * All inert roots known to this InertManager. In a map to allow looking up by Node.
       * @type {Map<Node, InertRoot>}
       */
      this._inertRoots = new Map();

      this._boundWatchForInert = this._watchForInert.bind(this);

      /**
       * Observer for mutations on `document.body`.
       * @type {MutationObserver}
       */
      this._observer = new MutationObserver(this._boundWatchForInert);

      // Add inert style.
      addInertStyle(document.head || document.body || document.documentElement);

      // Wait for document to be interactive.
      if (document.readyState === 'loading') {
        var onchanged = function onchanged() {
          document.removeEventListener('readystatechange', onchanged);
          _this._onDocumentLoaded();
        };
        document.addEventListener('readystatechange', onchanged);
      } else {
        this._onDocumentLoaded();
      }
    }

    /**
     * Set whether the given element should be an inert root or not.
     * @param {Element} root
     * @param {boolean} inert
     */


    createClass(InertManager, [{
      key: 'setInert',
      value: function setInert(root, inert) {
        if (this._inertRoots.has(root) === inert) // element is already inert
          return;
        if (inert) {
          var inertRoot = new InertRoot(root, this._boundWatchForInert);
          root.setAttribute('inert', '');
          this._inertRoots.set(root, inertRoot);
          // If not contained in the document, it must be in a shadowRoot.
          if (!this._document.body.contains(root)) {
            var parent = root.parentNode;
            while (parent) {
              if (parent.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                addInertStyle(parent);
                break;
              }
              parent = parent.parentNode;
            }
          }
        } else {
          var _inertRoot = this._inertRoots.get(root);
          _inertRoot.destructor();
          this._inertRoots.delete(root);
          root.removeAttribute('inert');
        }
      }

      /**
       * Callback used when document has finished loading.
       */

    }, {
      key: '_onDocumentLoaded',
      value: function _onDocumentLoaded() {
        // Find all inert roots in document and make them actually inert.
        var inertElements = Array.from(this._document.querySelectorAll('[inert]'));
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = inertElements[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var inertElement = _step.value;

            this.setInert(inertElement, true);
          } // Comment this out to use programmatic API only.
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        this._observer.observe(this._document.body, {
          attributes: true,
          subtree: true,
          childList: true
        });
      }

      /**
       * Callback used when mutation observer detects attribute changes.
       * @param {MutationRecord} records
       * @param {MutationObserver} self
       */

    }, {
      key: '_watchForInert',
      value: function _watchForInert(records, self) {
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = records[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var record = _step2.value;

            switch (record.type) {
              case 'childList':
                var _iteratorNormalCompletion3 = true;
                var _didIteratorError3 = false;
                var _iteratorError3 = undefined;

                try {
                  for (var _iterator3 = Array.from(record.addedNodes)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var node = _step3.value;

                    if (node.nodeType !== Node.ELEMENT_NODE) continue;
                    var inertElements = Array.from(node.querySelectorAll('[inert]'));
                    if (index(node, '[inert]')) inertElements.unshift(node);
                    var _iteratorNormalCompletion4 = true;
                    var _didIteratorError4 = false;
                    var _iteratorError4 = undefined;

                    try {
                      for (var _iterator4 = inertElements[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                        var inertElement = _step4.value;

                        this.setInert(inertElement, true);
                      }
                    } catch (err) {
                      _didIteratorError4 = true;
                      _iteratorError4 = err;
                    } finally {
                      try {
                        if (!_iteratorNormalCompletion4 && _iterator4.return) {
                          _iterator4.return();
                        }
                      } finally {
                        if (_didIteratorError4) {
                          throw _iteratorError4;
                        }
                      }
                    }
                  }
                } catch (err) {
                  _didIteratorError3 = true;
                  _iteratorError3 = err;
                } finally {
                  try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                      _iterator3.return();
                    }
                  } finally {
                    if (_didIteratorError3) {
                      throw _iteratorError3;
                    }
                  }
                }

                break;
              case 'attributes':
                if (record.attributeName !== 'inert') continue;
                var target = record.target;
                var inert = target.hasAttribute('inert');
                this.setInert(target, inert);
                break;
            }
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }
      }
    }]);
    return InertManager;
  }();

  /**
   * Adds a style element to the node containing the inert specific styles
   * @param {Node} node
   */


  function addInertStyle(node) {
    if (node.querySelector('style#inert-style')) {
      return;
    }
    var style = document.createElement('style');
    style.setAttribute('id', 'inert-style');
    style.textContent = '\n    [inert], [inert] * {\n      pointer-events: none;\n      cursor: default;\n      user-select: none;\n      -webkit-user-select: none;\n      -moz-user-select: none;\n      -ms-user-select: none;\n    }';
    node.appendChild(style);
  }

  var inertManager = new InertManager(document);

  Object.defineProperty(Element.prototype, 'inert', {
    enumerable: true,
    get: function get$$1() {
      return this.hasAttribute('inert');
    },
    set: function set$$1(inert) {
      inertManager.setInert(this, inert);
    }
  });

  var nativeFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function () {
    // If it is inert or into an inert node, no focus!
    var target = this;
    while (target && !target.inert) {
      // Target might be distributed, so go to the deepest assignedSlot
      // and walk up the tree from there.
      while (target.assignedSlot) {
        target = target.assignedSlot;
      }target = target.parentNode || target.host;
    }
    if (target && target.inert) return;
    return nativeFocus.call(this);
  };
})(document);

})));
