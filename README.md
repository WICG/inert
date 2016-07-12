# `inert` attribute

## tl;dr

The `inert` attribute would allow web authors to mark parts of the DOM tree as [inert](https://html.spec.whatwg.org/multipage/interaction.html#inert):

Try out the [polyfill](https://github.com/WICG/inert/blob/master/inert.js), or look at the [demo page](https://wicg.github.io/inert/inert.html).

> When a node is inert, then the user agent must act as if the node was absent for the purposes of targeting user interaction events, may ignore the node for the purposes of text search user interfaces (commonly known as "find in page"), and may prevent the user from selecting text in that node.

Furthermore, a node which is **inert** should also be hidden from assistive technology.

## Background

The `inert` attribute was [originally specced](https://github.com/whatwg/html/commit/2fb24fcf) as part of the `<dialog>` element specification.
 `<dialog>` required the concept of `inert` to be defined in order to describe the blocking behaviour of dialogs,
and the `inert` attribute was introduced ["so you could do `<dialog>` without `<dialog>`"](https://www.w3.org/Bugs/Public/show_bug.cgi?id=24983#c1).

The attribute was later [removed](https://github.com/whatwg/html/commit/5ddfc78b1f82e86cc202d72ccc752a0e15f1e4ad) as it was the consensus that its only use case was subsumed by `<dialog>`.

## Spec

The spec for the `inert` attribute,
with the existing definition of "inert" already specified,
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

`inert` would also allow more straightforward polyfilling of both `<dialog>` and the proposed, more primitive [`blockingElements`](https://github.com/whatwg/html/issues/897) API.

On the implementer side,
the vast majority of work involved in implementing `inert` is a necessary pre-cursor to both `<dialog>` and `blockingElements` implementations,
so by implementing `inert` first,
implementers may get useful functionality into the hands of developers sooner while still laying the groundwork for one or both of these more complex APIs.
