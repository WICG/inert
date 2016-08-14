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
        delete this._observer;

        if (this._rootElement) this._rootElement.removeAttribute('aria-hidden');
        delete this._rootElement;

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

        delete this._managedNodes;

        delete this._inertManager;
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

          if (this._overrodeFocusMethod) delete this._node.focus;
        }
        delete this._node;
        delete this._inertRoots;

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
        node.blur(); // TODO(alice): is this right?
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

      // Find all inert roots in document and make them actually inert.
      var inertElements = Array.from(document.querySelectorAll('[inert]'));
      var _iteratorNormalCompletion7 = true;
      var _didIteratorError7 = false;
      var _iteratorError7 = undefined;

      try {
        for (var _iterator7 = inertElements[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
          var inertElement = _step7.value;

          this.setInert(inertElement, true);
        } // Comment these two lines out to use programmatic API only
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

      this._observer = new MutationObserver(this._watchForInert.bind(this));
      this._observer.observe(document.body, { attributes: true, subtree: true, childList: true });
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

  addInertStyle(document.body);
})(document);
//# sourceMappingURL=data:application/json;base64,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dkIsRUFBNkI7QUFDM0IsUUFBSSxLQUFLLGFBQUwsQ0FBbUIsbUJBQW5CLENBQUosRUFBNkM7QUFDM0M7QUFDRDtBQUNELFFBQUksUUFBUSxTQUFTLGFBQVQsQ0FBdUIsT0FBdkIsQ0FBWjtBQUNBLFVBQU0sWUFBTixDQUFtQixJQUFuQixFQUF5QixhQUF6QjtBQUNBLFVBQU0sV0FBTixHQUFvQixPQUNBLGFBREEsR0FFQSwyQkFGQSxHQUdBLHNCQUhBLEdBSUEsS0FKQSxHQUtBLElBTEEsR0FNQSx3QkFOQSxHQU9BLHdCQVBBLEdBUUEsZ0NBUkEsR0FTQSw2QkFUQSxHQVVBLDRCQVZBLEdBV0EsS0FYcEI7QUFZQSxTQUFLLFdBQUwsQ0FBaUIsS0FBakI7QUFDRDs7QUFHRCxNQUFJLGVBQWUsSUFBSSxZQUFKLENBQWlCLFFBQWpCLENBQW5CO0FBQ0EsU0FBTyxjQUFQLENBQXNCLFFBQVEsU0FBOUIsRUFBeUMsT0FBekMsRUFBa0Q7QUFDMUIsZ0JBQVksSUFEYztBQUUxQixTQUFLLGVBQVc7QUFBRSxhQUFPLEtBQUssWUFBTCxDQUFrQixPQUFsQixDQUFQO0FBQW9DLEtBRjVCO0FBRzFCLFNBQUssYUFBUyxLQUFULEVBQWdCO0FBQUUsbUJBQWEsUUFBYixDQUFzQixJQUF0QixFQUE0QixLQUE1QjtBQUFvQztBQUhqQyxHQUFsRDs7QUFNQSxnQkFBYyxTQUFTLElBQXZCO0FBRUMsQ0FsbEJELEVBa2xCRyxRQWxsQkgiLCJmaWxlIjoiaW5lcnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG4oZnVuY3Rpb24oZG9jdW1lbnQpIHtcblxuLyoqIEB0eXBlIHtzdHJpbmd9ICovXG5jb25zdCBfZm9jdXNhYmxlRWxlbWVudHNTdHJpbmcgPSBbJ2FbaHJlZl0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdhcmVhW2hyZWZdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnaW5wdXQ6bm90KFtkaXNhYmxlZF0pJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc2VsZWN0Om5vdChbZGlzYWJsZWRdKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3RleHRhcmVhOm5vdChbZGlzYWJsZWRdKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2J1dHRvbjpub3QoW2Rpc2FibGVkXSknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdpZnJhbWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdlbWJlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1tjb250ZW50ZWRpdGFibGVdJ10uam9pbignLCcpO1xuXG4vKipcbiAqIGBJbmVydFJvb3RgIG1hbmFnZXMgYSBzaW5nbGUgaW5lcnQgc3VidHJlZSwgaS5lLiBhIERPTSBzdWJ0cmVlIHdob3NlIHJvb3QgZWxlbWVudCBoYXMgYW4gYGluZXJ0YFxuICogYXR0cmlidXRlLlxuICpcbiAqIEl0cyBtYWluIGZ1bmN0aW9ucyBhcmU6XG4gKlxuICogLSB0byBjcmVhdGUgYW5kIG1haW50YWluIGEgc2V0IG9mIG1hbmFnZWQgYEluZXJ0Tm9kZWBzLCBpbmNsdWRpbmcgd2hlbiBtdXRhdGlvbnMgb2NjdXIgaW4gdGhlXG4gKiAgIHN1YnRyZWUuIFRoZSBgbWFrZVN1YnRyZWVVbmZvY3VzYWJsZSgpYCBtZXRob2QgaGFuZGxlcyBjb2xsZWN0aW5nIGBJbmVydE5vZGVgcyB2aWEgcmVnaXN0ZXJpbmdcbiAqICAgZWFjaCBmb2N1c2FibGUgbm9kZSBpbiB0aGUgc3VidHJlZSB3aXRoIHRoZSBzaW5nbGV0b24gYEluZXJ0TWFuYWdlcmAgd2hpY2ggbWFuYWdlcyBhbGwga25vd25cbiAqICAgZm9jdXNhYmxlIG5vZGVzIHdpdGhpbiBpbmVydCBzdWJ0cmVlcy4gYEluZXJ0TWFuYWdlcmAgZW5zdXJlcyB0aGF0IGEgc2luZ2xlIGBJbmVydE5vZGVgXG4gKiAgIGluc3RhbmNlIGV4aXN0cyBmb3IgZWFjaCBmb2N1c2FibGUgbm9kZSB3aGljaCBoYXMgYXQgbGVhc3Qgb25lIGluZXJ0IHJvb3QgYXMgYW4gYW5jZXN0b3IuXG4gKlxuICogLSB0byBub3RpZnkgYWxsIG1hbmFnZWQgYEluZXJ0Tm9kZWBzIHdoZW4gdGhpcyBzdWJ0cmVlIHN0b3BzIGJlaW5nIGluZXJ0IChpLmUuIHdoZW4gdGhlIGBpbmVydGBcbiAqICAgYXR0cmlidXRlIGlzIHJlbW92ZWQgZnJvbSB0aGUgcm9vdCBub2RlKS4gVGhpcyBpcyBoYW5kbGVkIGluIHRoZSBkZXN0cnVjdG9yLCB3aGljaCBjYWxscyB0aGVcbiAqICAgYGRlcmVnaXN0ZXJgIG1ldGhvZCBvbiBgSW5lcnRNYW5hZ2VyYCBmb3IgZWFjaCBtYW5hZ2VkIGluZXJ0IG5vZGUuXG4gKi9cbmNsYXNzIEluZXJ0Um9vdCB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge0VsZW1lbnR9IHJvb3RFbGVtZW50IFRoZSBFbGVtZW50IGF0IHRoZSByb290IG9mIHRoZSBpbmVydCBzdWJ0cmVlLlxuICAgKiBAcGFyYW0ge0luZXJ0TWFuYWdlcn0gaW5lcnRNYW5hZ2VyIFRoZSBnbG9iYWwgc2luZ2xldG9uIEluZXJ0TWFuYWdlciBvYmplY3QuXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihyb290RWxlbWVudCwgaW5lcnRNYW5hZ2VyKSB7XG4gICAgLyoqIEB0eXBlIHtJbmVydE1hbmFnZXJ9ICovXG4gICAgdGhpcy5faW5lcnRNYW5hZ2VyID0gaW5lcnRNYW5hZ2VyO1xuXG4gICAgLyoqIEB0eXBlIHtFbGVtZW50fSAqL1xuICAgIHRoaXMuX3Jvb3RFbGVtZW50ID0gcm9vdEVsZW1lbnQ7XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSB7U2V0PE5vZGU+fVxuICAgICAqIEFsbCBtYW5hZ2VkIGZvY3VzYWJsZSBub2RlcyBpbiB0aGlzIEluZXJ0Um9vdCdzIHN1YnRyZWUuXG4gICAgICovXG4gICAgdGhpcy5fbWFuYWdlZE5vZGVzID0gbmV3IFNldChbXSk7XG5cbiAgICAvLyBNYWtlIHRoZSBzdWJ0cmVlIGhpZGRlbiBmcm9tIGFzc2lzdGl2ZSB0ZWNobm9sb2d5XG4gICAgdGhpcy5fcm9vdEVsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG5cbiAgICAvLyBNYWtlIGFsbCBmb2N1c2FibGUgZWxlbWVudHMgaW4gdGhlIHN1YnRyZWUgdW5mb2N1c2FibGUgYW5kIGFkZCB0aGVtIHRvIF9tYW5hZ2VkTm9kZXNcbiAgICB0aGlzLl9tYWtlU3VidHJlZVVuZm9jdXNhYmxlKHRoaXMuX3Jvb3RFbGVtZW50KTtcblxuICAgIC8vIFdhdGNoIGZvcjpcbiAgICAvLyAtIGFueSBhZGRpdGlvbnMgaW4gdGhlIHN1YnRyZWU6IG1ha2UgdGhlbSB1bmZvY3VzYWJsZSB0b29cbiAgICAvLyAtIGFueSByZW1vdmFscyBmcm9tIHRoZSBzdWJ0cmVlOiByZW1vdmUgdGhlbSBmcm9tIHRoaXMgaW5lcnQgcm9vdCdzIG1hbmFnZWQgbm9kZXNcbiAgICAvLyAtIGF0dHJpYnV0ZSBjaGFuZ2VzOiBpZiBgdGFiaW5kZXhgIGlzIGFkZGVkLCBvciByZW1vdmVkIGZyb20gYW4gaW50cmluc2ljYWxseSBmb2N1c2FibGUgZWxlbWVudCxcbiAgICAvLyAgIG1ha2UgdGhhdCBub2RlIGEgbWFuYWdlZCBub2RlLlxuICAgIHRoaXMuX29ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIodGhpcy5fb25NdXRhdGlvbi5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLl9vYnNlcnZlci5vYnNlcnZlKHRoaXMuX3Jvb3RFbGVtZW50LCB7IGF0dHJpYnV0ZXM6IHRydWUsIGNoaWxkTGlzdDogdHJ1ZSwgc3VidHJlZTogdHJ1ZSB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsIHRoaXMgd2hlbmV2ZXIgdGhpcyBvYmplY3QgaXMgYWJvdXQgdG8gYmVjb21lIG9ic29sZXRlLiAgVGhpcyB1bndpbmRzIGFsbCBvZiB0aGUgc3RhdGVcbiAgICogc3RvcmVkIGluIHRoaXMgb2JqZWN0IGFuZCB1cGRhdGVzIHRoZSBzdGF0ZSBvZiBhbGwgb2YgdGhlIG1hbmFnZWQgbm9kZXMuXG4gICAqL1xuICBkZXN0cnVjdG9yKCkge1xuICAgIHRoaXMuX29ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbiAgICBkZWxldGUgdGhpcy5fb2JzZXJ2ZXI7XG5cbiAgICBpZiAodGhpcy5fcm9vdEVsZW1lbnQpXG4gICAgICB0aGlzLl9yb290RWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJyk7XG4gICAgZGVsZXRlIHRoaXMuX3Jvb3RFbGVtZW50O1xuXG4gICAgZm9yIChsZXQgaW5lcnROb2RlIG9mIHRoaXMuX21hbmFnZWROb2RlcylcbiAgICAgIHRoaXMuX3VubWFuYWdlTm9kZShpbmVydE5vZGUubm9kZSk7XG5cbiAgICBkZWxldGUgdGhpcy5fbWFuYWdlZE5vZGVzO1xuXG4gICAgZGVsZXRlIHRoaXMuX2luZXJ0TWFuYWdlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIHtTZXQ8SW5lcnROb2RlPn0gQSBjb3B5IG9mIHRoaXMgSW5lcnRSb290J3MgbWFuYWdlZCBub2RlcyBzZXQuXG4gICAqL1xuICBnZXQgbWFuYWdlZE5vZGVzKCkge1xuICAgIHJldHVybiBuZXcgU2V0KHRoaXMuX21hbmFnZWROb2Rlcyk7XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHtOb2RlfSBzdGFydE5vZGVcbiAgICovXG4gIF9tYWtlU3VidHJlZVVuZm9jdXNhYmxlKHN0YXJ0Tm9kZSkge1xuICAgIGNvbXBvc2VkVHJlZVdhbGsoc3RhcnROb2RlLCAobm9kZSkgPT4geyB0aGlzLl92aXNpdE5vZGUobm9kZSk7IH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICAgKi9cbiAgX3Zpc2l0Tm9kZShub2RlKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgIT09IE5vZGUuRUxFTUVOVF9OT0RFKVxuICAgICAgcmV0dXJuO1xuXG4gICAgLy8gSWYgYSBkZXNjZW5kYW50IGluZXJ0IHJvb3QgYmVjb21lcyB1bi1pbmVydCwgaXRzIGRlc2NlbmRhbnRzIHdpbGwgc3RpbGwgYmUgaW5lcnQgYmVjYXVzZSBvZiB0aGlzXG4gICAgLy8gaW5lcnQgcm9vdCwgc28gYWxsIG9mIGl0cyBtYW5hZ2VkIG5vZGVzIG5lZWQgdG8gYmUgYWRvcHRlZCBieSB0aGlzIEluZXJ0Um9vdC5cbiAgICBpZiAobm9kZSAhPT0gdGhpcy5fcm9vdEVsZW1lbnQgJiYgbm9kZS5oYXNBdHRyaWJ1dGUoJ2luZXJ0JykpXG4gICAgICB0aGlzLl9hZG9wdEluZXJ0Um9vdChub2RlKTtcblxuICAgIGlmIChub2RlLm1hdGNoZXMoX2ZvY3VzYWJsZUVsZW1lbnRzU3RyaW5nKSB8fCBub2RlLmhhc0F0dHJpYnV0ZSgndGFiaW5kZXgnKSlcbiAgICAgIHRoaXMuX21hbmFnZU5vZGUobm9kZSk7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgdGhlIGdpdmVuIG5vZGUgd2l0aCB0aGlzIEluZXJ0Um9vdCBhbmQgd2l0aCBJbmVydE1hbmFnZXIuXG4gICAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICAgKi9cbiAgX21hbmFnZU5vZGUobm9kZSkge1xuICAgIGNvbnN0IGluZXJ0Tm9kZSA9IHRoaXMuX2luZXJ0TWFuYWdlci5yZWdpc3Rlcihub2RlLCB0aGlzKTtcbiAgICB0aGlzLl9tYW5hZ2VkTm9kZXMuYWRkKGluZXJ0Tm9kZSk7XG4gIH1cblxuICAvKipcbiAgICogVW5yZWdpc3RlciB0aGUgZ2l2ZW4gbm9kZSB3aXRoIHRoaXMgSW5lcnRSb290IGFuZCB3aXRoIEluZXJ0TWFuYWdlci5cbiAgICogQHBhcmFtIHtOb2RlfSBub2RlXG4gICAqL1xuICBfdW5tYW5hZ2VOb2RlKG5vZGUpIHtcbiAgICBjb25zdCBpbmVydE5vZGUgPSB0aGlzLl9pbmVydE1hbmFnZXIuZGVyZWdpc3Rlcihub2RlLCB0aGlzKTtcbiAgICBpZiAoaW5lcnROb2RlKVxuICAgICAgdGhpcy5fbWFuYWdlZE5vZGVzLmRlbGV0ZShpbmVydE5vZGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVucmVnaXN0ZXIgdGhlIGVudGlyZSBzdWJ0cmVlIHN0YXJ0aW5nIGF0IGBzdGFydE5vZGVgLlxuICAgKiBAcGFyYW0ge05vZGV9IHN0YXJ0Tm9kZVxuICAgKi9cbiAgX3VubWFuYWdlU3VidHJlZShzdGFydE5vZGUpIHtcbiAgICBjb21wb3NlZFRyZWVXYWxrKHN0YXJ0Tm9kZSwgKG5vZGUpID0+IHsgdGhpcy5fdW5tYW5hZ2VOb2RlKG5vZGUpOyB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJZiBhIGRlc2NlbmRhbnQgbm9kZSBpcyBmb3VuZCB3aXRoIGFuIGBpbmVydGAgYXR0cmlidXRlLCBhZG9wdCBpdHMgbWFuYWdlZCBub2Rlcy5cbiAgICogQHBhcmFtIHtOb2RlfSBub2RlXG4gICAqL1xuICBfYWRvcHRJbmVydFJvb3Qobm9kZSkge1xuICAgIGxldCBpbmVydFN1YnJvb3QgPSB0aGlzLl9pbmVydE1hbmFnZXIuZ2V0SW5lcnRSb290KG5vZGUpO1xuXG4gICAgLy8gRHVyaW5nIGluaXRpYWxpc2F0aW9uIHRoaXMgaW5lcnQgcm9vdCBtYXkgbm90IGhhdmUgYmVlbiByZWdpc3RlcmVkIHlldCxcbiAgICAvLyBzbyByZWdpc3RlciBpdCBub3cgaWYgbmVlZCBiZS5cbiAgICBpZiAoIWluZXJ0U3Vicm9vdCkge1xuICAgICAgdGhpcy5faW5lcnRNYW5hZ2VyLnNldEluZXJ0KG5vZGUsIHRydWUpO1xuICAgICAgaW5lcnRTdWJyb290ID0gdGhpcy5faW5lcnRNYW5hZ2VyLmdldEluZXJ0Um9vdChub2RlKTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBzYXZlZEluZXJ0Tm9kZSBvZiBpbmVydFN1YnJvb3QubWFuYWdlZE5vZGVzKVxuICAgICAgdGhpcy5fbWFuYWdlTm9kZShzYXZlZEluZXJ0Tm9kZS5ub2RlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsYmFjayB1c2VkIHdoZW4gbXV0YXRpb24gb2JzZXJ2ZXIgZGV0ZWN0cyBzdWJ0cmVlIGFkZGl0aW9ucywgcmVtb3ZhbHMsIG9yIGF0dHJpYnV0ZSBjaGFuZ2VzLlxuICAgKiBAcGFyYW0ge011dGF0aW9uUmVjb3JkfSByZWNvcmRzXG4gICAqIEBwYXJhbSB7TXV0YXRpb25PYnNlcnZlcn0gc2VsZlxuICAgKi9cbiAgX29uTXV0YXRpb24ocmVjb3Jkcywgc2VsZikge1xuICAgIGZvciAobGV0IHJlY29yZCBvZiByZWNvcmRzKSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSByZWNvcmQudGFyZ2V0O1xuICAgICAgaWYgKHJlY29yZC50eXBlID09PSAnY2hpbGRMaXN0Jykge1xuICAgICAgICAvLyBNYW5hZ2UgYWRkZWQgbm9kZXNcbiAgICAgICAgZm9yIChsZXQgbm9kZSBvZiBBcnJheS5mcm9tKHJlY29yZC5hZGRlZE5vZGVzKSlcbiAgICAgICAgICB0aGlzLl9tYWtlU3VidHJlZVVuZm9jdXNhYmxlKG5vZGUpO1xuXG4gICAgICAgIC8vIFVuLW1hbmFnZSByZW1vdmVkIG5vZGVzXG4gICAgICAgIGZvciAobGV0IG5vZGUgb2YgQXJyYXkuZnJvbShyZWNvcmQucmVtb3ZlZE5vZGVzKSlcbiAgICAgICAgICB0aGlzLl91bm1hbmFnZVN1YnRyZWUobm9kZSk7XG4gICAgICB9IGVsc2UgaWYgKHJlY29yZC50eXBlID09PSAnYXR0cmlidXRlcycpIHtcbiAgICAgICAgaWYgKHJlY29yZC5hdHRyaWJ1dGVOYW1lID09PSAndGFiaW5kZXgnKSB7XG4gICAgICAgICAgLy8gUmUtaW5pdGlhbGlzZSBpbmVydCBub2RlIGlmIHRhYmluZGV4IGNoYW5nZXNcbiAgICAgICAgICB0aGlzLl9tYW5hZ2VOb2RlKHRhcmdldCk7XG4gICAgICAgIH0gZWxzZSBpZiAodGFyZ2V0ICE9PSB0aGlzLl9yb290RWxlbWVudCAmJlxuICAgICAgICAgICAgICAgICAgIHJlY29yZC5hdHRyaWJ1dGVOYW1lID09PSAnaW5lcnQnICYmXG4gICAgICAgICAgICAgICAgICAgdGFyZ2V0Lmhhc0F0dHJpYnV0ZSgnaW5lcnQnKSkge1xuICAgICAgICAgIC8vIElmIGEgbmV3IGluZXJ0IHJvb3QgaXMgYWRkZWQsIGFkb3B0IGl0cyBtYW5hZ2VkIG5vZGVzIGFuZCBtYWtlIHN1cmUgaXQga25vd3MgYWJvdXQgdGhlXG4gICAgICAgICAgLy8gYWxyZWFkeSBtYW5hZ2VkIG5vZGVzIGZyb20gdGhpcyBpbmVydCBzdWJyb290LlxuICAgICAgICAgIHRoaXMuX2Fkb3B0SW5lcnRSb290KHRhcmdldCk7XG4gICAgICAgICAgbGV0IGluZXJ0U3Vicm9vdCA9IHRoaXMuX2luZXJ0TWFuYWdlci5nZXRJbmVydFJvb3QodGFyZ2V0KTtcbiAgICAgICAgICBmb3IgKGxldCBtYW5hZ2VkTm9kZSBvZiB0aGlzLl9tYW5hZ2VkTm9kZXMpIHtcbiAgICAgICAgICAgIGlmICh0YXJnZXQuY29udGFpbnMobWFuYWdlZE5vZGUubm9kZSkpXG4gICAgICAgICAgICAgIGluZXJ0U3Vicm9vdC5fbWFuYWdlTm9kZShtYW5hZ2VkTm9kZS5ub2RlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBgSW5lcnROb2RlYCBpbml0aWFsaXNlcyBhbmQgbWFuYWdlcyBhIHNpbmdsZSBpbmVydCBub2RlLlxuICogQSBub2RlIGlzIGluZXJ0IGlmIGl0IGlzIGEgZGVzY2VuZGFudCBvZiBvbmUgb3IgbW9yZSBpbmVydCByb290IGVsZW1lbnRzLlxuICpcbiAqIE9uIGNvbnN0cnVjdGlvbiwgYEluZXJ0Tm9kZWAgc2F2ZXMgdGhlIGV4aXN0aW5nIGB0YWJpbmRleGAgdmFsdWUgZm9yIHRoZSBub2RlLCBpZiBhbnksIGFuZFxuICogZWl0aGVyIHJlbW92ZXMgdGhlIGB0YWJpbmRleGAgYXR0cmlidXRlIG9yIHNldHMgaXQgdG8gYC0xYCwgZGVwZW5kaW5nIG9uIHdoZXRoZXIgdGhlIGVsZW1lbnRcbiAqIGlzIGludHJpbnNpY2FsbHkgZm9jdXNhYmxlIG9yIG5vdC5cbiAqXG4gKiBgSW5lcnROb2RlYCBtYWludGFpbnMgYSBzZXQgb2YgYEluZXJ0Um9vdGBzIHdoaWNoIGFyZSBkZXNjZW5kYW50cyBvZiB0aGlzIGBJbmVydE5vZGVgLiBXaGVuIGFuXG4gKiBgSW5lcnRSb290YCBpcyBkZXN0cm95ZWQsIGFuZCBjYWxscyBgSW5lcnRNYW5hZ2VyLmRlcmVnaXN0ZXIoKWAsIHRoZSBgSW5lcnRNYW5hZ2VyYCBub3RpZmllcyB0aGVcbiAqIGBJbmVydE5vZGVgIHZpYSBgcmVtb3ZlSW5lcnRSb290KClgLCB3aGljaCBpbiB0dXJuIGRlc3Ryb3lzIHRoZSBgSW5lcnROb2RlYCBpZiBubyBgSW5lcnRSb290YHNcbiAqIHJlbWFpbiBpbiB0aGUgc2V0LiBPbiBkZXN0cnVjdGlvbiwgYEluZXJ0Tm9kZWAgcmVpbnN0YXRlcyB0aGUgc3RvcmVkIGB0YWJpbmRleGAgaWYgb25lIGV4aXN0cyxcbiAqIG9yIHJlbW92ZXMgdGhlIGB0YWJpbmRleGAgYXR0cmlidXRlIGlmIHRoZSBlbGVtZW50IGlzIGludHJpbnNpY2FsbHkgZm9jdXNhYmxlLlxuICovXG5jbGFzcyBJbmVydE5vZGUge1xuICAvKipcbiAgICogQHBhcmFtIHtOb2RlfSBub2RlIEEgZm9jdXNhYmxlIGVsZW1lbnQgdG8gYmUgbWFkZSBpbmVydC5cbiAgICogQHBhcmFtIHtJbmVydFJvb3R9IGluZXJ0Um9vdCBUaGUgaW5lcnQgcm9vdCBlbGVtZW50IGFzc29jaWF0ZWQgd2l0aCB0aGlzIGluZXJ0IG5vZGUuXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihub2RlLCBpbmVydFJvb3QpIHtcbiAgICAvKiogQHR5cGUge05vZGV9ICovXG4gICAgdGhpcy5fbm9kZSA9IG5vZGU7XG5cbiAgICAvKiogQHR5cGUge2Jvb2xlYW59ICovXG4gICAgdGhpcy5fb3ZlcnJvZGVGb2N1c01ldGhvZCA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUge1NldDxJbmVydFJvb3Q+fSBUaGUgc2V0IG9mIGRlc2NlbmRhbnQgaW5lcnQgcm9vdHMuXG4gICAgICogICAgSWYgYW5kIG9ubHkgaWYgdGhpcyBzZXQgYmVjb21lcyBlbXB0eSwgdGhpcyBub2RlIGlzIG5vIGxvbmdlciBpbmVydC5cbiAgICAgKi9cbiAgICB0aGlzLl9pbmVydFJvb3RzID0gbmV3IFNldChbaW5lcnRSb290XSk7XG5cbiAgICAvKiogQHR5cGUge2Jvb2xlYW59ICovXG4gICAgdGhpcy5fZGVzdHJveWVkID0gZmFsc2U7XG5cbiAgICAvLyBTYXZlIGFueSBwcmlvciB0YWJpbmRleCBpbmZvIGFuZCBtYWtlIHRoaXMgbm9kZSB1bnRhYmJhYmxlXG4gICAgdGhpcy5lbnN1cmVVbnRhYmJhYmxlKCk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbCB0aGlzIHdoZW5ldmVyIHRoaXMgb2JqZWN0IGlzIGFib3V0IHRvIGJlY29tZSBvYnNvbGV0ZS5cbiAgICogVGhpcyBtYWtlcyB0aGUgbWFuYWdlZCBub2RlIGZvY3VzYWJsZSBhZ2FpbiBhbmQgZGVsZXRlcyBhbGwgb2YgdGhlIHByZXZpb3VzbHkgc3RvcmVkIHN0YXRlLlxuICAgKi9cbiAgZGVzdHJ1Y3RvcigpIHtcbiAgICB0aGlzLl90aHJvd0lmRGVzdHJveWVkKCk7XG5cbiAgICBpZiAodGhpcy5fbm9kZSkge1xuICAgICAgaWYgKHRoaXMuaGFzU2F2ZWRUYWJJbmRleClcbiAgICAgICAgdGhpcy5fbm9kZS5zZXRBdHRyaWJ1dGUoJ3RhYmluZGV4JywgdGhpcy5zYXZlZFRhYkluZGV4KTtcbiAgICAgIGVsc2VcbiAgICAgICAgdGhpcy5fbm9kZS5yZW1vdmVBdHRyaWJ1dGUoJ3RhYmluZGV4Jyk7XG5cbiAgICAgIGlmICh0aGlzLl9vdmVycm9kZUZvY3VzTWV0aG9kKVxuICAgICAgICBkZWxldGUgdGhpcy5fbm9kZS5mb2N1cztcbiAgICB9XG4gICAgZGVsZXRlIHRoaXMuX25vZGU7XG4gICAgZGVsZXRlIHRoaXMuX2luZXJ0Um9vdHM7XG5cbiAgICB0aGlzLl9kZXN0cm95ZWQgPSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEB0eXBlIHtib29sZWFufSBXaGV0aGVyIHRoaXMgb2JqZWN0IGlzIG9ic29sZXRlIGJlY2F1c2UgdGhlIG1hbmFnZWQgbm9kZSBpcyBubyBsb25nZXIgaW5lcnQuXG4gICAqIElmIHRoZSBvYmplY3QgaGFzIGJlZW4gZGVzdHJveWVkLCBhbnkgYXR0ZW1wdCB0byBhY2Nlc3MgaXQgd2lsbCBjYXVzZSBhbiBleGNlcHRpb24uXG4gICAqL1xuICBnZXQgZGVzdHJveWVkKCkge1xuICAgIHJldHVybiB0aGlzLl9kZXN0cm95ZWQ7XG4gIH1cblxuICBfdGhyb3dJZkRlc3Ryb3llZCgpIHtcbiAgICBpZiAodGhpcy5kZXN0cm95ZWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUcnlpbmcgdG8gYWNjZXNzIGRlc3Ryb3llZCBJbmVydE5vZGVcIik7XG4gIH1cblxuICAvKiogQHJldHVybiB7Ym9vbGVhbn0gKi9cbiAgZ2V0IGhhc1NhdmVkVGFiSW5kZXgoKSB7XG4gICAgcmV0dXJuICdfc2F2ZWRUYWJJbmRleCcgaW4gdGhpcztcbiAgfVxuXG4gIC8qKiBAcmV0dXJuIHtOb2RlfSAqL1xuICBnZXQgbm9kZSgpIHtcbiAgICB0aGlzLl90aHJvd0lmRGVzdHJveWVkKCk7XG4gICAgcmV0dXJuIHRoaXMuX25vZGU7XG4gIH1cblxuICAvKiogQHBhcmFtIHtudW1iZXJ9IHRhYkluZGV4ICovXG4gIHNldCBzYXZlZFRhYkluZGV4KHRhYkluZGV4KSB7XG4gICAgdGhpcy5fdGhyb3dJZkRlc3Ryb3llZCgpO1xuICAgIHRoaXMuX3NhdmVkVGFiSW5kZXggPSB0YWJJbmRleDtcbiAgfVxuXG4gIC8qKiBAcmV0dXJuIHtudW1iZXJ9ICovXG4gIGdldCBzYXZlZFRhYkluZGV4KCkge1xuICAgIHRoaXMuX3Rocm93SWZEZXN0cm95ZWQoKTtcbiAgICByZXR1cm4gdGhpcy5fc2F2ZWRUYWJJbmRleDtcbiAgfVxuXG4gIC8qKiBTYXZlIHRoZSBleGlzdGluZyB0YWJpbmRleCB2YWx1ZSBhbmQgbWFrZSB0aGUgbm9kZSB1bnRhYmJhYmxlIGFuZCB1bmZvY3VzYWJsZSAqL1xuICBlbnN1cmVVbnRhYmJhYmxlKCkge1xuICAgIGNvbnN0IG5vZGUgPSB0aGlzLm5vZGU7XG4gICAgbm9kZS5ibHVyKCk7ICAvLyBUT0RPKGFsaWNlKTogaXMgdGhpcyByaWdodD9cbiAgICBpZiAobm9kZS5tYXRjaGVzKF9mb2N1c2FibGVFbGVtZW50c1N0cmluZykpIHtcbiAgICAgIGlmIChub2RlLnRhYkluZGV4ID09PSAtMSAmJiB0aGlzLmhhc1NhdmVkVGFiSW5kZXgpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgaWYgKG5vZGUuaGFzQXR0cmlidXRlKCd0YWJpbmRleCcpKVxuICAgICAgICB0aGlzLl9zYXZlZFRhYkluZGV4ID0gbm9kZS50YWJJbmRleDtcbiAgICAgIG5vZGUuc2V0QXR0cmlidXRlKCd0YWJpbmRleCcsICctMScpO1xuICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgIG5vZGUuZm9jdXMgPSBmdW5jdGlvbigpIHt9O1xuICAgICAgICB0aGlzLl9vdmVycm9kZUZvY3VzTWV0aG9kID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG5vZGUuaGFzQXR0cmlidXRlKCd0YWJpbmRleCcpKSB7XG4gICAgICB0aGlzLl9zYXZlZFRhYkluZGV4ID0gbm9kZS50YWJJbmRleDtcbiAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKCd0YWJpbmRleCcpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYW5vdGhlciBpbmVydCByb290IHRvIHRoaXMgaW5lcnQgbm9kZSdzIHNldCBvZiBtYW5hZ2luZyBpbmVydCByb290cy5cbiAgICogQHBhcmFtIHtJbmVydFJvb3R9IGluZXJ0Um9vdFxuICAgKi9cbiAgYWRkSW5lcnRSb290KGluZXJ0Um9vdCkge1xuICAgIHRoaXMuX3Rocm93SWZEZXN0cm95ZWQoKTtcbiAgICB0aGlzLl9pbmVydFJvb3RzLmFkZChpbmVydFJvb3QpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSB0aGUgZ2l2ZW4gaW5lcnQgcm9vdCBmcm9tIHRoaXMgaW5lcnQgbm9kZSdzIHNldCBvZiBtYW5hZ2luZyBpbmVydCByb290cy5cbiAgICogSWYgdGhlIHNldCBvZiBtYW5hZ2luZyBpbmVydCByb290cyBiZWNvbWVzIGVtcHR5LCB0aGlzIG5vZGUgaXMgbm8gbG9uZ2VyIGluZXJ0LFxuICAgKiBzbyB0aGUgb2JqZWN0IHNob3VsZCBiZSBkZXN0cm95ZWQuXG4gICAqIEBwYXJhbSB7SW5lcnRSb290fSBpbmVydFJvb3RcbiAgICovXG4gIHJlbW92ZUluZXJ0Um9vdChpbmVydFJvb3QpIHtcbiAgICB0aGlzLl90aHJvd0lmRGVzdHJveWVkKCk7XG4gICAgdGhpcy5faW5lcnRSb290cy5kZWxldGUoaW5lcnRSb290KTtcbiAgICBpZiAodGhpcy5faW5lcnRSb290cy5zaXplID09PSAwKVxuICAgICAgdGhpcy5kZXN0cnVjdG9yKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBJbmVydE1hbmFnZXIgaXMgYSBwZXItZG9jdW1lbnQgc2luZ2xldG9uIG9iamVjdCB3aGljaCBtYW5hZ2VzIGFsbCBpbmVydCByb290cyBhbmQgbm9kZXMuXG4gKlxuICogV2hlbiBhbiBlbGVtZW50IGJlY29tZXMgYW4gaW5lcnQgcm9vdCBieSBoYXZpbmcgYW4gYGluZXJ0YCBhdHRyaWJ1dGUgc2V0IGFuZC9vciBpdHMgYGluZXJ0YFxuICogcHJvcGVydHkgc2V0IHRvIGB0cnVlYCwgdGhlIGBzZXRJbmVydGAgbWV0aG9kIGNyZWF0ZXMgYW4gYEluZXJ0Um9vdGAgb2JqZWN0IGZvciB0aGUgZWxlbWVudC5cbiAqIFRoZSBgSW5lcnRSb290YCBpbiB0dXJuIHJlZ2lzdGVycyBpdHNlbGYgYXMgbWFuYWdpbmcgYWxsIG9mIHRoZSBlbGVtZW50J3MgZm9jdXNhYmxlIGRlc2NlbmRhbnRcbiAqIG5vZGVzIHZpYSB0aGUgYHJlZ2lzdGVyKClgIG1ldGhvZC4gVGhlIGBJbmVydE1hbmFnZXJgIGVuc3VyZXMgdGhhdCBhIHNpbmdsZSBgSW5lcnROb2RlYCBpbnN0YW5jZVxuICogaXMgY3JlYXRlZCBmb3IgZWFjaCBzdWNoIG5vZGUsIHZpYSB0aGUgYF9tYW5hZ2VkTm9kZXNgIG1hcC5cbiAqL1xuY2xhc3MgSW5lcnRNYW5hZ2VyIHtcbiAgLyoqXG4gICAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvY3VtZW50XG4gICAqL1xuICBjb25zdHJ1Y3Rvcihkb2N1bWVudCkge1xuICAgIGlmICghZG9jdW1lbnQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgcmVxdWlyZWQgYXJndW1lbnQ7IEluZXJ0TWFuYWdlciBuZWVkcyB0byB3cmFwIGEgZG9jdW1lbnQuJyk7XG5cbiAgICAvKiogQHR5cGUge0RvY3VtZW50fSAqL1xuICAgIHRoaXMuX2RvY3VtZW50ID0gZG9jdW1lbnQ7XG5cbiAgICAvKipcbiAgICAgKiBBbGwgbWFuYWdlZCBub2RlcyBrbm93biB0byB0aGlzIEluZXJ0TWFuYWdlci4gSW4gYSBtYXAgdG8gYWxsb3cgbG9va2luZyB1cCBieSBOb2RlLlxuICAgICAqIEB0eXBlIHtNYXA8Tm9kZSwgSW5lcnROb2RlPn1cbiAgICAgKi9cbiAgICB0aGlzLl9tYW5hZ2VkTm9kZXMgPSBuZXcgTWFwKCk7XG5cbiAgICAvKipcbiAgICAgKiBBbGwgaW5lcnQgcm9vdHMga25vd24gdG8gdGhpcyBJbmVydE1hbmFnZXIuIEluIGEgbWFwIHRvIGFsbG93IGxvb2tpbmcgdXAgYnkgTm9kZS5cbiAgICAgKiBAdHlwZSB7TWFwPE5vZGUsIEluZXJ0Um9vdD59XG4gICAgICovXG4gICAgdGhpcy5faW5lcnRSb290cyA9IG5ldyBNYXAoKTtcblxuICAgIC8vIEZpbmQgYWxsIGluZXJ0IHJvb3RzIGluIGRvY3VtZW50IGFuZCBtYWtlIHRoZW0gYWN0dWFsbHkgaW5lcnQuXG4gICAgbGV0IGluZXJ0RWxlbWVudHMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tpbmVydF0nKSk7XG4gICAgZm9yIChsZXQgaW5lcnRFbGVtZW50IG9mIGluZXJ0RWxlbWVudHMpXG4gICAgICB0aGlzLnNldEluZXJ0KGluZXJ0RWxlbWVudCwgdHJ1ZSk7XG5cbiAgICAvLyBDb21tZW50IHRoZXNlIHR3byBsaW5lcyBvdXQgdG8gdXNlIHByb2dyYW1tYXRpYyBBUEkgb25seVxuICAgIHRoaXMuX29ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIodGhpcy5fd2F0Y2hGb3JJbmVydC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLl9vYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmJvZHksIHsgYXR0cmlidXRlczogdHJ1ZSwgc3VidHJlZTogdHJ1ZSwgY2hpbGRMaXN0OiB0cnVlIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCB3aGV0aGVyIHRoZSBnaXZlbiBlbGVtZW50IHNob3VsZCBiZSBhbiBpbmVydCByb290IG9yIG5vdC5cbiAgICogQHBhcmFtIHtFbGVtZW50fSByb290XG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gaW5lcnRcbiAgICovXG4gIHNldEluZXJ0KHJvb3QsIGluZXJ0KSB7XG4gICAgaWYgKGluZXJ0KSB7XG4gICAgICBpZiAodGhpcy5faW5lcnRSb290cy5oYXMocm9vdCkpICAgLy8gZWxlbWVudCBpcyBhbHJlYWR5IGluZXJ0XG4gICAgICAgIHJldHVybjtcblxuICAgICAgbGV0IGluZXJ0Um9vdCA9IG5ldyBJbmVydFJvb3Qocm9vdCwgdGhpcyk7XG4gICAgICByb290LnNldEF0dHJpYnV0ZSgnaW5lcnQnLCAnJyk7XG4gICAgICB0aGlzLl9pbmVydFJvb3RzLnNldChyb290LCBpbmVydFJvb3QpO1xuICAgICAgLy8gSWYgbm90IGNvbnRhaW5lZCBpbiB0aGUgZG9jdW1lbnQsIGl0IG11c3QgYmUgaW4gYSBzaGFkb3dSb290LlxuICAgICAgLy8gRW5zdXJlIGluZXJ0IHN0eWxlcyBhcmUgYWRkZWQgdGhlcmUuXG4gICAgICBpZiAoIXRoaXMuX2RvY3VtZW50LmJvZHkuY29udGFpbnMocm9vdCkpIHtcbiAgICAgICAgbGV0IHBhcmVudCA9IHJvb3QucGFyZW50Tm9kZTtcbiAgICAgICAgd2hpbGUgKHBhcmVudCkge1xuICAgICAgICAgIGlmIChwYXJlbnQubm9kZVR5cGUgPT09IDExKSB7XG4gICAgICAgICAgICBhZGRJbmVydFN0eWxlKHBhcmVudCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnROb2RlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghdGhpcy5faW5lcnRSb290cy5oYXMocm9vdCkpICAvLyBlbGVtZW50IGlzIGFscmVhZHkgbm9uLWluZXJ0XG4gICAgICAgIHJldHVybjtcblxuICAgICAgbGV0IGluZXJ0Um9vdCA9IHRoaXMuX2luZXJ0Um9vdHMuZ2V0KHJvb3QpO1xuICAgICAgaW5lcnRSb290LmRlc3RydWN0b3IoKTtcbiAgICAgIHRoaXMuX2luZXJ0Um9vdHMuZGVsZXRlKHJvb3QpO1xuICAgICAgcm9vdC5yZW1vdmVBdHRyaWJ1dGUoJ2luZXJ0Jyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgSW5lcnRSb290IG9iamVjdCBjb3JyZXNwb25kaW5nIHRvIHRoZSBnaXZlbiBpbmVydCByb290IGVsZW1lbnQsIGlmIGFueS5cbiAgICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50XG4gICAqIEByZXR1cm4ge0luZXJ0Um9vdD99XG4gICAqL1xuICBnZXRJbmVydFJvb3QoZWxlbWVudCkge1xuICAgIHJldHVybiB0aGlzLl9pbmVydFJvb3RzLmdldChlbGVtZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciB0aGUgZ2l2ZW4gSW5lcnRSb290IGFzIG1hbmFnaW5nIHRoZSBnaXZlbiBub2RlLlxuICAgKiBJbiB0aGUgY2FzZSB3aGVyZSB0aGUgbm9kZSBoYXMgYSBwcmV2aW91c2x5IGV4aXN0aW5nIGluZXJ0IHJvb3QsIHRoaXMgaW5lcnQgcm9vdCB3aWxsXG4gICAqIGJlIGFkZGVkIHRvIGl0cyBzZXQgb2YgaW5lcnQgcm9vdHMuXG4gICAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICAgKiBAcGFyYW0ge0luZXJ0Um9vdH0gaW5lcnRSb290XG4gICAqIEByZXR1cm4ge0luZXJ0Tm9kZX0gaW5lcnROb2RlXG4gICAqL1xuICByZWdpc3Rlcihub2RlLCBpbmVydFJvb3QpIHtcbiAgICBsZXQgaW5lcnROb2RlID0gdGhpcy5fbWFuYWdlZE5vZGVzLmdldChub2RlKTtcbiAgICBpZiAoaW5lcnROb2RlICE9PSB1bmRlZmluZWQpIHsgIC8vIG5vZGUgd2FzIGFscmVhZHkgaW4gYW4gaW5lcnQgc3VidHJlZVxuICAgICAgaW5lcnROb2RlLmFkZEluZXJ0Um9vdChpbmVydFJvb3QpO1xuICAgICAgLy8gVXBkYXRlIHNhdmVkIHRhYmluZGV4IHZhbHVlIGlmIG5lY2Vzc2FyeVxuICAgICAgaW5lcnROb2RlLmVuc3VyZVVudGFiYmFibGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW5lcnROb2RlID0gbmV3IEluZXJ0Tm9kZShub2RlLCBpbmVydFJvb3QpO1xuICAgIH1cblxuICAgIHRoaXMuX21hbmFnZWROb2Rlcy5zZXQobm9kZSwgaW5lcnROb2RlKTtcblxuICAgIHJldHVybiBpbmVydE5vZGU7XG4gIH1cblxuICAvKipcbiAgICogRGUtcmVnaXN0ZXIgdGhlIGdpdmVuIEluZXJ0Um9vdCBhcyBtYW5hZ2luZyB0aGUgZ2l2ZW4gaW5lcnQgbm9kZS5cbiAgICogUmVtb3ZlcyB0aGUgaW5lcnQgcm9vdCBmcm9tIHRoZSBJbmVydE5vZGUncyBzZXQgb2YgbWFuYWdpbmcgaW5lcnQgcm9vdHMsIGFuZCByZW1vdmUgdGhlIGluZXJ0XG4gICAqIG5vZGUgZnJvbSB0aGUgSW5lcnRNYW5hZ2VyJ3Mgc2V0IG9mIG1hbmFnZWQgbm9kZXMgaWYgaXQgaXMgZGVzdHJveWVkLlxuICAgKiBJZiB0aGUgbm9kZSBpcyBub3QgY3VycmVudGx5IG1hbmFnZWQsIHRoaXMgaXMgZXNzZW50aWFsbHkgYSBuby1vcC5cbiAgICogQHBhcmFtIHtOb2RlfSBub2RlXG4gICAqIEBwYXJhbSB7SW5lcnRSb290fSBpbmVydFJvb3RcbiAgICogQHJldHVybiB7SW5lcnROb2RlP30gVGhlIHBvdGVudGlhbGx5IGRlc3Ryb3llZCBJbmVydE5vZGUgYXNzb2NpYXRlZCB3aXRoIHRoaXMgbm9kZSwgaWYgYW55LlxuICAgKi9cbiAgZGVyZWdpc3Rlcihub2RlLCBpbmVydFJvb3QpIHtcbiAgICBjb25zdCBpbmVydE5vZGUgPSB0aGlzLl9tYW5hZ2VkTm9kZXMuZ2V0KG5vZGUpO1xuICAgIGlmICghaW5lcnROb2RlKVxuICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICBpbmVydE5vZGUucmVtb3ZlSW5lcnRSb290KGluZXJ0Um9vdCk7XG4gICAgaWYgKGluZXJ0Tm9kZS5kZXN0cm95ZWQpXG4gICAgICB0aGlzLl9tYW5hZ2VkTm9kZXMuZGVsZXRlKG5vZGUpO1xuXG4gICAgcmV0dXJuIGluZXJ0Tm9kZTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIHVzZWQgd2hlbiBtdXRhdGlvbiBvYnNlcnZlciBkZXRlY3RzIGF0dHJpYnV0ZSBjaGFuZ2VzLlxuICAgKiBAcGFyYW0ge011dGF0aW9uUmVjb3JkfSByZWNvcmRzXG4gICAqIEBwYXJhbSB7TXV0YXRpb25PYnNlcnZlcn0gc2VsZlxuICAgKi9cbiAgX3dhdGNoRm9ySW5lcnQocmVjb3Jkcywgc2VsZikge1xuICAgIGZvciAobGV0IHJlY29yZCBvZiByZWNvcmRzKSB7XG4gICAgICBzd2l0Y2ggKHJlY29yZC50eXBlKSB7XG4gICAgICBjYXNlICdjaGlsZExpc3QnOlxuICAgICAgICBmb3IgKGxldCBub2RlIG9mIEFycmF5LmZyb20ocmVjb3JkLmFkZGVkTm9kZXMpKSB7XG4gICAgICAgICAgaWYgKG5vZGUubm9kZVR5cGUgIT09IE5vZGUuRUxFTUVOVF9OT0RFKVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgbGV0IGluZXJ0RWxlbWVudHMgPSBBcnJheS5mcm9tKG5vZGUucXVlcnlTZWxlY3RvckFsbCgnW2luZXJ0XScpKTtcbiAgICAgICAgICBpZiAobm9kZS5tYXRjaGVzKCdbaW5lcnRdJykpXG4gICAgICAgICAgICBpbmVydEVsZW1lbnRzLnVuc2hpZnQobm9kZSk7XG4gICAgICAgICAgZm9yIChsZXQgaW5lcnRFbGVtZW50IG9mIGluZXJ0RWxlbWVudHMpXG4gICAgICAgICAgICB0aGlzLnNldEluZXJ0KGluZXJ0RWxlbWVudCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdhdHRyaWJ1dGVzJzpcbiAgICAgICAgaWYgKHJlY29yZC5hdHRyaWJ1dGVOYW1lICE9PSAnaW5lcnQnKVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICBsZXQgdGFyZ2V0ID0gcmVjb3JkLnRhcmdldDtcbiAgICAgICAgbGV0IGluZXJ0ID0gdGFyZ2V0Lmhhc0F0dHJpYnV0ZSgnaW5lcnQnKTtcbiAgICAgICAgdGhpcy5zZXRJbmVydCh0YXJnZXQsIGluZXJ0KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbiAvKipcbiAgKiBSZWN1cnNpdmVseSB3YWxrIHRoZSBjb21wb3NlZCB0cmVlIGZyb20gfG5vZGV8LlxuICAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICAqIEBwYXJhbSB7KGZ1bmN0aW9uIChFbGVtZW50KSk9fSBjYWxsYmFjayBDYWxsYmFjayB0byBiZSBjYWxsZWQgZm9yIGVhY2ggZWxlbWVudCB0cmF2ZXJzZWQsXG4gICogICAgIGJlZm9yZSBkZXNjZW5kaW5nIGludG8gY2hpbGQgbm9kZXMuXG4gICogQHBhcmFtIHtTaGFkb3dSb290PX0gc2hhZG93Um9vdEFuY2VzdG9yIFRoZSBuZWFyZXN0IFNoYWRvd1Jvb3QgYW5jZXN0b3IsIGlmIGFueS5cbiAgKi9cbmZ1bmN0aW9uIGNvbXBvc2VkVHJlZVdhbGsobm9kZSwgY2FsbGJhY2ssIHNoYWRvd1Jvb3RBbmNlc3Rvcikge1xuICBpZiAobm9kZS5ub2RlVHlwZSA9PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgIGNvbnN0IGVsZW1lbnQgPSAvKiogQHR5cGUge0VsZW1lbnR9ICovIChub2RlKTtcbiAgICBpZiAoY2FsbGJhY2spXG4gICAgICBjYWxsYmFjayhlbGVtZW50KVxuXG4gICAgLy8gRGVzY2VuZCBpbnRvIG5vZGU6XG4gICAgLy8gSWYgaXQgaGFzIGEgU2hhZG93Um9vdCwgaWdub3JlIGFsbCBjaGlsZCBlbGVtZW50cyAtIHRoZXNlIHdpbGwgYmUgcGlja2VkXG4gICAgLy8gdXAgYnkgdGhlIDxjb250ZW50PiBvciA8c2hhZG93PiBlbGVtZW50cy4gRGVzY2VuZCBzdHJhaWdodCBpbnRvIHRoZVxuICAgIC8vIFNoYWRvd1Jvb3QuXG4gICAgY29uc3Qgc2hhZG93Um9vdCA9IGVsZW1lbnQuc2hhZG93Um9vdCB8fCBlbGVtZW50LndlYmtpdFNoYWRvd1Jvb3Q7XG4gICAgaWYgKHNoYWRvd1Jvb3QpIHtcbiAgICAgIGNvbXBvc2VkVHJlZVdhbGsoc2hhZG93Um9vdCwgY2FsbGJhY2ssIHNoYWRvd1Jvb3QpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIGl0IGlzIGEgPGNvbnRlbnQ+IGVsZW1lbnQsIGRlc2NlbmQgaW50byBkaXN0cmlidXRlZCBlbGVtZW50cyAtIHRoZXNlXG4gICAgLy8gYXJlIGVsZW1lbnRzIGZyb20gb3V0c2lkZSB0aGUgc2hhZG93IHJvb3Qgd2hpY2ggYXJlIHJlbmRlcmVkIGluc2lkZSB0aGVcbiAgICAvLyBzaGFkb3cgRE9NLlxuICAgIGlmIChlbGVtZW50LmxvY2FsTmFtZSA9PSAnY29udGVudCcpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSAvKiogQHR5cGUge0hUTUxDb250ZW50RWxlbWVudH0gKi8gKGVsZW1lbnQpO1xuICAgICAgLy8gVmVyaWZpZXMgaWYgU2hhZG93RG9tIHYwIGlzIHN1cHBvcnRlZC5cbiAgICAgIGNvbnN0IGRpc3RyaWJ1dGVkTm9kZXMgPSBjb250ZW50LmdldERpc3RyaWJ1dGVkTm9kZXMgP1xuICAgICAgICBjb250ZW50LmdldERpc3RyaWJ1dGVkTm9kZXMoKSA6IFtdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkaXN0cmlidXRlZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbXBvc2VkVHJlZVdhbGsoZGlzdHJpYnV0ZWROb2Rlc1tpXSwgY2FsbGJhY2ssIHNoYWRvd1Jvb3RBbmNlc3Rvcik7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgaXQgaXMgYSA8c2xvdD4gZWxlbWVudCwgZGVzY2VuZCBpbnRvIGFzc2lnbmVkIG5vZGVzIC0gdGhlc2VcbiAgICAvLyBhcmUgZWxlbWVudHMgZnJvbSBvdXRzaWRlIHRoZSBzaGFkb3cgcm9vdCB3aGljaCBhcmUgcmVuZGVyZWQgaW5zaWRlIHRoZVxuICAgIC8vIHNoYWRvdyBET00uXG4gICAgaWYgKGVsZW1lbnQubG9jYWxOYW1lID09ICdzbG90Jykge1xuICAgICAgY29uc3Qgc2xvdCA9IC8qKiBAdHlwZSB7SFRNTFNsb3RFbGVtZW50fSAqLyAoZWxlbWVudCk7XG4gICAgICAvLyBWZXJpZnkgaWYgU2hhZG93RG9tIHYxIGlzIHN1cHBvcnRlZC5cbiAgICAgIGNvbnN0IGRpc3RyaWJ1dGVkTm9kZXMgPSBzbG90LmFzc2lnbmVkTm9kZXMgP1xuICAgICAgICBzbG90LmFzc2lnbmVkTm9kZXMoeyBmbGF0dGVuOiB0cnVlIH0pIDogW107XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRpc3RyaWJ1dGVkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29tcG9zZWRUcmVlV2FsayhkaXN0cmlidXRlZE5vZGVzW2ldLCBjYWxsYmFjaywgc2hhZG93Um9vdEFuY2VzdG9yKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICAvLyBJZiBpdCBpcyBuZWl0aGVyIHRoZSBwYXJlbnQgb2YgYSBTaGFkb3dSb290LCBhIDxjb250ZW50PiBlbGVtZW50LCBhIDxzbG90PlxuICAvLyBlbGVtZW50LCBub3IgYSA8c2hhZG93PiBlbGVtZW50IHJlY3Vyc2Ugbm9ybWFsbHkuXG4gIGxldCBjaGlsZCA9IG5vZGUuZmlyc3RDaGlsZDtcbiAgd2hpbGUgKGNoaWxkICE9IG51bGwpIHtcbiAgICBjb21wb3NlZFRyZWVXYWxrKGNoaWxkLCBjYWxsYmFjaywgc2hhZG93Um9vdEFuY2VzdG9yKTtcbiAgICBjaGlsZCA9IGNoaWxkLm5leHRTaWJsaW5nO1xuICB9XG59XG5cbi8qKlxuICogQWRkcyBhIHN0eWxlIGVsZW1lbnQgdG8gdGhlIG5vZGUgY29udGFpbmluZyB0aGUgaW5lcnQgc3BlY2lmaWMgc3R5bGVzXG4gKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAqL1xuZnVuY3Rpb24gYWRkSW5lcnRTdHlsZShub2RlKSB7XG4gIGlmIChub2RlLnF1ZXJ5U2VsZWN0b3IoJ3N0eWxlI2luZXJ0LXN0eWxlJykpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgbGV0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgc3R5bGUuc2V0QXR0cmlidXRlKCdpZCcsICdpbmVydC1zdHlsZScpO1xuICBzdHlsZS50ZXh0Q29udGVudCA9IFwiXFxuXCIrXG4gICAgICAgICAgICAgICAgICAgICAgXCJbaW5lcnRdIHtcXG5cIiArXG4gICAgICAgICAgICAgICAgICAgICAgXCIgIHBvaW50ZXItZXZlbnRzOiBub25lO1xcblwiICtcbiAgICAgICAgICAgICAgICAgICAgICBcIiAgY3Vyc29yOiBkZWZhdWx0O1xcblwiICtcbiAgICAgICAgICAgICAgICAgICAgICBcIn1cXG5cIiArXG4gICAgICAgICAgICAgICAgICAgICAgXCJcXG5cIiArXG4gICAgICAgICAgICAgICAgICAgICAgXCJbaW5lcnRdLCBbaW5lcnRdICoge1xcblwiICtcbiAgICAgICAgICAgICAgICAgICAgICBcIiAgdXNlci1zZWxlY3Q6IG5vbmU7XFxuXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIFwiICAtd2Via2l0LXVzZXItc2VsZWN0OiBub25lO1xcblwiICtcbiAgICAgICAgICAgICAgICAgICAgICBcIiAgLW1vei11c2VyLXNlbGVjdDogbm9uZTtcXG5cIiArXG4gICAgICAgICAgICAgICAgICAgICAgXCIgIC1tcy11c2VyLXNlbGVjdDogbm9uZTtcXG5cIiArXG4gICAgICAgICAgICAgICAgICAgICAgXCJ9XFxuXCI7XG4gIG5vZGUuYXBwZW5kQ2hpbGQoc3R5bGUpO1xufVxuXG5cbmxldCBpbmVydE1hbmFnZXIgPSBuZXcgSW5lcnRNYW5hZ2VyKGRvY3VtZW50KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShFbGVtZW50LnByb3RvdHlwZSwgJ2luZXJ0Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmhhc0F0dHJpYnV0ZSgnaW5lcnQnKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldDogZnVuY3Rpb24oaW5lcnQpIHsgaW5lcnRNYW5hZ2VyLnNldEluZXJ0KHRoaXMsIGluZXJ0KSB9XG4gICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbmFkZEluZXJ0U3R5bGUoZG9jdW1lbnQuYm9keSk7XG5cbn0pKGRvY3VtZW50KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
