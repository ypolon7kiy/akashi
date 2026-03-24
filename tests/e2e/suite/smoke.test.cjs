'use strict';

const assert = require('node:assert');
const vscode = require('vscode');

suite('Akashi e2e smoke', () => {
  test('extension manifest is loadable in test host', () => {
    const ext = vscode.extensions.getExtension('yp.akashi');
    assert.ok(ext, 'yp.akashi should be resolvable when running from extensionDevelopmentPath');
  });
});
