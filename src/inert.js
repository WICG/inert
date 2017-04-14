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

import matches from 'dom-matches';

(function(document) {
  /** @type {boolean} */
  const nativeShadowDOM = ('attachShadow' in Element.prototype);

  // https://dom.spec.whatwg.org/#dom-element-attachshadow
  /** @type {string} */
  const acceptsShadowRootSelector = [
    'article',
    'aside',
    'blockquote',
    'body',
    'div',
    'footer',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'header',
    'main',
    'nav',
    'p',
    'section',
    'span'
  ].join(',');

  /**
   * `InertRoot` manages a single inert subtree, i.e. a DOM subtree whose root element has an `inert`
   * attribute.
   *
   * Its main functions are:
   *
   * - make the rootElement untabbable.
   *
   * - notify the manager of inerted nodes in the rootElement's shadowRoot.
   */
  class InertRoot {
    /**
     * @param {Element} rootElement The Element at the root of the inert subtree.
     * @param {InertManager} inertManager The global singleton InertManager object.
     */
    constructor(rootElement, inertManager) {
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
        let active = document.activeElement;
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

      // We can attach a shadowRoot if supported, is a native element that accepts shadowRoot
      // or if element has potential custom element name.
      // https://html.spec.whatwg.org/multipage/scripting.html#valid-custom-element-name
      const canAttachShadow = (nativeShadowDOM &&
        rootElement.matches(acceptsShadowRootSelector) ||
        rootElement.localName.indexOf('-') !== -1);
      if (!canAttachShadow) return;

      // Force shadowRoot.
      if (!rootElement.shadowRoot) {
        rootElement.attachShadow({
          mode: 'open'
        }).appendChild(document.createElement('slot'));
        const nativeAttachShadow = rootElement.attachShadow;
        rootElement.attachShadow = function() {
          // Clear the slot we added.
          const slot = this.shadowRoot.querySelector('slot');
          slot && this.shadowRoot.removeChild(slot);
          this.attachShadow = nativeAttachShadow;
          return this.shadowRoot;
        };
      } else {
        // Manager might have not "seen" these children since they're in a shadowRoot. 
        const inertChildren = rootElement.shadowRoot.querySelectorAll('[inert]');
        for (let i = 0, l = inertChildren.length; i < l; i++) {
          inertManager.setInert(inertChildren[i], true);
        }
      }

      // Give the manager visibility on changing nodes in the shadowRoot.
      this._observer = new MutationObserver(inertManager.watchForInert);
      this._observer.observe(rootElement.shadowRoot, {
        attributes: true,
        subtree: true,
        childList: true
      });
    }

    /**
     * Call this whenever this object is about to become obsolete.  This unwinds all of the state
     * stored in this object and updates the state of all of the managed nodes.
     */
    destructor() {
      if (this._observer) this._observer.disconnect();

      this._rootElement.removeAttribute('aria-hidden');
      if (this._rootTabindex) {
        this._rootElement.setAttribute('tabindex', this._rootTabindex);
      } else {
        this._rootElement.removeAttribute('tabindex');
      }

      this._observer = null;
      this._rootElement = null;
      this._rootTabindex = null;
    }
  }

  /**
   * InertManager is a per-document singleton object which manages all inert roots and nodes.
   *
   * When an element becomes an inert root by having an `inert` attribute set and/or its `inert`
   * property set to `true`, the `setInert` method creates an `InertRoot` object for the element.
   * The `InertRoot` in turn registers itself as managing all of the element's focusable descendant
   * nodes via the `register()` method. The `InertManager` ensures that a single `InertNode` instance
   * is created for each such node, via the `_managedNodes` map.
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
       * All inert roots known to this InertManager. In a map to allow looking up by Node.
       * @type {Map<Node, InertRoot>}
       */
      this._inertRoots = new Map();

      this.watchForInert = this._watchForInert.bind(this);

      /**
       * Observer for mutations on `document.body`.
       * @type {MutationObserver}
       */
      this._observer = new MutationObserver(this.watchForInert);


      // Add inert style.
      addInertStyle(document.head || document.body || document.documentElement);

      // Wait for document to be interactive.
      if (document.readyState === 'loading') {
        const onchanged = () => {
          document.removeEventListener('readystatechange', onchanged);
          this._onDocumentLoaded();
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
    setInert(root, inert) {
      if (this._inertRoots.has(root) === inert) // element is already inert
        return;
      if (inert) {
        const inertRoot = new InertRoot(root, this);
        root.setAttribute('inert', '');
        this._inertRoots.set(root, inertRoot);
        // If not contained in the document, it must be in a shadowRoot.
        if (!this._document.body.contains(root)) {
          let parent = root.parentNode;
          while (parent) {
            if (parent.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
              addInertStyle(parent);
              break;
            }
            parent = parent.parentNode;
          }
        }
      } else {
        const inertRoot = this._inertRoots.get(root);
        inertRoot.destructor();
        this._inertRoots.delete(root);
        root.removeAttribute('inert');
      }
    }

    /**
     * Callback used when document has finished loading.
     */
    _onDocumentLoaded() {
      // Find all inert roots in document and make them actually inert.
      const inertElements = Array.from(this._document.querySelectorAll('[inert]'));
      for (let inertElement of inertElements)
        this.setInert(inertElement, true);

      // Comment this out to use programmatic API only.
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
    _watchForInert(records, self) {
      for (let record of records) {
        switch (record.type) {
          case 'childList':
            for (let node of Array.from(record.addedNodes)) {
              if (node.nodeType !== Node.ELEMENT_NODE)
                continue;
              const inertElements = Array.from(node.querySelectorAll('[inert]'));
              if (node.matches('[inert]'))
                inertElements.unshift(node);
              for (let inertElement of inertElements)
                this.setInert(inertElement, true);
            }
            break;
          case 'attributes':
            if (record.attributeName !== 'inert')
              continue;
            const target = record.target;
            const inert = target.hasAttribute('inert');
            this.setInert(target, inert);
            break;
        }
      }
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
    const style = document.createElement('style');
    style.setAttribute('id', 'inert-style');
    style.textContent = "\n" +
      "[inert], [inert] * {\n" +
      "  pointer-events: none;\n" +
      "  cursor: default;\n" +
      "  user-select: none;\n" +
      "  -webkit-user-select: none;\n" +
      "  -moz-user-select: none;\n" +
      "  -ms-user-select: none;\n" +
      "}\n";
    node.appendChild(style);
  }

  const inertManager = new InertManager(document);

  Object.defineProperty(Element.prototype, 'inert', {
    enumerable: true,
    get: function() {
      return this.hasAttribute('inert');
    },
    set: function(inert) {
      inertManager.setInert(this, inert)
    }
  });

  const nativeFocus = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'focus');
  Object.defineProperty(HTMLElement.prototype, 'focus', {
    enumerable: true,
    configurable: true,
    writable: true,
    value: function() {
      // If it is inert or into an inert node, no focus!
      let target = this;
      while (target && !target.inert) {
        // Target might be distributed, so go to the deepest assignedSlot
        // and walk up the tree from there.
        while (target.assignedSlot) target = target.assignedSlot;
        target = target.parentNode || target.host;
      }
      if (target && target.inert) return;
      return nativeFocus.value.call(this);
    }
  });

})(document);