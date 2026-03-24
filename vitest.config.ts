import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      vscode: path.join(root, 'tests/mocks/vscode.ts'),
      '@src': path.join(root, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.ts',
        'tests/**',
        // Browser webview bundles are not executed in the Node Vitest suite; excluding them
        // keeps the report focused on extension-host and shared logic (AGENTS.md).
        'src/sidebar/webview/**',
        'src/domains/graph/webview/**',
        'src/domains/graph/ui/webview/**',
        'src/webview-shared/**',
      ],
    },
  },
});
