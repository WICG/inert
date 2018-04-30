describe('ShadowDOM v1', function() {
  if (!Element.prototype.attachShadow) {
    console.log('ShadowDOM v1 is not supported by the browser.');
    return;
  }

  before(function() {
    fixture.setBase('test/fixtures');
  });

  beforeEach(function() {
    fixture.load('basic.html');
    // Because inert relies on MutationObservers,
    // wait till next microtask before running tests.
    return Promise.resolve();
  });

  afterEach(function() {
    fixture.cleanup();
  });

  let host;

  beforeEach(function() {
    fixture.el.inert = false;
    host = document.createElement('div');
    fixture.el.appendChild(host);
    host.attachShadow({
      mode: 'open',
    });
  });

  it('should apply inside shadow trees', function() {
    const shadowButton = document.createElement('button');
    shadowButton.textContent = 'Shadow button';
    host.shadowRoot.appendChild(shadowButton);
    shadowButton.focus();
    fixture.el.inert = true;
    expect(isUnfocusable(shadowButton)).to.equal(true);
  });

  it('should apply inert styles inside shadow trees', function() {
    const shadowButton = document.createElement('button');
    shadowButton.textContent = 'Shadow button';
    host.shadowRoot.appendChild(shadowButton);
    shadowButton.focus();
    shadowButton.inert = true;
    Promise.resolve().then(() => {
      expect(getComputedStyle(shadowButton).pointerEvents).to.equal('none');
      done();
    });
  });

  it('should apply inert styles inside shadow trees that aren\'t focused', function() {
    const shadowButton = document.createElement('button');
    shadowButton.textContent = 'Shadow button';
    host.shadowRoot.appendChild(shadowButton);
    shadowButton.inert = true;
    Promise.resolve().then(() => {
      expect(getComputedStyle(shadowButton).pointerEvents).to.equal('none');
      done();
    });
  });

  it('should apply inside shadow trees distributed content', function() {
    host.shadowRoot.appendChild(document.createElement('slot'));
    const distributedButton = document.createElement('button');
    distributedButton.textContent = 'Distributed button';
    host.appendChild(distributedButton);
    distributedButton.focus();
    fixture.el.inert = true;
    expect(isUnfocusable(distributedButton)).to.equal(true);
  });
});
