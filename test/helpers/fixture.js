/**
 * This work is licensed under the W3C Software and Document License
 * (http://www.w3.org/Consortium/Legal/2015/copyright-software-and-document).
 */

/* eslint-disable no-unused-vars */

/**
 * The FixtureLoader class takes a URL, loads its contents, and inserts them into the DOM.
 * It also provides a `destroy` method to clean out the page contents.
 */
class Fixture {
  /**
   * Setup initial state.
   */
  constructor() {
    this._fixture = undefined;
  }

  /**
   * Load the given URL and stick its contents into a `<div id="fixture">`.
   * @param {*} url
   * @return {Promise}
   */
  load(url) {
    this._fixture = document.createElement('div');
    this._fixture.id = 'fixture';
    document.body.appendChild(this._fixture);

    // Fetch template and insert in #fixture
    return new Promise((resolve, reject) => {
      fetch(url)
        .then((response) => {
          return response.text();
        }).then((html) => {
          this._fixture.innerHTML = html;
          resolve();
        }).catch((err) => {
          reject(err);
        });
    });
  }

  /**
   * Remove the current fixture and delete it.
   */
  destroy() {
    document.body.removeChild(this._fixture);
    this._fixture = undefined;
  }
}
