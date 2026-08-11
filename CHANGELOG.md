# Changelog

All notable changes to this project are documented here.
This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] — 2026-08-11

### Fixed

- **Segmentation no longer strands characters after a long match.** The segmenter used pure greedy longest-matching: it took the longest dictionary word at each position and never reconsidered. When that longest word left an unmatchable remainder, the leftovers were shredded into single clusters.

  `ຊິນອນ` ("will sleep") is the clearest case. `ຊິນ`, `ອ` and `ນ` are all dictionary entries, so greedy took `ຊິນ` and then had `ອນ` left over — not a word — producing `ຊິນ | ອ | ນ` instead of `ຊິ | ນອນ`. Likewise `ທ່ານດີບໍ` came out as `ທ່ານ | ດີບ | ໍ`, breaking the vowel sign off `ບໍ`.

  Each run of Lao letters is now treated as a word graph — every dictionary word starting at every position is an edge, with a Lao Grapheme Cluster edge as the fallback — and a linear-time dynamic program picks the best path: fewest unknown fragments, then fewest tokens, then longest words from the left. This is what PyThaiNLP's `newmm` does for Thai, and what the README already claimed this package did.

  ```js
  segment('ຊິນອນ')             // was ['ຊິນ','ອ','ນ']       → now ['ຊິ','ນອນ']
  segment('ທ່ານດີບໍ')          // was ['ທ່ານ','ດີບ','ໍ']    → now ['ທ່ານ','ດີ','ບໍ']
  segment('ຢຸດຮ້ອງເພງດູຊິນອນ') // → ['ຢຸດ','ຮ້ອງເພງ','ດູ','ຊິ','ນອນ']
  ```

  Still O(n × longest-word) per run, still lossless, and the repetition mark ໆ still glues to the word before it.

### Added

- `Trie.allMatches(text, pos, limit?)` — every dictionary word that is a prefix at `pos`, not just the longest.
- 15 regression tests for the shortest-path behaviour (558 total).

### Note

One pre-existing test expectation changed: `ທ່ານດີບໍ` was asserted as `['ທ່ານ','ດີບ','ໍ']`, which encoded the greedy bug. Every other one of the 519 original tests passes unchanged.

## [0.2.0] — 2026-08-11

### Fixed

- **The package now works in every JavaScript framework and runtime.** Previously the dictionary was read from disk at runtime with `fs.readFileSync(join(__dirname, '..', 'data', 'lao-words.txt'))`. That works in plain Node.js, but breaks as soon as the package is processed by a bundler: `fs` does not exist in the browser, and `__dirname` no longer points at the published `dist/` directory. Anyone using Vite, webpack, Next.js, Nuxt, SvelteKit, Astro, a Web Worker, or an edge runtime hit either a build-time resolution error or a runtime `ENOENT`.

  The dictionary is now compiled into the module as a string constant. There are **no Node.js built-in imports anywhere in the published output**, so the same `import { segment } from 'lao-segmenter'` works unchanged in Node, browsers, Bun, Deno, Cloudflare Workers, Vercel Edge and Deno Deploy — with no bundler configuration, no `fs` polyfill and no copying files into `public/`.

  Verified by real production builds of Vite 5, webpack 5, Next.js 15 (Server Component + Client Component + edge route), Nuxt 3, SvelteKit 2 and Astro 4.

### Added

- **`lao-segmenter/core`** — the segmentation engine without the built-in dictionary (~3 KB minified). Use it when you want to ship your own word list.
- **`lao-segmenter/dictionary`** — the word list on its own.
- **Browser global build** — `dist/lao-segmenter.global.js`, exposed via unpkg and jsDelivr, for `<script src>` usage with no build step.
- **`Segmenter` improvements** — `words` option (replace the dictionary entirely), `keepWhitespace` as a constructor default, `.has(word)`, `.addWords(words)` and a public `.trie` property.
- **`segmentWith(text, trie, options?)`** — the dictionary-free core segmentation function.
- **`getLaoWords()`**, **`DICTIONARY_SIZE`**, **`decodeWordList()`** exports.
- **Dual TypeScript declarations** (`.d.ts` + `.d.cts`) so types resolve under both `moduleResolution: "bundler"` and `"node16"`.
- **`npm run test:pkg`** — packs the tarball, installs it into a scratch directory, then exercises ESM, CJS, subpath imports, browser/edge bundling, the IIFE global and TypeScript resolution. This is what keeps the framework-support promise honest.
- 15 new unit tests covering the new entry points (543 total).

### Changed

- Package is now `"type": "module"` with explicit `.mjs` / `.cjs` output extensions and `"sideEffects": false` for better tree-shaking.
- Dictionary is stored front-coded (shared prefixes are elided), which nearly halves it: 260 KB → 168 KB of source characters, ~110 KB gzipped in a bundle.
- The dictionary is decoded lazily on first use and cached, so importing the package costs nothing until you segment something.
- `data/lao-words.txt` is no longer shipped in the npm tarball — it is compiled into `dist/`. It stays in the git repository as the source of truth, and `getRawDict()` still returns its contents.
- Dictionary word count corrected in the docs: 35,185 (was reported as 34,000).

### Compatibility

No public API was removed. `segment()`, `Segmenter`, `splitLGC()`, `nextLGCLength()`, `isLaoCodePoint()`, `Trie`, `buildTrie()`, `parseWordList()`, `buildCustomTrie()`, `getRawDict()` and `getDefaultTrie()` all behave as before, and all 519 pre-existing tests pass unchanged.

## [0.1.2]

- Expanded the dictionary builder to support CSV/JSONL sources and filter out compound words.

## [0.1.1]

- Added repository, homepage and bugs metadata; added the banner image.

## [0.1.0]

- Initial release: maximal-matching Lao word segmenter with LGC fallback.
