const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const watch = process.argv.includes('--watch');

const commonOptions = {
  bundle: true,
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  target: ['chrome116'],
  jsx: 'automatic',
  jsxImportSource: 'react',
  loader: { '.jsx': 'jsx', '.js': 'js' },
  outdir: path.resolve(__dirname, 'dist'),
};

const entries = [
  { entryPoints: ['src/sidepanel/index.jsx'], outdir: 'dist/sidepanel' },
  { entryPoints: ['src/dashboard/index.jsx'], outdir: 'dist/dashboard' },
  { entryPoints: ['src/background/service-worker.js'], outdir: 'dist/background' },
];

async function run() {
  for (const entry of entries) {
    const options = { ...commonOptions, ...entry };

    if (watch) {
      const ctx = await esbuild.context(options);
      await ctx.watch();
      console.log(`Watching ${entry.entryPoints[0]}...`);
    } else {
      await esbuild.build(options);
      console.log(`Built ${entry.entryPoints[0]}`);
    }
  }

  // Copy static files
  fs.cpSync('public', 'dist', { recursive: true });
  fs.mkdirSync(path.join('dist', 'tools'), { recursive: true });
  fs.cpSync(path.join('tools', 'interior-design.html'), path.join('dist', 'tools', 'interior-design.html'));
  fs.cpSync(path.join('tools', 'interior-design.js'), path.join('dist', 'tools', 'interior-design.js'));
  fs.cpSync('manifest.json', 'dist/manifest.json');
  console.log('Copied public/, tools/interior-design.html + manifest.json -> dist/');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
