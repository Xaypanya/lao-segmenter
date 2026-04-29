/**
 * lao-segmenter
 *
 * Lao word segmenter using maximal matching with a 34k-word dictionary.
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
 * For repeated use, prefer the `Segmenter` class which caches the Trie:
 * ```ts
 * import { Segmenter } from 'lao-segmenter'
 *
 * const seg = new Segmenter({ customWords: ['ຊາວໜຸ່ມ'] })
 * seg.segment('ຂ່າວສານ')
 * ```
 */

export { segment, Segmenter } from './segmenter.js'
export type { SegmentOptions } from './segmenter.js'

export { Trie, TrieNode, buildTrie } from './trie.js'
export { splitLGC, nextLGCLength, isLaoCodePoint } from './lgc.js'
export { parseWordList, buildCustomTrie, getRawDict } from './dict.js'
