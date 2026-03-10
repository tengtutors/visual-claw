const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const watch = process.argv.includes('--watch');

// Load .env file for build-time token injection
const envPath = path.resolve(__dirname, '.env');
const envVars = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^(\w+)=(.*)$/);
    if (match) envVars[match[1]] = match[2].trim();
  }
}

const commonOptions = {
  bundle: true,
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  target: ['chrome116'],
  jsx: 'automatic',
  jsxImportSource: 'react',
  loader: { '.jsx': 'jsx', '.js': 'js' },
  outdir: path.resolve(__dirname, 'dist'),
  define: {
    'process.env.OPENCLAW_AUTH_TOKEN': JSON.stringify(envVars.OPENCLAW_AUTH_TOKEN || ''),
  },
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
  fs.cpSync('manifest.json', 'dist/manifest.json');
  console.log('Copied public/ + manifest.json -> dist/');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
