/**
 * build-jsx.cjs — Compila app.jsx → app.bundle.js usando esbuild
 */
const esbuild = require('esbuild');
const path = require('path');

async function build() {
  console.log('[build-jsx] Compilando app.jsx…');

  await esbuild.build({
    entryPoints: [path.join(__dirname, 'app.jsx')],
    outfile: path.join(__dirname, 'app.bundle.js'),
    bundle: false,
    minify: false,
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    target: ['es2020'],
    charset: 'utf8',
  });

  console.log('[build-jsx] app.bundle.js gerado com sucesso.');
}

build().catch(err => {
  console.error('[build-jsx] ERRO:', err);
  process.exit(1);
});
