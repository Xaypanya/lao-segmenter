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
 */

import { Trie, buildTrie } from './trie.js'
import { nextLGCLength, isLaoCodePoint } from './lgc.js'
import { getDefaultTrie, parseWordList, getRawDict } from './dict.js'

// ─── Character-category helpers ──────────────────────────────────────────────

const LAO_REPETITION = 0x0EC6 // ໆ
const CP_SPACE = 0x20

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
   * Additional words to recognise on top of the built-in dictionary.
   * These are inserted into a copy of the default Trie before segmenting.
   */
  customWords?: string[]

  /**
   * Provide a fully custom Trie instead of the default dictionary.
   * When set, `customWords` is ignored.
   */
  trie?: Trie
}

// ─── Core segmentation ────────────────────────────────────────────────────────

/**
 * Segment `text` into an array of tokens (words, unknown clusters, spaces, …).
 *
 * ```ts
 * segment('ສະບາຍດີ')        // ['ສະບາຍ', 'ດີ']
 * segment('ສະບາຍດີ world') // ['ສະບາຍ', 'ດີ', ' ', 'world']
 * ```
 */
export function segment(text: string, options: SegmentOptions = {}): string[] {
  if (text.length === 0) return []

  const trie = options.trie ?? buildWorkingTrie(options.customWords)
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
 * Reusable segmenter that keeps a cached Trie.
 * Prefer this when segmenting many strings to avoid rebuilding the Trie each time.
 *
 * ```ts
 * const seg = new Segmenter({ customWords: ['ສາທາລະນະລັດ'] })
 * seg.segment('ສາທາລະນະລັດປະຊາທິປະໄຕ')
 * ```
 */
export class Segmenter {
  private readonly trie: Trie

  constructor(options: Omit<SegmentOptions, 'trie'> & { trie?: Trie } = {}) {
    this.trie = options.trie ?? buildWorkingTrie(options.customWords)
  }

  segment(text: string, options: Pick<SegmentOptions, 'keepWhitespace'> = {}): string[] {
    return segment(text, { ...options, trie: this.trie })
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Build the working Trie: default dictionary optionally extended with custom words.
 * Returns the cached default Trie when no custom words are needed.
 */
function buildWorkingTrie(customWords?: string[]): Trie {
  if (!customWords || customWords.length === 0) return getDefaultTrie()

  // Build a fresh Trie with all default words + custom words.
  // This happens once per Segmenter instance construction.
  const words = parseWordList(getRawDict())
  for (const w of customWords) words.push(w)
  return buildTrie(words)
}
