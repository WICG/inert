describe('Nested inert regions', function() {
  before(function() {
    fixture.setBase('test/fixtures');
  });

  beforeEach(function() {
    fixture.load('nested.html');
    // Because inert relies on MutationObservers,
    // wait till next microtask before running tests.
    return Promise.resolve();
  });

  afterEach(function() {
    fixture.cleanup();
  });

  it('should apply regardless of how many deep the nesting is', function() {
    const outerButton = fixture.el.querySelector('#outer-button');
    expect(isUnfocusable(outerButton)).to.equal(true);
    const outerFakeButton = fixture.el.querySelector('#outer-fake-button');
    expect(isUnfocusable(outerFakeButton)).to.equal(true);

    const innerButton = fixture.el.querySelector('#inner-button');
    expect(isUnfocusable(innerButton)).to.equal(true);
    const innerFakeButton = fixture.el.querySelector('#inner-fake-button');
    expect(isUnfocusable(innerFakeButton)).to.equal(true);
  });

  it('should still apply if inner inert is removed', function() {
    fixture.el.querySelector('#inner').inert = false;

    const outerButton = fixture.el.querySelector('#outer-button');
    expect(isUnfocusable(outerButton)).to.equal(true);
    const outerFakeButton = fixture.el.querySelector('#outer-fake-button');
    expect(isUnfocusable(outerFakeButton)).to.equal(true);

    const innerButton = fixture.el.querySelector('#inner-button');
    expect(isUnfocusable(innerButton)).to.equal(true);
    const innerFakeButton = fixture.el.querySelector('#inner-fake-button');
    expect(isUnfocusable(innerFakeButton)).to.equal(true);
  });

  it('should still apply to inner content if outer inert is removed', function() {
    fixture.el.querySelector('#outer').inert = false;

    const outerButton = fixture.el.querySelector('#outer-button');
    expect(isUnfocusable(outerButton)).to.equal(false);
    const outerFakeButton = fixture.el.querySelector('#outer-fake-button');
    expect(isUnfocusable(outerFakeButton)).to.equal(false);

    const innerButton = fixture.el.querySelector('#inner-button');
    expect(isUnfocusable(innerButton)).to.equal(true);
    const innerFakeButton = fixture.el.querySelector('#inner-fake-button');
    expect(isUnfocusable(innerFakeButton)).to.equal(true);
  });

  it('should be detected on dynamically added content within an inert root', function(done) {
    const temp = document.createElement('div');
    const outerContainer = fixture.el.querySelector('#outer');
    outerContainer.appendChild(temp);
    expect(temp.parentElement).to.eql(outerContainer);
    temp.outerHTML = '<div id="inner2" inert><button>Click me</button></div>';
    const div = outerContainer.querySelector('#inner2');
    Promise.resolve().then(() => {
      expect(div.inert).to.equal(true);
      const button = div.querySelector('button');
      expect(isUnfocusable(button)).to.equal(true);

      // un-inerting outer container doesn't mess up the new inner container
      outerContainer.inert = false;
      expect(div.inert).to.equal(true);
      expect(isUnfocusable(button)).to.equal(true);
      done();
    });
  });
});
