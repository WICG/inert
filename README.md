[![Build Status](https://travis-ci.org/WICG/inert.svg?branch=master)](https://travis-ci.org/WICG/inert)
[![Greenkeeper badge](https://badges.greenkeeper.io/WICG/inert.svg)](https://greenkeeper.io/)

The `inert` attribute/property allows web authors to mark parts of the DOM tree
as [inert](https://html.spec.whatwg.org/multipage/interaction.html#inert):

> When a node is inert, then the user agent must act as if the node was absent
> for the purposes of targeting user interaction events, may ignore the node for
> the purposes of text search user interfaces (commonly known as "find in
> page"), and may prevent the user from selecting text in that node.

Furthermore, a node which is **inert** should also be hidden from assistive
technology.

# Details

- Read the [Explainer](explainer.md).
- Read the [Spec](https://html.spec.whatwg.org/multipage/interaction.html#inert).
- Try the [Demo](https://wicg.github.io/inert/demo).
- [Give feedback!](https://github.com/WICG/inert/issues)

# Polyfill

## Installation

`npm install --save wicg-inert`

_We recommend only using versions of the polyfill that have been published to npm, rather than
cloning the repo and using the source directly. This helps ensure the version you're using is stable
and thoroughly tested._

_If you do want to build from source, make sure you clone the latest tag!_

## Usage

### 1. Add the script to your page

```html
    ...
    <script src="/node_modules/wicg-inert/dist/inert.min.js"></script>
  </body>
</html>
```

### 2. Toggle `inert` on an element

```js
const el = document.querySelector('#my-element');
el.inert = true; // alternatively, el.setAttribute('inert', '');
```

### Legacy Browser Support

If you want to use `inert` with an older browser you'll need to include
additional polyfills for
[Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map),
[Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set),
and
[Element.prototype.matches](https://developer.mozilla.org/en-US/docs/Web/API/Element/matches).

In accordance with the W3C's new [polyfill
guidance](https://www.w3.org/2001/tag/doc/polyfills/#don-t-serve-unnecessary-polyfills),
the `inert` polyfill does not bundle other polyfills.

You can use a service like [Polyfill.io](https://polyfill.io/v2/docs/examples)
to download only the polyfills needed by the current browser. Just add the
following line to the start of your page:

```html
<script src="https://cdn.polyfill.io/v2/polyfill.min.js?features=Map,Set,Element.prototype.matches"></script>
```

### Performance and gotchas

The polyfill attempts to provide a reasonable fidelity polyfill for the `inert`
**attribute**, however please note:

- It relies on mutation observers to detect the addition of the `inert`
  attribute, and to detect dynamically added content within inert subtrees.
  Testing for _inert_-ness in any way immediately after either type of mutation
  will therefore give inconsistent results; please allow the current task to end
  before relying on mutation-related changes to take effect, for example via
  `setTimeout(fn, 0)` or `Promise.resolve()`.

  Example:
```js
const newButton = document.createElement('button');
const inertContainer = document.querySelector('[inert]');
inertContainer.appendChild(newButton);
// Wait for the next microtask to allow mutation observers to react to the
// DOM change
Promise.resolve().then(() => {
  expect(isUnfocusable(newButton)).to.equal(true);
});
```
- Using the `inert` **property**, however, is synchronous.

- The polyfill will be expensive, performance-wise, compared to a native `inert`
  implementation, because it requires a fair amount of tree-walking. To mitigate
  this, we recommend not using `inert` during performance sensitive actions
  (like during animations or scrolling). Instead, wait till these events are
  complete, or consider using
  [requestIdleCallback](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback)
  to set `inert`.
