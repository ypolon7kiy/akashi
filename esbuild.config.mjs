import { build, context } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isWatch = process.argv.includes('--watch');

async function main() {
  const common = {
    bundle: true,
    sourcemap: true,
    minify: false,
    logLevel: 'info',
  };

  const extensionOptions = {
    ...common,
    platform: 'node',
    target: 'node18',
    entryPoints: [join(__dirname, 'src', 'extension.ts')],
    outfile: join(__dirname, 'dist', 'extension.js'),
    external: ['vscode'],
  };

  const sidebarWebviewOptions = {
    ...common,
    platform: 'browser',
    target: 'es2020',
    entryPoints: {
      'sidebar-main': join(__dirname, 'src', 'sidebar', 'webview', 'index.tsx'),
    },
    outdir: join(__dirname, 'dist', 'webview', 'sidebar'),
    format: 'iife',
    loader: { '.tsx': 'tsx' },
  };

  const graph2dWebviewOptions = {
    ...common,
    platform: 'browser',
    target: 'es2020',
    entryPoints: {
      'graph2d-main': join(__dirname, 'src', 'domains', 'graph', 'webview', 'graph2d', 'index.tsx'),
    },
    outdir: join(__dirname, 'dist', 'webview', 'graph2d'),
    format: 'iife',
    loader: { '.tsx': 'tsx' },
  };

  if (isWatch) {
    const extCtx = await context(extensionOptions);
    const sidebarCtx = await context(sidebarWebviewOptions);
    const graph2dCtx = await context(graph2dWebviewOptions);

    console.log('Watching for changes...');
    await Promise.all([extCtx.watch(), sidebarCtx.watch(), graph2dCtx.watch()]);
  } else {
    await build(extensionOptions);
    await build(sidebarWebviewOptions);
    await build(graph2dWebviewOptions);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
