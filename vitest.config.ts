import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      vscode: path.join(root, 'src/test/mocks/vscode.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: [
        'src/shared/validateSourceFileBaseName.ts',
        'src/domains/sources/domain/artifactCreator.ts',
        'src/domains/sources/domain/creators/**/*.ts',
        'src/domains/sources/presets/**/creators.ts',
        'src/domains/sources/presets/**/creators/**/*.ts',
        'src/domains/sources/registerSourcePresets.ts',
      ],
    },
  },
});
