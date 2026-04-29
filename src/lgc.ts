/**
 * Lao Grapheme Cluster (LGC)
 *
 * The LGC is the smallest atomic unit of Lao script — equivalent to Thai
 * Character Cluster (TCC) used by PyThaiNLP as a segmentation fallback.
 *
 * A Lao syllable in Unicode logical order:
 *   [leading vowel]  consonant  [subjoined]  [above vowel]  [below vowel]
 *   [tone mark]  [diacritic]  [trailing vowel]
 *
 * Lao Unicode block: U+0E80–U+0EFF
 *
 *  Consonants:      U+0E81 ກ … U+0EAE ຮ (with gaps), U+0EDC ໜ, U+0EDD ໝ
 *  Leading vowels:  U+0EC0 ເ  U+0EC1 ແ  U+0EC2 ໂ  U+0EC3 ໃ  U+0EC4 ໄ
 *                   (appear before the consonant visually, after it in Unicode)
 *  Above vowels:    U+0EB1 ັ  U+0EB4 ິ  U+0EB5 ີ  U+0EB6 ຶ  U+0EB7 ື  U+0EBB ົ
 *  Below vowels:    U+0EB8 ຸ  U+0EB9 ູ
 *  Subjoined:       U+0EBC ຼ (lo)  U+0EBD ຽ (nyo)
 *  Tone marks:      U+0EC8 ່  U+0EC9 ້  U+0ECA ໊  U+0ECB ໋
 *  Other diacritics:U+0ECC ໌  U+0ECD ໍ
 *  Trailing vowels: U+0EB0 ະ  U+0EB2 າ  U+0EB3 ຳ
 *  Repetition mark: U+0EC6 ໆ  (always glues to the previous token)
 *  Lao digits:      U+0ED0–U+0ED9
 */

// Explicit set of Lao consonant codepoints (avoiding gaps in the block)
const LAO_CONSONANTS = new Set([
  0x0E81, 0x0E82, 0x0E84, 0x0E87, 0x0E88, 0x0E8A, 0x0E8D,
  0x0E94, 0x0E95, 0x0E96, 0x0E97, 0x0E99, 0x0E9A, 0x0E9B,
  0x0E9C, 0x0E9D, 0x0E9E, 0x0E9F, 0x0EA1, 0x0EA2, 0x0EA3,
  0x0EA5, 0x0EA7, 0x0EAA, 0x0EAB, 0x0EAD, 0x0EAE,
  0x0EDC, 0x0EDD, // ໜ ໝ (precomposed Ho No / Ho Mo)
])

function isConsonant(cp: number): boolean { return LAO_CONSONANTS.has(cp) }
function isLeadingVowel(cp: number): boolean { return cp >= 0x0EC0 && cp <= 0x0EC4 }
function isAboveVowel(cp: number): boolean {
  return cp === 0x0EB1 || (cp >= 0x0EB4 && cp <= 0x0EB7) || cp === 0x0EBB
}
function isBelowVowel(cp: number): boolean { return cp === 0x0EB8 || cp === 0x0EB9 }
function isSubjoined(cp: number): boolean { return cp === 0x0EBC || cp === 0x0EBD }
function isToneMark(cp: number): boolean { return cp >= 0x0EC8 && cp <= 0x0ECB }
function isOtherDiacritic(cp: number): boolean { return cp === 0x0ECC || cp === 0x0ECD }
function isTrailingVowel(cp: number): boolean {
  return cp === 0x0EB0 || cp === 0x0EB2 || cp === 0x0EB3
}

export function isLaoCodePoint(cp: number): boolean {
  return cp >= 0x0E80 && cp <= 0x0EFF
}

/**
 * Returns the number of JS string characters consumed by the next Lao Grapheme
 * Cluster starting at `pos` in `text`.
 *
 * For non-Lao code points, returns the size of that single code point (1 or 2
 * for surrogate pairs, though Lao characters are all in the BMP so pairs never
 * occur within the Lao block itself).
 *
 * Returns 0 when `pos` is at or beyond the end of `text`.
 */
export function nextLGCLength(text: string, pos: number): number {
  if (pos >= text.length) return 0

  const cp = text.codePointAt(pos)!
  const cpLen = cp > 0xffff ? 2 : 1

  if (!isLaoCodePoint(cp)) return cpLen

  let end = pos

  // 1. Optional leading vowel followed by a consonant
  if (isLeadingVowel(cp)) {
    end += cpLen
    if (end >= text.length) return end - pos
    const nextCp = text.codePointAt(end)!
    if (!isConsonant(nextCp)) return end - pos // standalone leading vowel (malformed)
    end += nextCp > 0xffff ? 2 : 1
  } else if (isConsonant(cp)) {
    end += cpLen
  } else {
    // Some other Lao char without a preceding consonant (digit, diacritic, etc.)
    return cpLen
  }

  // 2. Optional subjoined consonant (ຼ or ຽ)
  if (end < text.length) {
    const c = text.codePointAt(end)!
    if (isSubjoined(c)) end += c > 0xffff ? 2 : 1
  }

  // 3. Optional above vowel
  if (end < text.length) {
    const c = text.codePointAt(end)!
    if (isAboveVowel(c)) end += c > 0xffff ? 2 : 1
  }

  // 4. Optional below vowel
  if (end < text.length) {
    const c = text.codePointAt(end)!
    if (isBelowVowel(c)) end += c > 0xffff ? 2 : 1
  }

  // 5. Optional tone mark
  if (end < text.length) {
    const c = text.codePointAt(end)!
    if (isToneMark(c)) end += c > 0xffff ? 2 : 1
  }

  // 6. Optional cancellation mark / niggahita
  if (end < text.length) {
    const c = text.codePointAt(end)!
    if (isOtherDiacritic(c)) end += c > 0xffff ? 2 : 1
  }

  // 7. Optional trailing vowel (ະ, າ, ຳ)
  if (end < text.length) {
    const c = text.codePointAt(end)!
    if (isTrailingVowel(c)) end += c > 0xffff ? 2 : 1
  }

  return end - pos
}

/**
 * Split `text` into an array of Lao Grapheme Clusters (and non-Lao codepoints).
 * This is a low-level utility; prefer `segment()` for word-level splitting.
 */
export function splitLGC(text: string): string[] {
  const result: string[] = []
  let pos = 0
  while (pos < text.length) {
    const len = nextLGCLength(text, pos)
    if (len === 0) break
    result.push(text.slice(pos, pos + len))
    pos += len
  }
  return result
}
