/**
 * Word-list utilities.
 *
 * Nothing in this module touches the file system or the built-in dictionary,
 * so it is safe to use in browsers, edge runtimes and Web Workers.
 */

import { Trie, buildTrie } from './trie.js'

/**
 * Parse a raw word-list string: one word per line, blank lines and lines
 * starting with `#` are ignored.
 *
 * ```ts
 * parseWordList('# comment\nສະບາຍ\nດີ\n') // → ['ສະບາຍ', 'ດີ']
 * ```
 */
export function parseWordList(raw: string): string[] {
  const words: string[] = []
  for (const line of raw.split('\n')) {
    const w = line.trim()
    if (w && w[0] !== '#') words.push(w)
  }
  return words
}

/**
 * Decode a front-coded word list (the format produced by
 * `scripts/generate-dict-module.mjs`).
 *
 * Each line is `<shared-prefix-length in base36><suffix>`, where the shared
 * prefix comes from the previous decoded word.
 */
export function decodeWordList(packed: string): string[] {
  if (packed.length === 0) return []
  const lines = packed.split('\n')
  const words: string[] = new Array(lines.length)
  let prev = ''
  for (let i = 0; i < lines.length; i++) {
    const entry = lines[i]
    const shared = parseInt(entry[0], 36)
    const word = shared === 0 ? entry.slice(1) : prev.slice(0, shared) + entry.slice(1)
    words[i] = word
    prev = word
  }
  return words
}

/** Build a fresh Trie from an arbitrary word list (for custom dictionaries). */
export function buildCustomTrie(words: Iterable<string>): Trie {
  return buildTrie(words)
}
