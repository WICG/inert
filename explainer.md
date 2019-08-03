- [Background](#background)
- [Spec](#spec)
  * [Spec gaps](#spec-gaps)
- [The case for `inert` as a primitive](#the-case-for-inert-as-a-primitive)
  * [Use cases](#use-cases)
- [Wouldn't this be better as...](#wouldnt-this-be-better-as)

# Background

The `inert` attribute was [originally specced](https://github.com/whatwg/html/commit/2fb24fcf) as part of the `<dialog>` element specification.
 `<dialog>` required the concept of `inert` to be defined in order to describe the blocking behaviour of dialogs,
and the `inert` attribute was introduced ["so you could do `<dialog>` without `<dialog>`"](https://www.w3.org/Bugs/Public/show_bug.cgi?id=24983#c1).

The attribute was later [removed](https://github.com/whatwg/html/commit/5ddfc78b1f82e86cc202d72ccc752a0e15f1e4ad) as it was argued that its only use case was subsumed by `<dialog>`. However, later discussion on the [original bug](https://www.w3.org/Bugs/Public/show_bug.cgi?id=24983) proposed several use cases which could not be handled, or only handled poorly, using `<dialog>`.

## Spec

The spec for the `inert` attribute,
with [the existing definition of "inert" already specified](https://html.spec.whatwg.org/multipage/interaction.html#inert),
is extremely straightforward:

>  <h4>The <dfn title="attr-inert"><code>inert</code></dfn> attribute</h4>

>  <p>The <code title="attr-inert">inert</code> attribute is a
>  <span>boolean attribute</span> that indicates, by its presence, that
>  the element is to be made <span>inert</span>.</p>

>  <div class="impl">

>  <p>When an element has an <code title="attr-inert">inert</code>
>  attribute, the user agent must mark that element as
>  <span>inert</span>.</p>

>  </div>

>  <p class="note">By default, there is no visual indication of a
>  subtree being inert. Authors are encouraged to clearly mark what
>  parts of their document are active and which are inert, to avoid
>  user confusion. In particular, it is worth remembering that not all
>  users can see all parts of a page at once; for example, users of
>  screen readers, users on small devices or with magnifiers, and even
>  users just using particularly small windows might not be able to see
>  the active part of a page and may get frustrated if inert sections
>  are not obviously inert. For individual controls, the <code
>  title="attr-input-disabled">disabled</code> attribute is probably
>  more appropriate.</p>

### Spec gaps

- The spec does not explicitly state what effect `inert` has on the subtree of the element marked as `inert`,
however it is implied by the note that `inert` causes the entire subtree of the element with the `inert` attribute to be made [_inert_](https://html.spec.whatwg.org/multipage/interaction.html#inert).
The polyfill makes the assumption that the entire subtree becomes _inert_.
  - Furthermore, the spec is unclear as to whether the attribute applies into [shadow trees](https://dom.spec.whatwg.org/#concept-shadow-tree).
  Consistency with CSS attributes and with inheriting attributes like [`aria-hidden`](https://www.w3.org/TR/wai-aria/#aria-hidden) and [`lang`](https://html.spec.whatwg.org/multipage/dom.html#the-lang-and-xml:lang-attributes) imply that it should.
  The polyfill assumes that it does so.
- The [existing description of _inert_](https://html.spec.whatwg.org/multipage/interaction.html#inert) is not specific about where pointer events which would have been targeted to an element in an inert subtree should go.
  (See also: discussion on the [WHATWG pull request](https://github.com/whatwg/html/pull/1474).)
  Does the event:

  1. go to the next non-inert element in the hit test stack?
(The inert element is "transparent" for pointer events.)
  2. go to the next non-inert parent element?
  3. simply not fire?

  Consistency with `pointer-events` would suggest (ii). The polyfill uses `pointer-events: none` and so models its behaviour.
- The spec is also not explicit about whether the attribute should be [reflected](https://html.spec.whatwg.org/multipage/common-dom-interfaces.html#reflecting-content-attributes-in-idl-attributes). The polyfill assumes that it is.
- The spec does not explicitly state that inert content should be [hidden from assistive technology](https://www.w3.org/WAI/PF/aria-implementation/#exclude_elements2).
However, typically, the HTML spec does not provide this type of information. The polyfill makes _inert_ content hidden from assistive technology (via `aria-hidden`).
- The spec does not make explicit that there is no way to "un-inert" a subtree of an inert subtree.

## The case for `inert` as a primitive

Developers find themselves in situations where they'd like to be able to mark a part of the page "un-tabbable".
Rob Dodson lays out one such example in his article ["Building better accessibility primitives"](https://robdodson.me/building-better-accessibility-primitives/#problem2disablingtabindex):

> One problem: to [achieve a performance optimisation for animation] we must leave the drawer in the DOM at all times.
> Meaning its focusable children are just sitting there offscreen,
> and as the user is tabbing through the page eventually their focus will just disappear into the drawer and they won't know where it went.
> I see this on responsive websites all the time.
> This is just one example but I've also run into the need to disable tabindex when I'm animating between elements with opacity: 0,
> or temporarily disabling large lists of custom controls,
> and as others have pointed out,
> you'd hit if you tried to build something like coverflow where you can see a preview of the next element but can't actually interact with it yet.

`inert` would also allow slightly more straightforward polyfilling of both `<dialog>`
and the proposed, more primitive 
[`blockingElements`](https://github.com/whatwg/html/issues/897) 
API.
See 
[Polymer Labs' `blockingElements` polyfill](https://github.com/PolymerLabs/blockingElements/blob/master/demo/index.html), 
based on this polyfill,
for an example of how `inert` may be used for this purpose.
Currently, since there is no way to express the "inertness" concept,
polyfilling these APIs requires both focus event trapping
to avoid focus cycling out of the dialog/blocking element
(and thus as a side effect may prevent focus from walking out of the page at all)
and a tree-walk
(usually neglected by developers)
to set `aria-hidden` on all sibling elements of the dialog or blocking element.

On the implementer side,
the vast majority of work involved in implementing `inert` is a necessary pre-cursor to both `<dialog>` and `blockingElements` implementations,
so by implementing `inert` first,
implementers may get useful functionality into the hands of developers sooner while still laying the groundwork for one or both of these more complex APIs.

### Use cases

- **Temporarily offscreen/hidden content**

  As discussed in the [article](https://robdodson.me/building-better-accessibility-primitives/#problem2disablingtabindex),
  there are a range of circumstances in which case it's desirable to add content to the DOM to be rendered but remain offscreen.

  In these cases, without `inert`, authors are forced to choose between
  an accessible experience for keyboard and assistive technology users,
  or the factors (such as performance) which make offscreen rendering desirable -
  or, performing all the contortions necessary to keep the offscreen content functionally "inert".

  These cases include:

  + rendering content, such as a menu, offscreen, before having it animate on-screen;
  + similarly, for content like a menu which may be repeatedly shown to the user,
  avoiding re-rendering this content each time;
  + a carousel or other type of content cycler (such as a "tweet cycler")
  which visually hides non-current items by placing them at a lower z-index than the active item,
  or by setting their `opacity` to zero,
  and animates transitions between items;
  + "infinitely scrolling" UI which re-uses and/or pre-renders nodes.

- **On-screen but non-interactive content**

  Occasionally, UI designs require that certain content be visible or partially visible,
  but clearly non-interactive.
  Typically, this content is made non-interactive for pointer device users
  either via a semi-transparent overlay which provides a visual cue as well as intercepting pointer events,
  or via using `pointer-events: none`.

  In these cases developers are once again required to perform contortions in order to ensure that this content is not an accessibility issue.

  These cases include:

  + Any of the use cases for [`blockingElement[s]`](https://github.com/whatwg/html/issues/897):
    * a modal dialog;
    * a focus-trapping menu;
    * a [side nav](https://material.io/design/components/navigation-drawer.html).

  + A slide show or "cover flow" style carousel may have non-active items partially visible,
  as a preview -
  they may be transformed or partially obscured to indicate that they are non-interactive.

  + Form content which is not currently relevant,
  e.g. fading out and disabling the "Shipping Address" fields when the "Same as billing address" checkbox has been checked.

  + Disabling the entire UI while in an inconsistent state,
  such as showing a throbber/loading bar during unexpectedly slow loading.

## Wouldn't this be better as...

- A **CSS property**?

  `inert` encompasses the behaviour of at least two other things which are CSS properties -
  `pointer-events: none` and `user-select: none`, plus another attribute, `aria-hidden`.
  These behaviours, along with the currently near-impossible to achieve behaviour of preventing tabbing/programmatic focus, are very frequently applied together
  (or if one, such as `aria-hidden`, is omitted, it is more often through lack of awareness than deliberate).

  There is scope for a more primitive CSS property to "explain" the ability of `inert` to prevent focus, however that could easily coexist with the `inert` attribute.

- [`blockingElements`](https://github.com/whatwg/html/issues/897)?

  `blockingElements` (or, potentially, a single `blockingElement`) represents roughly the opposite use case to `inert`:
  a per-document, single element which blocks the document, analogous to the [blocking behaviour of a modal dialog](https://html.spec.whatwg.org/multipage/interaction.html#blocked-by-a-modal-dialog).

  It's not always the case that we will want a single subtree to be non-inert. Ideally, we would have both concepts available;
  however, `inert` allows reasonable approximation of `blockingElements` whereas the reverse is not true.
  - To approximate a `blockingElement` using `inert`, it's most straightforward to insert a non-_inert_ element as a sibling element to the main page content, and then use `inert` to mark the main page content as _inert_.
    More generally, all siblings of the desired "blocking" element, plus all siblings of all of its ancestors, could be marked _inert_.

- A **programmatic API**?

  Something like `document.makeInert(el)`.

  This would require waiting for script execution before parts of the page became inert, which can take some time.
