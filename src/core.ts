/**
 * lao-segmenter/core — the segmentation engine *without* the built-in dictionary.
 *
 * Import this entry point when you want to ship your own word list and keep the
 * ~170 KB built-in dictionary out of your bundle.
 *
 * ```ts
 * import { Segmenter, buildTrie, parseWordList } from 'lao-segmenter/core'
 *
 * const words = parseWordList(await fetch('/my-lao-words.txt').then(r => r.text()))
 * const seg = new Segmenter({ words })
 * seg.segment('ສະບາຍດີ')
 * ```
 *
 * Everything here is pure JavaScript with zero dependencies and no Node.js
 * built-ins, so it runs in browsers, Web Workers and edge runtimes as-is.
 */

export { Segmenter, segmentWith } from './segmenter.js'
export type { SegmentOptions, SegmenterOptions } from './segmenter.js'

export { Trie, TrieNode, buildTrie } from './trie.js'
export { splitLGC, nextLGCLength, isLaoCodePoint } from './lgc.js'
export { parseWordList, buildCustomTrie, decodeWordList } from './wordlist.js'
