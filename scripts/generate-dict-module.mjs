#!/usr/bin/env node
/**
 * Generate `src/generated/dictionary-data.ts` from `data/lao-words.txt`.
 *
 * Why: the dictionary used to be read from disk with `fs.readFileSync()` at
 * runtime. That works in plain Node.js but breaks the moment the package is
 * bundled (Vite, webpack, Rollup, esbuild, Next.js, Nuxt, Astro, Cloudflare
 * Workers, Deno Deploy …) because `fs` does not exist there and `__dirname`
 * no longer points at the published `dist/` directory.
 *
 * Inlining the word list as a plain string constant removes every runtime
 * dependency on the file system, so the package works identically in Node,
 * browsers, edge runtimes and every bundler.
 *
 * Encoding: the sorted word list is *front-coded* (a.k.a. prefix compression).
 * Each entry is `<shared-prefix-length in base36><suffix>`; the shared prefix
 * is taken from the previous word. This cuts the inlined payload roughly in
 * half (266k → 172k characters) with a decoder that is ~15 lines long.
 *
 * Usage: node scripts/generate-dict-module.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

/** base36 uses a single character for 0–35, so shared prefixes are capped there. */
const MAX_PREFIX = 35

const raw = readFileSync(join(ROOT, 'data', 'lao-words.txt'), 'utf-8')

const words = [
  ...new Set(
    raw
      .split('\n')
      .map((line) => line.trim())
      .filter((w) => w.length > 0 && w[0] !== '#')
  ),
].sort()

/** Front-code the sorted list: `<sharedLen base36><suffix>` joined by \n. */
function frontCode(sorted) {
  const out = []
  let prev = ''
  for (const word of sorted) {
    const max = Math.min(prev.length, word.length, MAX_PREFIX)
    let shared = 0
    while (shared < max && prev[shared] === word[shared]) shared++
    out.push(shared.toString(36) + word.slice(shared))
    prev = word
  }
  return out.join('\n')
}

const encoded = frontCode(words)

// Sanity check: round-trip before writing anything.
function decode(packed) {
  const result = []
  let prev = ''
  for (const entry of packed.split('\n')) {
    const shared = parseInt(entry[0], 36)
    const word = prev.slice(0, shared) + entry.slice(1)
    result.push(word)
    prev = word
  }
  return result
}

const roundTripped = decode(encoded)
if (roundTripped.length !== words.length) {
  throw new Error(`round-trip length mismatch: ${roundTripped.length} !== ${words.length}`)
}
for (let i = 0; i < words.length; i++) {
  if (roundTripped[i] !== words[i]) {
    throw new Error(`round-trip mismatch at ${i}: ${roundTripped[i]} !== ${words[i]}`)
  }
}

// A word containing a literal newline would corrupt the format.
if (words.some((w) => w.includes('\n'))) {
  throw new Error('word list contains a newline character')
}

const escaped = encoded.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')

const banner = `/* eslint-disable */
// prettier-ignore
/**
 * GENERATED FILE — do not edit by hand.
 * Run \`npm run generate:dict\` to regenerate from data/lao-words.txt.
 *
 * ${words.length} Lao words, front-coded (see scripts/generate-dict-module.mjs).
 */
`

const body = `${banner}
/** Number of words in the built-in dictionary. */
export const DICTIONARY_SIZE = ${words.length}

/** Front-coded word list. Decode with \`decodeWordList()\` from ../dictionary.js. */
export const PACKED_WORDS = \`${escaped}\`
`

mkdirSync(join(ROOT, 'src', 'generated'), { recursive: true })
writeFileSync(join(ROOT, 'src', 'generated', 'dictionary-data.ts'), body, 'utf-8')

const kb = (n) => `${(n / 1024).toFixed(1)} KB`
console.log(
  `generated src/generated/dictionary-data.ts — ${words.length} words, ` +
    `${kb(encoded.length)} of source chars (raw list was ${kb(words.join('\n').length)})`
)
