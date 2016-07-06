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

(function(document) {

/** @type {string} */
const _focusableElementsString = ['a[href]',
                                  'area[href]',
                                  'input:not([disabled])',
                                  'select:not([disabled])',
                                  'textarea:not([disabled])',
                                  'button:not([disabled])',
                                  'iframe',
                                  'object',
                                  'embed',
                                  '[contenteditable]'].join(',');

/**
 * InertRoot manages a single inert subtree.
 */
class InertRoot {
  /**
   * @param {Element} rootElement The Element at the root of the inert subtree.
   * @param {InertManager} inertManager The global singleton InertManager object.
   */
  constructor(rootElement, inertManager) {
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

    // Make all focusable elements in the subtree unfocusable
    this._makeSubtreeUnfocusable(this._rootElement);

    // Watch for any additions in the subtree and make them unfocusable too
    this._observer = new MutationObserver(this._onChildAdded.bind(this));
    this._observer.observe(this._rootElement, { childList: true, subtree: true });
  }

  /**
   * Call this whenever this object is about to become obsolete.
   * This unwinds all of the state stored in this object and updates the state of all of the managed nodes.
   */
  destructor() {
    this._observer.disconnect();
    delete this._observer;

    if (this._rootElement)
      this._rootElement.removeAttribute('aria-hidden');
    delete this._rootElement;

    for (let inertNode of this._managedNodes) {
      this._inertManager.deregister(inertNode, this);
      this._managedNodes.delete(inertNode);
    }
    delete this._managedNodes;

    delete this._inertManager;
  }

  /**
   * @return {Set<InertNode>} A copy of this InertRoot's managed nodes set.
   */
  get managedNodes() {
    return new Set(this._managedNodes);
  }

  /**
   * @param {Node} startNode
   */
  _makeSubtreeUnfocusable(startNode) {
    composedTreeWalk(startNode, (node) => { return this._visitNode(node); });
  }

  /**
   * @param {Node} node
   */
  _visitNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE)
      return;

    // If a descendant inert root becomes un-inert, its descendants will still be inert because of this
    // inert root, so all of its managed nodes need to be adopted by this InertRoot.
    if (node !== this._rootElement && node.hasAttribute('inert')) {
      let inertSubRoot = this._inertManager.getInertRoot(node);

      // During initialisation this inert root may not have been registered yet,
      // so register it now if need be.
      if (!inertSubRoot) {
        this._inertManager.setInert(node, true);
        inertSubRoot = this._inertManager.getInertRoot(node);
      }

      for (let savedInertNode of inertSubRoot.managedNodes) {
        this._inertManager.register(savedInertNode.node, this);
        this._managedNodes.add(savedInertNode);
      }
    }

    if (node.matches(_focusableElementsString) || node.hasAttribute('tabindex')) {
      let inertNode = this._inertManager.register(node, this);
      this._managedNodes.add(inertNode);
    }
  }

  /**
   * Callback used when mutation observer detects subtree additions.
   * @param {MutationRecord} records
   * @param {MutationObserver} self
   */
  _onChildAdded(records, self) {
    for (let record of records) {
      for (let node of Array.from(record.addedNodes))
        this._makeSubtreeUnfocusable(node);
    }
  }
}

/**
 * InertNode initialises and manages a single inert node.
 * A node is inert if it is a descendant of one or more inert root elements.
 */
class InertNode {
  /**
   * @param {Node} node A focusable element to be made inert.
   * @param {InertRoot} inertRoot The inert root element associated with this inert node.
   */
  constructor(node, inertRoot) {
    /** @type {Node} */
    this._node = node;

    /**
     * @type {Set<InertRoot>} The set of descendant inert roots.
     *    If and only if this set becomes empty, this node is no longer inert.
     */
    this._inertRoots = new Set([inertRoot]);

    /** @type {boolean} */
    this._destroyed = false;

    // Make this node unfocusable
    if (node.matches(_focusableElementsString)) {
      if (node.hasAttribute('tabindex'))
        this._savedTabIndex = node.tabIndex;
      this._node.setAttribute('tabindex', '-1');
    } else if (node.hasAttribute('tabindex')) {
      this._savedTabIndex = node.tabIndex;
      this._node.removeAttribute('tabindex');
    }
  }

  /**
   * Call this whenever this object is about to become obsolete.
   * This makes the managed node focusable again and deletes all of the previously stored state.
   */
  destructor() {
    this._throwIfDestroyed();

    if (this._node) {
      if ('_savedTabIndex' in this)
        this._node.setAttribute('tabindex', this.savedTabIndex);
      else
        this._node.removeAttribute('tabindex');
    }
    delete this._node;
    delete this._inertRoots;

    this._destroyed = true;
  }

  /**
   * @type {boolean} Whether this object is obsolete because the managed node is no longer inert.
   * If the object has been destroyed, any attempt to access it will cause an exception.
   */
  get destroyed() {
    return this._destroyed;
  }

  _throwIfDestroyed() {
    if (this.destroyed)
      throw new Error("Trying to access destroyed InertNode");
  }

  /** @return {Node} */
  get node() {
    this._throwIfDestroyed;
    return this._node;
  }

  /** @param {number} tabIndex */
  set savedTabIndex(tabIndex) {
    this._throwIfDestroyed();
    this._savedTabIndex = tabIndex;
  }

  /** @return {number} */
  get savedTabIndex() {
    this._throwIfDestroyed();
    return this._savedTabIndex;
  }

  /**
   * Add another inert root to this inert node's set of managing inert roots.
   * @param {InertRoot} inertRoot
   */
  addInertRoot(inertRoot) {
    this._throwIfDestroyed();
    this._inertRoots.add(inertRoot);
  }

  /**
   * Remove the given inert root from this inert node's set of managing inert roots.
   * If the set of managing inert roots becomes empty, this node is no longer inert,
   * so the object should be destroyed.
   * @param {InertRoot} inertRoot
   */
  removeInertRoot(inertRoot) {
    this._throwIfDestroyed();
    this._inertRoots.delete(inertRoot);
    if (this._inertRoots.size === 0)
      this.destructor();
  }
}

/**
 * InertManager is a per-document singleton object which manages all inert roots and nodes.
 */
class InertManager {
  /**
   * @param {Document} document
   */
  constructor(document) {
    if (!document)
      throw new Error('Missing required argument; InertManager needs to wrap a document.');

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
    let inertElements = Array.from(document.querySelectorAll('[inert]'));
    for (let inertElement of inertElements)
      this.setInert(inertElement, true);

    // Comment these two lines out to use programmatic API only
    this._observer = new MutationObserver(this._watchForInert.bind(this));
    this._observer.observe(document.body, { attributes: true, subtree: true });
  }

  /**
   * Set whether the given element should be an inert root or not.
   * @param {Element} root
   * @param {boolean} inert
   */
  setInert(root, inert) {
    if (inert) {
      if (this._inertRoots.has(root))   // element is already inert
        return;

      let inertRoot = new InertRoot(root, this);
      root.setAttribute('inert', '');
      this._inertRoots.set(root, inertRoot);
    } else {
      if (!this._inertRoots.has(root))  // element is already non-inert
        return;

      let inertRoot = this._inertRoots.get(root);
      inertRoot.destructor();
      this._inertRoots.delete(root);
      root.removeAttribute('inert');
    }
  }

  getInertRoot(element) {
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
  register(node, inertRoot) {
    let inertNode = this._managedNodes.get(node);
    if (inertNode !== undefined)  // node was already in an inert subtree
      inertNode.addInertRoot(inertRoot);
    else
      inertNode = new InertNode(node, inertRoot);

    this._managedNodes.set(node, inertNode);

    return inertNode;
  }

  /**
   * De-register the given InertRoot as managing the given InertNode.
   * Removes the inert root from the InertNode's set of managing inert roots, and remove the inert
   * node from the InertManager's set of managed nodes if it is destroyed.
   * @param {InertNode} inertNode
   * @param {InertRoot} inertRoot
   */
  deregister(inertNode, inertRoot) {
    let node = inertNode.node;
    inertNode.removeInertRoot(inertRoot);
    if (inertNode.destroyed)
      this._managedNodes.delete(node);
  }


  /**
   * Callback used when mutation observer detects attribute changes.
   * @param {MutationRecord} records
   * @param {MutationObserver} self
   */
  _watchForInert(records, self) {
    for (let record of records) {
      if (record.type !== 'attributes' || record.attributeName !== 'inert')
        continue;
      let target = record.target;
      let inert = target.hasAttribute('inert');
      this.setInert(target, inert);
    }
  }
}

 /**
  * Recursively walk the composed tree from |node|.
  * @param {Node} node
  * @param {(function (Element))=} callback Callback to be called for each element traversed,
  *     before descending into child nodes.
  * @param {ShadowRoot=} shadowRootAncestor The nearest ShadowRoot ancestor, if any.
  */
function composedTreeWalk(node, callback, shadowRootAncestor) {
  let element = undefined;
  if (node.nodeType == Node.ELEMENT_NODE)
    element = /** @type {Element} */ (node);

  if (element && callback)
    callback(element)

  // Descend into node:
  // If it has a ShadowRoot, ignore all child elements - these will be picked
  // up by the <content> or <shadow> elements. Descend straight into the
  // ShadowRoot.
  if (element) {
    let shadowRoot = element.shadowRoot || element.webkitShadowRoot;
    if (shadowRoot) {
      composedTreeWalk(shadowRoot, callback, shadowRoot);
      return;
    }
  }

  // If it is a <content> element, descend into distributed elements - these
  // are elements from outside the shadow root which are rendered inside the
  // shadow DOM.
  if (element && element.localName == 'content') {
    let content = /** @type {HTMLContentElement} */ (element);
    let distributedNodes = content.getDistributedNodes();
    for (let i = 0; i < distributedNodes.length; i++) {
      composedTreeWalk(distributedNodes[i], callback, shadowRootAncestor);
    }
    return;
  }

  // If it is neither the parent of a ShadowRoot, a <content> element, nor
  // a <shadow> element recurse normally.
  let child = node.firstChild;
  while (child != null) {
    composedTreeWalk(child, callback, shadowRootAncestor);
    child = child.nextSibling;
  }
}

let inertManager = new InertManager(document);
Object.defineProperty(Element.prototype, 'inert', {
                        enumerable: true,
                        get: function() { return this.hasAttribute('inert'); },
                        set: function(inert) { inertManager.setInert(this, inert) }
                      });

let style = document.createElement('style');
style.textContent = "\n"+
                    "[inert], [inert] * {\n" +
                    "  pointer-events: none;\n" +
                    "  user-select: none;\n" +
                    "  -webkit-user-select: none;\n" +
                    "  -moz-user-select: none;\n" +
                    "  -ms-user-select: none;\n" +
                    "  cursor: default;\n"
                    "}\n";

document.body.appendChild(style);

})(document);

