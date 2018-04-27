/**
 * This work is licensed under the W3C Software and Document License
 * (http://www.w3.org/Consortium/Legal/2015/copyright-software-and-document).
 */

const expect = chai.expect;
const fixtureLoader = new Fixture();

/* eslint-disable require-jsdoc */

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

describe('Basic', function() {
  /* eslint-disable no-invalid-this */
  this.timeout(10000);

  describe('children of declaratively inert parent', function() {
    beforeEach(function() {
      return fixtureLoader.load('fixtures/basic.html');
    });

    afterEach(function() {
      fixtureLoader.destroy();
    });

    describe('ShadowDOM v0', function() {
      if (!Element.prototype.createShadowRoot) {
        console.log('ShadowDOM v0 is not supported by the browser.');
        return;
      }

      let fixture;
      let host;

      beforeEach(function() {
        fixture = document.querySelector('#fixture');
        fixture.inert = false;
        host = document.createElement('div');
        fixture.appendChild(host);
        host.createShadowRoot();
      });

      it('should apply inside shadow trees', function() {
        const shadowButton = document.createElement('button');
        shadowButton.textContent = 'Shadow button';
        host.shadowRoot.appendChild(shadowButton);
        shadowButton.focus();
        fixture.inert = true;
        expect(isUnfocusable(shadowButton)).to.equal(true);
      });

      it('should apply inert styles inside shadow trees', function() {
        const shadowButton = document.createElement('button');
        shadowButton.textContent = 'Shadow button';
        host.shadowRoot.appendChild(shadowButton);
        shadowButton.focus();
        shadowButton.inert = true;
        expect(getComputedStyle(shadowButton).pointerEvents).to.equal('none');
      });

      it('should apply inside shadow trees distributed content', function() {
        host.shadowRoot.appendChild(document.createElement('content'));
        const distributedButton = document.createElement('button');
        distributedButton.textContent = 'Distributed button';
        host.appendChild(distributedButton);
        distributedButton.focus();
        fixture.inert = true;
        expect(isUnfocusable(distributedButton)).to.equal(true);
      });
    });

    describe('ShadowDOM v1', function() {
      if (!Element.prototype.attachShadow) {
        console.log('ShadowDOM v1 is not supported by the browser.');
        return;
      }

      let fixture;
      let host;

      beforeEach(function() {
        fixture = document.querySelector('#fixture');
        fixture.inert = false;
        host = document.createElement('div');
        fixture.appendChild(host);
        host.attachShadow({
          mode: 'open',
        });
      });

      it('should apply inside shadow trees', function() {
        const shadowButton = document.createElement('button');
        shadowButton.textContent = 'Shadow button';
        host.shadowRoot.appendChild(shadowButton);
        shadowButton.focus();
        fixture.inert = true;
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
        fixture.inert = true;
        expect(isUnfocusable(distributedButton)).to.equal(true);
      });
    });
  });

  describe('nested inert regions', function() {
    beforeEach(function() {
      return fixtureLoader.load('fixtures/nested.html');
    });

    afterEach(function() {
      fixtureLoader.destroy();
    });

    it('should apply regardless of how many deep the nesting is', function() {
      const outerButton = document.querySelector('#outer-button');
      expect(isUnfocusable(outerButton)).to.equal(true);
      const outerFakeButton = document.querySelector('#outer-fake-button');
      expect(isUnfocusable(outerFakeButton)).to.equal(true);

      const innerButton = document.querySelector('#inner-button');
      expect(isUnfocusable(innerButton)).to.equal(true);
      const innerFakeButton = document.querySelector('#inner-fake-button');
      expect(isUnfocusable(innerFakeButton)).to.equal(true);
    });

    it('should still apply if inner inert is removed', function() {
      document.querySelector('#inner').inert = false;

      const outerButton = document.querySelector('#outer-button');
      expect(isUnfocusable(outerButton)).to.equal(true);
      const outerFakeButton = document.querySelector('#outer-fake-button');
      expect(isUnfocusable(outerFakeButton)).to.equal(true);

      const innerButton = document.querySelector('#inner-button');
      expect(isUnfocusable(innerButton)).to.equal(true);
      const innerFakeButton = document.querySelector('#inner-fake-button');
      expect(isUnfocusable(innerFakeButton)).to.equal(true);
    });

    it('should still apply to inner content if outer inert is removed', function() {
      document.querySelector('#outer').inert = false;

      const outerButton = document.querySelector('#outer-button');
      expect(isUnfocusable(outerButton)).to.equal(false);
      const outerFakeButton = document.querySelector('#outer-fake-button');
      expect(isUnfocusable(outerFakeButton)).to.equal(false);

      const innerButton = document.querySelector('#inner-button');
      expect(isUnfocusable(innerButton)).to.equal(true);
      const innerFakeButton = document.querySelector('#inner-fake-button');
      expect(isUnfocusable(innerFakeButton)).to.equal(true);
    });

    it('should be detected on dynamically added content within an inert root', function(done) {
      const temp = document.createElement('div');
      const outerContainer = document.querySelector('#outer');
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

  describe('reapply existing tabindex', function() {
    beforeEach(function() {
      return fixtureLoader.load('fixtures/tabindex.html');
    });

    afterEach(function() {
      fixtureLoader.destroy();
    });

    it('should reinstate pre-existing tabindex on setting inert=false', function() {
      const container = document.querySelector('#container');
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

  describe('reapply existing aria-hidden', function() {
    beforeEach(function() {
      return fixtureLoader.load('fixtures/aria-hidden.html');
    });

    afterEach(function() {
      fixtureLoader.destroy();
    });

    it('should reinstate pre-existing aria-hidden on setting inert=false', function() {
      const container = document.querySelector('#container');
      const ariaHiddens = new Map();
      for (let el of Array.from(container.children)) {
        if (el.hasAttribute('aria-hidden')) {
          ariaHiddens.set(el, el.getAttribute('aria-hidden'));
        }

        el.inert = true;
        el.inert = false;
      }

      for (let el of Array.from(container.children)) {
        let ariaHidden = ariaHiddens.get(el);
        if (ariaHidden) {
          expect(el.hasAttribute('aria-hidden')).to.equal(true);
          expect(el.getAttribute('aria-hidden')).to.equal(ariaHiddens.get(el));
        } else {
          expect(el.hasAttribute('aria-hidden')).to.equal(false);
        }
      }
    });
  });
});
