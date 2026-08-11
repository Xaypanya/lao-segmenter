/**
 * Lao word segmenter — maximal matching with LGC fallback.
 *
 * Algorithm (same family as PyThaiNLP's "newmm"):
 *   1. At each position try to find the longest dictionary match (Trie lookup).
 *   2. If found, emit that word and advance past it.
 *   3. If not found, advance exactly one Lao Grapheme Cluster (LGC) and emit
 *      it as an unknown token so we never get stuck.
 *   4. Non-Lao runs (ASCII, numbers, spaces, punctuation) are handled by
 *      grouping consecutive same-category characters into a single token.
 *
 * The repetition mark ໆ (U+0EC6) is always merged into the token that
 * immediately precedes it (e.g. "ຕ່າງໆ" stays as one word).
 *
 * This module is dictionary-free: it never imports the built-in word list and
 * never touches the file system. The dictionary-bound API lives in `index.ts`.
 */

import { Trie, buildTrie } from './trie.js'
import { nextLGCLength, isLaoCodePoint } from './lgc.js'

// ─── Character-category helpers ──────────────────────────────────────────────

const LAO_REPETITION = 0x0ec6 // ໆ

function isAsciiLetter(cp: number): boolean {
  return (cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)
}

function isAsciiDigit(cp: number): boolean {
  return cp >= 0x30 && cp <= 0x39
}

function isLaoDigit(cp: number): boolean {
  return cp >= 0x0ed0 && cp <= 0x0ed9
}

function isWhitespace(cp: number): boolean {
  return cp === 0x20 || cp === 0x09 || cp === 0x0a || cp === 0x0d
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SegmentOptions {
  /**
   * Include whitespace tokens in the result (default: true).
   * Set to false to strip spaces/newlines from the output array.
   */
  keepWhitespace?: boolean

  /**
   * Additional words to recognise on top of the base dictionary.
   * These are inserted into a copy of the base Trie before segmenting.
   */
  customWords?: string[]

  /**
   * Provide a fully custom Trie instead of the base dictionary.
   * When set, `words` and `customWords` are ignored.
   */
  trie?: Trie
}

export interface SegmenterOptions extends SegmentOptions {
  /**
   * The base word list. Required unless `trie` is given.
   *
   * The main `lao-segmenter` entry point fills this in with the built-in
   * 35k-word Lao dictionary, so you only need it when importing from
   * `lao-segmenter/core`.
   */
  words?: Iterable<string>
}

// ─── Core segmentation ────────────────────────────────────────────────────────

/**
 * Segment `text` using an explicit Trie. This is the dictionary-free core;
 * prefer `segment()` from `lao-segmenter` unless you are supplying your own
 * word list.
 *
 * ```ts
 * const trie = buildTrie(['ສະບາຍ', 'ດີ'])
 * segmentWith('ສະບາຍດີ', trie) // → ['ສະບາຍ', 'ດີ']
 * ```
 */
export function segmentWith(
  text: string,
  trie: Trie,
  options: Pick<SegmentOptions, 'keepWhitespace'> = {}
): string[] {
  if (text.length === 0) return []

  const keepWS = options.keepWhitespace ?? true
  const tokens: string[] = []
  let pos = 0

  while (pos < text.length) {
    const cp = text.codePointAt(pos)!

    // ── Whitespace run ────────────────────────────────────────────────────
    if (isWhitespace(cp)) {
      let end = pos + 1
      while (end < text.length && isWhitespace(text.codePointAt(end)!)) end++
      if (keepWS) tokens.push(text.slice(pos, end))
      pos = end
      continue
    }

    // ── ASCII letter run ─────────────────────────────────────────────────
    if (isAsciiLetter(cp)) {
      let end = pos + 1
      while (end < text.length && isAsciiLetter(text.codePointAt(end)!)) end++
      tokens.push(text.slice(pos, end))
      pos = end
      continue
    }

    // ── Digit run (ASCII or Lao digits) ──────────────────────────────────
    if (isAsciiDigit(cp) || isLaoDigit(cp)) {
      const sameCat = isAsciiDigit(cp) ? isAsciiDigit : isLaoDigit
      let end = pos + 1
      while (end < text.length && sameCat(text.codePointAt(end)!)) end++
      tokens.push(text.slice(pos, end))
      pos = end
      continue
    }

    // ── Lao script ───────────────────────────────────────────────────────
    if (isLaoCodePoint(cp)) {
      const matchLen = trie.longestMatch(text, pos)
      let token: string

      if (matchLen > 0) {
        token = text.slice(pos, pos + matchLen)
        pos += matchLen
      } else {
        // Unknown: advance one Lao Grapheme Cluster so we never stall
        const lgcLen = nextLGCLength(text, pos)
        token = text.slice(pos, pos + lgcLen)
        pos += lgcLen
      }

      // Absorb a trailing repetition mark ໆ (it belongs to this word)
      if (pos < text.length && text.codePointAt(pos) === LAO_REPETITION) {
        token += text[pos]
        pos++
      }

      tokens.push(token)
      continue
    }

    // ── Everything else: one code point ──────────────────────────────────
    const cpLen = cp > 0xffff ? 2 : 1
    tokens.push(text.slice(pos, pos + cpLen))
    pos += cpLen
  }

  return tokens
}

// ─── Stateful Segmenter class ─────────────────────────────────────────────────

/**
 * Reusable segmenter that keeps a cached Trie. Prefer this when segmenting
 * many strings, so the Trie is built only once.
 *
 * Importing from `lao-segmenter` gives you a subclass that defaults to the
 * built-in Lao dictionary. Importing from `lao-segmenter/core` gives you this
 * class, which requires you to pass `words` or `trie`.
 *
 * ```ts
 * import { Segmenter, buildTrie } from 'lao-segmenter/core'
 *
 * const seg = new Segmenter({ words: ['ສະບາຍ', 'ດີ'] })
 * seg.segment('ສະບາຍດີ') // → ['ສະບາຍ', 'ດີ']
 * ```
 */
export class Segmenter {
  /** The Trie backing this segmenter. */
  readonly trie: Trie

  private readonly defaultKeepWhitespace: boolean

  constructor(options: SegmenterOptions = {}) {
    this.defaultKeepWhitespace = options.keepWhitespace ?? true

    if (options.trie) {
      this.trie = options.trie
      return
    }

    if (!options.words) {
      throw new Error(
        'Segmenter: pass `words` or `trie`. ' +
          "If you want the built-in Lao dictionary, import from 'lao-segmenter' instead of 'lao-segmenter/core'."
      )
    }

    const custom = options.customWords
    if (custom && custom.length > 0) {
      const trie = buildTrie(options.words)
      for (const w of custom) if (w.length > 0) trie.insert(w)
      this.trie = trie
    } else {
      this.trie = buildTrie(options.words)
    }
  }

  /** Segment `text` into tokens. */
  segment(text: string, options: Pick<SegmentOptions, 'keepWhitespace'> = {}): string[] {
    return segmentWith(text, this.trie, {
      keepWhitespace: options.keepWhitespace ?? this.defaultKeepWhitespace,
    })
  }

  /** True if `word` is an exact entry in this segmenter's dictionary. */
  has(word: string): boolean {
    return this.trie.has(word)
  }

  /** Add words to this segmenter's dictionary in place. */
  addWords(words: Iterable<string>): this {
    for (const w of words) if (w.length > 0) this.trie.insert(w)
    return this
  }
}
