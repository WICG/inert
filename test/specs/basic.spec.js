describe('Basic', function() {
  before(function() {
    fixture.setBase('test/fixtures');
  });

  beforeEach(function(done) {
    fixture.load('basic.html');
    // Because inert relies on MutationObservers,
    // wait till next microtask before running tests.
    setTimeout(function() {
      done();
    }, 0);
  });

  afterEach(function() {
    fixture.cleanup();
  });

  it('should have no effect on elements outside inert region', function() {
    var button = fixture.el.querySelector('#non-inert');
    expect(isUnfocusable(button)).to.equal(false);
  });

  it('should make implicitly focusable child not focusable', function() {
    var button = fixture.el.querySelector('[inert] button');
    expect(isUnfocusable(button)).to.equal(true);
  });

  it('should make explicitly focusable child not focusable', function() {
    var div = fixture.el.querySelector('#fake-button');
    expect(div.hasAttribute('tabindex')).to.equal(false);
    expect(isUnfocusable(div)).to.equal(true);
  });

  it('should remove attribute and un-inert content if set to false', function() {
    var inertContainer = fixture.el.querySelector('[inert]');
    expect(inertContainer.hasAttribute('inert')).to.equal(true);
    expect(inertContainer.inert).to.equal(true);
    var button = inertContainer.querySelector('button');
    expect(isUnfocusable(button)).to.equal(true);

    inertContainer.inert = false;
    expect(inertContainer.hasAttribute('inert')).to.equal(false);
    expect(inertContainer.inert).to.equal(false);
    expect(isUnfocusable(button)).to.equal(false);
  });

  it('should be able to be reapplied multiple times', function() {
    var inertContainer = fixture.el.querySelector('[inert]');
    var button = document.querySelector('[inert] button');
    expect(isUnfocusable(button)).to.equal(true);

    inertContainer.inert = false;
    expect(isUnfocusable(button)).to.equal(false);

    inertContainer.inert = true;
    expect(isUnfocusable(button)).to.equal(true);

    inertContainer.inert = false;
    expect(isUnfocusable(button)).to.equal(false);

    inertContainer.inert = true;
    expect(isUnfocusable(button)).to.equal(true);
  });

  it('should apply to dynamically added content', function(done) {
    var newButton = document.createElement('button');
    newButton.textContent = 'Click me too';
    var inertContainer = fixture.el.querySelector('[inert]');
    inertContainer.appendChild(newButton);
    // Wait for the next microtask to allow mutation observers to react to the DOM change
    setTimeout(function() {
      expect(isUnfocusable(newButton)).to.equal(true);
      done();
    }, 0);
  });

  it('should be detected on dynamically added content', function(done) {
    var temp = document.createElement('div');
    fixture.el.appendChild(temp);
    temp.outerHTML = '<div id="inert2" inert><button>Click me</button></div>';
    var div = fixture.el.querySelector('#inert2');
    // Wait for the next microtask to allow mutation observers to react to the DOM change
    setTimeout(function() {
      expect(div.inert).to.equal(true);
      var button = div.querySelector('button');
      expect(isUnfocusable(button)).to.equal(true);
      done();
    }, 0);
  });
});
