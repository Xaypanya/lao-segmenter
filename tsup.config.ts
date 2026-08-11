import { defineConfig } from 'tsup'

/**
 * Three entry points, two module formats, plus a browser global build.
 *
 *   dist/index.{mjs,cjs}       full package — engine + built-in dictionary
 *   dist/core.{mjs,cjs}        engine only — bring your own word list
 *   dist/dictionary.{mjs,cjs}  the word list only
 *   dist/lao-segmenter.global.js   IIFE for <script src> / CDN usage
 *
 * The dictionary is compiled into the JS output as a string constant, so no
 * build produces a Node.js built-in import. `platform: 'neutral'` makes esbuild
 * fail loudly if that ever regresses.
 */
export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      core: 'src/core.ts',
      dictionary: 'src/dictionary.ts',
    },
    format: ['esm', 'cjs'],
    platform: 'neutral',
    target: 'es2018',
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
    // Emit Lao characters literally instead of \uXXXX escapes — the inlined
    // dictionary shrinks from ~670 KB to ~380 KB of output.
    esbuildOptions: (options) => {
      options.charset = 'utf8'
    },
  },
  {
    entry: { 'lao-segmenter': 'src/index.ts' },
    format: ['iife'],
    globalName: 'LaoSegmenter',
    platform: 'browser',
    target: 'es2018',
    dts: false,
    clean: false,
    sourcemap: false,
    minify: true,
    outExtension: () => ({ js: '.global.js' }),
    esbuildOptions: (options) => {
      options.charset = 'utf8'
    },
    // Expose the named exports directly on window.LaoSegmenter rather than
    // window.LaoSegmenter.default.
    footer: {
      js: 'if(typeof globalThis!=="undefined"&&globalThis.LaoSegmenter&&globalThis.LaoSegmenter.default){globalThis.LaoSegmenter=Object.assign(globalThis.LaoSegmenter.default,globalThis.LaoSegmenter)}',
    },
  },
])
