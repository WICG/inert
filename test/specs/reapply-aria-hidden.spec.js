describe('Reapply existing aria-hidden', function() {
  before(function() {
    fixture.setBase('test/fixtures');
  });

  beforeEach(function(done) {
    fixture.load('aria-hidden.html');
    // Because inert relies on MutationObservers,
    // wait till next microtask before running tests.
    setTimeout(function() {
      done();
    }, 0);
  });

  afterEach(function() {
    fixture.cleanup();
  });

  it('should reinstate pre-existing aria-hidden on setting inert=false', function() {
    var container = fixture.el.querySelector('#container');
    var ariaHiddens = new Map();
    Array.from(container.children).forEach(function(el) {
      if (el.hasAttribute('aria-hidden')) {
        ariaHiddens.set(el, el.getAttribute('aria-hidden'));
      }

      el.inert = true;
      el.inert = false;
    });

    Array.from(container.children).forEach(function(el) {
      var ariaHidden = ariaHiddens.get(el);
      if (ariaHidden) {
        expect(el.hasAttribute('aria-hidden')).to.equal(true);
        expect(el.getAttribute('aria-hidden')).to.equal(ariaHiddens.get(el));
      } else {
        expect(el.hasAttribute('aria-hidden')).to.equal(false);
      }
    });
  });
});
