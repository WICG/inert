describe('reapply existing aria-hidden', function() {
  before(function() {
    fixture.setBase('test/fixtures');
  });

  beforeEach(function() {
    fixture.load('aria-hidden.html');
    // Because inert relies on MutationObservers,
    // wait till next microtask before running tests.
    return Promise.resolve();
  });

  afterEach(function() {
    fixture.cleanup();
  });

  it('should reinstate pre-existing aria-hidden on setting inert=false', function() {
    const container = fixture.el.querySelector('#container');
    const ariaHiddens = new Map();
    for (let el of Array.from(container.children)) {
      if (el.hasAttribute('aria-hidden')) {
        ariaHiddens.set(el, el.getAttribute('aria-hidden'));
      }

      el.inert = true;
      el.inert = false;
    }

    for (let el of Array.from(container.children)) {
      let ariaHidden = ariaHiddens.get(el);
      if (ariaHidden) {
        expect(el.hasAttribute('aria-hidden')).to.equal(true);
        expect(el.getAttribute('aria-hidden')).to.equal(ariaHiddens.get(el));
      } else {
        expect(el.hasAttribute('aria-hidden')).to.equal(false);
      }
    }
  });
});
