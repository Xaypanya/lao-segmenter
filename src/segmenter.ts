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
    if (isLaoCodePoint(cp) && !isLaoDigit(cp)) {
      // Take the whole run of Lao letters and segment it as one unit, so the
      // algorithm can look past a locally-longest match (see segmentLaoRun).
      let end = pos + 1
      while (end < text.length) {
        const c = text.codePointAt(end)!
        if (!isLaoCodePoint(c) || isLaoDigit(c)) break
        end++
      }
      segmentLaoRun(text, pos, end, trie, tokens)
      pos = end
      continue
    }

    // ── Everything else: one code point ──────────────────────────────────
    const cpLen = cp > 0xffff ? 2 : 1
    tokens.push(text.slice(pos, pos + cpLen))
    pos += cpLen
  }

  return tokens
}

// ─── Lao run segmentation (shortest path over the dictionary DAG) ─────────────

/**
 * Segment one maximal run of Lao letters and append the tokens to `out`.
 *
 * Plain greedy longest-match fails whenever the longest word at a position
 * strands the characters after it. "ຊິນອນ" is the classic case: ຊິນ, ອ and ນ
 * are all dictionary entries, so greedy produces ຊິນ + ອ + ນ — three tokens —
 * while ຊິ + ນອນ ("will" + "sleep") is both shorter and correct.
 *
 * So instead of committing to the first longest match, we treat the run as a
 * DAG: every dictionary word starting at a position is an edge, plus one Lao
 * Grapheme Cluster edge as a fallback so unknown text can never stall us. A
 * linear-time dynamic program then picks the best path, ranked by:
 *
 *   1. fewest unknown (non-dictionary) tokens — stay inside the dictionary
 *   2. fewest tokens overall               — prefer whole words to fragments
 *   3. longest final token                 — matches greedy on genuine ties
 *
 * This is the same "maximal matching over a word DAG" that PyThaiNLP's newmm
 * uses for Thai, and it runs in O(n × longest-word) for a run of n characters.
 */
function segmentLaoRun(
  text: string,
  start: number,
  end: number,
  trie: Trie,
  out: string[]
): void {
  const n = end - start
  if (n <= 0) return

  const INF = Infinity
  // Cost of the best known path reaching each position, and where it came from.
  const unknownCost = new Float64Array(n + 1).fill(INF)
  const tokenCount = new Float64Array(n + 1).fill(INF)
  const prev = new Int32Array(n + 1).fill(-1)
  unknownCost[0] = 0
  tokenCount[0] = 0

  const relax = (to: number, from: number, unknown: number, count: number): void => {
    const better =
      unknown < unknownCost[to] ||
      (unknown === unknownCost[to] &&
        (count < tokenCount[to] ||
          // Tie on both costs: fall back to greedy-from-the-left by preferring
          // the edge that starts latest, which leaves the earlier tokens as
          // long as possible. "ຫົວໃຈດີ" → ຫົວໃຈ + ດີ rather than ຫົວ + ໃຈດີ.
          (count === tokenCount[to] && from > prev[to])))
    if (better) {
      unknownCost[to] = unknown
      tokenCount[to] = count
      prev[to] = from
    }
  }

  for (let i = 0; i < n; i++) {
    if (unknownCost[i] === INF) continue
    const abs = start + i
    const unknown = unknownCost[i]
    const count = tokenCount[i]

    // Dictionary edges — every word starting here, not just the longest.
    const matches = trie.allMatches(text, abs, n - i)
    for (let m = 0; m < matches.length; m++) {
      relax(i + matches[m], i, unknown, count + 1)
    }

    // Fallback edge: one Lao Grapheme Cluster, so we always make progress.
    // The repetition mark ໆ is not really an unknown word — it is glued onto
    // the previous token below — so it does not carry the unknown penalty.
    let lgcLen = nextLGCLength(text, abs)
    if (lgcLen <= 0) lgcLen = 1
    if (i + lgcLen > n) lgcLen = n - i
    const isRepetition = text.codePointAt(abs) === LAO_REPETITION
    relax(i + lgcLen, i, unknown + (isRepetition ? 0 : 1), count + 1)
  }

  // Walk the parent pointers back from the end of the run.
  const boundaries: number[] = []
  for (let i = n; i > 0; i = prev[i]) {
    boundaries.push(i)
    /* istanbul ignore next — every position is reachable via the LGC fallback */
    if (prev[i] < 0) break
  }
  boundaries.push(0)
  boundaries.reverse()

  const runTokens: string[] = []
  for (let b = 1; b < boundaries.length; b++) {
    runTokens.push(text.slice(start + boundaries[b - 1], start + boundaries[b]))
  }

  // A repetition mark ໆ always belongs to the word in front of it.
  for (let k = 1; k < runTokens.length; k++) {
    while (runTokens[k].length > 0 && runTokens[k].codePointAt(0) === LAO_REPETITION) {
      runTokens[k - 1] += runTokens[k][0]
      runTokens[k] = runTokens[k].slice(1)
    }
  }

  for (const token of runTokens) {
    if (token.length > 0) out.push(token)
  }
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
