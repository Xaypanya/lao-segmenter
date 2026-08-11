/**
 * lao-segmenter
 *
 * Lao word segmenter using maximal matching with a 35k-word dictionary.
 * Pure JavaScript, zero dependencies, no Node.js built-ins — the dictionary is
 * inlined into the bundle, so the exact same import works in Node.js, browsers,
 * Bun, Deno, Cloudflare Workers, and under every bundler (Vite, webpack,
 * Rollup, esbuild, Next.js, Nuxt, SvelteKit, Astro, Remix …).
 *
 * Quick start:
 * ```ts
 * import { segment } from 'lao-segmenter'
 *
 * segment('ສະບາຍດີ')
 * // → ['ສະບາຍ', 'ດີ']
 *
 * segment('ສະບາຍດີ hello world', { keepWhitespace: false })
 * // → ['ສະບາຍ', 'ດີ', 'hello', 'world']
 * ```
 *
 * For repeated use, prefer the `Segmenter` class — it builds the Trie once:
 * ```ts
 * import { Segmenter } from 'lao-segmenter'
 *
 * const seg = new Segmenter({ customWords: ['ຊາວໜຸ່ມ'] })
 * seg.segment('ຂ່າວສານ')
 * ```
 *
 * To keep the built-in dictionary out of your bundle, import
 * `lao-segmenter/core` and supply your own word list instead.
 */

import { Trie, buildTrie } from './trie.js'
import {
  Segmenter as CoreSegmenter,
  segmentWith,
  type SegmentOptions,
  type SegmenterOptions,
} from './segmenter.js'
import { getLaoWords } from './dictionary.js'

// ─── Re-exports (dictionary-free building blocks) ─────────────────────────────

export { segmentWith }
export type { SegmentOptions, SegmenterOptions }

export { Trie, TrieNode, buildTrie } from './trie.js'
export { splitLGC, nextLGCLength, isLaoCodePoint } from './lgc.js'
export { parseWordList, buildCustomTrie, decodeWordList } from './wordlist.js'
export { getLaoWords, getRawDict, DICTIONARY_SIZE } from './dictionary.js'

// ─── Built-in dictionary Trie (lazy + cached) ─────────────────────────────────

let _defaultTrie: Trie | null = null

/**
 * The Trie built from the built-in Lao dictionary.
 * Built on first use (~35k words, a few milliseconds) and cached afterwards.
 */
export function getDefaultTrie(): Trie {
  if (_defaultTrie === null) _defaultTrie = buildTrie(getLaoWords())
  return _defaultTrie
}

/** Options accepted by the dictionary-backed `Segmenter`. */
export interface LaoSegmenterOptions extends SegmenterOptions {}

/**
 * Reusable segmenter backed by the built-in Lao dictionary.
 *
 * ```ts
 * const seg = new Segmenter({ customWords: ['ສາທາລະນະລັດ'] })
 * seg.segment('ສາທາລະນະລັດປະຊາທິປະໄຕ')
 * ```
 *
 * Pass `words` or `trie` to replace the built-in dictionary entirely, or
 * `customWords` to extend it.
 */
export class Segmenter extends CoreSegmenter {
  constructor(options: LaoSegmenterOptions = {}) {
    // No custom words and no custom dictionary → reuse the cached default Trie
    // instead of building a second copy.
    if (!options.trie && !options.words && !options.customWords?.length) {
      super({ ...options, trie: getDefaultTrie() })
      return
    }
    super({ ...options, words: options.words ?? getLaoWords() })
  }
}

/**
 * Segment `text` into an array of tokens (words, unknown clusters, spaces, …).
 *
 * ```ts
 * segment('ສະບາຍດີ')         // ['ສະບາຍ', 'ດີ']
 * segment('ສະບາຍດີ world')  // ['ສະບາຍ', 'ດີ', ' ', 'world']
 * ```
 *
 * Building the dictionary Trie is cached, so repeated calls are cheap — but
 * when you pass `customWords` a fresh Trie is built on every call. Use the
 * `Segmenter` class in that case.
 */
export function segment(text: string, options: SegmentOptions = {}): string[] {
  const keepWhitespace = options.keepWhitespace

  if (options.trie) {
    return segmentWith(text, options.trie, { keepWhitespace })
  }

  if (options.customWords && options.customWords.length > 0) {
    const trie = buildTrie(getLaoWords())
    for (const w of options.customWords) if (w.length > 0) trie.insert(w)
    return segmentWith(text, trie, { keepWhitespace })
  }

  return segmentWith(text, getDefaultTrie(), { keepWhitespace })
}

/** Default export for `import laoSegmenter from 'lao-segmenter'` and UMD/global use. */
export default { segment, Segmenter, getDefaultTrie, getLaoWords }
