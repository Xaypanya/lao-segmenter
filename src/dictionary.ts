/**
 * The built-in Lao dictionary.
 *
 * The word list is inlined into the bundle as a front-coded string constant —
 * there is no `fs.readFileSync`, no `fetch`, and no `__dirname`, so this works
 * unchanged in Node.js, browsers, Bun, Deno, Cloudflare Workers and every
 * bundler (Vite, webpack, Rollup, esbuild, Next.js, Nuxt, Astro …).
 *
 * Decoding is lazy and memoised: importing this module is free, the ~35k-word
 * array is materialised on the first call to `getLaoWords()`.
 *
 * Import from the `lao-segmenter/dictionary` subpath if you only want the data:
 * ```ts
 * import { getLaoWords, DICTIONARY_SIZE } from 'lao-segmenter/dictionary'
 * ```
 */

import { PACKED_WORDS, DICTIONARY_SIZE } from './generated/dictionary-data.js'
import { decodeWordList } from './wordlist.js'

export { DICTIONARY_SIZE }

let _words: readonly string[] | null = null

/**
 * The built-in Lao word list, sorted. Decoded on first call, cached after.
 *
 * The returned array is shared — treat it as read-only. Copy it (`[...words]`)
 * before mutating.
 */
export function getLaoWords(): readonly string[] {
  if (_words === null) _words = decodeWordList(PACKED_WORDS)
  return _words
}

/**
 * The built-in dictionary as a newline-separated string, the same shape as
 * `data/lao-words.txt`. Useful for inspection or for writing your own file.
 */
export function getRawDict(): string {
  return getLaoWords().join('\n')
}
