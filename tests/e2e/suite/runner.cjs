'use strict';

const path = require('node:path');
const Mocha = require('mocha');

/**
 * VS Code extension test entry: must export `run()` returning a Promise.
 */
function run() {
  const mocha = new Mocha({ ui: 'tdd', color: true, timeout: 30_000 });
  mocha.addFile(path.join(__dirname, 'smoke.test.cjs'));
  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} test(s) failed`));
      } else {
        resolve();
      }
    });
  });
}

module.exports = { run };
