describe('Nested inert regions with data-attribute', function() {
  before(function() {
    fixture.setBase('test/fixtures');
  });

  beforeEach(function(done) {
    fixture.load('nested-data-attribute.html');
    // Because inert relies on MutationObservers,
    // wait till next microtask before running tests.
    setTimeout(function() {
      done();
    }, 0);
  });

  afterEach(function() {
    fixture.cleanup();
  });

  it('should be detected on dynamically added content within an inert root', function(done) {
    var temp = document.createElement('div');
    var outerContainer = fixture.el.querySelector('#outer');
    outerContainer.appendChild(temp);
    expect(temp.parentElement).to.eql(outerContainer);
    temp.outerHTML = '<div id="inner2" data-inert><button>Click me</button></div>';
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
