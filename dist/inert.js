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
    style.textContent = "\n" + "[inert] {\n" + "  pointer-events: none;\n" + "  cursor: default;\n" + "}\n" + "\n" + "[inert], [inert] * {\n" + "  user-select: none;\n" + "  -webkit-user-select: none;\n" + "  -moz-user-select: none;\n" + "  -ms-user-select: none;\n" + "}\n";
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZXJ0LmpzIl0sIm5hbWVzIjpbImRvY3VtZW50IiwiX2ZvY3VzYWJsZUVsZW1lbnRzU3RyaW5nIiwiam9pbiIsIkluZXJ0Um9vdCIsInJvb3RFbGVtZW50IiwiaW5lcnRNYW5hZ2VyIiwiX2luZXJ0TWFuYWdlciIsIl9yb290RWxlbWVudCIsIl9tYW5hZ2VkTm9kZXMiLCJTZXQiLCJzZXRBdHRyaWJ1dGUiLCJfbWFrZVN1YnRyZWVVbmZvY3VzYWJsZSIsIl9vYnNlcnZlciIsIk11dGF0aW9uT2JzZXJ2ZXIiLCJfb25NdXRhdGlvbiIsImJpbmQiLCJvYnNlcnZlIiwiYXR0cmlidXRlcyIsImNoaWxkTGlzdCIsInN1YnRyZWUiLCJkaXNjb25uZWN0IiwicmVtb3ZlQXR0cmlidXRlIiwiaW5lcnROb2RlIiwiX3VubWFuYWdlTm9kZSIsIm5vZGUiLCJzdGFydE5vZGUiLCJjb21wb3NlZFRyZWVXYWxrIiwiX3Zpc2l0Tm9kZSIsImFjdGl2ZUVsZW1lbnQiLCJjb250YWlucyIsInJvb3QiLCJ1bmRlZmluZWQiLCJub2RlVHlwZSIsIk5vZGUiLCJET0NVTUVOVF9GUkFHTUVOVF9OT0RFIiwicGFyZW50Tm9kZSIsImJsdXIiLCJFTEVNRU5UX05PREUiLCJoYXNBdHRyaWJ1dGUiLCJfYWRvcHRJbmVydFJvb3QiLCJtYXRjaGVzIiwiX21hbmFnZU5vZGUiLCJyZWdpc3RlciIsImFkZCIsImRlcmVnaXN0ZXIiLCJkZWxldGUiLCJpbmVydFN1YnJvb3QiLCJnZXRJbmVydFJvb3QiLCJzZXRJbmVydCIsIm1hbmFnZWROb2RlcyIsInNhdmVkSW5lcnROb2RlIiwicmVjb3JkcyIsInNlbGYiLCJyZWNvcmQiLCJ0YXJnZXQiLCJ0eXBlIiwiQXJyYXkiLCJmcm9tIiwiYWRkZWROb2RlcyIsInJlbW92ZWROb2RlcyIsIl91bm1hbmFnZVN1YnRyZWUiLCJhdHRyaWJ1dGVOYW1lIiwibWFuYWdlZE5vZGUiLCJJbmVydE5vZGUiLCJpbmVydFJvb3QiLCJfbm9kZSIsIl9vdmVycm9kZUZvY3VzTWV0aG9kIiwiX2luZXJ0Um9vdHMiLCJfZGVzdHJveWVkIiwiZW5zdXJlVW50YWJiYWJsZSIsIl90aHJvd0lmRGVzdHJveWVkIiwiaGFzU2F2ZWRUYWJJbmRleCIsInNhdmVkVGFiSW5kZXgiLCJmb2N1cyIsImRlc3Ryb3llZCIsIkVycm9yIiwidGFiSW5kZXgiLCJfc2F2ZWRUYWJJbmRleCIsInNpemUiLCJkZXN0cnVjdG9yIiwiSW5lcnRNYW5hZ2VyIiwiX2RvY3VtZW50IiwiTWFwIiwiX3dhdGNoRm9ySW5lcnQiLCJhZGRJbmVydFN0eWxlIiwiaGVhZCIsImJvZHkiLCJkb2N1bWVudEVsZW1lbnQiLCJyZWFkeVN0YXRlIiwiYWRkRXZlbnRMaXN0ZW5lciIsIl9vbkRvY3VtZW50TG9hZGVkIiwiaW5lcnQiLCJoYXMiLCJzZXQiLCJwYXJlbnQiLCJnZXQiLCJlbGVtZW50IiwiYWRkSW5lcnRSb290IiwicmVtb3ZlSW5lcnRSb290IiwiaW5lcnRFbGVtZW50cyIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJpbmVydEVsZW1lbnQiLCJ1bnNoaWZ0IiwiY2FsbGJhY2siLCJzaGFkb3dSb290QW5jZXN0b3IiLCJzaGFkb3dSb290Iiwid2Via2l0U2hhZG93Um9vdCIsImxvY2FsTmFtZSIsImNvbnRlbnQiLCJkaXN0cmlidXRlZE5vZGVzIiwiZ2V0RGlzdHJpYnV0ZWROb2RlcyIsImkiLCJsZW5ndGgiLCJzbG90IiwiYXNzaWduZWROb2RlcyIsImZsYXR0ZW4iLCJjaGlsZCIsImZpcnN0Q2hpbGQiLCJuZXh0U2libGluZyIsInF1ZXJ5U2VsZWN0b3IiLCJzdHlsZSIsImNyZWF0ZUVsZW1lbnQiLCJ0ZXh0Q29udGVudCIsImFwcGVuZENoaWxkIiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJFbGVtZW50IiwicHJvdG90eXBlIiwiZW51bWVyYWJsZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBaUJBLENBQUMsVUFBU0EsUUFBVCxFQUFtQjs7QUFFcEI7QUFDQSxNQUFN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RixtQkFBYTJDLFFBQWIsQ0FBc0IsSUFBdEIsRUFBNEIyQyxLQUE1QjtBQUFvQztBQUhqQyxHQUFsRDtBQU1DLENBdG5CRCxFQXNuQkczRixRQXRuQkgiLCJmaWxlIjoiaW5lcnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG4oZnVuY3Rpb24oZG9jdW1lbnQpIHtcblxuLyoqIEB0eXBlIHtzdHJpbmd9ICovXG5jb25zdCBfZm9jdXNhYmxlRWxlbWVudHNTdHJpbmcgPSBbJ2FbaHJlZl0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdhcmVhW2hyZWZdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnaW5wdXQ6bm90KFtkaXNhYmxlZF0pJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc2VsZWN0Om5vdChbZGlzYWJsZWRdKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3RleHRhcmVhOm5vdChbZGlzYWJsZWRdKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2J1dHRvbjpub3QoW2Rpc2FibGVkXSknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdpZnJhbWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdlbWJlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1tjb250ZW50ZWRpdGFibGVdJ10uam9pbignLCcpO1xuXG4vKipcbiAqIGBJbmVydFJvb3RgIG1hbmFnZXMgYSBzaW5nbGUgaW5lcnQgc3VidHJlZSwgaS5lLiBhIERPTSBzdWJ0cmVlIHdob3NlIHJvb3QgZWxlbWVudCBoYXMgYW4gYGluZXJ0YFxuICogYXR0cmlidXRlLlxuICpcbiAqIEl0cyBtYWluIGZ1bmN0aW9ucyBhcmU6XG4gKlxuICogLSB0byBjcmVhdGUgYW5kIG1haW50YWluIGEgc2V0IG9mIG1hbmFnZWQgYEluZXJ0Tm9kZWBzLCBpbmNsdWRpbmcgd2hlbiBtdXRhdGlvbnMgb2NjdXIgaW4gdGhlXG4gKiAgIHN1YnRyZWUuIFRoZSBgbWFrZVN1YnRyZWVVbmZvY3VzYWJsZSgpYCBtZXRob2QgaGFuZGxlcyBjb2xsZWN0aW5nIGBJbmVydE5vZGVgcyB2aWEgcmVnaXN0ZXJpbmdcbiAqICAgZWFjaCBmb2N1c2FibGUgbm9kZSBpbiB0aGUgc3VidHJlZSB3aXRoIHRoZSBzaW5nbGV0b24gYEluZXJ0TWFuYWdlcmAgd2hpY2ggbWFuYWdlcyBhbGwga25vd25cbiAqICAgZm9jdXNhYmxlIG5vZGVzIHdpdGhpbiBpbmVydCBzdWJ0cmVlcy4gYEluZXJ0TWFuYWdlcmAgZW5zdXJlcyB0aGF0IGEgc2luZ2xlIGBJbmVydE5vZGVgXG4gKiAgIGluc3RhbmNlIGV4aXN0cyBmb3IgZWFjaCBmb2N1c2FibGUgbm9kZSB3aGljaCBoYXMgYXQgbGVhc3Qgb25lIGluZXJ0IHJvb3QgYXMgYW4gYW5jZXN0b3IuXG4gKlxuICogLSB0byBub3RpZnkgYWxsIG1hbmFnZWQgYEluZXJ0Tm9kZWBzIHdoZW4gdGhpcyBzdWJ0cmVlIHN0b3BzIGJlaW5nIGluZXJ0IChpLmUuIHdoZW4gdGhlIGBpbmVydGBcbiAqICAgYXR0cmlidXRlIGlzIHJlbW92ZWQgZnJvbSB0aGUgcm9vdCBub2RlKS4gVGhpcyBpcyBoYW5kbGVkIGluIHRoZSBkZXN0cnVjdG9yLCB3aGljaCBjYWxscyB0aGVcbiAqICAgYGRlcmVnaXN0ZXJgIG1ldGhvZCBvbiBgSW5lcnRNYW5hZ2VyYCBmb3IgZWFjaCBtYW5hZ2VkIGluZXJ0IG5vZGUuXG4gKi9cbmNsYXNzIEluZXJ0Um9vdCB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge0VsZW1lbnR9IHJvb3RFbGVtZW50IFRoZSBFbGVtZW50IGF0IHRoZSByb290IG9mIHRoZSBpbmVydCBzdWJ0cmVlLlxuICAgKiBAcGFyYW0ge0luZXJ0TWFuYWdlcn0gaW5lcnRNYW5hZ2VyIFRoZSBnbG9iYWwgc2luZ2xldG9uIEluZXJ0TWFuYWdlciBvYmplY3QuXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihyb290RWxlbWVudCwgaW5lcnRNYW5hZ2VyKSB7XG4gICAgLyoqIEB0eXBlIHtJbmVydE1hbmFnZXJ9ICovXG4gICAgdGhpcy5faW5lcnRNYW5hZ2VyID0gaW5lcnRNYW5hZ2VyO1xuXG4gICAgLyoqIEB0eXBlIHtFbGVtZW50fSAqL1xuICAgIHRoaXMuX3Jvb3RFbGVtZW50ID0gcm9vdEVsZW1lbnQ7XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSB7U2V0PE5vZGU+fVxuICAgICAqIEFsbCBtYW5hZ2VkIGZvY3VzYWJsZSBub2RlcyBpbiB0aGlzIEluZXJ0Um9vdCdzIHN1YnRyZWUuXG4gICAgICovXG4gICAgdGhpcy5fbWFuYWdlZE5vZGVzID0gbmV3IFNldChbXSk7XG5cbiAgICAvLyBNYWtlIHRoZSBzdWJ0cmVlIGhpZGRlbiBmcm9tIGFzc2lzdGl2ZSB0ZWNobm9sb2d5XG4gICAgdGhpcy5fcm9vdEVsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG5cbiAgICAvLyBNYWtlIGFsbCBmb2N1c2FibGUgZWxlbWVudHMgaW4gdGhlIHN1YnRyZWUgdW5mb2N1c2FibGUgYW5kIGFkZCB0aGVtIHRvIF9tYW5hZ2VkTm9kZXNcbiAgICB0aGlzLl9tYWtlU3VidHJlZVVuZm9jdXNhYmxlKHRoaXMuX3Jvb3RFbGVtZW50KTtcblxuICAgIC8vIFdhdGNoIGZvcjpcbiAgICAvLyAtIGFueSBhZGRpdGlvbnMgaW4gdGhlIHN1YnRyZWU6IG1ha2UgdGhlbSB1bmZvY3VzYWJsZSB0b29cbiAgICAvLyAtIGFueSByZW1vdmFscyBmcm9tIHRoZSBzdWJ0cmVlOiByZW1vdmUgdGhlbSBmcm9tIHRoaXMgaW5lcnQgcm9vdCdzIG1hbmFnZWQgbm9kZXNcbiAgICAvLyAtIGF0dHJpYnV0ZSBjaGFuZ2VzOiBpZiBgdGFiaW5kZXhgIGlzIGFkZGVkLCBvciByZW1vdmVkIGZyb20gYW4gaW50cmluc2ljYWxseSBmb2N1c2FibGUgZWxlbWVudCxcbiAgICAvLyAgIG1ha2UgdGhhdCBub2RlIGEgbWFuYWdlZCBub2RlLlxuICAgIHRoaXMuX29ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIodGhpcy5fb25NdXRhdGlvbi5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLl9vYnNlcnZlci5vYnNlcnZlKHRoaXMuX3Jvb3RFbGVtZW50LCB7IGF0dHJpYnV0ZXM6IHRydWUsIGNoaWxkTGlzdDogdHJ1ZSwgc3VidHJlZTogdHJ1ZSB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsIHRoaXMgd2hlbmV2ZXIgdGhpcyBvYmplY3QgaXMgYWJvdXQgdG8gYmVjb21lIG9ic29sZXRlLiAgVGhpcyB1bndpbmRzIGFsbCBvZiB0aGUgc3RhdGVcbiAgICogc3RvcmVkIGluIHRoaXMgb2JqZWN0IGFuZCB1cGRhdGVzIHRoZSBzdGF0ZSBvZiBhbGwgb2YgdGhlIG1hbmFnZWQgbm9kZXMuXG4gICAqL1xuICBkZXN0cnVjdG9yKCkge1xuICAgIHRoaXMuX29ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbiAgICB0aGlzLl9vYnNlcnZlciA9IG51bGw7XG5cbiAgICBpZiAodGhpcy5fcm9vdEVsZW1lbnQpXG4gICAgICB0aGlzLl9yb290RWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJyk7XG4gICAgdGhpcy5fcm9vdEVsZW1lbnQgPSBudWxsO1xuXG4gICAgZm9yIChsZXQgaW5lcnROb2RlIG9mIHRoaXMuX21hbmFnZWROb2RlcylcbiAgICAgIHRoaXMuX3VubWFuYWdlTm9kZShpbmVydE5vZGUubm9kZSk7XG5cbiAgICB0aGlzLl9tYW5hZ2VkTm9kZXMgPSBudWxsO1xuXG4gICAgdGhpcy5faW5lcnRNYW5hZ2VyID0gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIHtTZXQ8SW5lcnROb2RlPn0gQSBjb3B5IG9mIHRoaXMgSW5lcnRSb290J3MgbWFuYWdlZCBub2RlcyBzZXQuXG4gICAqL1xuICBnZXQgbWFuYWdlZE5vZGVzKCkge1xuICAgIHJldHVybiBuZXcgU2V0KHRoaXMuX21hbmFnZWROb2Rlcyk7XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHtOb2RlfSBzdGFydE5vZGVcbiAgICovXG4gIF9tYWtlU3VidHJlZVVuZm9jdXNhYmxlKHN0YXJ0Tm9kZSkge1xuICAgIGNvbXBvc2VkVHJlZVdhbGsoc3RhcnROb2RlLCAobm9kZSkgPT4geyB0aGlzLl92aXNpdE5vZGUobm9kZSk7IH0pO1xuXG4gICAgbGV0IGFjdGl2ZUVsZW1lbnQgPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50O1xuICAgIGlmICghZG9jdW1lbnQuY29udGFpbnMoc3RhcnROb2RlKSkge1xuICAgICAgLy8gc3RhcnROb2RlIG1heSBiZSBpbiBzaGFkb3cgRE9NLCBzbyBmaW5kIGl0cyBuZWFyZXN0IHNoYWRvd1Jvb3QgdG8gZ2V0IHRoZSBhY3RpdmVFbGVtZW50LlxuICAgICAgbGV0IG5vZGUgPSBzdGFydE5vZGU7XG4gICAgICBsZXQgcm9vdCA9IHVuZGVmaW5lZDtcbiAgICAgIHdoaWxlIChub2RlKSB7XG4gICAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSBOb2RlLkRPQ1VNRU5UX0ZSQUdNRU5UX05PREUpIHtcbiAgICAgICAgICByb290ID0gbm9kZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgICAgfVxuICAgICAgaWYgKHJvb3QpXG4gICAgICAgIGFjdGl2ZUVsZW1lbnQgPSByb290LmFjdGl2ZUVsZW1lbnRcbiAgICB9XG4gICAgaWYgKHN0YXJ0Tm9kZS5jb250YWlucyhhY3RpdmVFbGVtZW50KSlcbiAgICAgIGFjdGl2ZUVsZW1lbnQuYmx1cigpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICAgKi9cbiAgX3Zpc2l0Tm9kZShub2RlKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgIT09IE5vZGUuRUxFTUVOVF9OT0RFKVxuICAgICAgcmV0dXJuO1xuXG4gICAgLy8gSWYgYSBkZXNjZW5kYW50IGluZXJ0IHJvb3QgYmVjb21lcyB1bi1pbmVydCwgaXRzIGRlc2NlbmRhbnRzIHdpbGwgc3RpbGwgYmUgaW5lcnQgYmVjYXVzZSBvZiB0aGlzXG4gICAgLy8gaW5lcnQgcm9vdCwgc28gYWxsIG9mIGl0cyBtYW5hZ2VkIG5vZGVzIG5lZWQgdG8gYmUgYWRvcHRlZCBieSB0aGlzIEluZXJ0Um9vdC5cbiAgICBpZiAobm9kZSAhPT0gdGhpcy5fcm9vdEVsZW1lbnQgJiYgbm9kZS5oYXNBdHRyaWJ1dGUoJ2luZXJ0JykpXG4gICAgICB0aGlzLl9hZG9wdEluZXJ0Um9vdChub2RlKTtcblxuICAgIGlmIChub2RlLm1hdGNoZXMoX2ZvY3VzYWJsZUVsZW1lbnRzU3RyaW5nKSB8fCBub2RlLmhhc0F0dHJpYnV0ZSgndGFiaW5kZXgnKSlcbiAgICAgIHRoaXMuX21hbmFnZU5vZGUobm9kZSk7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgdGhlIGdpdmVuIG5vZGUgd2l0aCB0aGlzIEluZXJ0Um9vdCBhbmQgd2l0aCBJbmVydE1hbmFnZXIuXG4gICAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICAgKi9cbiAgX21hbmFnZU5vZGUobm9kZSkge1xuICAgIGNvbnN0IGluZXJ0Tm9kZSA9IHRoaXMuX2luZXJ0TWFuYWdlci5yZWdpc3Rlcihub2RlLCB0aGlzKTtcbiAgICB0aGlzLl9tYW5hZ2VkTm9kZXMuYWRkKGluZXJ0Tm9kZSk7XG4gIH1cblxuICAvKipcbiAgICogVW5yZWdpc3RlciB0aGUgZ2l2ZW4gbm9kZSB3aXRoIHRoaXMgSW5lcnRSb290IGFuZCB3aXRoIEluZXJ0TWFuYWdlci5cbiAgICogQHBhcmFtIHtOb2RlfSBub2RlXG4gICAqL1xuICBfdW5tYW5hZ2VOb2RlKG5vZGUpIHtcbiAgICBjb25zdCBpbmVydE5vZGUgPSB0aGlzLl9pbmVydE1hbmFnZXIuZGVyZWdpc3Rlcihub2RlLCB0aGlzKTtcbiAgICBpZiAoaW5lcnROb2RlKVxuICAgICAgdGhpcy5fbWFuYWdlZE5vZGVzLmRlbGV0ZShpbmVydE5vZGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVucmVnaXN0ZXIgdGhlIGVudGlyZSBzdWJ0cmVlIHN0YXJ0aW5nIGF0IGBzdGFydE5vZGVgLlxuICAgKiBAcGFyYW0ge05vZGV9IHN0YXJ0Tm9kZVxuICAgKi9cbiAgX3VubWFuYWdlU3VidHJlZShzdGFydE5vZGUpIHtcbiAgICBjb21wb3NlZFRyZWVXYWxrKHN0YXJ0Tm9kZSwgKG5vZGUpID0+IHsgdGhpcy5fdW5tYW5hZ2VOb2RlKG5vZGUpOyB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJZiBhIGRlc2NlbmRhbnQgbm9kZSBpcyBmb3VuZCB3aXRoIGFuIGBpbmVydGAgYXR0cmlidXRlLCBhZG9wdCBpdHMgbWFuYWdlZCBub2Rlcy5cbiAgICogQHBhcmFtIHtOb2RlfSBub2RlXG4gICAqL1xuICBfYWRvcHRJbmVydFJvb3Qobm9kZSkge1xuICAgIGxldCBpbmVydFN1YnJvb3QgPSB0aGlzLl9pbmVydE1hbmFnZXIuZ2V0SW5lcnRSb290KG5vZGUpO1xuXG4gICAgLy8gRHVyaW5nIGluaXRpYWxpc2F0aW9uIHRoaXMgaW5lcnQgcm9vdCBtYXkgbm90IGhhdmUgYmVlbiByZWdpc3RlcmVkIHlldCxcbiAgICAvLyBzbyByZWdpc3RlciBpdCBub3cgaWYgbmVlZCBiZS5cbiAgICBpZiAoIWluZXJ0U3Vicm9vdCkge1xuICAgICAgdGhpcy5faW5lcnRNYW5hZ2VyLnNldEluZXJ0KG5vZGUsIHRydWUpO1xuICAgICAgaW5lcnRTdWJyb290ID0gdGhpcy5faW5lcnRNYW5hZ2VyLmdldEluZXJ0Um9vdChub2RlKTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBzYXZlZEluZXJ0Tm9kZSBvZiBpbmVydFN1YnJvb3QubWFuYWdlZE5vZGVzKVxuICAgICAgdGhpcy5fbWFuYWdlTm9kZShzYXZlZEluZXJ0Tm9kZS5ub2RlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsYmFjayB1c2VkIHdoZW4gbXV0YXRpb24gb2JzZXJ2ZXIgZGV0ZWN0cyBzdWJ0cmVlIGFkZGl0aW9ucywgcmVtb3ZhbHMsIG9yIGF0dHJpYnV0ZSBjaGFuZ2VzLlxuICAgKiBAcGFyYW0ge011dGF0aW9uUmVjb3JkfSByZWNvcmRzXG4gICAqIEBwYXJhbSB7TXV0YXRpb25PYnNlcnZlcn0gc2VsZlxuICAgKi9cbiAgX29uTXV0YXRpb24ocmVjb3Jkcywgc2VsZikge1xuICAgIGZvciAobGV0IHJlY29yZCBvZiByZWNvcmRzKSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSByZWNvcmQudGFyZ2V0O1xuICAgICAgaWYgKHJlY29yZC50eXBlID09PSAnY2hpbGRMaXN0Jykge1xuICAgICAgICAvLyBNYW5hZ2UgYWRkZWQgbm9kZXNcbiAgICAgICAgZm9yIChsZXQgbm9kZSBvZiBBcnJheS5mcm9tKHJlY29yZC5hZGRlZE5vZGVzKSlcbiAgICAgICAgICB0aGlzLl9tYWtlU3VidHJlZVVuZm9jdXNhYmxlKG5vZGUpO1xuXG4gICAgICAgIC8vIFVuLW1hbmFnZSByZW1vdmVkIG5vZGVzXG4gICAgICAgIGZvciAobGV0IG5vZGUgb2YgQXJyYXkuZnJvbShyZWNvcmQucmVtb3ZlZE5vZGVzKSlcbiAgICAgICAgICB0aGlzLl91bm1hbmFnZVN1YnRyZWUobm9kZSk7XG4gICAgICB9IGVsc2UgaWYgKHJlY29yZC50eXBlID09PSAnYXR0cmlidXRlcycpIHtcbiAgICAgICAgaWYgKHJlY29yZC5hdHRyaWJ1dGVOYW1lID09PSAndGFiaW5kZXgnKSB7XG4gICAgICAgICAgLy8gUmUtaW5pdGlhbGlzZSBpbmVydCBub2RlIGlmIHRhYmluZGV4IGNoYW5nZXNcbiAgICAgICAgICB0aGlzLl9tYW5hZ2VOb2RlKHRhcmdldCk7XG4gICAgICAgIH0gZWxzZSBpZiAodGFyZ2V0ICE9PSB0aGlzLl9yb290RWxlbWVudCAmJlxuICAgICAgICAgICAgICAgICAgIHJlY29yZC5hdHRyaWJ1dGVOYW1lID09PSAnaW5lcnQnICYmXG4gICAgICAgICAgICAgICAgICAgdGFyZ2V0Lmhhc0F0dHJpYnV0ZSgnaW5lcnQnKSkge1xuICAgICAgICAgIC8vIElmIGEgbmV3IGluZXJ0IHJvb3QgaXMgYWRkZWQsIGFkb3B0IGl0cyBtYW5hZ2VkIG5vZGVzIGFuZCBtYWtlIHN1cmUgaXQga25vd3MgYWJvdXQgdGhlXG4gICAgICAgICAgLy8gYWxyZWFkeSBtYW5hZ2VkIG5vZGVzIGZyb20gdGhpcyBpbmVydCBzdWJyb290LlxuICAgICAgICAgIHRoaXMuX2Fkb3B0SW5lcnRSb290KHRhcmdldCk7XG4gICAgICAgICAgY29uc3QgaW5lcnRTdWJyb290ID0gdGhpcy5faW5lcnRNYW5hZ2VyLmdldEluZXJ0Um9vdCh0YXJnZXQpO1xuICAgICAgICAgIGZvciAobGV0IG1hbmFnZWROb2RlIG9mIHRoaXMuX21hbmFnZWROb2Rlcykge1xuICAgICAgICAgICAgaWYgKHRhcmdldC5jb250YWlucyhtYW5hZ2VkTm9kZS5ub2RlKSlcbiAgICAgICAgICAgICAgaW5lcnRTdWJyb290Ll9tYW5hZ2VOb2RlKG1hbmFnZWROb2RlLm5vZGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIGBJbmVydE5vZGVgIGluaXRpYWxpc2VzIGFuZCBtYW5hZ2VzIGEgc2luZ2xlIGluZXJ0IG5vZGUuXG4gKiBBIG5vZGUgaXMgaW5lcnQgaWYgaXQgaXMgYSBkZXNjZW5kYW50IG9mIG9uZSBvciBtb3JlIGluZXJ0IHJvb3QgZWxlbWVudHMuXG4gKlxuICogT24gY29uc3RydWN0aW9uLCBgSW5lcnROb2RlYCBzYXZlcyB0aGUgZXhpc3RpbmcgYHRhYmluZGV4YCB2YWx1ZSBmb3IgdGhlIG5vZGUsIGlmIGFueSwgYW5kXG4gKiBlaXRoZXIgcmVtb3ZlcyB0aGUgYHRhYmluZGV4YCBhdHRyaWJ1dGUgb3Igc2V0cyBpdCB0byBgLTFgLCBkZXBlbmRpbmcgb24gd2hldGhlciB0aGUgZWxlbWVudFxuICogaXMgaW50cmluc2ljYWxseSBmb2N1c2FibGUgb3Igbm90LlxuICpcbiAqIGBJbmVydE5vZGVgIG1haW50YWlucyBhIHNldCBvZiBgSW5lcnRSb290YHMgd2hpY2ggYXJlIGRlc2NlbmRhbnRzIG9mIHRoaXMgYEluZXJ0Tm9kZWAuIFdoZW4gYW5cbiAqIGBJbmVydFJvb3RgIGlzIGRlc3Ryb3llZCwgYW5kIGNhbGxzIGBJbmVydE1hbmFnZXIuZGVyZWdpc3RlcigpYCwgdGhlIGBJbmVydE1hbmFnZXJgIG5vdGlmaWVzIHRoZVxuICogYEluZXJ0Tm9kZWAgdmlhIGByZW1vdmVJbmVydFJvb3QoKWAsIHdoaWNoIGluIHR1cm4gZGVzdHJveXMgdGhlIGBJbmVydE5vZGVgIGlmIG5vIGBJbmVydFJvb3Rgc1xuICogcmVtYWluIGluIHRoZSBzZXQuIE9uIGRlc3RydWN0aW9uLCBgSW5lcnROb2RlYCByZWluc3RhdGVzIHRoZSBzdG9yZWQgYHRhYmluZGV4YCBpZiBvbmUgZXhpc3RzLFxuICogb3IgcmVtb3ZlcyB0aGUgYHRhYmluZGV4YCBhdHRyaWJ1dGUgaWYgdGhlIGVsZW1lbnQgaXMgaW50cmluc2ljYWxseSBmb2N1c2FibGUuXG4gKi9cbmNsYXNzIEluZXJ0Tm9kZSB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge05vZGV9IG5vZGUgQSBmb2N1c2FibGUgZWxlbWVudCB0byBiZSBtYWRlIGluZXJ0LlxuICAgKiBAcGFyYW0ge0luZXJ0Um9vdH0gaW5lcnRSb290IFRoZSBpbmVydCByb290IGVsZW1lbnQgYXNzb2NpYXRlZCB3aXRoIHRoaXMgaW5lcnQgbm9kZS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKG5vZGUsIGluZXJ0Um9vdCkge1xuICAgIC8qKiBAdHlwZSB7Tm9kZX0gKi9cbiAgICB0aGlzLl9ub2RlID0gbm9kZTtcblxuICAgIC8qKiBAdHlwZSB7Ym9vbGVhbn0gKi9cbiAgICB0aGlzLl9vdmVycm9kZUZvY3VzTWV0aG9kID0gZmFsc2U7XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSB7U2V0PEluZXJ0Um9vdD59IFRoZSBzZXQgb2YgZGVzY2VuZGFudCBpbmVydCByb290cy5cbiAgICAgKiAgICBJZiBhbmQgb25seSBpZiB0aGlzIHNldCBiZWNvbWVzIGVtcHR5LCB0aGlzIG5vZGUgaXMgbm8gbG9uZ2VyIGluZXJ0LlxuICAgICAqL1xuICAgIHRoaXMuX2luZXJ0Um9vdHMgPSBuZXcgU2V0KFtpbmVydFJvb3RdKTtcblxuICAgIC8qKiBAdHlwZSB7Ym9vbGVhbn0gKi9cbiAgICB0aGlzLl9kZXN0cm95ZWQgPSBmYWxzZTtcblxuICAgIC8vIFNhdmUgYW55IHByaW9yIHRhYmluZGV4IGluZm8gYW5kIG1ha2UgdGhpcyBub2RlIHVudGFiYmFibGVcbiAgICB0aGlzLmVuc3VyZVVudGFiYmFibGUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsIHRoaXMgd2hlbmV2ZXIgdGhpcyBvYmplY3QgaXMgYWJvdXQgdG8gYmVjb21lIG9ic29sZXRlLlxuICAgKiBUaGlzIG1ha2VzIHRoZSBtYW5hZ2VkIG5vZGUgZm9jdXNhYmxlIGFnYWluIGFuZCBkZWxldGVzIGFsbCBvZiB0aGUgcHJldmlvdXNseSBzdG9yZWQgc3RhdGUuXG4gICAqL1xuICBkZXN0cnVjdG9yKCkge1xuICAgIHRoaXMuX3Rocm93SWZEZXN0cm95ZWQoKTtcblxuICAgIGlmICh0aGlzLl9ub2RlKSB7XG4gICAgICBpZiAodGhpcy5oYXNTYXZlZFRhYkluZGV4KVxuICAgICAgICB0aGlzLl9ub2RlLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCB0aGlzLnNhdmVkVGFiSW5kZXgpO1xuICAgICAgZWxzZVxuICAgICAgICB0aGlzLl9ub2RlLnJlbW92ZUF0dHJpYnV0ZSgndGFiaW5kZXgnKTtcblxuICAgICAgLy8gVXNlIGBkZWxldGVgIHRvIHJlc3RvcmUgbmF0aXZlIGZvY3VzIG1ldGhvZC5cbiAgICAgIGlmICh0aGlzLl9vdmVycm9kZUZvY3VzTWV0aG9kKVxuICAgICAgICBkZWxldGUgdGhpcy5fbm9kZS5mb2N1cztcbiAgICB9XG4gICAgdGhpcy5fbm9kZSA9IG51bGw7XG4gICAgdGhpcy5faW5lcnRSb290cyA9IG51bGw7XG5cbiAgICB0aGlzLl9kZXN0cm95ZWQgPSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEB0eXBlIHtib29sZWFufSBXaGV0aGVyIHRoaXMgb2JqZWN0IGlzIG9ic29sZXRlIGJlY2F1c2UgdGhlIG1hbmFnZWQgbm9kZSBpcyBubyBsb25nZXIgaW5lcnQuXG4gICAqIElmIHRoZSBvYmplY3QgaGFzIGJlZW4gZGVzdHJveWVkLCBhbnkgYXR0ZW1wdCB0byBhY2Nlc3MgaXQgd2lsbCBjYXVzZSBhbiBleGNlcHRpb24uXG4gICAqL1xuICBnZXQgZGVzdHJveWVkKCkge1xuICAgIHJldHVybiB0aGlzLl9kZXN0cm95ZWQ7XG4gIH1cblxuICBfdGhyb3dJZkRlc3Ryb3llZCgpIHtcbiAgICBpZiAodGhpcy5kZXN0cm95ZWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUcnlpbmcgdG8gYWNjZXNzIGRlc3Ryb3llZCBJbmVydE5vZGVcIik7XG4gIH1cblxuICAvKiogQHJldHVybiB7Ym9vbGVhbn0gKi9cbiAgZ2V0IGhhc1NhdmVkVGFiSW5kZXgoKSB7XG4gICAgcmV0dXJuICdfc2F2ZWRUYWJJbmRleCcgaW4gdGhpcztcbiAgfVxuXG4gIC8qKiBAcmV0dXJuIHtOb2RlfSAqL1xuICBnZXQgbm9kZSgpIHtcbiAgICB0aGlzLl90aHJvd0lmRGVzdHJveWVkKCk7XG4gICAgcmV0dXJuIHRoaXMuX25vZGU7XG4gIH1cblxuICAvKiogQHBhcmFtIHtudW1iZXJ9IHRhYkluZGV4ICovXG4gIHNldCBzYXZlZFRhYkluZGV4KHRhYkluZGV4KSB7XG4gICAgdGhpcy5fdGhyb3dJZkRlc3Ryb3llZCgpO1xuICAgIHRoaXMuX3NhdmVkVGFiSW5kZXggPSB0YWJJbmRleDtcbiAgfVxuXG4gIC8qKiBAcmV0dXJuIHtudW1iZXJ9ICovXG4gIGdldCBzYXZlZFRhYkluZGV4KCkge1xuICAgIHRoaXMuX3Rocm93SWZEZXN0cm95ZWQoKTtcbiAgICByZXR1cm4gdGhpcy5fc2F2ZWRUYWJJbmRleDtcbiAgfVxuXG4gIC8qKiBTYXZlIHRoZSBleGlzdGluZyB0YWJpbmRleCB2YWx1ZSBhbmQgbWFrZSB0aGUgbm9kZSB1bnRhYmJhYmxlIGFuZCB1bmZvY3VzYWJsZSAqL1xuICBlbnN1cmVVbnRhYmJhYmxlKCkge1xuICAgIGNvbnN0IG5vZGUgPSB0aGlzLm5vZGU7XG4gICAgaWYgKG5vZGUubWF0Y2hlcyhfZm9jdXNhYmxlRWxlbWVudHNTdHJpbmcpKSB7XG4gICAgICBpZiAobm9kZS50YWJJbmRleCA9PT0gLTEgJiYgdGhpcy5oYXNTYXZlZFRhYkluZGV4KVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIGlmIChub2RlLmhhc0F0dHJpYnV0ZSgndGFiaW5kZXgnKSlcbiAgICAgICAgdGhpcy5fc2F2ZWRUYWJJbmRleCA9IG5vZGUudGFiSW5kZXg7XG4gICAgICBub2RlLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAnLTEnKTtcbiAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgICAgICBub2RlLmZvY3VzID0gZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgdGhpcy5fb3ZlcnJvZGVGb2N1c01ldGhvZCA9IHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChub2RlLmhhc0F0dHJpYnV0ZSgndGFiaW5kZXgnKSkge1xuICAgICAgdGhpcy5fc2F2ZWRUYWJJbmRleCA9IG5vZGUudGFiSW5kZXg7XG4gICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZSgndGFiaW5kZXgnKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkIGFub3RoZXIgaW5lcnQgcm9vdCB0byB0aGlzIGluZXJ0IG5vZGUncyBzZXQgb2YgbWFuYWdpbmcgaW5lcnQgcm9vdHMuXG4gICAqIEBwYXJhbSB7SW5lcnRSb290fSBpbmVydFJvb3RcbiAgICovXG4gIGFkZEluZXJ0Um9vdChpbmVydFJvb3QpIHtcbiAgICB0aGlzLl90aHJvd0lmRGVzdHJveWVkKCk7XG4gICAgdGhpcy5faW5lcnRSb290cy5hZGQoaW5lcnRSb290KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgdGhlIGdpdmVuIGluZXJ0IHJvb3QgZnJvbSB0aGlzIGluZXJ0IG5vZGUncyBzZXQgb2YgbWFuYWdpbmcgaW5lcnQgcm9vdHMuXG4gICAqIElmIHRoZSBzZXQgb2YgbWFuYWdpbmcgaW5lcnQgcm9vdHMgYmVjb21lcyBlbXB0eSwgdGhpcyBub2RlIGlzIG5vIGxvbmdlciBpbmVydCxcbiAgICogc28gdGhlIG9iamVjdCBzaG91bGQgYmUgZGVzdHJveWVkLlxuICAgKiBAcGFyYW0ge0luZXJ0Um9vdH0gaW5lcnRSb290XG4gICAqL1xuICByZW1vdmVJbmVydFJvb3QoaW5lcnRSb290KSB7XG4gICAgdGhpcy5fdGhyb3dJZkRlc3Ryb3llZCgpO1xuICAgIHRoaXMuX2luZXJ0Um9vdHMuZGVsZXRlKGluZXJ0Um9vdCk7XG4gICAgaWYgKHRoaXMuX2luZXJ0Um9vdHMuc2l6ZSA9PT0gMClcbiAgICAgIHRoaXMuZGVzdHJ1Y3RvcigpO1xuICB9XG59XG5cbi8qKlxuICogSW5lcnRNYW5hZ2VyIGlzIGEgcGVyLWRvY3VtZW50IHNpbmdsZXRvbiBvYmplY3Qgd2hpY2ggbWFuYWdlcyBhbGwgaW5lcnQgcm9vdHMgYW5kIG5vZGVzLlxuICpcbiAqIFdoZW4gYW4gZWxlbWVudCBiZWNvbWVzIGFuIGluZXJ0IHJvb3QgYnkgaGF2aW5nIGFuIGBpbmVydGAgYXR0cmlidXRlIHNldCBhbmQvb3IgaXRzIGBpbmVydGBcbiAqIHByb3BlcnR5IHNldCB0byBgdHJ1ZWAsIHRoZSBgc2V0SW5lcnRgIG1ldGhvZCBjcmVhdGVzIGFuIGBJbmVydFJvb3RgIG9iamVjdCBmb3IgdGhlIGVsZW1lbnQuXG4gKiBUaGUgYEluZXJ0Um9vdGAgaW4gdHVybiByZWdpc3RlcnMgaXRzZWxmIGFzIG1hbmFnaW5nIGFsbCBvZiB0aGUgZWxlbWVudCdzIGZvY3VzYWJsZSBkZXNjZW5kYW50XG4gKiBub2RlcyB2aWEgdGhlIGByZWdpc3RlcigpYCBtZXRob2QuIFRoZSBgSW5lcnRNYW5hZ2VyYCBlbnN1cmVzIHRoYXQgYSBzaW5nbGUgYEluZXJ0Tm9kZWAgaW5zdGFuY2VcbiAqIGlzIGNyZWF0ZWQgZm9yIGVhY2ggc3VjaCBub2RlLCB2aWEgdGhlIGBfbWFuYWdlZE5vZGVzYCBtYXAuXG4gKi9cbmNsYXNzIEluZXJ0TWFuYWdlciB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge0RvY3VtZW50fSBkb2N1bWVudFxuICAgKi9cbiAgY29uc3RydWN0b3IoZG9jdW1lbnQpIHtcbiAgICBpZiAoIWRvY3VtZW50KVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHJlcXVpcmVkIGFyZ3VtZW50OyBJbmVydE1hbmFnZXIgbmVlZHMgdG8gd3JhcCBhIGRvY3VtZW50LicpO1xuXG4gICAgLyoqIEB0eXBlIHtEb2N1bWVudH0gKi9cbiAgICB0aGlzLl9kb2N1bWVudCA9IGRvY3VtZW50O1xuXG4gICAgLyoqXG4gICAgICogQWxsIG1hbmFnZWQgbm9kZXMga25vd24gdG8gdGhpcyBJbmVydE1hbmFnZXIuIEluIGEgbWFwIHRvIGFsbG93IGxvb2tpbmcgdXAgYnkgTm9kZS5cbiAgICAgKiBAdHlwZSB7TWFwPE5vZGUsIEluZXJ0Tm9kZT59XG4gICAgICovXG4gICAgdGhpcy5fbWFuYWdlZE5vZGVzID0gbmV3IE1hcCgpO1xuXG4gICAgLyoqXG4gICAgICogQWxsIGluZXJ0IHJvb3RzIGtub3duIHRvIHRoaXMgSW5lcnRNYW5hZ2VyLiBJbiBhIG1hcCB0byBhbGxvdyBsb29raW5nIHVwIGJ5IE5vZGUuXG4gICAgICogQHR5cGUge01hcDxOb2RlLCBJbmVydFJvb3Q+fVxuICAgICAqL1xuICAgIHRoaXMuX2luZXJ0Um9vdHMgPSBuZXcgTWFwKCk7XG5cbiAgICAvKipcbiAgICAgKiBPYnNlcnZlciBmb3IgbXV0YXRpb25zIG9uIGBkb2N1bWVudC5ib2R5YC5cbiAgICAgKiBAdHlwZSB7TXV0YXRpb25PYnNlcnZlcn1cbiAgICAgKi9cbiAgICB0aGlzLl9vYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKHRoaXMuX3dhdGNoRm9ySW5lcnQuYmluZCh0aGlzKSk7XG5cblxuICAgIC8vIEFkZCBpbmVydCBzdHlsZS5cbiAgICBhZGRJbmVydFN0eWxlKGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuYm9keSB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpO1xuXG4gICAgLy8gV2FpdCBmb3IgZG9jdW1lbnQgdG8gYmUgbG9hZGVkLlxuICAgIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09PSAnbG9hZGluZycpIHtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCB0aGlzLl9vbkRvY3VtZW50TG9hZGVkLmJpbmQodGhpcykpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9vbkRvY3VtZW50TG9hZGVkKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldCB3aGV0aGVyIHRoZSBnaXZlbiBlbGVtZW50IHNob3VsZCBiZSBhbiBpbmVydCByb290IG9yIG5vdC5cbiAgICogQHBhcmFtIHtFbGVtZW50fSByb290XG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gaW5lcnRcbiAgICovXG4gIHNldEluZXJ0KHJvb3QsIGluZXJ0KSB7XG4gICAgaWYgKGluZXJ0KSB7XG4gICAgICBpZiAodGhpcy5faW5lcnRSb290cy5oYXMocm9vdCkpICAgLy8gZWxlbWVudCBpcyBhbHJlYWR5IGluZXJ0XG4gICAgICAgIHJldHVybjtcblxuICAgICAgY29uc3QgaW5lcnRSb290ID0gbmV3IEluZXJ0Um9vdChyb290LCB0aGlzKTtcbiAgICAgIHJvb3Quc2V0QXR0cmlidXRlKCdpbmVydCcsICcnKTtcbiAgICAgIHRoaXMuX2luZXJ0Um9vdHMuc2V0KHJvb3QsIGluZXJ0Um9vdCk7XG4gICAgICAvLyBJZiBub3QgY29udGFpbmVkIGluIHRoZSBkb2N1bWVudCwgaXQgbXVzdCBiZSBpbiBhIHNoYWRvd1Jvb3QuXG4gICAgICAvLyBFbnN1cmUgaW5lcnQgc3R5bGVzIGFyZSBhZGRlZCB0aGVyZS5cbiAgICAgIGlmICghdGhpcy5fZG9jdW1lbnQuYm9keS5jb250YWlucyhyb290KSkge1xuICAgICAgICBsZXQgcGFyZW50ID0gcm9vdC5wYXJlbnROb2RlO1xuICAgICAgICB3aGlsZSAocGFyZW50KSB7XG4gICAgICAgICAgaWYgKHBhcmVudC5ub2RlVHlwZSA9PT0gMTEpIHtcbiAgICAgICAgICAgIGFkZEluZXJ0U3R5bGUocGFyZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudE5vZGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCF0aGlzLl9pbmVydFJvb3RzLmhhcyhyb290KSkgIC8vIGVsZW1lbnQgaXMgYWxyZWFkeSBub24taW5lcnRcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICBjb25zdCBpbmVydFJvb3QgPSB0aGlzLl9pbmVydFJvb3RzLmdldChyb290KTtcbiAgICAgIGluZXJ0Um9vdC5kZXN0cnVjdG9yKCk7XG4gICAgICB0aGlzLl9pbmVydFJvb3RzLmRlbGV0ZShyb290KTtcbiAgICAgIHJvb3QucmVtb3ZlQXR0cmlidXRlKCdpbmVydCcpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIEluZXJ0Um9vdCBvYmplY3QgY29ycmVzcG9uZGluZyB0byB0aGUgZ2l2ZW4gaW5lcnQgcm9vdCBlbGVtZW50LCBpZiBhbnkuXG4gICAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudFxuICAgKiBAcmV0dXJuIHtJbmVydFJvb3Q/fVxuICAgKi9cbiAgZ2V0SW5lcnRSb290KGVsZW1lbnQpIHtcbiAgICByZXR1cm4gdGhpcy5faW5lcnRSb290cy5nZXQoZWxlbWVudCk7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgdGhlIGdpdmVuIEluZXJ0Um9vdCBhcyBtYW5hZ2luZyB0aGUgZ2l2ZW4gbm9kZS5cbiAgICogSW4gdGhlIGNhc2Ugd2hlcmUgdGhlIG5vZGUgaGFzIGEgcHJldmlvdXNseSBleGlzdGluZyBpbmVydCByb290LCB0aGlzIGluZXJ0IHJvb3Qgd2lsbFxuICAgKiBiZSBhZGRlZCB0byBpdHMgc2V0IG9mIGluZXJ0IHJvb3RzLlxuICAgKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAgICogQHBhcmFtIHtJbmVydFJvb3R9IGluZXJ0Um9vdFxuICAgKiBAcmV0dXJuIHtJbmVydE5vZGV9IGluZXJ0Tm9kZVxuICAgKi9cbiAgcmVnaXN0ZXIobm9kZSwgaW5lcnRSb290KSB7XG4gICAgbGV0IGluZXJ0Tm9kZSA9IHRoaXMuX21hbmFnZWROb2Rlcy5nZXQobm9kZSk7XG4gICAgaWYgKGluZXJ0Tm9kZSAhPT0gdW5kZWZpbmVkKSB7ICAvLyBub2RlIHdhcyBhbHJlYWR5IGluIGFuIGluZXJ0IHN1YnRyZWVcbiAgICAgIGluZXJ0Tm9kZS5hZGRJbmVydFJvb3QoaW5lcnRSb290KTtcbiAgICAgIC8vIFVwZGF0ZSBzYXZlZCB0YWJpbmRleCB2YWx1ZSBpZiBuZWNlc3NhcnlcbiAgICAgIGluZXJ0Tm9kZS5lbnN1cmVVbnRhYmJhYmxlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGluZXJ0Tm9kZSA9IG5ldyBJbmVydE5vZGUobm9kZSwgaW5lcnRSb290KTtcbiAgICB9XG5cbiAgICB0aGlzLl9tYW5hZ2VkTm9kZXMuc2V0KG5vZGUsIGluZXJ0Tm9kZSk7XG5cbiAgICByZXR1cm4gaW5lcnROb2RlO1xuICB9XG5cbiAgLyoqXG4gICAqIERlLXJlZ2lzdGVyIHRoZSBnaXZlbiBJbmVydFJvb3QgYXMgbWFuYWdpbmcgdGhlIGdpdmVuIGluZXJ0IG5vZGUuXG4gICAqIFJlbW92ZXMgdGhlIGluZXJ0IHJvb3QgZnJvbSB0aGUgSW5lcnROb2RlJ3Mgc2V0IG9mIG1hbmFnaW5nIGluZXJ0IHJvb3RzLCBhbmQgcmVtb3ZlIHRoZSBpbmVydFxuICAgKiBub2RlIGZyb20gdGhlIEluZXJ0TWFuYWdlcidzIHNldCBvZiBtYW5hZ2VkIG5vZGVzIGlmIGl0IGlzIGRlc3Ryb3llZC5cbiAgICogSWYgdGhlIG5vZGUgaXMgbm90IGN1cnJlbnRseSBtYW5hZ2VkLCB0aGlzIGlzIGVzc2VudGlhbGx5IGEgbm8tb3AuXG4gICAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICAgKiBAcGFyYW0ge0luZXJ0Um9vdH0gaW5lcnRSb290XG4gICAqIEByZXR1cm4ge0luZXJ0Tm9kZT99IFRoZSBwb3RlbnRpYWxseSBkZXN0cm95ZWQgSW5lcnROb2RlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIG5vZGUsIGlmIGFueS5cbiAgICovXG4gIGRlcmVnaXN0ZXIobm9kZSwgaW5lcnRSb290KSB7XG4gICAgY29uc3QgaW5lcnROb2RlID0gdGhpcy5fbWFuYWdlZE5vZGVzLmdldChub2RlKTtcbiAgICBpZiAoIWluZXJ0Tm9kZSlcbiAgICAgIHJldHVybiBudWxsO1xuXG4gICAgaW5lcnROb2RlLnJlbW92ZUluZXJ0Um9vdChpbmVydFJvb3QpO1xuICAgIGlmIChpbmVydE5vZGUuZGVzdHJveWVkKVxuICAgICAgdGhpcy5fbWFuYWdlZE5vZGVzLmRlbGV0ZShub2RlKTtcblxuICAgIHJldHVybiBpbmVydE5vZGU7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGJhY2sgdXNlZCB3aGVuIGRvY3VtZW50IGhhcyBmaW5pc2hlZCBsb2FkaW5nLlxuICAgKi9cbiAgX29uRG9jdW1lbnRMb2FkZWQoKSB7XG4gICAgLy8gRmluZCBhbGwgaW5lcnQgcm9vdHMgaW4gZG9jdW1lbnQgYW5kIG1ha2UgdGhlbSBhY3R1YWxseSBpbmVydC5cbiAgICBjb25zdCBpbmVydEVsZW1lbnRzID0gQXJyYXkuZnJvbSh0aGlzLl9kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbaW5lcnRdJykpO1xuICAgIGZvciAobGV0IGluZXJ0RWxlbWVudCBvZiBpbmVydEVsZW1lbnRzKVxuICAgICAgdGhpcy5zZXRJbmVydChpbmVydEVsZW1lbnQsIHRydWUpO1xuXG4gICAgLy8gQ29tbWVudCB0aGlzIG91dCB0byB1c2UgcHJvZ3JhbW1hdGljIEFQSSBvbmx5LlxuICAgIHRoaXMuX29ic2VydmVyLm9ic2VydmUodGhpcy5fZG9jdW1lbnQuYm9keSwgeyBhdHRyaWJ1dGVzOiB0cnVlLCBzdWJ0cmVlOiB0cnVlLCBjaGlsZExpc3Q6IHRydWUgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGJhY2sgdXNlZCB3aGVuIG11dGF0aW9uIG9ic2VydmVyIGRldGVjdHMgYXR0cmlidXRlIGNoYW5nZXMuXG4gICAqIEBwYXJhbSB7TXV0YXRpb25SZWNvcmR9IHJlY29yZHNcbiAgICogQHBhcmFtIHtNdXRhdGlvbk9ic2VydmVyfSBzZWxmXG4gICAqL1xuICBfd2F0Y2hGb3JJbmVydChyZWNvcmRzLCBzZWxmKSB7XG4gICAgZm9yIChsZXQgcmVjb3JkIG9mIHJlY29yZHMpIHtcbiAgICAgIHN3aXRjaCAocmVjb3JkLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2NoaWxkTGlzdCc6XG4gICAgICAgIGZvciAobGV0IG5vZGUgb2YgQXJyYXkuZnJvbShyZWNvcmQuYWRkZWROb2RlcykpIHtcbiAgICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSAhPT0gTm9kZS5FTEVNRU5UX05PREUpXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCBpbmVydEVsZW1lbnRzID0gQXJyYXkuZnJvbShub2RlLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tpbmVydF0nKSk7XG4gICAgICAgICAgaWYgKG5vZGUubWF0Y2hlcygnW2luZXJ0XScpKVxuICAgICAgICAgICAgaW5lcnRFbGVtZW50cy51bnNoaWZ0KG5vZGUpO1xuICAgICAgICAgIGZvciAobGV0IGluZXJ0RWxlbWVudCBvZiBpbmVydEVsZW1lbnRzKVxuICAgICAgICAgICAgdGhpcy5zZXRJbmVydChpbmVydEVsZW1lbnQsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnYXR0cmlidXRlcyc6XG4gICAgICAgIGlmIChyZWNvcmQuYXR0cmlidXRlTmFtZSAhPT0gJ2luZXJ0JylcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gcmVjb3JkLnRhcmdldDtcbiAgICAgICAgY29uc3QgaW5lcnQgPSB0YXJnZXQuaGFzQXR0cmlidXRlKCdpbmVydCcpO1xuICAgICAgICB0aGlzLnNldEluZXJ0KHRhcmdldCwgaW5lcnQpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuIC8qKlxuICAqIFJlY3Vyc2l2ZWx5IHdhbGsgdGhlIGNvbXBvc2VkIHRyZWUgZnJvbSB8bm9kZXwuXG4gICogQHBhcmFtIHtOb2RlfSBub2RlXG4gICogQHBhcmFtIHsoZnVuY3Rpb24gKEVsZW1lbnQpKT19IGNhbGxiYWNrIENhbGxiYWNrIHRvIGJlIGNhbGxlZCBmb3IgZWFjaCBlbGVtZW50IHRyYXZlcnNlZCxcbiAgKiAgICAgYmVmb3JlIGRlc2NlbmRpbmcgaW50byBjaGlsZCBub2Rlcy5cbiAgKiBAcGFyYW0ge1NoYWRvd1Jvb3Q9fSBzaGFkb3dSb290QW5jZXN0b3IgVGhlIG5lYXJlc3QgU2hhZG93Um9vdCBhbmNlc3RvciwgaWYgYW55LlxuICAqL1xuZnVuY3Rpb24gY29tcG9zZWRUcmVlV2Fsayhub2RlLCBjYWxsYmFjaywgc2hhZG93Um9vdEFuY2VzdG9yKSB7XG4gIGlmIChub2RlLm5vZGVUeXBlID09IE5vZGUuRUxFTUVOVF9OT0RFKSB7XG4gICAgY29uc3QgZWxlbWVudCA9IC8qKiBAdHlwZSB7RWxlbWVudH0gKi8gKG5vZGUpO1xuICAgIGlmIChjYWxsYmFjaylcbiAgICAgIGNhbGxiYWNrKGVsZW1lbnQpXG5cbiAgICAvLyBEZXNjZW5kIGludG8gbm9kZTpcbiAgICAvLyBJZiBpdCBoYXMgYSBTaGFkb3dSb290LCBpZ25vcmUgYWxsIGNoaWxkIGVsZW1lbnRzIC0gdGhlc2Ugd2lsbCBiZSBwaWNrZWRcbiAgICAvLyB1cCBieSB0aGUgPGNvbnRlbnQ+IG9yIDxzaGFkb3c+IGVsZW1lbnRzLiBEZXNjZW5kIHN0cmFpZ2h0IGludG8gdGhlXG4gICAgLy8gU2hhZG93Um9vdC5cbiAgICBjb25zdCBzaGFkb3dSb290ID0gZWxlbWVudC5zaGFkb3dSb290IHx8IGVsZW1lbnQud2Via2l0U2hhZG93Um9vdDtcbiAgICBpZiAoc2hhZG93Um9vdCkge1xuICAgICAgY29tcG9zZWRUcmVlV2FsayhzaGFkb3dSb290LCBjYWxsYmFjaywgc2hhZG93Um9vdCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgaXQgaXMgYSA8Y29udGVudD4gZWxlbWVudCwgZGVzY2VuZCBpbnRvIGRpc3RyaWJ1dGVkIGVsZW1lbnRzIC0gdGhlc2VcbiAgICAvLyBhcmUgZWxlbWVudHMgZnJvbSBvdXRzaWRlIHRoZSBzaGFkb3cgcm9vdCB3aGljaCBhcmUgcmVuZGVyZWQgaW5zaWRlIHRoZVxuICAgIC8vIHNoYWRvdyBET00uXG4gICAgaWYgKGVsZW1lbnQubG9jYWxOYW1lID09ICdjb250ZW50Jykge1xuICAgICAgY29uc3QgY29udGVudCA9IC8qKiBAdHlwZSB7SFRNTENvbnRlbnRFbGVtZW50fSAqLyAoZWxlbWVudCk7XG4gICAgICAvLyBWZXJpZmllcyBpZiBTaGFkb3dEb20gdjAgaXMgc3VwcG9ydGVkLlxuICAgICAgY29uc3QgZGlzdHJpYnV0ZWROb2RlcyA9IGNvbnRlbnQuZ2V0RGlzdHJpYnV0ZWROb2RlcyA/XG4gICAgICAgIGNvbnRlbnQuZ2V0RGlzdHJpYnV0ZWROb2RlcygpIDogW107XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRpc3RyaWJ1dGVkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29tcG9zZWRUcmVlV2FsayhkaXN0cmlidXRlZE5vZGVzW2ldLCBjYWxsYmFjaywgc2hhZG93Um9vdEFuY2VzdG9yKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJZiBpdCBpcyBhIDxzbG90PiBlbGVtZW50LCBkZXNjZW5kIGludG8gYXNzaWduZWQgbm9kZXMgLSB0aGVzZVxuICAgIC8vIGFyZSBlbGVtZW50cyBmcm9tIG91dHNpZGUgdGhlIHNoYWRvdyByb290IHdoaWNoIGFyZSByZW5kZXJlZCBpbnNpZGUgdGhlXG4gICAgLy8gc2hhZG93IERPTS5cbiAgICBpZiAoZWxlbWVudC5sb2NhbE5hbWUgPT0gJ3Nsb3QnKSB7XG4gICAgICBjb25zdCBzbG90ID0gLyoqIEB0eXBlIHtIVE1MU2xvdEVsZW1lbnR9ICovIChlbGVtZW50KTtcbiAgICAgIC8vIFZlcmlmeSBpZiBTaGFkb3dEb20gdjEgaXMgc3VwcG9ydGVkLlxuICAgICAgY29uc3QgZGlzdHJpYnV0ZWROb2RlcyA9IHNsb3QuYXNzaWduZWROb2RlcyA/XG4gICAgICAgIHNsb3QuYXNzaWduZWROb2Rlcyh7IGZsYXR0ZW46IHRydWUgfSkgOiBbXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGlzdHJpYnV0ZWROb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb21wb3NlZFRyZWVXYWxrKGRpc3RyaWJ1dGVkTm9kZXNbaV0sIGNhbGxiYWNrLCBzaGFkb3dSb290QW5jZXN0b3IpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuXG4gIC8vIElmIGl0IGlzIG5laXRoZXIgdGhlIHBhcmVudCBvZiBhIFNoYWRvd1Jvb3QsIGEgPGNvbnRlbnQ+IGVsZW1lbnQsIGEgPHNsb3Q+XG4gIC8vIGVsZW1lbnQsIG5vciBhIDxzaGFkb3c+IGVsZW1lbnQgcmVjdXJzZSBub3JtYWxseS5cbiAgbGV0IGNoaWxkID0gbm9kZS5maXJzdENoaWxkO1xuICB3aGlsZSAoY2hpbGQgIT0gbnVsbCkge1xuICAgIGNvbXBvc2VkVHJlZVdhbGsoY2hpbGQsIGNhbGxiYWNrLCBzaGFkb3dSb290QW5jZXN0b3IpO1xuICAgIGNoaWxkID0gY2hpbGQubmV4dFNpYmxpbmc7XG4gIH1cbn1cblxuLyoqXG4gKiBBZGRzIGEgc3R5bGUgZWxlbWVudCB0byB0aGUgbm9kZSBjb250YWluaW5nIHRoZSBpbmVydCBzcGVjaWZpYyBzdHlsZXNcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICovXG5mdW5jdGlvbiBhZGRJbmVydFN0eWxlKG5vZGUpIHtcbiAgaWYgKG5vZGUucXVlcnlTZWxlY3Rvcignc3R5bGUjaW5lcnQtc3R5bGUnKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gIHN0eWxlLnNldEF0dHJpYnV0ZSgnaWQnLCAnaW5lcnQtc3R5bGUnKTtcbiAgc3R5bGUudGV4dENvbnRlbnQgPSBcIlxcblwiK1xuICAgICAgICAgICAgICAgICAgICAgIFwiW2luZXJ0XSB7XFxuXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIFwiICBwb2ludGVyLWV2ZW50czogbm9uZTtcXG5cIiArXG4gICAgICAgICAgICAgICAgICAgICAgXCIgIGN1cnNvcjogZGVmYXVsdDtcXG5cIiArXG4gICAgICAgICAgICAgICAgICAgICAgXCJ9XFxuXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIFwiXFxuXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIFwiW2luZXJ0XSwgW2luZXJ0XSAqIHtcXG5cIiArXG4gICAgICAgICAgICAgICAgICAgICAgXCIgIHVzZXItc2VsZWN0OiBub25lO1xcblwiICtcbiAgICAgICAgICAgICAgICAgICAgICBcIiAgLXdlYmtpdC11c2VyLXNlbGVjdDogbm9uZTtcXG5cIiArXG4gICAgICAgICAgICAgICAgICAgICAgXCIgIC1tb3otdXNlci1zZWxlY3Q6IG5vbmU7XFxuXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIFwiICAtbXMtdXNlci1zZWxlY3Q6IG5vbmU7XFxuXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIFwifVxcblwiO1xuICBub2RlLmFwcGVuZENoaWxkKHN0eWxlKTtcbn1cblxuY29uc3QgaW5lcnRNYW5hZ2VyID0gbmV3IEluZXJ0TWFuYWdlcihkb2N1bWVudCk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShFbGVtZW50LnByb3RvdHlwZSwgJ2luZXJ0Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmhhc0F0dHJpYnV0ZSgnaW5lcnQnKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldDogZnVuY3Rpb24oaW5lcnQpIHsgaW5lcnRNYW5hZ2VyLnNldEluZXJ0KHRoaXMsIGluZXJ0KSB9XG4gICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbn0pKGRvY3VtZW50KTtcbiJdfQ==
