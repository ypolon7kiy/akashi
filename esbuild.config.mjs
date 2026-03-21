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

  const graphWebviewOptions = {
    ...common,
    platform: 'browser',
    target: 'es2020',
    entryPoints: {
      'graph-main': join(__dirname, 'src', 'domains', 'graph', 'webview', 'index.tsx'),
    },
    outdir: join(__dirname, 'dist', 'webview', 'graph'),
    format: 'iife',
    loader: { '.tsx': 'tsx' },
  };

  if (isWatch) {
    const extCtx = await context(extensionOptions);
    const sidebarCtx = await context(sidebarWebviewOptions);
    const graphCtx = await context(graphWebviewOptions);

    console.log('Watching for changes...');
    await Promise.all([extCtx.watch(), sidebarCtx.watch(), graphCtx.watch()]);
  } else {
    await build(extensionOptions);
    await build(sidebarWebviewOptions);
    await build(graphWebviewOptions);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
