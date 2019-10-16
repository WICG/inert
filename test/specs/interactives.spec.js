describe('Interactives', function() {
  before(function() {
    fixture.setBase('test/fixtures');
  });

  beforeEach(function(done) {
    fixture.load('interactives.html');
    // Because inert relies on MutationObservers,
    // wait till next microtask before running tests.
    setTimeout(function() {
      done();
    }, 0);
  });

  afterEach(function() {
    fixture.cleanup();
  });

  it('should make button child not focusable', function() {
    var button = fixture.el.querySelector('[inert] button');
    expect(isUnfocusable(button)).to.equal(true);
  });

  it('should make tabindexed child not focusable', function() {
    var div = fixture.el.querySelector('#fake-button');
    expect(div.hasAttribute('tabindex')).to.equal(false);
    expect(isUnfocusable(div)).to.equal(true);
  });

  it('should make a[href] child not focusable', function() {
    var anchor = fixture.el.querySelector('[inert] a[href]');
    expect(isUnfocusable(anchor)).to.equal(true);
  });

  it('should make input child not focusable', function() {
    var input = fixture.el.querySelector('[inert] input');
    expect(isUnfocusable(input)).to.equal(true);
  });

  it('should make select child not focusable', function() {
    var select = fixture.el.querySelector('[inert] select');
    expect(isUnfocusable(select)).to.equal(true);
  });

  it('should make textarea child not focusable', function() {
    var textarea = fixture.el.querySelector('[inert] textarea');
    expect(isUnfocusable(textarea)).to.equal(true);
  });

  it('should make details child not focusable', function() {
    var details = fixture.el.querySelector('#details-no-summary');

    expect(isUnfocusable(details)).to.equal(true);
  });

  it('should make details with summary child not focusable', function() {
    var details = fixture.el.querySelector('#details-with-summary');
    var summary = details.querySelector('summary');

    expect(isUnfocusable(details)).to.equal(true);
    expect(isUnfocusable(summary)).to.equal(true);
  });

  it('should make contenteditable child not focusable', function() {
    var editor = fixture.el.querySelector('#editable');
    expect(isUnfocusable(editor)).to.equal(true);
  });
});
