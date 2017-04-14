/**
 *
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
