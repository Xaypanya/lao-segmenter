/**
 * Dictionary loading.
 *
 * The word list is read from `data/lao-words.txt` at runtime using Node.js `fs`.
 * tsup injects a `__dirname` shim for ESM output so path resolution works in
 * both CJS and ESM builds.
 *
 * For browser environments (no `fs`), pass `customWords` or a pre-built `Trie`
 * to `segment()` / `new Segmenter()` instead.
 *
 * The raw string and Trie are each cached after the first call.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { Trie, buildTrie } from './trie.js'

let _rawDict: string | null = null
let _defaultTrie: Trie | null = null

function loadRawDict(): string {
  if (_rawDict !== null) return _rawDict
  // __dirname is the dist/ directory at runtime.
  // tsup shims __dirname automatically for ESM output.
  const dictPath = join(__dirname, '..', 'data', 'lao-words.txt')
  _rawDict = readFileSync(dictPath, 'utf-8')
  return _rawDict
}

/** Parse a raw word-list string (one word per line, lines starting with # ignored). */
export function parseWordList(raw: string): string[] {
  const words: string[] = []
  for (const line of raw.split('\n')) {
    const w = line.trim()
    if (w && w[0] !== '#') words.push(w)
  }
  return words
}

/**
 * Return the lazily-built default Trie.
 * First call reads the file (~250 KB), parses ~34k words, and builds the Trie.
 * Subsequent calls are O(1).
 */
export function getDefaultTrie(): Trie {
  if (!_defaultTrie) {
    _defaultTrie = buildTrie(parseWordList(loadRawDict()))
  }
  return _defaultTrie
}

/**
 * Return the raw dictionary string (useful for inspection or extension).
 * Lazily loaded from disk on first access.
 */
export function getRawDict(): string {
  return loadRawDict()
}

/** Build a fresh Trie from an arbitrary word list (for custom dictionaries). */
export function buildCustomTrie(words: string[]): Trie {
  return buildTrie(words)
}
