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

class InertRoot {
  constructor(rootElement, inertManager) {
    this._inertManager = inertManager;
    this._rootElement = rootElement;
    this._rootElement.setAttribute('aria-hidden', 'true');
    this._rootElement.__inertRoot = this;

    this._savedNodes = new Set([]);

    this._walkSubtree(this._rootElement);

    // mutation observer
    this._observer = new MutationObserver(this._onChildAdded.bind(this));
    this._observer.observe(this._rootElement, { childList: true, subtree: true });
  }

  destructor() {
    this._observer.disconnect();
    delete this._observer;

    if (this._rootElement && this._rootElement.parentNode)
      this._rootElement.removeAttribute('aria-hidden');
    delete this._rootElement;

    for (let inertNode of this._savedNodes) {
      inertNode.removeInertRoot(this);
      this._savedNodes.delete(inertNode);
    }
    delete this._savedNodes;

    delete this._inertManager;
  }

  /**
   * @param {Node} startNode
   */
  _walkSubtree(startNode) {
    InertManager.composedTreeWalk(startNode, { preorder: (node) => { return this._visitNode(node); } });
  }

  /**
   * @param {Node} node
   */
  _visitNode(node) {
    if (node.hasAttribute('inert')) {
      let inertSubRoot = node.__inertRoot;
      for (let savedInertNode of inertSubRoot._savedNodes) {
        this._inertManager.register(savedInertNode.node, this);
        this._savedNodes.add(savedInertNode);
      }
    }

    if (!node.matches(InertNode._focusableElementsString) && !node.hasAttribute('tabindex'))
      return;

    let inertNode = this._inertManager.register(node, this);
    this._savedNodes.add(inertNode);
  }

  _onChildAdded(records, self) {
    for (let record of records) {
      for (let node of Array.from(record.addedNodes))
        this._walkSubtree(node);
    }
  }
}

class InertNode {
  /**
   * @param {Node} node
   * @param {InertRoot} inertRoot
   */
  constructor(node, inertRoot) {
    this._node = node;
    this._node.__inertNode = this;

    this._inertRoots = new Set([inertRoot]);
    this._destroyed = false;

    if (node.matches(InertNode._focusableElementsString)) {
      if (node.hasAttribute('tabindex'))
        this._savedTabIndex = node.tabIndex;
      this._node.setAttribute('tabindex', '-1');
    } else if (node.hasAttribute('tabindex')) {
      this._savedTabIndex = node.tabIndex;
      this._node.removeAttribute('tabindex');
    }
  }

  destructor() {
    this._throwIfDestroyed();

    if (this._node.parentNode) {
      if ('_savedTabIndex' in this)
        this._node.setAttribute('tabindex', this.savedTabIndex);
      else
        this._node.removeAttribute('tabindex');
    }
    delete this._node.__inertNode;
    delete this._node;
    delete this._inertRoots;

    this._destroyed = true;
  }

  static get _focusableElementsString() {
    return 'a[href],area[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),iframe,object,embed,[contenteditable]';
  }

  get destroyed() {
    return this._destroyed;
  }

  _throwIfDestroyed() {
    if (this.destroyed)
      throw new Error("Trying to access destroyed InertNode");
  }

  get node() {
    this._throwIfDestroyed();
    return this._node;
  }

  set savedTabIndex(tabIndex) {
    this._throwIfDestroyed();
    this._savedTabIndex = tabIndex;
  }

  get savedTabIndex() {
    this._throwIfDestroyed();
    return this._savedTabIndex;
  }

  addInertRoot(inertRoot) {
    this._throwIfDestroyed();
    this._inertRoots.add(inertRoot);
  }

  removeInertRoot(inertRoot) {
    this._throwIfDestroyed();
    this._inertRoots.delete(inertRoot);
    if (this._inertRoots.size === 0)
      this.destructor();
  }
}

class InertManager {
  /**
   * @param {Document} document
   */
  constructor(document) {
    if (!document)
      throw new Error('Missing required argument; InertManager needs to wrap a document.');

    this._document = document;
    this._savedNodes = new Set([]);
    this._inertRoots = new Set([]);

    var inertElements = Array.from(document.querySelectorAll('[inert]'));
    for (let inertElement of inertElements)
      this.setInert(inertElement, true);
  }

  /**
   * @param {Element} root
   * @param {boolean} inert
   */
  setInert(root, inert) {
    if (inert) {
      if (root.__inertRoot)  // Check for inert attribute?
        return;

      let inertRoot = new InertRoot(root, this);
      root.__inertRoot = inertRoot;
      root.setAttribute('inert', '');
      this._inertRoots.add(inertRoot);
    } else {
      if (!root.__inertRoot)  // Check for inert attribute?
        return;

      let inertRoot = root.__inertRoot;
      inertRoot.destructor();
      this._inertRoots.delete(inertRoot);
      delete root.__inertRoot;
      root.removeAttribute('inert');
    }
  }

  /**
   * @param {Node} node
   * @param {InertRoot} inertRoot
   * @return {InertNode} inertNode
   */
  register(node, inertRoot) {
    let inertNode = undefined;
    // TODO better way to associate nodeData with node?
    if (node.__inertNode) {
      inertNode = node.__inertNode;
      inertNode._inertRoots.add(inertRoot);
    } else {
      inertNode = new InertNode(node, inertRoot);
    }
    this._savedNodes.add(inertNode);

    return inertNode;
  }

  /**
   * @param {InertNode} inertNode
   * @param {InertRoot} inertRoot
   */
  deregister(inertNode, inertRoot) {
    inertNode.removeInertRoot(inertRoot);
    if (inertNode.destroyed)
      this._savedNodes.delete(inertNode);
  }

  /**
   * Recursively walk the composed tree from |node|.
   * @param {Node} node
   * @param {{preorder: (function (Node):boolean|undefined),
   *          postorder: (function (Node)|undefined)}} callbacks
   *     Callbacks to be called for each element traversed. Possible
   *     callbacks are |preorder|, called before descending into child
   *     nodes, and |postorder| called after all child nodes have been
   *     traversed. If |preorder| returns true, its child nodes will
   *     not be traversed.
   * @param {ShadowRoot=} opt_shadowRoot The nearest ShadowRoot ancestor, if any.
   */
  static composedTreeWalk(node, callbacks, opt_shadowRoot) {
    if (node.nodeType == Node.ELEMENT_NODE)
      var element = /** @type {Element} */ (node);

    if (element && callbacks.preorder) {
      if (callbacks.preorder(element))
        return;
    }

    // Descend into node:
    // If it has a ShadowRoot, ignore all child elements - these will be picked
    // up by the <content> or <shadow> elements. Descend straight into the
    // ShadowRoot.
    if (element) {
      var shadowRoot = element.shadowRoot || element.webkitShadowRoot;
      if (shadowRoot) {
        InertManager.composedTreeWalk(shadowRoot,
                                      callbacks,
                                      shadowRoot);
        if (element && callbacks.postorder)
          callbacks.postorder(element);
        return;
      }
    }

    // If it is a <content> element, descend into distributed elements - these
    // are elements from outside the shadow root which are rendered inside the
    // shadow DOM.
    if (element && element.localName == 'content') {
      var content = /** @type {HTMLContentElement} */ (element);
      var distributedNodes = content.getDistributedNodes();
      for (var i = 0; i < distributedNodes.length; i++) {
        InertManager.composedTreeWalk(distributedNodes[i],
                                              callbacks,
                                              opt_shadowRoot);
      }
      if (element && callbacks.postorder)
        callbacks.postorder.call(null, element);
      return;
    }

    // If it is neither the parent of a ShadowRoot, a <content> element, nor
    // a <shadow> element recurse normally.
    var child = node.firstChild;
    while (child != null) {
      InertManager.composedTreeWalk(child,
                                    callbacks,
                                    opt_shadowRoot);
      child = child.nextSibling;
    }

    if (element && callbacks.postorder)
      callbacks.postorder.call(null, element);
  }

}

document.inertManager = new InertManager(document);

function watchForInert(records, self) {
  for (var record of records) {
    if (record.type != 'attributes')
      continue;
    if (record.attributeName != 'inert')
      continue;
    var target = record.target;
    var inert = target.hasAttribute('inert');
    document.inertManager.setInert(target, inert);
  }
}

// Comment these two lines out to use programmatic API only
var observer = new MutationObserver(watchForInert);
observer.observe(document.body, { attributes: true, subtree: true });

