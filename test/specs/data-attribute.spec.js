describe('Data-Attribute', function() {
  before(function() {
    fixture.setBase('test/fixtures');
  });

  beforeEach(function(done) {
    fixture.load('data-attribute.html');
    // Because inert relies on MutationObservers,
    // wait till next microtask before running tests.
    setTimeout(function() {
      done();
    }, 0);
  });

  afterEach(function() {
    fixture.cleanup();
  });

  it('should make implicitly focusable child not focusable', function() {
    var button = fixture.el.querySelector('[data-inert] button');
    expect(isUnfocusable(button)).to.equal(true);
  });

  it('should make explicitly focusable child not focusable', function() {
    var div = fixture.el.querySelector('#fake-button');
    expect(div.hasAttribute('tabindex')).to.equal(false);
    expect(isUnfocusable(div)).to.equal(true);
  });
});
