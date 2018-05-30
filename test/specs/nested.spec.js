describe('Nested inert regions', function() {
  before(function() {
    fixture.setBase('test/fixtures');
  });

  beforeEach(function(done) {
    fixture.load('nested.html');
    // Because inert relies on MutationObservers,
    // wait till next microtask before running tests.
    setTimeout(function() {
      done();
    }, 0);
  });

  afterEach(function() {
    fixture.cleanup();
  });

  it('should apply regardless of how many deep the nesting is', function() {
    var outerButton = fixture.el.querySelector('#outer-button');
    expect(isUnfocusable(outerButton)).to.equal(true);
    var outerFakeButton = fixture.el.querySelector('#outer-fake-button');
    expect(isUnfocusable(outerFakeButton)).to.equal(true);

    var innerButton = fixture.el.querySelector('#inner-button');
    expect(isUnfocusable(innerButton)).to.equal(true);
    var innerFakeButton = fixture.el.querySelector('#inner-fake-button');
    expect(isUnfocusable(innerFakeButton)).to.equal(true);
  });

  it('should still apply if inner inert is removed', function() {
    fixture.el.querySelector('#inner').inert = false;

    var outerButton = fixture.el.querySelector('#outer-button');
    expect(isUnfocusable(outerButton)).to.equal(true);
    var outerFakeButton = fixture.el.querySelector('#outer-fake-button');
    expect(isUnfocusable(outerFakeButton)).to.equal(true);

    var innerButton = fixture.el.querySelector('#inner-button');
    expect(isUnfocusable(innerButton)).to.equal(true);
    var innerFakeButton = fixture.el.querySelector('#inner-fake-button');
    expect(isUnfocusable(innerFakeButton)).to.equal(true);
  });

  it('should still apply to inner content if outer inert is removed', function() {
    fixture.el.querySelector('#outer').inert = false;

    var outerButton = fixture.el.querySelector('#outer-button');
    expect(isUnfocusable(outerButton)).to.equal(false);
    var outerFakeButton = fixture.el.querySelector('#outer-fake-button');
    expect(isUnfocusable(outerFakeButton)).to.equal(false);

    var innerButton = fixture.el.querySelector('#inner-button');
    expect(isUnfocusable(innerButton)).to.equal(true);
    var innerFakeButton = fixture.el.querySelector('#inner-fake-button');
    expect(isUnfocusable(innerFakeButton)).to.equal(true);
  });

  it('should be detected on dynamically added content within an inert root', function(done) {
    var temp = document.createElement('div');
    var outerContainer = fixture.el.querySelector('#outer');
    outerContainer.appendChild(temp);
    expect(temp.parentElement).to.eql(outerContainer);
    temp.outerHTML = '<div id="inner2" inert><button>Click me</button></div>';
    var div = outerContainer.querySelector('#inner2');
    // Wait for the next microtask to allow mutation observers to react to the DOM change
    setTimeout(function() {
      expect(div.inert).to.equal(true);
      var button = div.querySelector('button');
      expect(isUnfocusable(button)).to.equal(true);

      // un-inerting outer container doesn't mess up the new inner container
      outerContainer.inert = false;
      expect(div.inert).to.equal(true);
      expect(isUnfocusable(button)).to.equal(true);
      done();
    }, 0);
  });
});
