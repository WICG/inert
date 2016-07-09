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
class Fixture {
  constructor() {
    this._fixture = undefined;
  }

  load(url, callback) {
    // Add a <div id="fixture"> to the body
    this._fixture = document.createElement('div');
    this._fixture.id = 'fixture';
    document.body.appendChild(this._fixture);

    // Fetch template and insert in #fixture
    const promise = new Promise((resolve, reject) => {
      fetch(url)
        .then((response) => {
          return response.text()
        }).then((html) => {
          this._fixture.innerHTML = html;
          resolve();
        }).catch((err) => {
          reject(err);
        });
    });

    // Use this promise instead of immediately triggering the callback
    // in order to wait till the next microtask and give any Mutation Observers
    // a chance to run
    promise
      .then(callback)
      .catch((err) => {
        callback(err)
      });
  }

  destroy() {
    document.body.removeChild(this._fixture);
    this._fixture = undefined;
  }
}
