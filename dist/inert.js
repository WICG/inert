'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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

  /** @type {string} */
  var _focusableElementsString = ['a[href]', 'area[href]', 'input:not([disabled])', 'select:not([disabled])', 'textarea:not([disabled])', 'button:not([disabled])', 'iframe', 'object', 'embed', '[contenteditable]'].join(',');

  /**
   * `InertRoot` manages a single inert subtree, i.e. a DOM subtree whose root element has an `inert`
   * attribute.
   *
   * Its main functions are:
   *
   * - to create and maintain a set of managed `InertNode`s, including when mutations occur in the
   *   subtree. The `makeSubtreeUnfocusable()` method handles collecting `InertNode`s via registering
   *   each focusable node in the subtree with the singleton `InertManager` which manages all known
   *   focusable nodes within inert subtrees. `InertManager` ensures that a single `InertNode`
   *   instance exists for each focusable node which has at least one inert root as an ancestor.
   *
   * - to notify all managed `InertNode`s when this subtree stops being inert (i.e. when the `inert`
   *   attribute is removed from the root node). This is handled in the destructor, which calls the
   *   `deregister` method on `InertManager` for each managed inert node.
   */

  var InertRoot = function () {
    /**
     * @param {Element} rootElement The Element at the root of the inert subtree.
     * @param {InertManager} inertManager The global singleton InertManager object.
     */
    function InertRoot(rootElement, inertManager) {
      _classCallCheck(this, InertRoot);

      /** @type {InertManager} */
      this._inertManager = inertManager;

      /** @type {Element} */
      this._rootElement = rootElement;

      /**
       * @type {Set<Node>}
       * All managed focusable nodes in this InertRoot's subtree.
       */
      this._managedNodes = new Set([]);

      // Make the subtree hidden from assistive technology
      this._rootElement.setAttribute('aria-hidden', 'true');

      // Make all focusable elements in the subtree unfocusable and add them to _managedNodes
      this._makeSubtreeUnfocusable(this._rootElement);

      // Watch for:
      // - any additions in the subtree: make them unfocusable too
      // - any removals from the subtree: remove them from this inert root's managed nodes
      // - attribute changes: if `tabindex` is added, or removed from an intrinsically focusable element,
      //   make that node a managed node.
      this._observer = new MutationObserver(this._onMutation.bind(this));
      this._observer.observe(this._rootElement, { attributes: true, childList: true, subtree: true });
    }

    /**
     * Call this whenever this object is about to become obsolete.  This unwinds all of the state
     * stored in this object and updates the state of all of the managed nodes.
     */


    _createClass(InertRoot, [{
      key: 'destructor',
      value: function destructor() {
        this._observer.disconnect();
        this._observer = null;

        if (this._rootElement) this._rootElement.removeAttribute('aria-hidden');
        this._rootElement = null;

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = this._managedNodes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var inertNode = _step.value;

            this._unmanageNode(inertNode.node);
          }
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

        this._managedNodes = null;

        this._inertManager = null;
      }

      /**
       * @return {Set<InertNode>} A copy of this InertRoot's managed nodes set.
       */

    }, {
      key: '_makeSubtreeUnfocusable',


      /**
       * @param {Node} startNode
       */
      value: function _makeSubtreeUnfocusable(startNode) {
        var _this = this;

        composedTreeWalk(startNode, function (node) {
          _this._visitNode(node);
        });

        var activeElement = document.activeElement;
        if (!document.contains(startNode)) {
          // startNode may be in shadow DOM, so find its nearest shadowRoot to get the activeElement.
          var node = startNode;
          var root = undefined;
          while (node) {
            if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
              root = node;
              break;
            }
            node = node.parentNode;
          }
          if (root) activeElement = root.activeElement;
        }
        if (startNode.contains(activeElement)) activeElement.blur();
      }

      /**
       * @param {Node} node
       */

    }, {
      key: '_visitNode',
      value: function _visitNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        // If a descendant inert root becomes un-inert, its descendants will still be inert because of this
        // inert root, so all of its managed nodes need to be adopted by this InertRoot.
        if (node !== this._rootElement && node.hasAttribute('inert')) this._adoptInertRoot(node);

        if (node.matches(_focusableElementsString) || node.hasAttribute('tabindex')) this._manageNode(node);
      }

      /**
       * Register the given node with this InertRoot and with InertManager.
       * @param {Node} node
       */

    }, {
      key: '_manageNode',
      value: function _manageNode(node) {
        var inertNode = this._inertManager.register(node, this);
        this._managedNodes.add(inertNode);
      }

      /**
       * Unregister the given node with this InertRoot and with InertManager.
       * @param {Node} node
       */

    }, {
      key: '_unmanageNode',
      value: function _unmanageNode(node) {
        var inertNode = this._inertManager.deregister(node, this);
        if (inertNode) this._managedNodes.delete(inertNode);
      }

      /**
       * Unregister the entire subtree starting at `startNode`.
       * @param {Node} startNode
       */

    }, {
      key: '_unmanageSubtree',
      value: function _unmanageSubtree(startNode) {
        var _this2 = this;

        composedTreeWalk(startNode, function (node) {
          _this2._unmanageNode(node);
        });
      }

      /**
       * If a descendant node is found with an `inert` attribute, adopt its managed nodes.
       * @param {Node} node
       */

    }, {
      key: '_adoptInertRoot',
      value: function _adoptInertRoot(node) {
        var inertSubroot = this._inertManager.getInertRoot(node);

        // During initialisation this inert root may not have been registered yet,
        // so register it now if need be.
        if (!inertSubroot) {
          this._inertManager.setInert(node, true);
          inertSubroot = this._inertManager.getInertRoot(node);
        }

        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = inertSubroot.managedNodes[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var savedInertNode = _step2.value;

            this._manageNode(savedInertNode.node);
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

      /**
       * Callback used when mutation observer detects subtree additions, removals, or attribute changes.
       * @param {MutationRecord} records
       * @param {MutationObserver} self
       */

    }, {
      key: '_onMutation',
      value: function _onMutation(records, self) {
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = records[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var record = _step3.value;

            var target = record.target;
            if (record.type === 'childList') {
              // Manage added nodes
              var _iteratorNormalCompletion4 = true;
              var _didIteratorError4 = false;
              var _iteratorError4 = undefined;

              try {
                for (var _iterator4 = Array.from(record.addedNodes)[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                  var node = _step4.value;

                  this._makeSubtreeUnfocusable(node);
                } // Un-manage removed nodes
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

              var _iteratorNormalCompletion5 = true;
              var _didIteratorError5 = false;
              var _iteratorError5 = undefined;

              try {
                for (var _iterator5 = Array.from(record.removedNodes)[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                  var _node = _step5.value;

                  this._unmanageSubtree(_node);
                }
              } catch (err) {
                _didIteratorError5 = true;
                _iteratorError5 = err;
              } finally {
                try {
                  if (!_iteratorNormalCompletion5 && _iterator5.return) {
                    _iterator5.return();
                  }
                } finally {
                  if (_didIteratorError5) {
                    throw _iteratorError5;
                  }
                }
              }
            } else if (record.type === 'attributes') {
              if (record.attributeName === 'tabindex') {
                // Re-initialise inert node if tabindex changes
                this._manageNode(target);
              } else if (target !== this._rootElement && record.attributeName === 'inert' && target.hasAttribute('inert')) {
                // If a new inert root is added, adopt its managed nodes and make sure it knows about the
                // already managed nodes from this inert subroot.
                this._adoptInertRoot(target);
                var inertSubroot = this._inertManager.getInertRoot(target);
                var _iteratorNormalCompletion6 = true;
                var _didIteratorError6 = false;
                var _iteratorError6 = undefined;

                try {
                  for (var _iterator6 = this._managedNodes[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                    var managedNode = _step6.value;

                    if (target.contains(managedNode.node)) inertSubroot._manageNode(managedNode.node);
                  }
                } catch (err) {
                  _didIteratorError6 = true;
                  _iteratorError6 = err;
                } finally {
                  try {
                    if (!_iteratorNormalCompletion6 && _iterator6.return) {
                      _iterator6.return();
                    }
                  } finally {
                    if (_didIteratorError6) {
                      throw _iteratorError6;
                    }
                  }
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
      }
    }, {
      key: 'managedNodes',
      get: function get() {
        return new Set(this._managedNodes);
      }
    }]);

    return InertRoot;
  }();

  /**
   * `InertNode` initialises and manages a single inert node.
   * A node is inert if it is a descendant of one or more inert root elements.
   *
   * On construction, `InertNode` saves the existing `tabindex` value for the node, if any, and
   * either removes the `tabindex` attribute or sets it to `-1`, depending on whether the element
   * is intrinsically focusable or not.
   *
   * `InertNode` maintains a set of `InertRoot`s which are descendants of this `InertNode`. When an
   * `InertRoot` is destroyed, and calls `InertManager.deregister()`, the `InertManager` notifies the
   * `InertNode` via `removeInertRoot()`, which in turn destroys the `InertNode` if no `InertRoot`s
   * remain in the set. On destruction, `InertNode` reinstates the stored `tabindex` if one exists,
   * or removes the `tabindex` attribute if the element is intrinsically focusable.
   */


  var InertNode = function () {
    /**
     * @param {Node} node A focusable element to be made inert.
     * @param {InertRoot} inertRoot The inert root element associated with this inert node.
     */
    function InertNode(node, inertRoot) {
      _classCallCheck(this, InertNode);

      /** @type {Node} */
      this._node = node;

      /** @type {boolean} */
      this._overrodeFocusMethod = false;

      /**
       * @type {Set<InertRoot>} The set of descendant inert roots.
       *    If and only if this set becomes empty, this node is no longer inert.
       */
      this._inertRoots = new Set([inertRoot]);

      /** @type {boolean} */
      this._destroyed = false;

      // Save any prior tabindex info and make this node untabbable
      this.ensureUntabbable();
    }

    /**
     * Call this whenever this object is about to become obsolete.
     * This makes the managed node focusable again and deletes all of the previously stored state.
     */


    _createClass(InertNode, [{
      key: 'destructor',
      value: function destructor() {
        this._throwIfDestroyed();

        if (this._node) {
          if (this.hasSavedTabIndex) this._node.setAttribute('tabindex', this.savedTabIndex);else this._node.removeAttribute('tabindex');

          // Use `delete` to restore native focus method.
          if (this._overrodeFocusMethod) delete this._node.focus;
        }
        this._node = null;
        this._inertRoots = null;

        this._destroyed = true;
      }

      /**
       * @type {boolean} Whether this object is obsolete because the managed node is no longer inert.
       * If the object has been destroyed, any attempt to access it will cause an exception.
       */

    }, {
      key: '_throwIfDestroyed',
      value: function _throwIfDestroyed() {
        if (this.destroyed) throw new Error("Trying to access destroyed InertNode");
      }

      /** @return {boolean} */

    }, {
      key: 'ensureUntabbable',


      /** Save the existing tabindex value and make the node untabbable and unfocusable */
      value: function ensureUntabbable() {
        var node = this.node;
        if (node.matches(_focusableElementsString)) {
          if (node.tabIndex === -1 && this.hasSavedTabIndex) return;

          if (node.hasAttribute('tabindex')) this._savedTabIndex = node.tabIndex;
          node.setAttribute('tabindex', '-1');
          if (node.nodeType === Node.ELEMENT_NODE) {
            node.focus = function () {};
            this._overrodeFocusMethod = true;
          }
        } else if (node.hasAttribute('tabindex')) {
          this._savedTabIndex = node.tabIndex;
          node.removeAttribute('tabindex');
        }
      }

      /**
       * Add another inert root to this inert node's set of managing inert roots.
       * @param {InertRoot} inertRoot
       */

    }, {
      key: 'addInertRoot',
      value: function addInertRoot(inertRoot) {
        this._throwIfDestroyed();
        this._inertRoots.add(inertRoot);
      }

      /**
       * Remove the given inert root from this inert node's set of managing inert roots.
       * If the set of managing inert roots becomes empty, this node is no longer inert,
       * so the object should be destroyed.
       * @param {InertRoot} inertRoot
       */

    }, {
      key: 'removeInertRoot',
      value: function removeInertRoot(inertRoot) {
        this._throwIfDestroyed();
        this._inertRoots.delete(inertRoot);
        if (this._inertRoots.size === 0) this.destructor();
      }
    }, {
      key: 'destroyed',
      get: function get() {
        return this._destroyed;
      }
    }, {
      key: 'hasSavedTabIndex',
      get: function get() {
        return '_savedTabIndex' in this;
      }

      /** @return {Node} */

    }, {
      key: 'node',
      get: function get() {
        this._throwIfDestroyed();
        return this._node;
      }

      /** @param {number} tabIndex */

    }, {
      key: 'savedTabIndex',
      set: function set(tabIndex) {
        this._throwIfDestroyed();
        this._savedTabIndex = tabIndex;
      }

      /** @return {number} */
      ,
      get: function get() {
        this._throwIfDestroyed();
        return this._savedTabIndex;
      }
    }]);

    return InertNode;
  }();

  /**
   * InertManager is a per-document singleton object which manages all inert roots and nodes.
   *
   * When an element becomes an inert root by having an `inert` attribute set and/or its `inert`
   * property set to `true`, the `setInert` method creates an `InertRoot` object for the element.
   * The `InertRoot` in turn registers itself as managing all of the element's focusable descendant
   * nodes via the `register()` method. The `InertManager` ensures that a single `InertNode` instance
   * is created for each such node, via the `_managedNodes` map.
   */


  var InertManager = function () {
    /**
     * @param {Document} document
     */
    function InertManager(document) {
      _classCallCheck(this, InertManager);

      if (!document) throw new Error('Missing required argument; InertManager needs to wrap a document.');

      /** @type {Document} */
      this._document = document;

      /**
       * All managed nodes known to this InertManager. In a map to allow looking up by Node.
       * @type {Map<Node, InertNode>}
       */
      this._managedNodes = new Map();

      /**
       * All inert roots known to this InertManager. In a map to allow looking up by Node.
       * @type {Map<Node, InertRoot>}
       */
      this._inertRoots = new Map();

      /**
       * Observer for mutations on `document.body`.
       * @type {MutationObserver}
       */
      this._observer = new MutationObserver(this._watchForInert.bind(this));

      // Add inert style.
      addInertStyle(document.head || document.body || document.documentElement);

      // Wait for document to be loaded.
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', this._onDocumentLoaded.bind(this));
      } else {
        this._onDocumentLoaded();
      }
    }

    /**
     * Set whether the given element should be an inert root or not.
     * @param {Element} root
     * @param {boolean} inert
     */


    _createClass(InertManager, [{
      key: 'setInert',
      value: function setInert(root, inert) {
        if (inert) {
          if (this._inertRoots.has(root)) // element is already inert
            return;

          var inertRoot = new InertRoot(root, this);
          root.setAttribute('inert', '');
          this._inertRoots.set(root, inertRoot);
          // If not contained in the document, it must be in a shadowRoot.
          // Ensure inert styles are added there.
          if (!this._document.body.contains(root)) {
            var parent = root.parentNode;
            while (parent) {
              if (parent.nodeType === 11) {
                addInertStyle(parent);
              }
              parent = parent.parentNode;
            }
          }
        } else {
          if (!this._inertRoots.has(root)) // element is already non-inert
            return;

          var _inertRoot = this._inertRoots.get(root);
          _inertRoot.destructor();
          this._inertRoots.delete(root);
          root.removeAttribute('inert');
        }
      }

      /**
       * Get the InertRoot object corresponding to the given inert root element, if any.
       * @param {Element} element
       * @return {InertRoot?}
       */

    }, {
      key: 'getInertRoot',
      value: function getInertRoot(element) {
        return this._inertRoots.get(element);
      }

      /**
       * Register the given InertRoot as managing the given node.
       * In the case where the node has a previously existing inert root, this inert root will
       * be added to its set of inert roots.
       * @param {Node} node
       * @param {InertRoot} inertRoot
       * @return {InertNode} inertNode
       */

    }, {
      key: 'register',
      value: function register(node, inertRoot) {
        var inertNode = this._managedNodes.get(node);
        if (inertNode !== undefined) {
          // node was already in an inert subtree
          inertNode.addInertRoot(inertRoot);
          // Update saved tabindex value if necessary
          inertNode.ensureUntabbable();
        } else {
          inertNode = new InertNode(node, inertRoot);
        }

        this._managedNodes.set(node, inertNode);

        return inertNode;
      }

      /**
       * De-register the given InertRoot as managing the given inert node.
       * Removes the inert root from the InertNode's set of managing inert roots, and remove the inert
       * node from the InertManager's set of managed nodes if it is destroyed.
       * If the node is not currently managed, this is essentially a no-op.
       * @param {Node} node
       * @param {InertRoot} inertRoot
       * @return {InertNode?} The potentially destroyed InertNode associated with this node, if any.
       */

    }, {
      key: 'deregister',
      value: function deregister(node, inertRoot) {
        var inertNode = this._managedNodes.get(node);
        if (!inertNode) return null;

        inertNode.removeInertRoot(inertRoot);
        if (inertNode.destroyed) this._managedNodes.delete(node);

        return inertNode;
      }

      /**
       * Callback used when document has finished loading.
       */

    }, {
      key: '_onDocumentLoaded',
      value: function _onDocumentLoaded() {
        // Find all inert roots in document and make them actually inert.
        var inertElements = Array.from(this._document.querySelectorAll('[inert]'));
        var _iteratorNormalCompletion7 = true;
        var _didIteratorError7 = false;
        var _iteratorError7 = undefined;

        try {
          for (var _iterator7 = inertElements[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
            var inertElement = _step7.value;

            this.setInert(inertElement, true);
          } // Comment this out to use programmatic API only.
        } catch (err) {
          _didIteratorError7 = true;
          _iteratorError7 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion7 && _iterator7.return) {
              _iterator7.return();
            }
          } finally {
            if (_didIteratorError7) {
              throw _iteratorError7;
            }
          }
        }

        this._observer.observe(this._document.body, { attributes: true, subtree: true, childList: true });
      }

      /**
       * Callback used when mutation observer detects attribute changes.
       * @param {MutationRecord} records
       * @param {MutationObserver} self
       */

    }, {
      key: '_watchForInert',
      value: function _watchForInert(records, self) {
        var _iteratorNormalCompletion8 = true;
        var _didIteratorError8 = false;
        var _iteratorError8 = undefined;

        try {
          for (var _iterator8 = records[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
            var record = _step8.value;

            switch (record.type) {
              case 'childList':
                var _iteratorNormalCompletion9 = true;
                var _didIteratorError9 = false;
                var _iteratorError9 = undefined;

                try {
                  for (var _iterator9 = Array.from(record.addedNodes)[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
                    var node = _step9.value;

                    if (node.nodeType !== Node.ELEMENT_NODE) continue;
                    var inertElements = Array.from(node.querySelectorAll('[inert]'));
                    if (node.matches('[inert]')) inertElements.unshift(node);
                    var _iteratorNormalCompletion10 = true;
                    var _didIteratorError10 = false;
                    var _iteratorError10 = undefined;

                    try {
                      for (var _iterator10 = inertElements[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
                        var inertElement = _step10.value;

                        this.setInert(inertElement, true);
                      }
                    } catch (err) {
                      _didIteratorError10 = true;
                      _iteratorError10 = err;
                    } finally {
                      try {
                        if (!_iteratorNormalCompletion10 && _iterator10.return) {
                          _iterator10.return();
                        }
                      } finally {
                        if (_didIteratorError10) {
                          throw _iteratorError10;
                        }
                      }
                    }
                  }
                } catch (err) {
                  _didIteratorError9 = true;
                  _iteratorError9 = err;
                } finally {
                  try {
                    if (!_iteratorNormalCompletion9 && _iterator9.return) {
                      _iterator9.return();
                    }
                  } finally {
                    if (_didIteratorError9) {
                      throw _iteratorError9;
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
          _didIteratorError8 = true;
          _iteratorError8 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion8 && _iterator8.return) {
              _iterator8.return();
            }
          } finally {
            if (_didIteratorError8) {
              throw _iteratorError8;
            }
          }
        }
      }
    }]);

    return InertManager;
  }();

  /**
   * Recursively walk the composed tree from |node|.
   * @param {Node} node
   * @param {(function (Element))=} callback Callback to be called for each element traversed,
   *     before descending into child nodes.
   * @param {ShadowRoot=} shadowRootAncestor The nearest ShadowRoot ancestor, if any.
   */


  function composedTreeWalk(node, callback, shadowRootAncestor) {
    if (node.nodeType == Node.ELEMENT_NODE) {
      var element = /** @type {Element} */node;
      if (callback) callback(element);

      // Descend into node:
      // If it has a ShadowRoot, ignore all child elements - these will be picked
      // up by the <content> or <shadow> elements. Descend straight into the
      // ShadowRoot.
      var shadowRoot = element.shadowRoot || element.webkitShadowRoot;
      if (shadowRoot) {
        composedTreeWalk(shadowRoot, callback, shadowRoot);
        return;
      }

      // If it is a <content> element, descend into distributed elements - these
      // are elements from outside the shadow root which are rendered inside the
      // shadow DOM.
      if (element.localName == 'content') {
        var content = /** @type {HTMLContentElement} */element;
        // Verifies if ShadowDom v0 is supported.
        var distributedNodes = content.getDistributedNodes ? content.getDistributedNodes() : [];
        for (var i = 0; i < distributedNodes.length; i++) {
          composedTreeWalk(distributedNodes[i], callback, shadowRootAncestor);
        }
        return;
      }

      // If it is a <slot> element, descend into assigned nodes - these
      // are elements from outside the shadow root which are rendered inside the
      // shadow DOM.
      if (element.localName == 'slot') {
        var slot = /** @type {HTMLSlotElement} */element;
        // Verify if ShadowDom v1 is supported.
        var _distributedNodes = slot.assignedNodes ? slot.assignedNodes({ flatten: true }) : [];
        for (var _i = 0; _i < _distributedNodes.length; _i++) {
          composedTreeWalk(_distributedNodes[_i], callback, shadowRootAncestor);
        }
        return;
      }
    }

    // If it is neither the parent of a ShadowRoot, a <content> element, a <slot>
    // element, nor a <shadow> element recurse normally.
    var child = node.firstChild;
    while (child != null) {
      composedTreeWalk(child, callback, shadowRootAncestor);
      child = child.nextSibling;
    }
  }

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
    style.textContent = "\n" + "[inert] {\n" + "  pointer-events: none;\n" + "  cursor: default;\n" + "}\n" + "\n" + "[inert], [inert] * {\n" + "  user-select: none;\n" + "  -webkit-user-select: none;\n" + "  -moz-user-select: none;\n" + "  -ms-user-select: none;\n" + "  overflow: hidden !important;\n" + "  user-modify: none !important;\n" + "}\n";
    node.appendChild(style);
  }

  var inertManager = new InertManager(document);

  Object.defineProperty(Element.prototype, 'inert', {
    enumerable: true,
    get: function get() {
      return this.hasAttribute('inert');
    },
    set: function set(inert) {
      inertManager.setInert(this, inert);
    }
  });
})(document);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZXJ0LmpzIl0sIm5hbWVzIjpbImRvY3VtZW50IiwiX2ZvY3VzYWJsZUVsZW1lbnRzU3RyaW5nIiwiam9pbiIsIkluZXJ0Um9vdCIsInJvb3RFbGVtZW50IiwiaW5lcnRNYW5hZ2VyIiwiX2luZXJ0TWFuYWdlciIsIl9yb290RWxlbWVudCIsIl9tYW5hZ2VkTm9kZXMiLCJTZXQiLCJzZXRBdHRyaWJ1dGUiLCJfbWFrZVN1YnRyZWVVbmZvY3VzYWJsZSIsIl9vYnNlcnZlciIsIk11dGF0aW9uT2JzZXJ2ZXIiLCJfb25NdXRhdGlvbiIsImJpbmQiLCJvYnNlcnZlIiwiYXR0cmlidXRlcyIsImNoaWxkTGlzdCIsInN1YnRyZWUiLCJkaXNjb25uZWN0IiwicmVtb3ZlQXR0cmlidXRlIiwiaW5lcnROb2RlIiwiX3VubWFuYWdlTm9kZSIsIm5vZGUiLCJzdGFydE5vZGUiLCJjb21wb3NlZFRyZWVXYWxrIiwiX3Zpc2l0Tm9kZSIsImFjdGl2ZUVsZW1lbnQiLCJjb250YWlucyIsInJvb3QiLCJ1bmRlZmluZWQiLCJub2RlVHlwZSIsIk5vZGUiLCJET0NVTUVOVF9GUkFHTUVOVF9OT0RFIiwicGFyZW50Tm9kZSIsImJsdXIiLCJFTEVNRU5UX05PREUiLCJoYXNBdHRyaWJ1dGUiLCJfYWRvcHRJbmVydFJvb3QiLCJtYXRjaGVzIiwiX21hbmFnZU5vZGUiLCJyZWdpc3RlciIsImFkZCIsImRlcmVnaXN0ZXIiLCJkZWxldGUiLCJpbmVydFN1YnJvb3QiLCJnZXRJbmVydFJvb3QiLCJzZXRJbmVydCIsIm1hbmFnZWROb2RlcyIsInNhdmVkSW5lcnROb2RlIiwicmVjb3JkcyIsInNlbGYiLCJyZWNvcmQiLCJ0YXJnZXQiLCJ0eXBlIiwiQXJyYXkiLCJmcm9tIiwiYWRkZWROb2RlcyIsInJlbW92ZWROb2RlcyIsIl91bm1hbmFnZVN1YnRyZWUiLCJhdHRyaWJ1dGVOYW1lIiwibWFuYWdlZE5vZGUiLCJJbmVydE5vZGUiLCJpbmVydFJvb3QiLCJfbm9kZSIsIl9vdmVycm9kZUZvY3VzTWV0aG9kIiwiX2luZXJ0Um9vdHMiLCJfZGVzdHJveWVkIiwiZW5zdXJlVW50YWJiYWJsZSIsIl90aHJvd0lmRGVzdHJveWVkIiwiaGFzU2F2ZWRUYWJJbmRleCIsInNhdmVkVGFiSW5kZXgiLCJmb2N1cyIsImRlc3Ryb3llZCIsIkVycm9yIiwidGFiSW5kZXgiLCJfc2F2ZWRUYWJJbmRleCIsInNpemUiLCJkZXN0cnVjdG9yIiwiSW5lcnRNYW5hZ2VyIiwiX2RvY3VtZW50IiwiTWFwIiwiX3dhdGNoRm9ySW5lcnQiLCJhZGRJbmVydFN0eWxlIiwiaGVhZCIsImJvZHkiLCJkb2N1bWVudEVsZW1lbnQiLCJyZWFkeVN0YXRlIiwiYWRkRXZlbnRMaXN0ZW5lciIsIl9vbkRvY3VtZW50TG9hZGVkIiwiaW5lcnQiLCJoYXMiLCJzZXQiLCJwYXJlbnQiLCJnZXQiLCJlbGVtZW50IiwiYWRkSW5lcnRSb290IiwicmVtb3ZlSW5lcnRSb290IiwiaW5lcnRFbGVtZW50cyIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJpbmVydEVsZW1lbnQiLCJ1bnNoaWZ0IiwiY2FsbGJhY2siLCJzaGFkb3dSb290QW5jZXN0b3IiLCJzaGFkb3dSb290Iiwid2Via2l0U2hhZG93Um9vdCIsImxvY2FsTmFtZSIsImNvbnRlbnQiLCJkaXN0cmlidXRlZE5vZGVzIiwiZ2V0RGlzdHJpYnV0ZWROb2RlcyIsImkiLCJsZW5ndGgiLCJzbG90IiwiYXNzaWduZWROb2RlcyIsImZsYXR0ZW4iLCJjaGlsZCIsImZpcnN0Q2hpbGQiLCJuZXh0U2libGluZyIsInF1ZXJ5U2VsZWN0b3IiLCJzdHlsZSIsImNyZWF0ZUVsZW1lbnQiLCJ0ZXh0Q29udGVudCIsImFwcGVuZENoaWxkIiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJFbGVtZW50IiwicHJvdG90eXBlIiwiZW51bWVyYWJsZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBaUJBLENBQUMsVUFBU0EsUUFBVCxFQUFtQjs7QUFFcEI7QUFDQSxNQUFN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YUFBU0YsS0FBVCxFQUFnQjtBQUFFdEYsbUJBQWEyQyxRQUFiLENBQXNCLElBQXRCLEVBQTRCMkMsS0FBNUI7QUFBb0M7QUFIakMsR0FBbEQ7QUFNQyxDQXhuQkQsRUF3bkJHM0YsUUF4bkJIIiwiZmlsZSI6ImluZXJ0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKlxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuKGZ1bmN0aW9uKGRvY3VtZW50KSB7XG5cbi8qKiBAdHlwZSB7c3RyaW5nfSAqL1xuY29uc3QgX2ZvY3VzYWJsZUVsZW1lbnRzU3RyaW5nID0gWydhW2hyZWZdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnYXJlYVtocmVmXScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2lucHV0Om5vdChbZGlzYWJsZWRdKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3NlbGVjdDpub3QoW2Rpc2FibGVkXSknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd0ZXh0YXJlYTpub3QoW2Rpc2FibGVkXSknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdidXR0b246bm90KFtkaXNhYmxlZF0pJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnaWZyYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZW1iZWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdbY29udGVudGVkaXRhYmxlXSddLmpvaW4oJywnKTtcblxuLyoqXG4gKiBgSW5lcnRSb290YCBtYW5hZ2VzIGEgc2luZ2xlIGluZXJ0IHN1YnRyZWUsIGkuZS4gYSBET00gc3VidHJlZSB3aG9zZSByb290IGVsZW1lbnQgaGFzIGFuIGBpbmVydGBcbiAqIGF0dHJpYnV0ZS5cbiAqXG4gKiBJdHMgbWFpbiBmdW5jdGlvbnMgYXJlOlxuICpcbiAqIC0gdG8gY3JlYXRlIGFuZCBtYWludGFpbiBhIHNldCBvZiBtYW5hZ2VkIGBJbmVydE5vZGVgcywgaW5jbHVkaW5nIHdoZW4gbXV0YXRpb25zIG9jY3VyIGluIHRoZVxuICogICBzdWJ0cmVlLiBUaGUgYG1ha2VTdWJ0cmVlVW5mb2N1c2FibGUoKWAgbWV0aG9kIGhhbmRsZXMgY29sbGVjdGluZyBgSW5lcnROb2RlYHMgdmlhIHJlZ2lzdGVyaW5nXG4gKiAgIGVhY2ggZm9jdXNhYmxlIG5vZGUgaW4gdGhlIHN1YnRyZWUgd2l0aCB0aGUgc2luZ2xldG9uIGBJbmVydE1hbmFnZXJgIHdoaWNoIG1hbmFnZXMgYWxsIGtub3duXG4gKiAgIGZvY3VzYWJsZSBub2RlcyB3aXRoaW4gaW5lcnQgc3VidHJlZXMuIGBJbmVydE1hbmFnZXJgIGVuc3VyZXMgdGhhdCBhIHNpbmdsZSBgSW5lcnROb2RlYFxuICogICBpbnN0YW5jZSBleGlzdHMgZm9yIGVhY2ggZm9jdXNhYmxlIG5vZGUgd2hpY2ggaGFzIGF0IGxlYXN0IG9uZSBpbmVydCByb290IGFzIGFuIGFuY2VzdG9yLlxuICpcbiAqIC0gdG8gbm90aWZ5IGFsbCBtYW5hZ2VkIGBJbmVydE5vZGVgcyB3aGVuIHRoaXMgc3VidHJlZSBzdG9wcyBiZWluZyBpbmVydCAoaS5lLiB3aGVuIHRoZSBgaW5lcnRgXG4gKiAgIGF0dHJpYnV0ZSBpcyByZW1vdmVkIGZyb20gdGhlIHJvb3Qgbm9kZSkuIFRoaXMgaXMgaGFuZGxlZCBpbiB0aGUgZGVzdHJ1Y3Rvciwgd2hpY2ggY2FsbHMgdGhlXG4gKiAgIGBkZXJlZ2lzdGVyYCBtZXRob2Qgb24gYEluZXJ0TWFuYWdlcmAgZm9yIGVhY2ggbWFuYWdlZCBpbmVydCBub2RlLlxuICovXG5jbGFzcyBJbmVydFJvb3Qge1xuICAvKipcbiAgICogQHBhcmFtIHtFbGVtZW50fSByb290RWxlbWVudCBUaGUgRWxlbWVudCBhdCB0aGUgcm9vdCBvZiB0aGUgaW5lcnQgc3VidHJlZS5cbiAgICogQHBhcmFtIHtJbmVydE1hbmFnZXJ9IGluZXJ0TWFuYWdlciBUaGUgZ2xvYmFsIHNpbmdsZXRvbiBJbmVydE1hbmFnZXIgb2JqZWN0LlxuICAgKi9cbiAgY29uc3RydWN0b3Iocm9vdEVsZW1lbnQsIGluZXJ0TWFuYWdlcikge1xuICAgIC8qKiBAdHlwZSB7SW5lcnRNYW5hZ2VyfSAqL1xuICAgIHRoaXMuX2luZXJ0TWFuYWdlciA9IGluZXJ0TWFuYWdlcjtcblxuICAgIC8qKiBAdHlwZSB7RWxlbWVudH0gKi9cbiAgICB0aGlzLl9yb290RWxlbWVudCA9IHJvb3RFbGVtZW50O1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUge1NldDxOb2RlPn1cbiAgICAgKiBBbGwgbWFuYWdlZCBmb2N1c2FibGUgbm9kZXMgaW4gdGhpcyBJbmVydFJvb3QncyBzdWJ0cmVlLlxuICAgICAqL1xuICAgIHRoaXMuX21hbmFnZWROb2RlcyA9IG5ldyBTZXQoW10pO1xuXG4gICAgLy8gTWFrZSB0aGUgc3VidHJlZSBoaWRkZW4gZnJvbSBhc3Npc3RpdmUgdGVjaG5vbG9neVxuICAgIHRoaXMuX3Jvb3RFbGVtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuXG4gICAgLy8gTWFrZSBhbGwgZm9jdXNhYmxlIGVsZW1lbnRzIGluIHRoZSBzdWJ0cmVlIHVuZm9jdXNhYmxlIGFuZCBhZGQgdGhlbSB0byBfbWFuYWdlZE5vZGVzXG4gICAgdGhpcy5fbWFrZVN1YnRyZWVVbmZvY3VzYWJsZSh0aGlzLl9yb290RWxlbWVudCk7XG5cbiAgICAvLyBXYXRjaCBmb3I6XG4gICAgLy8gLSBhbnkgYWRkaXRpb25zIGluIHRoZSBzdWJ0cmVlOiBtYWtlIHRoZW0gdW5mb2N1c2FibGUgdG9vXG4gICAgLy8gLSBhbnkgcmVtb3ZhbHMgZnJvbSB0aGUgc3VidHJlZTogcmVtb3ZlIHRoZW0gZnJvbSB0aGlzIGluZXJ0IHJvb3QncyBtYW5hZ2VkIG5vZGVzXG4gICAgLy8gLSBhdHRyaWJ1dGUgY2hhbmdlczogaWYgYHRhYmluZGV4YCBpcyBhZGRlZCwgb3IgcmVtb3ZlZCBmcm9tIGFuIGludHJpbnNpY2FsbHkgZm9jdXNhYmxlIGVsZW1lbnQsXG4gICAgLy8gICBtYWtlIHRoYXQgbm9kZSBhIG1hbmFnZWQgbm9kZS5cbiAgICB0aGlzLl9vYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKHRoaXMuX29uTXV0YXRpb24uYmluZCh0aGlzKSk7XG4gICAgdGhpcy5fb2JzZXJ2ZXIub2JzZXJ2ZSh0aGlzLl9yb290RWxlbWVudCwgeyBhdHRyaWJ1dGVzOiB0cnVlLCBjaGlsZExpc3Q6IHRydWUsIHN1YnRyZWU6IHRydWUgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbCB0aGlzIHdoZW5ldmVyIHRoaXMgb2JqZWN0IGlzIGFib3V0IHRvIGJlY29tZSBvYnNvbGV0ZS4gIFRoaXMgdW53aW5kcyBhbGwgb2YgdGhlIHN0YXRlXG4gICAqIHN0b3JlZCBpbiB0aGlzIG9iamVjdCBhbmQgdXBkYXRlcyB0aGUgc3RhdGUgb2YgYWxsIG9mIHRoZSBtYW5hZ2VkIG5vZGVzLlxuICAgKi9cbiAgZGVzdHJ1Y3RvcigpIHtcbiAgICB0aGlzLl9vYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgdGhpcy5fb2JzZXJ2ZXIgPSBudWxsO1xuXG4gICAgaWYgKHRoaXMuX3Jvb3RFbGVtZW50KVxuICAgICAgdGhpcy5fcm9vdEVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKCdhcmlhLWhpZGRlbicpO1xuICAgIHRoaXMuX3Jvb3RFbGVtZW50ID0gbnVsbDtcblxuICAgIGZvciAobGV0IGluZXJ0Tm9kZSBvZiB0aGlzLl9tYW5hZ2VkTm9kZXMpXG4gICAgICB0aGlzLl91bm1hbmFnZU5vZGUoaW5lcnROb2RlLm5vZGUpO1xuXG4gICAgdGhpcy5fbWFuYWdlZE5vZGVzID0gbnVsbDtcblxuICAgIHRoaXMuX2luZXJ0TWFuYWdlciA9IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybiB7U2V0PEluZXJ0Tm9kZT59IEEgY29weSBvZiB0aGlzIEluZXJ0Um9vdCdzIG1hbmFnZWQgbm9kZXMgc2V0LlxuICAgKi9cbiAgZ2V0IG1hbmFnZWROb2RlcygpIHtcbiAgICByZXR1cm4gbmV3IFNldCh0aGlzLl9tYW5hZ2VkTm9kZXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7Tm9kZX0gc3RhcnROb2RlXG4gICAqL1xuICBfbWFrZVN1YnRyZWVVbmZvY3VzYWJsZShzdGFydE5vZGUpIHtcbiAgICBjb21wb3NlZFRyZWVXYWxrKHN0YXJ0Tm9kZSwgKG5vZGUpID0+IHsgdGhpcy5fdmlzaXROb2RlKG5vZGUpOyB9KTtcblxuICAgIGxldCBhY3RpdmVFbGVtZW50ID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudDtcbiAgICBpZiAoIWRvY3VtZW50LmNvbnRhaW5zKHN0YXJ0Tm9kZSkpIHtcbiAgICAgIC8vIHN0YXJ0Tm9kZSBtYXkgYmUgaW4gc2hhZG93IERPTSwgc28gZmluZCBpdHMgbmVhcmVzdCBzaGFkb3dSb290IHRvIGdldCB0aGUgYWN0aXZlRWxlbWVudC5cbiAgICAgIGxldCBub2RlID0gc3RhcnROb2RlO1xuICAgICAgbGV0IHJvb3QgPSB1bmRlZmluZWQ7XG4gICAgICB3aGlsZSAobm9kZSkge1xuICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFKSB7XG4gICAgICAgICAgcm9vdCA9IG5vZGU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICAgIH1cbiAgICAgIGlmIChyb290KVxuICAgICAgICBhY3RpdmVFbGVtZW50ID0gcm9vdC5hY3RpdmVFbGVtZW50XG4gICAgfVxuICAgIGlmIChzdGFydE5vZGUuY29udGFpbnMoYWN0aXZlRWxlbWVudCkpXG4gICAgICBhY3RpdmVFbGVtZW50LmJsdXIoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAgICovXG4gIF92aXNpdE5vZGUobm9kZSkge1xuICAgIGlmIChub2RlLm5vZGVUeXBlICE9PSBOb2RlLkVMRU1FTlRfTk9ERSlcbiAgICAgIHJldHVybjtcblxuICAgIC8vIElmIGEgZGVzY2VuZGFudCBpbmVydCByb290IGJlY29tZXMgdW4taW5lcnQsIGl0cyBkZXNjZW5kYW50cyB3aWxsIHN0aWxsIGJlIGluZXJ0IGJlY2F1c2Ugb2YgdGhpc1xuICAgIC8vIGluZXJ0IHJvb3QsIHNvIGFsbCBvZiBpdHMgbWFuYWdlZCBub2RlcyBuZWVkIHRvIGJlIGFkb3B0ZWQgYnkgdGhpcyBJbmVydFJvb3QuXG4gICAgaWYgKG5vZGUgIT09IHRoaXMuX3Jvb3RFbGVtZW50ICYmIG5vZGUuaGFzQXR0cmlidXRlKCdpbmVydCcpKVxuICAgICAgdGhpcy5fYWRvcHRJbmVydFJvb3Qobm9kZSk7XG5cbiAgICBpZiAobm9kZS5tYXRjaGVzKF9mb2N1c2FibGVFbGVtZW50c1N0cmluZykgfHwgbm9kZS5oYXNBdHRyaWJ1dGUoJ3RhYmluZGV4JykpXG4gICAgICB0aGlzLl9tYW5hZ2VOb2RlKG5vZGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHRoZSBnaXZlbiBub2RlIHdpdGggdGhpcyBJbmVydFJvb3QgYW5kIHdpdGggSW5lcnRNYW5hZ2VyLlxuICAgKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAgICovXG4gIF9tYW5hZ2VOb2RlKG5vZGUpIHtcbiAgICBjb25zdCBpbmVydE5vZGUgPSB0aGlzLl9pbmVydE1hbmFnZXIucmVnaXN0ZXIobm9kZSwgdGhpcyk7XG4gICAgdGhpcy5fbWFuYWdlZE5vZGVzLmFkZChpbmVydE5vZGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVucmVnaXN0ZXIgdGhlIGdpdmVuIG5vZGUgd2l0aCB0aGlzIEluZXJ0Um9vdCBhbmQgd2l0aCBJbmVydE1hbmFnZXIuXG4gICAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICAgKi9cbiAgX3VubWFuYWdlTm9kZShub2RlKSB7XG4gICAgY29uc3QgaW5lcnROb2RlID0gdGhpcy5faW5lcnRNYW5hZ2VyLmRlcmVnaXN0ZXIobm9kZSwgdGhpcyk7XG4gICAgaWYgKGluZXJ0Tm9kZSlcbiAgICAgIHRoaXMuX21hbmFnZWROb2Rlcy5kZWxldGUoaW5lcnROb2RlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVbnJlZ2lzdGVyIHRoZSBlbnRpcmUgc3VidHJlZSBzdGFydGluZyBhdCBgc3RhcnROb2RlYC5cbiAgICogQHBhcmFtIHtOb2RlfSBzdGFydE5vZGVcbiAgICovXG4gIF91bm1hbmFnZVN1YnRyZWUoc3RhcnROb2RlKSB7XG4gICAgY29tcG9zZWRUcmVlV2FsayhzdGFydE5vZGUsIChub2RlKSA9PiB7IHRoaXMuX3VubWFuYWdlTm9kZShub2RlKTsgfSk7XG4gIH1cblxuICAvKipcbiAgICogSWYgYSBkZXNjZW5kYW50IG5vZGUgaXMgZm91bmQgd2l0aCBhbiBgaW5lcnRgIGF0dHJpYnV0ZSwgYWRvcHQgaXRzIG1hbmFnZWQgbm9kZXMuXG4gICAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICAgKi9cbiAgX2Fkb3B0SW5lcnRSb290KG5vZGUpIHtcbiAgICBsZXQgaW5lcnRTdWJyb290ID0gdGhpcy5faW5lcnRNYW5hZ2VyLmdldEluZXJ0Um9vdChub2RlKTtcblxuICAgIC8vIER1cmluZyBpbml0aWFsaXNhdGlvbiB0aGlzIGluZXJ0IHJvb3QgbWF5IG5vdCBoYXZlIGJlZW4gcmVnaXN0ZXJlZCB5ZXQsXG4gICAgLy8gc28gcmVnaXN0ZXIgaXQgbm93IGlmIG5lZWQgYmUuXG4gICAgaWYgKCFpbmVydFN1YnJvb3QpIHtcbiAgICAgIHRoaXMuX2luZXJ0TWFuYWdlci5zZXRJbmVydChub2RlLCB0cnVlKTtcbiAgICAgIGluZXJ0U3Vicm9vdCA9IHRoaXMuX2luZXJ0TWFuYWdlci5nZXRJbmVydFJvb3Qobm9kZSk7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgc2F2ZWRJbmVydE5vZGUgb2YgaW5lcnRTdWJyb290Lm1hbmFnZWROb2RlcylcbiAgICAgIHRoaXMuX21hbmFnZU5vZGUoc2F2ZWRJbmVydE5vZGUubm9kZSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGJhY2sgdXNlZCB3aGVuIG11dGF0aW9uIG9ic2VydmVyIGRldGVjdHMgc3VidHJlZSBhZGRpdGlvbnMsIHJlbW92YWxzLCBvciBhdHRyaWJ1dGUgY2hhbmdlcy5cbiAgICogQHBhcmFtIHtNdXRhdGlvblJlY29yZH0gcmVjb3Jkc1xuICAgKiBAcGFyYW0ge011dGF0aW9uT2JzZXJ2ZXJ9IHNlbGZcbiAgICovXG4gIF9vbk11dGF0aW9uKHJlY29yZHMsIHNlbGYpIHtcbiAgICBmb3IgKGxldCByZWNvcmQgb2YgcmVjb3Jkcykge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gcmVjb3JkLnRhcmdldDtcbiAgICAgIGlmIChyZWNvcmQudHlwZSA9PT0gJ2NoaWxkTGlzdCcpIHtcbiAgICAgICAgLy8gTWFuYWdlIGFkZGVkIG5vZGVzXG4gICAgICAgIGZvciAobGV0IG5vZGUgb2YgQXJyYXkuZnJvbShyZWNvcmQuYWRkZWROb2RlcykpXG4gICAgICAgICAgdGhpcy5fbWFrZVN1YnRyZWVVbmZvY3VzYWJsZShub2RlKTtcblxuICAgICAgICAvLyBVbi1tYW5hZ2UgcmVtb3ZlZCBub2Rlc1xuICAgICAgICBmb3IgKGxldCBub2RlIG9mIEFycmF5LmZyb20ocmVjb3JkLnJlbW92ZWROb2RlcykpXG4gICAgICAgICAgdGhpcy5fdW5tYW5hZ2VTdWJ0cmVlKG5vZGUpO1xuICAgICAgfSBlbHNlIGlmIChyZWNvcmQudHlwZSA9PT0gJ2F0dHJpYnV0ZXMnKSB7XG4gICAgICAgIGlmIChyZWNvcmQuYXR0cmlidXRlTmFtZSA9PT0gJ3RhYmluZGV4Jykge1xuICAgICAgICAgIC8vIFJlLWluaXRpYWxpc2UgaW5lcnQgbm9kZSBpZiB0YWJpbmRleCBjaGFuZ2VzXG4gICAgICAgICAgdGhpcy5fbWFuYWdlTm9kZSh0YXJnZXQpO1xuICAgICAgICB9IGVsc2UgaWYgKHRhcmdldCAhPT0gdGhpcy5fcm9vdEVsZW1lbnQgJiZcbiAgICAgICAgICAgICAgICAgICByZWNvcmQuYXR0cmlidXRlTmFtZSA9PT0gJ2luZXJ0JyAmJlxuICAgICAgICAgICAgICAgICAgIHRhcmdldC5oYXNBdHRyaWJ1dGUoJ2luZXJ0JykpIHtcbiAgICAgICAgICAvLyBJZiBhIG5ldyBpbmVydCByb290IGlzIGFkZGVkLCBhZG9wdCBpdHMgbWFuYWdlZCBub2RlcyBhbmQgbWFrZSBzdXJlIGl0IGtub3dzIGFib3V0IHRoZVxuICAgICAgICAgIC8vIGFscmVhZHkgbWFuYWdlZCBub2RlcyBmcm9tIHRoaXMgaW5lcnQgc3Vicm9vdC5cbiAgICAgICAgICB0aGlzLl9hZG9wdEluZXJ0Um9vdCh0YXJnZXQpO1xuICAgICAgICAgIGNvbnN0IGluZXJ0U3Vicm9vdCA9IHRoaXMuX2luZXJ0TWFuYWdlci5nZXRJbmVydFJvb3QodGFyZ2V0KTtcbiAgICAgICAgICBmb3IgKGxldCBtYW5hZ2VkTm9kZSBvZiB0aGlzLl9tYW5hZ2VkTm9kZXMpIHtcbiAgICAgICAgICAgIGlmICh0YXJnZXQuY29udGFpbnMobWFuYWdlZE5vZGUubm9kZSkpXG4gICAgICAgICAgICAgIGluZXJ0U3Vicm9vdC5fbWFuYWdlTm9kZShtYW5hZ2VkTm9kZS5ub2RlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBgSW5lcnROb2RlYCBpbml0aWFsaXNlcyBhbmQgbWFuYWdlcyBhIHNpbmdsZSBpbmVydCBub2RlLlxuICogQSBub2RlIGlzIGluZXJ0IGlmIGl0IGlzIGEgZGVzY2VuZGFudCBvZiBvbmUgb3IgbW9yZSBpbmVydCByb290IGVsZW1lbnRzLlxuICpcbiAqIE9uIGNvbnN0cnVjdGlvbiwgYEluZXJ0Tm9kZWAgc2F2ZXMgdGhlIGV4aXN0aW5nIGB0YWJpbmRleGAgdmFsdWUgZm9yIHRoZSBub2RlLCBpZiBhbnksIGFuZFxuICogZWl0aGVyIHJlbW92ZXMgdGhlIGB0YWJpbmRleGAgYXR0cmlidXRlIG9yIHNldHMgaXQgdG8gYC0xYCwgZGVwZW5kaW5nIG9uIHdoZXRoZXIgdGhlIGVsZW1lbnRcbiAqIGlzIGludHJpbnNpY2FsbHkgZm9jdXNhYmxlIG9yIG5vdC5cbiAqXG4gKiBgSW5lcnROb2RlYCBtYWludGFpbnMgYSBzZXQgb2YgYEluZXJ0Um9vdGBzIHdoaWNoIGFyZSBkZXNjZW5kYW50cyBvZiB0aGlzIGBJbmVydE5vZGVgLiBXaGVuIGFuXG4gKiBgSW5lcnRSb290YCBpcyBkZXN0cm95ZWQsIGFuZCBjYWxscyBgSW5lcnRNYW5hZ2VyLmRlcmVnaXN0ZXIoKWAsIHRoZSBgSW5lcnRNYW5hZ2VyYCBub3RpZmllcyB0aGVcbiAqIGBJbmVydE5vZGVgIHZpYSBgcmVtb3ZlSW5lcnRSb290KClgLCB3aGljaCBpbiB0dXJuIGRlc3Ryb3lzIHRoZSBgSW5lcnROb2RlYCBpZiBubyBgSW5lcnRSb290YHNcbiAqIHJlbWFpbiBpbiB0aGUgc2V0LiBPbiBkZXN0cnVjdGlvbiwgYEluZXJ0Tm9kZWAgcmVpbnN0YXRlcyB0aGUgc3RvcmVkIGB0YWJpbmRleGAgaWYgb25lIGV4aXN0cyxcbiAqIG9yIHJlbW92ZXMgdGhlIGB0YWJpbmRleGAgYXR0cmlidXRlIGlmIHRoZSBlbGVtZW50IGlzIGludHJpbnNpY2FsbHkgZm9jdXNhYmxlLlxuICovXG5jbGFzcyBJbmVydE5vZGUge1xuICAvKipcbiAgICogQHBhcmFtIHtOb2RlfSBub2RlIEEgZm9jdXNhYmxlIGVsZW1lbnQgdG8gYmUgbWFkZSBpbmVydC5cbiAgICogQHBhcmFtIHtJbmVydFJvb3R9IGluZXJ0Um9vdCBUaGUgaW5lcnQgcm9vdCBlbGVtZW50IGFzc29jaWF0ZWQgd2l0aCB0aGlzIGluZXJ0IG5vZGUuXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihub2RlLCBpbmVydFJvb3QpIHtcbiAgICAvKiogQHR5cGUge05vZGV9ICovXG4gICAgdGhpcy5fbm9kZSA9IG5vZGU7XG5cbiAgICAvKiogQHR5cGUge2Jvb2xlYW59ICovXG4gICAgdGhpcy5fb3ZlcnJvZGVGb2N1c01ldGhvZCA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUge1NldDxJbmVydFJvb3Q+fSBUaGUgc2V0IG9mIGRlc2NlbmRhbnQgaW5lcnQgcm9vdHMuXG4gICAgICogICAgSWYgYW5kIG9ubHkgaWYgdGhpcyBzZXQgYmVjb21lcyBlbXB0eSwgdGhpcyBub2RlIGlzIG5vIGxvbmdlciBpbmVydC5cbiAgICAgKi9cbiAgICB0aGlzLl9pbmVydFJvb3RzID0gbmV3IFNldChbaW5lcnRSb290XSk7XG5cbiAgICAvKiogQHR5cGUge2Jvb2xlYW59ICovXG4gICAgdGhpcy5fZGVzdHJveWVkID0gZmFsc2U7XG5cbiAgICAvLyBTYXZlIGFueSBwcmlvciB0YWJpbmRleCBpbmZvIGFuZCBtYWtlIHRoaXMgbm9kZSB1bnRhYmJhYmxlXG4gICAgdGhpcy5lbnN1cmVVbnRhYmJhYmxlKCk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbCB0aGlzIHdoZW5ldmVyIHRoaXMgb2JqZWN0IGlzIGFib3V0IHRvIGJlY29tZSBvYnNvbGV0ZS5cbiAgICogVGhpcyBtYWtlcyB0aGUgbWFuYWdlZCBub2RlIGZvY3VzYWJsZSBhZ2FpbiBhbmQgZGVsZXRlcyBhbGwgb2YgdGhlIHByZXZpb3VzbHkgc3RvcmVkIHN0YXRlLlxuICAgKi9cbiAgZGVzdHJ1Y3RvcigpIHtcbiAgICB0aGlzLl90aHJvd0lmRGVzdHJveWVkKCk7XG5cbiAgICBpZiAodGhpcy5fbm9kZSkge1xuICAgICAgaWYgKHRoaXMuaGFzU2F2ZWRUYWJJbmRleClcbiAgICAgICAgdGhpcy5fbm9kZS5zZXRBdHRyaWJ1dGUoJ3RhYmluZGV4JywgdGhpcy5zYXZlZFRhYkluZGV4KTtcbiAgICAgIGVsc2VcbiAgICAgICAgdGhpcy5fbm9kZS5yZW1vdmVBdHRyaWJ1dGUoJ3RhYmluZGV4Jyk7XG5cbiAgICAgIC8vIFVzZSBgZGVsZXRlYCB0byByZXN0b3JlIG5hdGl2ZSBmb2N1cyBtZXRob2QuXG4gICAgICBpZiAodGhpcy5fb3ZlcnJvZGVGb2N1c01ldGhvZClcbiAgICAgICAgZGVsZXRlIHRoaXMuX25vZGUuZm9jdXM7XG4gICAgfVxuICAgIHRoaXMuX25vZGUgPSBudWxsO1xuICAgIHRoaXMuX2luZXJ0Um9vdHMgPSBudWxsO1xuXG4gICAgdGhpcy5fZGVzdHJveWVkID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAdHlwZSB7Ym9vbGVhbn0gV2hldGhlciB0aGlzIG9iamVjdCBpcyBvYnNvbGV0ZSBiZWNhdXNlIHRoZSBtYW5hZ2VkIG5vZGUgaXMgbm8gbG9uZ2VyIGluZXJ0LlxuICAgKiBJZiB0aGUgb2JqZWN0IGhhcyBiZWVuIGRlc3Ryb3llZCwgYW55IGF0dGVtcHQgdG8gYWNjZXNzIGl0IHdpbGwgY2F1c2UgYW4gZXhjZXB0aW9uLlxuICAgKi9cbiAgZ2V0IGRlc3Ryb3llZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fZGVzdHJveWVkO1xuICB9XG5cbiAgX3Rocm93SWZEZXN0cm95ZWQoKSB7XG4gICAgaWYgKHRoaXMuZGVzdHJveWVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVHJ5aW5nIHRvIGFjY2VzcyBkZXN0cm95ZWQgSW5lcnROb2RlXCIpO1xuICB9XG5cbiAgLyoqIEByZXR1cm4ge2Jvb2xlYW59ICovXG4gIGdldCBoYXNTYXZlZFRhYkluZGV4KCkge1xuICAgIHJldHVybiAnX3NhdmVkVGFiSW5kZXgnIGluIHRoaXM7XG4gIH1cblxuICAvKiogQHJldHVybiB7Tm9kZX0gKi9cbiAgZ2V0IG5vZGUoKSB7XG4gICAgdGhpcy5fdGhyb3dJZkRlc3Ryb3llZCgpO1xuICAgIHJldHVybiB0aGlzLl9ub2RlO1xuICB9XG5cbiAgLyoqIEBwYXJhbSB7bnVtYmVyfSB0YWJJbmRleCAqL1xuICBzZXQgc2F2ZWRUYWJJbmRleCh0YWJJbmRleCkge1xuICAgIHRoaXMuX3Rocm93SWZEZXN0cm95ZWQoKTtcbiAgICB0aGlzLl9zYXZlZFRhYkluZGV4ID0gdGFiSW5kZXg7XG4gIH1cblxuICAvKiogQHJldHVybiB7bnVtYmVyfSAqL1xuICBnZXQgc2F2ZWRUYWJJbmRleCgpIHtcbiAgICB0aGlzLl90aHJvd0lmRGVzdHJveWVkKCk7XG4gICAgcmV0dXJuIHRoaXMuX3NhdmVkVGFiSW5kZXg7XG4gIH1cblxuICAvKiogU2F2ZSB0aGUgZXhpc3RpbmcgdGFiaW5kZXggdmFsdWUgYW5kIG1ha2UgdGhlIG5vZGUgdW50YWJiYWJsZSBhbmQgdW5mb2N1c2FibGUgKi9cbiAgZW5zdXJlVW50YWJiYWJsZSgpIHtcbiAgICBjb25zdCBub2RlID0gdGhpcy5ub2RlO1xuICAgIGlmIChub2RlLm1hdGNoZXMoX2ZvY3VzYWJsZUVsZW1lbnRzU3RyaW5nKSkge1xuICAgICAgaWYgKG5vZGUudGFiSW5kZXggPT09IC0xICYmIHRoaXMuaGFzU2F2ZWRUYWJJbmRleClcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICBpZiAobm9kZS5oYXNBdHRyaWJ1dGUoJ3RhYmluZGV4JykpXG4gICAgICAgIHRoaXMuX3NhdmVkVGFiSW5kZXggPSBub2RlLnRhYkluZGV4O1xuICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoJ3RhYmluZGV4JywgJy0xJyk7XG4gICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUpIHtcbiAgICAgICAgbm9kZS5mb2N1cyA9IGZ1bmN0aW9uKCkge307XG4gICAgICAgIHRoaXMuX292ZXJyb2RlRm9jdXNNZXRob2QgPSB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobm9kZS5oYXNBdHRyaWJ1dGUoJ3RhYmluZGV4JykpIHtcbiAgICAgIHRoaXMuX3NhdmVkVGFiSW5kZXggPSBub2RlLnRhYkluZGV4O1xuICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoJ3RhYmluZGV4Jyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhbm90aGVyIGluZXJ0IHJvb3QgdG8gdGhpcyBpbmVydCBub2RlJ3Mgc2V0IG9mIG1hbmFnaW5nIGluZXJ0IHJvb3RzLlxuICAgKiBAcGFyYW0ge0luZXJ0Um9vdH0gaW5lcnRSb290XG4gICAqL1xuICBhZGRJbmVydFJvb3QoaW5lcnRSb290KSB7XG4gICAgdGhpcy5fdGhyb3dJZkRlc3Ryb3llZCgpO1xuICAgIHRoaXMuX2luZXJ0Um9vdHMuYWRkKGluZXJ0Um9vdCk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBnaXZlbiBpbmVydCByb290IGZyb20gdGhpcyBpbmVydCBub2RlJ3Mgc2V0IG9mIG1hbmFnaW5nIGluZXJ0IHJvb3RzLlxuICAgKiBJZiB0aGUgc2V0IG9mIG1hbmFnaW5nIGluZXJ0IHJvb3RzIGJlY29tZXMgZW1wdHksIHRoaXMgbm9kZSBpcyBubyBsb25nZXIgaW5lcnQsXG4gICAqIHNvIHRoZSBvYmplY3Qgc2hvdWxkIGJlIGRlc3Ryb3llZC5cbiAgICogQHBhcmFtIHtJbmVydFJvb3R9IGluZXJ0Um9vdFxuICAgKi9cbiAgcmVtb3ZlSW5lcnRSb290KGluZXJ0Um9vdCkge1xuICAgIHRoaXMuX3Rocm93SWZEZXN0cm95ZWQoKTtcbiAgICB0aGlzLl9pbmVydFJvb3RzLmRlbGV0ZShpbmVydFJvb3QpO1xuICAgIGlmICh0aGlzLl9pbmVydFJvb3RzLnNpemUgPT09IDApXG4gICAgICB0aGlzLmRlc3RydWN0b3IoKTtcbiAgfVxufVxuXG4vKipcbiAqIEluZXJ0TWFuYWdlciBpcyBhIHBlci1kb2N1bWVudCBzaW5nbGV0b24gb2JqZWN0IHdoaWNoIG1hbmFnZXMgYWxsIGluZXJ0IHJvb3RzIGFuZCBub2Rlcy5cbiAqXG4gKiBXaGVuIGFuIGVsZW1lbnQgYmVjb21lcyBhbiBpbmVydCByb290IGJ5IGhhdmluZyBhbiBgaW5lcnRgIGF0dHJpYnV0ZSBzZXQgYW5kL29yIGl0cyBgaW5lcnRgXG4gKiBwcm9wZXJ0eSBzZXQgdG8gYHRydWVgLCB0aGUgYHNldEluZXJ0YCBtZXRob2QgY3JlYXRlcyBhbiBgSW5lcnRSb290YCBvYmplY3QgZm9yIHRoZSBlbGVtZW50LlxuICogVGhlIGBJbmVydFJvb3RgIGluIHR1cm4gcmVnaXN0ZXJzIGl0c2VsZiBhcyBtYW5hZ2luZyBhbGwgb2YgdGhlIGVsZW1lbnQncyBmb2N1c2FibGUgZGVzY2VuZGFudFxuICogbm9kZXMgdmlhIHRoZSBgcmVnaXN0ZXIoKWAgbWV0aG9kLiBUaGUgYEluZXJ0TWFuYWdlcmAgZW5zdXJlcyB0aGF0IGEgc2luZ2xlIGBJbmVydE5vZGVgIGluc3RhbmNlXG4gKiBpcyBjcmVhdGVkIGZvciBlYWNoIHN1Y2ggbm9kZSwgdmlhIHRoZSBgX21hbmFnZWROb2Rlc2AgbWFwLlxuICovXG5jbGFzcyBJbmVydE1hbmFnZXIge1xuICAvKipcbiAgICogQHBhcmFtIHtEb2N1bWVudH0gZG9jdW1lbnRcbiAgICovXG4gIGNvbnN0cnVjdG9yKGRvY3VtZW50KSB7XG4gICAgaWYgKCFkb2N1bWVudClcbiAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyByZXF1aXJlZCBhcmd1bWVudDsgSW5lcnRNYW5hZ2VyIG5lZWRzIHRvIHdyYXAgYSBkb2N1bWVudC4nKTtcblxuICAgIC8qKiBAdHlwZSB7RG9jdW1lbnR9ICovXG4gICAgdGhpcy5fZG9jdW1lbnQgPSBkb2N1bWVudDtcblxuICAgIC8qKlxuICAgICAqIEFsbCBtYW5hZ2VkIG5vZGVzIGtub3duIHRvIHRoaXMgSW5lcnRNYW5hZ2VyLiBJbiBhIG1hcCB0byBhbGxvdyBsb29raW5nIHVwIGJ5IE5vZGUuXG4gICAgICogQHR5cGUge01hcDxOb2RlLCBJbmVydE5vZGU+fVxuICAgICAqL1xuICAgIHRoaXMuX21hbmFnZWROb2RlcyA9IG5ldyBNYXAoKTtcblxuICAgIC8qKlxuICAgICAqIEFsbCBpbmVydCByb290cyBrbm93biB0byB0aGlzIEluZXJ0TWFuYWdlci4gSW4gYSBtYXAgdG8gYWxsb3cgbG9va2luZyB1cCBieSBOb2RlLlxuICAgICAqIEB0eXBlIHtNYXA8Tm9kZSwgSW5lcnRSb290Pn1cbiAgICAgKi9cbiAgICB0aGlzLl9pbmVydFJvb3RzID0gbmV3IE1hcCgpO1xuXG4gICAgLyoqXG4gICAgICogT2JzZXJ2ZXIgZm9yIG11dGF0aW9ucyBvbiBgZG9jdW1lbnQuYm9keWAuXG4gICAgICogQHR5cGUge011dGF0aW9uT2JzZXJ2ZXJ9XG4gICAgICovXG4gICAgdGhpcy5fb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcih0aGlzLl93YXRjaEZvckluZXJ0LmJpbmQodGhpcykpO1xuXG5cbiAgICAvLyBBZGQgaW5lcnQgc3R5bGUuXG4gICAgYWRkSW5lcnRTdHlsZShkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmJvZHkgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KTtcblxuICAgIC8vIFdhaXQgZm9yIGRvY3VtZW50IHRvIGJlIGxvYWRlZC5cbiAgICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2xvYWRpbmcnKSB7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgdGhpcy5fb25Eb2N1bWVudExvYWRlZC5iaW5kKHRoaXMpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fb25Eb2N1bWVudExvYWRlZCgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgd2hldGhlciB0aGUgZ2l2ZW4gZWxlbWVudCBzaG91bGQgYmUgYW4gaW5lcnQgcm9vdCBvciBub3QuXG4gICAqIEBwYXJhbSB7RWxlbWVudH0gcm9vdFxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IGluZXJ0XG4gICAqL1xuICBzZXRJbmVydChyb290LCBpbmVydCkge1xuICAgIGlmIChpbmVydCkge1xuICAgICAgaWYgKHRoaXMuX2luZXJ0Um9vdHMuaGFzKHJvb3QpKSAgIC8vIGVsZW1lbnQgaXMgYWxyZWFkeSBpbmVydFxuICAgICAgICByZXR1cm47XG5cbiAgICAgIGNvbnN0IGluZXJ0Um9vdCA9IG5ldyBJbmVydFJvb3Qocm9vdCwgdGhpcyk7XG4gICAgICByb290LnNldEF0dHJpYnV0ZSgnaW5lcnQnLCAnJyk7XG4gICAgICB0aGlzLl9pbmVydFJvb3RzLnNldChyb290LCBpbmVydFJvb3QpO1xuICAgICAgLy8gSWYgbm90IGNvbnRhaW5lZCBpbiB0aGUgZG9jdW1lbnQsIGl0IG11c3QgYmUgaW4gYSBzaGFkb3dSb290LlxuICAgICAgLy8gRW5zdXJlIGluZXJ0IHN0eWxlcyBhcmUgYWRkZWQgdGhlcmUuXG4gICAgICBpZiAoIXRoaXMuX2RvY3VtZW50LmJvZHkuY29udGFpbnMocm9vdCkpIHtcbiAgICAgICAgbGV0IHBhcmVudCA9IHJvb3QucGFyZW50Tm9kZTtcbiAgICAgICAgd2hpbGUgKHBhcmVudCkge1xuICAgICAgICAgIGlmIChwYXJlbnQubm9kZVR5cGUgPT09IDExKSB7XG4gICAgICAgICAgICBhZGRJbmVydFN0eWxlKHBhcmVudCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnROb2RlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghdGhpcy5faW5lcnRSb290cy5oYXMocm9vdCkpICAvLyBlbGVtZW50IGlzIGFscmVhZHkgbm9uLWluZXJ0XG4gICAgICAgIHJldHVybjtcblxuICAgICAgY29uc3QgaW5lcnRSb290ID0gdGhpcy5faW5lcnRSb290cy5nZXQocm9vdCk7XG4gICAgICBpbmVydFJvb3QuZGVzdHJ1Y3RvcigpO1xuICAgICAgdGhpcy5faW5lcnRSb290cy5kZWxldGUocm9vdCk7XG4gICAgICByb290LnJlbW92ZUF0dHJpYnV0ZSgnaW5lcnQnKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBJbmVydFJvb3Qgb2JqZWN0IGNvcnJlc3BvbmRpbmcgdG8gdGhlIGdpdmVuIGluZXJ0IHJvb3QgZWxlbWVudCwgaWYgYW55LlxuICAgKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnRcbiAgICogQHJldHVybiB7SW5lcnRSb290P31cbiAgICovXG4gIGdldEluZXJ0Um9vdChlbGVtZW50KSB7XG4gICAgcmV0dXJuIHRoaXMuX2luZXJ0Um9vdHMuZ2V0KGVsZW1lbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHRoZSBnaXZlbiBJbmVydFJvb3QgYXMgbWFuYWdpbmcgdGhlIGdpdmVuIG5vZGUuXG4gICAqIEluIHRoZSBjYXNlIHdoZXJlIHRoZSBub2RlIGhhcyBhIHByZXZpb3VzbHkgZXhpc3RpbmcgaW5lcnQgcm9vdCwgdGhpcyBpbmVydCByb290IHdpbGxcbiAgICogYmUgYWRkZWQgdG8gaXRzIHNldCBvZiBpbmVydCByb290cy5cbiAgICogQHBhcmFtIHtOb2RlfSBub2RlXG4gICAqIEBwYXJhbSB7SW5lcnRSb290fSBpbmVydFJvb3RcbiAgICogQHJldHVybiB7SW5lcnROb2RlfSBpbmVydE5vZGVcbiAgICovXG4gIHJlZ2lzdGVyKG5vZGUsIGluZXJ0Um9vdCkge1xuICAgIGxldCBpbmVydE5vZGUgPSB0aGlzLl9tYW5hZ2VkTm9kZXMuZ2V0KG5vZGUpO1xuICAgIGlmIChpbmVydE5vZGUgIT09IHVuZGVmaW5lZCkgeyAgLy8gbm9kZSB3YXMgYWxyZWFkeSBpbiBhbiBpbmVydCBzdWJ0cmVlXG4gICAgICBpbmVydE5vZGUuYWRkSW5lcnRSb290KGluZXJ0Um9vdCk7XG4gICAgICAvLyBVcGRhdGUgc2F2ZWQgdGFiaW5kZXggdmFsdWUgaWYgbmVjZXNzYXJ5XG4gICAgICBpbmVydE5vZGUuZW5zdXJlVW50YWJiYWJsZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpbmVydE5vZGUgPSBuZXcgSW5lcnROb2RlKG5vZGUsIGluZXJ0Um9vdCk7XG4gICAgfVxuXG4gICAgdGhpcy5fbWFuYWdlZE5vZGVzLnNldChub2RlLCBpbmVydE5vZGUpO1xuXG4gICAgcmV0dXJuIGluZXJ0Tm9kZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZS1yZWdpc3RlciB0aGUgZ2l2ZW4gSW5lcnRSb290IGFzIG1hbmFnaW5nIHRoZSBnaXZlbiBpbmVydCBub2RlLlxuICAgKiBSZW1vdmVzIHRoZSBpbmVydCByb290IGZyb20gdGhlIEluZXJ0Tm9kZSdzIHNldCBvZiBtYW5hZ2luZyBpbmVydCByb290cywgYW5kIHJlbW92ZSB0aGUgaW5lcnRcbiAgICogbm9kZSBmcm9tIHRoZSBJbmVydE1hbmFnZXIncyBzZXQgb2YgbWFuYWdlZCBub2RlcyBpZiBpdCBpcyBkZXN0cm95ZWQuXG4gICAqIElmIHRoZSBub2RlIGlzIG5vdCBjdXJyZW50bHkgbWFuYWdlZCwgdGhpcyBpcyBlc3NlbnRpYWxseSBhIG5vLW9wLlxuICAgKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAgICogQHBhcmFtIHtJbmVydFJvb3R9IGluZXJ0Um9vdFxuICAgKiBAcmV0dXJuIHtJbmVydE5vZGU/fSBUaGUgcG90ZW50aWFsbHkgZGVzdHJveWVkIEluZXJ0Tm9kZSBhc3NvY2lhdGVkIHdpdGggdGhpcyBub2RlLCBpZiBhbnkuXG4gICAqL1xuICBkZXJlZ2lzdGVyKG5vZGUsIGluZXJ0Um9vdCkge1xuICAgIGNvbnN0IGluZXJ0Tm9kZSA9IHRoaXMuX21hbmFnZWROb2Rlcy5nZXQobm9kZSk7XG4gICAgaWYgKCFpbmVydE5vZGUpXG4gICAgICByZXR1cm4gbnVsbDtcblxuICAgIGluZXJ0Tm9kZS5yZW1vdmVJbmVydFJvb3QoaW5lcnRSb290KTtcbiAgICBpZiAoaW5lcnROb2RlLmRlc3Ryb3llZClcbiAgICAgIHRoaXMuX21hbmFnZWROb2Rlcy5kZWxldGUobm9kZSk7XG5cbiAgICByZXR1cm4gaW5lcnROb2RlO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIHVzZWQgd2hlbiBkb2N1bWVudCBoYXMgZmluaXNoZWQgbG9hZGluZy5cbiAgICovXG4gIF9vbkRvY3VtZW50TG9hZGVkKCkge1xuICAgIC8vIEZpbmQgYWxsIGluZXJ0IHJvb3RzIGluIGRvY3VtZW50IGFuZCBtYWtlIHRoZW0gYWN0dWFsbHkgaW5lcnQuXG4gICAgY29uc3QgaW5lcnRFbGVtZW50cyA9IEFycmF5LmZyb20odGhpcy5fZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2luZXJ0XScpKTtcbiAgICBmb3IgKGxldCBpbmVydEVsZW1lbnQgb2YgaW5lcnRFbGVtZW50cylcbiAgICAgIHRoaXMuc2V0SW5lcnQoaW5lcnRFbGVtZW50LCB0cnVlKTtcblxuICAgIC8vIENvbW1lbnQgdGhpcyBvdXQgdG8gdXNlIHByb2dyYW1tYXRpYyBBUEkgb25seS5cbiAgICB0aGlzLl9vYnNlcnZlci5vYnNlcnZlKHRoaXMuX2RvY3VtZW50LmJvZHksIHsgYXR0cmlidXRlczogdHJ1ZSwgc3VidHJlZTogdHJ1ZSwgY2hpbGRMaXN0OiB0cnVlIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIHVzZWQgd2hlbiBtdXRhdGlvbiBvYnNlcnZlciBkZXRlY3RzIGF0dHJpYnV0ZSBjaGFuZ2VzLlxuICAgKiBAcGFyYW0ge011dGF0aW9uUmVjb3JkfSByZWNvcmRzXG4gICAqIEBwYXJhbSB7TXV0YXRpb25PYnNlcnZlcn0gc2VsZlxuICAgKi9cbiAgX3dhdGNoRm9ySW5lcnQocmVjb3Jkcywgc2VsZikge1xuICAgIGZvciAobGV0IHJlY29yZCBvZiByZWNvcmRzKSB7XG4gICAgICBzd2l0Y2ggKHJlY29yZC50eXBlKSB7XG4gICAgICBjYXNlICdjaGlsZExpc3QnOlxuICAgICAgICBmb3IgKGxldCBub2RlIG9mIEFycmF5LmZyb20ocmVjb3JkLmFkZGVkTm9kZXMpKSB7XG4gICAgICAgICAgaWYgKG5vZGUubm9kZVR5cGUgIT09IE5vZGUuRUxFTUVOVF9OT0RFKVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgY29uc3QgaW5lcnRFbGVtZW50cyA9IEFycmF5LmZyb20obm9kZS5xdWVyeVNlbGVjdG9yQWxsKCdbaW5lcnRdJykpO1xuICAgICAgICAgIGlmIChub2RlLm1hdGNoZXMoJ1tpbmVydF0nKSlcbiAgICAgICAgICAgIGluZXJ0RWxlbWVudHMudW5zaGlmdChub2RlKTtcbiAgICAgICAgICBmb3IgKGxldCBpbmVydEVsZW1lbnQgb2YgaW5lcnRFbGVtZW50cylcbiAgICAgICAgICAgIHRoaXMuc2V0SW5lcnQoaW5lcnRFbGVtZW50LCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2F0dHJpYnV0ZXMnOlxuICAgICAgICBpZiAocmVjb3JkLmF0dHJpYnV0ZU5hbWUgIT09ICdpbmVydCcpXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IHJlY29yZC50YXJnZXQ7XG4gICAgICAgIGNvbnN0IGluZXJ0ID0gdGFyZ2V0Lmhhc0F0dHJpYnV0ZSgnaW5lcnQnKTtcbiAgICAgICAgdGhpcy5zZXRJbmVydCh0YXJnZXQsIGluZXJ0KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbiAvKipcbiAgKiBSZWN1cnNpdmVseSB3YWxrIHRoZSBjb21wb3NlZCB0cmVlIGZyb20gfG5vZGV8LlxuICAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICAqIEBwYXJhbSB7KGZ1bmN0aW9uIChFbGVtZW50KSk9fSBjYWxsYmFjayBDYWxsYmFjayB0byBiZSBjYWxsZWQgZm9yIGVhY2ggZWxlbWVudCB0cmF2ZXJzZWQsXG4gICogICAgIGJlZm9yZSBkZXNjZW5kaW5nIGludG8gY2hpbGQgbm9kZXMuXG4gICogQHBhcmFtIHtTaGFkb3dSb290PX0gc2hhZG93Um9vdEFuY2VzdG9yIFRoZSBuZWFyZXN0IFNoYWRvd1Jvb3QgYW5jZXN0b3IsIGlmIGFueS5cbiAgKi9cbmZ1bmN0aW9uIGNvbXBvc2VkVHJlZVdhbGsobm9kZSwgY2FsbGJhY2ssIHNoYWRvd1Jvb3RBbmNlc3Rvcikge1xuICBpZiAobm9kZS5ub2RlVHlwZSA9PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgIGNvbnN0IGVsZW1lbnQgPSAvKiogQHR5cGUge0VsZW1lbnR9ICovIChub2RlKTtcbiAgICBpZiAoY2FsbGJhY2spXG4gICAgICBjYWxsYmFjayhlbGVtZW50KVxuXG4gICAgLy8gRGVzY2VuZCBpbnRvIG5vZGU6XG4gICAgLy8gSWYgaXQgaGFzIGEgU2hhZG93Um9vdCwgaWdub3JlIGFsbCBjaGlsZCBlbGVtZW50cyAtIHRoZXNlIHdpbGwgYmUgcGlja2VkXG4gICAgLy8gdXAgYnkgdGhlIDxjb250ZW50PiBvciA8c2hhZG93PiBlbGVtZW50cy4gRGVzY2VuZCBzdHJhaWdodCBpbnRvIHRoZVxuICAgIC8vIFNoYWRvd1Jvb3QuXG4gICAgY29uc3Qgc2hhZG93Um9vdCA9IGVsZW1lbnQuc2hhZG93Um9vdCB8fCBlbGVtZW50LndlYmtpdFNoYWRvd1Jvb3Q7XG4gICAgaWYgKHNoYWRvd1Jvb3QpIHtcbiAgICAgIGNvbXBvc2VkVHJlZVdhbGsoc2hhZG93Um9vdCwgY2FsbGJhY2ssIHNoYWRvd1Jvb3QpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIGl0IGlzIGEgPGNvbnRlbnQ+IGVsZW1lbnQsIGRlc2NlbmQgaW50byBkaXN0cmlidXRlZCBlbGVtZW50cyAtIHRoZXNlXG4gICAgLy8gYXJlIGVsZW1lbnRzIGZyb20gb3V0c2lkZSB0aGUgc2hhZG93IHJvb3Qgd2hpY2ggYXJlIHJlbmRlcmVkIGluc2lkZSB0aGVcbiAgICAvLyBzaGFkb3cgRE9NLlxuICAgIGlmIChlbGVtZW50LmxvY2FsTmFtZSA9PSAnY29udGVudCcpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSAvKiogQHR5cGUge0hUTUxDb250ZW50RWxlbWVudH0gKi8gKGVsZW1lbnQpO1xuICAgICAgLy8gVmVyaWZpZXMgaWYgU2hhZG93RG9tIHYwIGlzIHN1cHBvcnRlZC5cbiAgICAgIGNvbnN0IGRpc3RyaWJ1dGVkTm9kZXMgPSBjb250ZW50LmdldERpc3RyaWJ1dGVkTm9kZXMgP1xuICAgICAgICBjb250ZW50LmdldERpc3RyaWJ1dGVkTm9kZXMoKSA6IFtdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkaXN0cmlidXRlZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbXBvc2VkVHJlZVdhbGsoZGlzdHJpYnV0ZWROb2Rlc1tpXSwgY2FsbGJhY2ssIHNoYWRvd1Jvb3RBbmNlc3Rvcik7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgaXQgaXMgYSA8c2xvdD4gZWxlbWVudCwgZGVzY2VuZCBpbnRvIGFzc2lnbmVkIG5vZGVzIC0gdGhlc2VcbiAgICAvLyBhcmUgZWxlbWVudHMgZnJvbSBvdXRzaWRlIHRoZSBzaGFkb3cgcm9vdCB3aGljaCBhcmUgcmVuZGVyZWQgaW5zaWRlIHRoZVxuICAgIC8vIHNoYWRvdyBET00uXG4gICAgaWYgKGVsZW1lbnQubG9jYWxOYW1lID09ICdzbG90Jykge1xuICAgICAgY29uc3Qgc2xvdCA9IC8qKiBAdHlwZSB7SFRNTFNsb3RFbGVtZW50fSAqLyAoZWxlbWVudCk7XG4gICAgICAvLyBWZXJpZnkgaWYgU2hhZG93RG9tIHYxIGlzIHN1cHBvcnRlZC5cbiAgICAgIGNvbnN0IGRpc3RyaWJ1dGVkTm9kZXMgPSBzbG90LmFzc2lnbmVkTm9kZXMgP1xuICAgICAgICBzbG90LmFzc2lnbmVkTm9kZXMoeyBmbGF0dGVuOiB0cnVlIH0pIDogW107XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRpc3RyaWJ1dGVkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29tcG9zZWRUcmVlV2FsayhkaXN0cmlidXRlZE5vZGVzW2ldLCBjYWxsYmFjaywgc2hhZG93Um9vdEFuY2VzdG9yKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICAvLyBJZiBpdCBpcyBuZWl0aGVyIHRoZSBwYXJlbnQgb2YgYSBTaGFkb3dSb290LCBhIDxjb250ZW50PiBlbGVtZW50LCBhIDxzbG90PlxuICAvLyBlbGVtZW50LCBub3IgYSA8c2hhZG93PiBlbGVtZW50IHJlY3Vyc2Ugbm9ybWFsbHkuXG4gIGxldCBjaGlsZCA9IG5vZGUuZmlyc3RDaGlsZDtcbiAgd2hpbGUgKGNoaWxkICE9IG51bGwpIHtcbiAgICBjb21wb3NlZFRyZWVXYWxrKGNoaWxkLCBjYWxsYmFjaywgc2hhZG93Um9vdEFuY2VzdG9yKTtcbiAgICBjaGlsZCA9IGNoaWxkLm5leHRTaWJsaW5nO1xuICB9XG59XG5cbi8qKlxuICogQWRkcyBhIHN0eWxlIGVsZW1lbnQgdG8gdGhlIG5vZGUgY29udGFpbmluZyB0aGUgaW5lcnQgc3BlY2lmaWMgc3R5bGVzXG4gKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAqL1xuZnVuY3Rpb24gYWRkSW5lcnRTdHlsZShub2RlKSB7XG4gIGlmIChub2RlLnF1ZXJ5U2VsZWN0b3IoJ3N0eWxlI2luZXJ0LXN0eWxlJykpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3Qgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICBzdHlsZS5zZXRBdHRyaWJ1dGUoJ2lkJywgJ2luZXJ0LXN0eWxlJyk7XG4gIHN0eWxlLnRleHRDb250ZW50ID0gXCJcXG5cIitcbiAgICAgICAgICAgICAgICAgICAgICBcIltpbmVydF0ge1xcblwiICtcbiAgICAgICAgICAgICAgICAgICAgICBcIiAgcG9pbnRlci1ldmVudHM6IG5vbmU7XFxuXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIFwiICBjdXJzb3I6IGRlZmF1bHQ7XFxuXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIFwifVxcblwiICtcbiAgICAgICAgICAgICAgICAgICAgICBcIlxcblwiICtcbiAgICAgICAgICAgICAgICAgICAgICBcIltpbmVydF0sIFtpbmVydF0gKiB7XFxuXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIFwiICB1c2VyLXNlbGVjdDogbm9uZTtcXG5cIiArXG4gICAgICAgICAgICAgICAgICAgICAgXCIgIC13ZWJraXQtdXNlci1zZWxlY3Q6IG5vbmU7XFxuXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIFwiICAtbW96LXVzZXItc2VsZWN0OiBub25lO1xcblwiICtcbiAgICAgICAgICAgICAgICAgICAgICBcIiAgLW1zLXVzZXItc2VsZWN0OiBub25lO1xcblwiICtcbiAgICAgICAgICAgICAgICAgICAgICBcIiAgb3ZlcmZsb3c6IGhpZGRlbiAhaW1wb3J0YW50O1xcblwiICtcbiAgICAgICAgICAgICAgICAgICAgICBcIiAgdXNlci1tb2RpZnk6IG5vbmUgIWltcG9ydGFudDtcXG5cIiArXG4gICAgICAgICAgICAgICAgICAgICAgXCJ9XFxuXCI7XG4gIG5vZGUuYXBwZW5kQ2hpbGQoc3R5bGUpO1xufVxuXG5jb25zdCBpbmVydE1hbmFnZXIgPSBuZXcgSW5lcnRNYW5hZ2VyKGRvY3VtZW50KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEVsZW1lbnQucHJvdG90eXBlLCAnaW5lcnQnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuaGFzQXR0cmlidXRlKCdpbmVydCcpOyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0OiBmdW5jdGlvbihpbmVydCkgeyBpbmVydE1hbmFnZXIuc2V0SW5lcnQodGhpcywgaW5lcnQpIH1cbiAgICAgICAgICAgICAgICAgICAgICB9KTtcblxufSkoZG9jdW1lbnQpO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
