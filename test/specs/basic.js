function isUnfocusable(el) {
  var oldActiveElement = document.activeElement;
  el.focus();
  if (document.activeElement !== oldActiveElement) {
    return false;
  }
  if (document.activeElement === el) {
    return false;
  }
  if (el.tabIndex !== -1) {
    return false;
  }
  return true;
}

describe("Basic", function() {
  before(function() {
    fixture.setBase("test/fixtures");
  });

  beforeEach(function() {
    fixture.load("basic.html");
    // Because inert relies on MutationObservers,
    // wait till next microtask before running tests.
    return Promise.resolve();
  });

  afterEach(function() {
    fixture.cleanup();
  });

  it("should have no effect on elements outside inert region", function() {
    const button = fixture.el.querySelector("#non-inert");
    expect(isUnfocusable(button)).to.equal(false);
  });

  it("should make implicitly focusable child not focusable", function() {
    const button = fixture.el.querySelector("[inert] button");
    expect(isUnfocusable(button)).to.equal(true);
  });

  it("should make explicitly focusable child not focusable", function() {
    const div = fixture.el.querySelector("#fake-button");
    expect(div.hasAttribute("tabindex")).to.equal(false);
    expect(isUnfocusable(div)).to.equal(true);
  });

  it("should remove attribute and un-inert content if set to false", function() {
    const inertContainer = fixture.el.querySelector("[inert]");
    expect(inertContainer.hasAttribute("inert")).to.equal(true);
    expect(inertContainer.inert).to.equal(true);
    const button = inertContainer.querySelector("button");
    expect(isUnfocusable(button)).to.equal(true);

    inertContainer.inert = false;
    expect(inertContainer.hasAttribute("inert")).to.equal(false);
    expect(inertContainer.inert).to.equal(false);
    expect(isUnfocusable(button)).to.equal(false);
  });

  it("should be able to be reapplied multiple times", function() {
    const inertContainer = fixture.el.querySelector("[inert]");
    const button = document.querySelector("[inert] button");
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

  it("should apply to dynamically added content", function(done) {
    const newButton = document.createElement("button");
    newButton.textContent = "Click me too";
    const inertContainer = fixture.el.querySelector("[inert]");
    inertContainer.appendChild(newButton);
    // Wait for the next microtask to allow mutation observers to react to the DOM change
    Promise.resolve().then(() => {
      expect(isUnfocusable(newButton)).to.equal(true);
      done();
    });
  });

  it('should be detected on dynamically added content', function(done) {
    const temp = document.createElement('div');
    fixture.el.appendChild(temp);
    temp.outerHTML = '<div id="inert2" inert><button>Click me</button></div>';
    const div = fixture.el.querySelector('#inert2');
    // Wait for the next microtask to allow mutation observers to react to the DOM change
    Promise.resolve().then(() => {
      expect(div.inert).to.equal(true);
      const button = div.querySelector('button');
      expect(isUnfocusable(button)).to.equal(true);
      done();
    });
  });
});
