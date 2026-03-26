'use strict';

const assert = require('node:assert');
const vscode = require('vscode');

suite('Akashi e2e smoke', () => {
  test('extension manifest is loadable in test host', () => {
    const ext = vscode.extensions.getExtension('akashi.akashi');
    assert.ok(ext, 'akashi.akashi should be resolvable when running from extensionDevelopmentPath');
  });
});
