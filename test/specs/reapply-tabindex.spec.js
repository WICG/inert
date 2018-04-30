describe('Reapply existing tabindex', function() {
  before(function() {
    fixture.setBase('test/fixtures');
  });

  beforeEach(function() {
    fixture.load('tabindex.html');
    // Because inert relies on MutationObservers,
    // wait till next microtask before running tests.
    return Promise.resolve();
  });

  afterEach(function() {
    fixture.cleanup();
  });

  it('should reinstate pre-existing tabindex on setting inert=false', function() {
    const container = fixture.el.querySelector('#container');
    const tabindexes = new Map();
    const focusableElements = new Set();
    for (let el of Array.from(container.children)) {
      if (el.hasAttribute('tabindex')) {
        tabindexes.set(el, el.getAttribute('tabindex'));
      }
      if (!isUnfocusable(el)) {
        focusableElements.add(el);
      }
    }

    container.inert = true;
    for (let focusableEl of focusableElements) {
      expect(isUnfocusable(focusableEl)).to.equal(true);
    }

    container.inert = false;
    for (let focusableEl of focusableElements) {
      expect(isUnfocusable(focusableEl)).to.equal(false);
    }

    for (let el of Array.from(container.children)) {
      let tabindex = tabindexes.get(el);
      if (tabindex) {
        expect(el.hasAttribute('tabindex')).to.equal(true);
        expect(el.getAttribute('tabindex')).to.equal(tabindexes.get(el));
      } else {
        expect(el.hasAttribute('tabindex')).to.equal(false);
      }
    }
  });
});
