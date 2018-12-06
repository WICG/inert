describe('Reapply existing tabindex', function() {
  before(function() {
    fixture.setBase('test/fixtures');
  });

  beforeEach(function(done) {
    fixture.load('tabindex.html');
    // Because inert relies on MutationObservers,
    // wait till next microtask before running tests.
    setTimeout(function() {
      done();
    }, 0);
  });

  afterEach(function() {
    fixture.cleanup();
  });

  it('should reinstate pre-existing tabindex on setting inert=false', function() {
    var container = fixture.el.querySelector('#container');
    var tabindexes = new Map();
    var focusableElements = new Set();
    Array.from(container.children).forEach(function(el) {
      if (el.hasAttribute('tabindex')) {
        tabindexes.set(el, el.getAttribute('tabindex'));
      }
      if (!isUnfocusable(el)) {
        focusableElements.add(el);
      }
    });

    container.inert = true;
    focusableElements.forEach(function(focusableEl) {
      expect(isUnfocusable(focusableEl)).to.equal(true);
    });

    container.inert = false;
    focusableElements.forEach(function(focusableEl) {
      expect(isUnfocusable(focusableEl)).to.equal(false);
    });

    Array.from(container.children).forEach(function(el) {
      var tabindex = tabindexes.get(el);
      if (tabindex) {
        expect(el.hasAttribute('tabindex')).to.equal(true);
        expect(el.getAttribute('tabindex')).to.equal(tabindexes.get(el));
      } else {
        expect(el.hasAttribute('tabindex')).to.equal(false);
      }
    });
  });

  it('should set tabindex correctly for elements added later in the inert root', function(done) {
      var divRoot = document.createElement('div');
      document.body.appendChild(divRoot);
      divRoot.inert = true;
      var button = document.createElement('button');
      divRoot.appendChild(button);

      // adding a timeout in order to enter the next event loop, due to the mutationObserver events
      setTimeout(function() {
        expect(button.tabIndex).to.equal(-1);

        divRoot.inert = false;
        expect(button.tabIndex).to.equal(0);
        done();
      });
    });
});
