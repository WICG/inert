- [Background](#background)
- [The case for `inert` as a primitive](#the-case-for-inert-as-a-primitive)
  * [Use cases](#use-cases)
- [Wouldn't this be better as...](#wouldnt-this-be-better-as)

## Introduction

The boolean `inert` attribute allows authors to mark a subtree as _inert_.

If an Element is `inert`, it is completely non-interactive:
it isn't targeted for any user interaction events,
and it is removed from the focus order,
and it is not exposed to assistive technology.

## History

The `inert` attribute was [originally specced](https://github.com/whatwg/html/commit/2fb24fcf) as part of the `<dialog>` element specification.
 `<dialog>` required the concept of `inert` to be defined in order to describe the blocking behaviour of dialogs,
and the `inert` attribute was introduced ["so you could do `<dialog>` without `<dialog>`"](https://www.w3.org/Bugs/Public/show_bug.cgi?id=24983#c1).

The attribute was later [removed](https://github.com/whatwg/html/commit/5ddfc78b1f82e86cc202d72ccc752a0e15f1e4ad) as it was argued that its only use case was subsumed by `<dialog>`. However, later discussion on the [original bug](https://www.w3.org/Bugs/Public/show_bug.cgi?id=24983) proposed several use cases which could not be handled, or only handled poorly, using `<dialog>`.

## Use cases

### Temporarily offscreen/hidden content**

As discussed in this [article](https://robdodson.me/building-better-accessibility-primitives/#problem2disablingtabindex),
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

### On-screen but non-interactive content**

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
