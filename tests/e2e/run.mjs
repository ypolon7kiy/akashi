/**
 * Launches VS Code (downloaded under .vscode-test on first run) and runs the Mocha suite
 * in the Extension Development Host. Requires a display server on Linux (e.g. xvfb-run).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runTests } from '@vscode/test-electron';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

async function main() {
  const exitCode = await runTests({
    extensionDevelopmentPath: repoRoot,
    extensionTestsPath: path.join(__dirname, 'suite', 'runner.cjs'),
    launchArgs: [path.join(__dirname, 'fixture'), '--disable-extensions'],
  });
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
