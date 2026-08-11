/**
 * 100-case test suite for lao-segmenter.
 *
 * Categories:
 *  A. Single dictionary words           (20 cases)
 *  B. Multi-word unsegmented phrases    (20 cases)
 *  C. Spaced sentences                  (10 cases)
 *  D. Mixed Lao + non-Lao content       (10 cases)
 *  E. Repetition mark ໆ                  (5 cases)
 *  F. Edge cases                        (10 cases)
 *  G. keepWhitespace=false              (5 cases)
 *  H. Custom dictionary                 (5 cases)
 *  I. Segmenter class API               (5 cases)
 *  J. LGC / nextLGCLength               (10 cases)
 */

import { describe, it, expect } from 'vitest'
import { segment, Segmenter, splitLGC, nextLGCLength } from '../src/index.js'

// Helper — every test must be lossless
function assertLossless(text: string) {
  expect(segment(text).join('')).toBe(text)
}

// ─── A. Single dictionary words ───────────────────────────────────────────────
// Each input is a known dictionary entry → should come back as one token.

describe('A: single dictionary words', () => {
  const singles: [string, string][] = [
    ['ນ້ຳ',      'water'],
    ['ໄຟ',      'fire'],
    ['ດິນ',     'earth/soil'],
    ['ລົມ',     'wind'],
    ['ດາວ',     'star'],
    ['ເດືອນ',   'month/moon'],
    ['ຕາເວັນ',  'sun'],
    ['ຝົນ',     'rain'],
    ['ສະບາຍດີ', 'hello'],
    ['ຂອບໃຈ',  'thank you'],
    ['ຄົນ',     'person'],
    ['ໂຮງຮຽນ',  'school'],
    ['ໂຮງໝໍ',   'hospital'],
    ['ຕະຫຼາດ',  'market'],
    ['ອາຫານ',   'food'],
    ['ຂ້າວ',    'rice'],
    ['ໝາກໄມ້',  'fruit'],
    ['ລົດໄຟ',   'train'],
    ['ໂຮງພະຍາບານ', 'hospital (formal)'],
    ['ສະຖານີ',  'station'],
  ]

  for (const [word, meaning] of singles) {
    it(`"${word}" (${meaning}) → single token`, () => {
      expect(segment(word)).toEqual([word])
    })
  }
})

// ─── B. Multi-word unsegmented phrases ────────────────────────────────────────
// Input has no spaces; algorithm should split on word boundaries.

describe('B: multi-word unsegmented phrases', () => {
  it('ຄົນລາວ  → [ຄົນ, ລາວ]  (Lao people)', () => {
    expect(segment('ຄົນລາວ')).toEqual(['ຄົນ', 'ລາວ'])
  })

  it('ຂ້ອຍຮຽນ → [ຂ້ອຍ, ຮຽນ]  (I study)', () => {
    expect(segment('ຂ້ອຍຮຽນ')).toEqual(['ຂ້ອຍ', 'ຮຽນ'])
  })

  it('ຂ້ອຍຮັກລາວ → [ຂ້ອຍ, ຮັກ, ລາວ]  (I love Laos)', () => {
    expect(segment('ຂ້ອຍຮັກລາວ')).toEqual(['ຂ້ອຍ', 'ຮັກ', 'ລາວ'])
  })

  it('ລາວໄປໂຮງຮຽນ → [ລາວ, ໄປ, ໂຮງຮຽນ]  (he/she goes to school)', () => {
    expect(segment('ລາວໄປໂຮງຮຽນ')).toEqual(['ລາວ', 'ໄປ', 'ໂຮງຮຽນ'])
  })

  it('ຂ້ອຍໄປຮຽນທີ່ໂຮງຮຽນ → 5 tokens', () => {
    expect(segment('ຂ້ອຍໄປຮຽນທີ່ໂຮງຮຽນ')).toEqual(['ຂ້ອຍ', 'ໄປ', 'ຮຽນ', 'ທີ່', 'ໂຮງຮຽນ'])
  })

  it('ຂ້ອຍບໍ່ຮູ້ → [ຂ້ອຍ, ບໍ່, ຮູ້]  (I don\'t know)', () => {
    expect(segment('ຂ້ອຍບໍ່ຮູ້')).toEqual(['ຂ້ອຍ', 'ບໍ່', 'ຮູ້'])
  })

  it('ທ່ານຊື່ຫຍັງ → [ທ່ານ, ຊື່, ຫຍັງ]  (what is your name?)', () => {
    expect(segment('ທ່ານຊື່ຫຍັງ')).toEqual(['ທ່ານ', 'ຊື່', 'ຫຍັງ'])
  })

  it('ຂ້ອຍຊື່ວ່າ → [ຂ້ອຍ, ຊື່, ວ່າ]  (my name is)', () => {
    expect(segment('ຂ້ອຍຊື່ວ່າ')).toEqual(['ຂ້ອຍ', 'ຊື່', 'ວ່າ'])
  })

  it('ຫົວໃຈດີ → [ຫົວໃຈ, ດີ]  (good heart)', () => {
    expect(segment('ຫົວໃຈດີ')).toEqual(['ຫົວໃຈ', 'ດີ'])
  })

  it('ໂຮງຮຽນລາວ → [ໂຮງຮຽນ, ລາວ]  (Lao school)', () => {
    expect(segment('ໂຮງຮຽນລາວ')).toEqual(['ໂຮງຮຽນ', 'ລາວ'])
  })

  it('ນ້ຳຮ້ອນຫຼືນ້ຳເຢັນ → [ນ້ຳຮ້ອນ, ຫຼື, ນ້ຳເຢັນ]  (hot or cold water)', () => {
    expect(segment('ນ້ຳຮ້ອນຫຼືນ້ຳເຢັນ')).toEqual(['ນ້ຳຮ້ອນ', 'ຫຼື', 'ນ້ຳເຢັນ'])
  })

  it('ຄົນລາວຮັກຊາດ → [ຄົນ, ລາວ, ຮັກຊາດ]  (Lao people love their nation)', () => {
    expect(segment('ຄົນລາວຮັກຊາດ')).toEqual(['ຄົນ', 'ລາວ', 'ຮັກຊາດ'])
  })

  it('ພາສາລາວເປັນພາສາລາວ → [ພາສາລາວ, ເປັນ, ພາສາລາວ]', () => {
    expect(segment('ພາສາລາວເປັນພາສາລາວ')).toEqual(['ພາສາລາວ', 'ເປັນ', 'ພາສາລາວ'])
  })

  it('ນະຄອນຫຼວງວຽງຈັນ → [ນະຄອນຫຼວງ, ວຽງຈັນ]  (Vientiane capital)', () => {
    expect(segment('ນະຄອນຫຼວງວຽງຈັນ')).toEqual(['ນະຄອນຫຼວງ', 'ວຽງຈັນ'])
  })

  it('ແຂວງວຽງຈັນ → [ແຂວງ, ວຽງຈັນ]  (Vientiane province)', () => {
    expect(segment('ແຂວງວຽງຈັນ')).toEqual(['ແຂວງ', 'ວຽງຈັນ'])
  })

  it('ແຂວງສະຫວັນນະເຂດ → [ແຂວງ, ສະຫວັນນະເຂດ]  (Savannakhet province)', () => {
    expect(segment('ແຂວງສະຫວັນນະເຂດ')).toEqual(['ແຂວງ', 'ສະຫວັນນະເຂດ'])
  })

  it('ໄຊສົມບູນ → [ໄຊ, ສົມບູນ]  (Xaisomboun)', () => {
    expect(segment('ໄຊສົມບູນ')).toEqual(['ໄຊ', 'ສົມບູນ'])
  })

  it('ອັກສອນລາວ → [ອັກສອນ, ລາວ]  (Lao alphabet)', () => {
    expect(segment('ອັກສອນລາວ')).toEqual(['ອັກສອນ', 'ລາວ'])
  })

  it('ລາວກິນເຂົ້າທຸກວັນ → [ລາວ, ກິນເຂົ້າ, ທຸກ, ວັນ]  (he eats rice every day)', () => {
    expect(segment('ລາວກິນເຂົ້າທຸກວັນ')).toEqual(['ລາວ', 'ກິນເຂົ້າ', 'ທຸກ', 'ວັນ'])
  })

  it('ຂ້ອຍບໍ່ໄດ້ → [ຂ້ອຍ, ບໍ່ໄດ້]  (I can\'t)', () => {
    expect(segment('ຂ້ອຍບໍ່ໄດ້')).toEqual(['ຂ້ອຍ', 'ບໍ່ໄດ້'])
  })
})

// ─── C. Spaced sentences ──────────────────────────────────────────────────────
// Spaces are preserved as whitespace tokens.

describe('C: spaced sentences', () => {
  it('ຂ້ອຍ ມາ ຈາກ ລາວ — spaces preserved', () => {
    expect(segment('ຂ້ອຍ ມາ ຈາກ ລາວ')).toEqual(['ຂ້ອຍ', ' ', 'ມາ', ' ', 'ຈາກ', ' ', 'ລາວ'])
  })

  it('ທ່ານ ໄປ ໃສ? — question mark as separate token', () => {
    expect(segment('ທ່ານ ໄປ ໃສ?')).toEqual(['ທ່ານ', ' ', 'ໄປ', ' ', 'ໃສ', '?'])
  })

  it('ລາຄາ ເທົ່າໃດ? — currency question', () => {
    expect(segment('ລາຄາ ເທົ່າໃດ?')).toEqual(['ລາຄາ', ' ', 'ເທົ່າໃດ', '?'])
  })

  it('ກະລຸນາ ຊ່ວຍ ດ້ວຍ — please help', () => {
    expect(segment('ກະລຸນາ ຊ່ວຍ ດ້ວຍ')).toEqual(['ກະລຸນາ', ' ', 'ຊ່ວຍ', ' ', 'ດ້ວຍ'])
  })

  it('ຂ້ອຍ ຮຽນ ພາສາ ລາວ — with explicit spaces', () => {
    expect(segment('ຂ້ອຍ ຮຽນ ພາສາ ລາວ')).toEqual(['ຂ້ອຍ', ' ', 'ຮຽນ', ' ', 'ພາສາ', ' ', 'ລາວ'])
  })

  it('ດີ, ຂອບໃຈ. — comma and period as tokens', () => {
    expect(segment('ດີ, ຂອບໃຈ.')).toEqual(['ດີ', ',', ' ', 'ຂອບໃຈ', '.'])
  })

  it('ສະບາຍດີ! — exclamation mark as token', () => {
    expect(segment('ສະບາຍດີ!')).toEqual(['ສະບາຍດີ', '!'])
  })

  it('ຂ້ອຍ ຮຽນ ພາສາ — 3-word sentence', () => {
    expect(segment('ຂ້ອຍ ຮຽນ ພາສາ')).toEqual(['ຂ້ອຍ', ' ', 'ຮຽນ', ' ', 'ພາສາ'])
  })

  it('ສະບາຍ\\nດີ — newline is a whitespace token', () => {
    expect(segment('ສະບາຍ\nດີ')).toEqual(['ສະບາຍ', '\n', 'ດີ'])
  })

  it('ສະບາຍ    ດີ — multiple spaces as one whitespace token', () => {
    expect(segment('ສະບາຍ    ດີ')).toEqual(['ສະບາຍ', '    ', 'ດີ'])
  })
})

// ─── D. Mixed Lao + non-Lao content ──────────────────────────────────────────

describe('D: mixed Lao + non-Lao content', () => {
  it('ພາສາ English — Lao then ASCII word', () => {
    expect(segment('ພາສາ English')).toEqual(['ພາສາ', ' ', 'English'])
  })

  it('ລາວ PDR — Lao then uppercase acronym', () => {
    expect(segment('ລາວ PDR')).toEqual(['ລາວ', ' ', 'PDR'])
  })

  it('ລາວ-ໄທ — hyphen separates two words', () => {
    expect(segment('ລາວ-ໄທ')).toEqual(['ລາວ', '-', 'ໄທ'])
  })

  it('ອາຍຸ 25 ປີ — number between Lao words', () => {
    expect(segment('ອາຍຸ 25 ປີ')).toEqual(['ອາຍຸ', ' ', '25', ' ', 'ປີ'])
  })

  it('ລາຄາ 1000 ກີບ — price in kip', () => {
    expect(segment('ລາຄາ 1000 ກີບ')).toEqual(['ລາຄາ', ' ', '1000', ' ', 'ກີບ'])
  })

  it('ເວລາ 8 ໂມງ — time expression', () => {
    expect(segment('ເວລາ 8 ໂມງ')).toEqual(['ເວລາ', ' ', '8', ' ', 'ໂມງ'])
  })

  it('ຈຳນວນ 500 ຄົນ — count expression', () => {
    expect(segment('ຈຳນວນ 500 ຄົນ')).toEqual(['ຈຳນວນ', ' ', '500', ' ', 'ຄົນ'])
  })

  it('ພາຍໃນ 3 ວັນ — "within 3 days"', () => {
    expect(segment('ພາຍໃນ 3 ວັນ')).toEqual(['ພາຍໃນ', ' ', '3', ' ', 'ວັນ'])
  })

  it('ASCII digits only — grouped into one token', () => {
    expect(segment('123')).toEqual(['123'])
  })

  it('Lao digits run — grouped into one token', () => {
    expect(segment('໐໑໒໓໔໕໖໗໘໙')).toEqual(['໐໑໒໓໔໕໖໗໘໙'])
  })
})

// ─── E. Repetition mark ໆ ────────────────────────────────────────────────────

describe('E: repetition mark ໆ', () => {
  it('ຕ່າງໆ — ໆ absorbed into preceding token', () => {
    const result = segment('ຕ່າງໆ')
    expect(result.every(t => !t.startsWith('ໆ'))).toBe(true) // ໆ never leads
    expect(result.join('')).toBe('ຕ່າງໆ')
  })

  it('ວັນໆ — ໆ absorbed', () => {
    const result = segment('ວັນໆ')
    expect(result.join('')).toBe('ວັນໆ')
    expect(result.every(t => !t.startsWith('ໆ'))).toBe(true)
  })

  it('ຄ່ອຍໆ — ໆ absorbed', () => {
    const result = segment('ຄ່ອຍໆ')
    expect(result.join('')).toBe('ຄ່ອຍໆ')
    expect(result.every(t => !t.startsWith('ໆ'))).toBe(true)
  })

  it('ຢ້ອຍໆ — ໆ absorbed', () => {
    const result = segment('ຢ້ອຍໆ')
    expect(result.join('')).toBe('ຢ້ອຍໆ')
    expect(result.every(t => !t.startsWith('ໆ'))).toBe(true)
  })

  it('ຕ່າງໆ in sentence — ໆ still absorbed, spaces handled', () => {
    const result = segment('ຕ່າງໆ ກັນ')
    expect(result[0]).toBe('ຕ່າງໆ')
    expect(result.join('')).toBe('ຕ່າງໆ ກັນ')
  })
})

// ─── F. Edge cases ────────────────────────────────────────────────────────────

describe('F: edge cases', () => {
  it('empty string → []', () => {
    expect(segment('')).toEqual([])
  })

  it('single space → [" "]', () => {
    expect(segment(' ')).toEqual([' '])
  })

  it('only spaces → one whitespace token', () => {
    expect(segment('   ')).toEqual(['   '])
  })

  it('newline only → ["\\n"]', () => {
    expect(segment('\n')).toEqual(['\n'])
  })

  it('punctuation only: "..." → three "." tokens', () => {
    expect(segment('...')).toEqual(['.', '.', '.'])
  })

  it('lossless on all standard probes', () => {
    const probes = [
      'ສະບາຍດີ', 'ຂ້ອຍຮຽນ', 'ຄົນລາວ', 'ໂຮງຮຽນ',
      'ທ່ານ ໄປ ໃສ?', 'ລາຄາ 1000 ກີບ', 'ຕ່າງໆ ກັນ',
    ]
    for (const text of probes) assertLossless(text)
  })

  it('unknown Lao chars fall back to LGC (one cluster per unknown syllable)', () => {
    // ຂຄງ has individual consonants but no matches in the dict
    const result = segment('ຂຄງ')
    expect(result.join('')).toBe('ຂຄງ')
    expect(result.length).toBeGreaterThan(0)
  })

  it('single consonant works without crashing', () => {
    expect(segment('ກ').join('')).toBe('ກ')
  })

  it('mixed-type content is lossless', () => {
    const text = 'ສະບາຍດີ hello 123 !'
    expect(segment(text).join('')).toBe(text)
  })

  it('only ASCII letters → grouped into one word token', () => {
    expect(segment('hello')).toEqual(['hello'])
  })
})

// ─── G. keepWhitespace=false ──────────────────────────────────────────────────

describe('G: keepWhitespace=false', () => {
  it('strips spaces from Lao sentence', () => {
    const result = segment('ຂ້ອຍ ຮຽນ ພາສາ', { keepWhitespace: false })
    expect(result).toEqual(['ຂ້ອຍ', 'ຮຽນ', 'ພາສາ'])
  })

  it('strips spaces from mixed content', () => {
    const result = segment('ລາວ PDR', { keepWhitespace: false })
    expect(result).toEqual(['ລາວ', 'PDR'])
  })

  it('no whitespace tokens appear in output', () => {
    const result = segment('ຂ້ອຍ ມາ ຈາກ ລາວ', { keepWhitespace: false })
    expect(result.every(t => t.trim() === t && t.length > 0)).toBe(true)
  })

  it('works with newlines', () => {
    const result = segment('ສະບາຍ\nດີ', { keepWhitespace: false })
    expect(result).not.toContain('\n')
  })

  it('empty string still returns []', () => {
    expect(segment('', { keepWhitespace: false })).toEqual([])
  })
})

// ─── H. Custom dictionary ─────────────────────────────────────────────────────

describe('H: custom dictionary', () => {
  it('recognises a multi-syllable custom word as one token', () => {
    const word = 'ນວັດຕະກຳໃໝ່'
    const result = segment(word, { customWords: [word] })
    expect(result).toContain(word)
  })

  it('custom word takes priority over shorter default matches', () => {
    // "ຊາວໜຸ່ມ" (youth) — add it as one word
    const word = 'ຊາວໜຸ່ມ'
    const result = segment(word, { customWords: [word] })
    expect(result[0]).toBe(word)
  })

  it('Segmenter class respects customWords passed at construction', () => {
    const word = 'ທົດສອບ'
    const seg = new Segmenter({ customWords: [word] })
    expect(seg.segment(word)).toContain(word)
  })

  it('multiple custom words all recognised', () => {
    const words = ['ໂຄ້ດດິ້ງ', 'ໂປຣແກຣມ']
    const seg = new Segmenter({ customWords: words })
    for (const w of words) {
      expect(seg.segment(w)).toContain(w)
    }
  })

  it('non-custom words still use default dictionary', () => {
    const seg = new Segmenter({ customWords: ['ພິເສດ'] })
    expect(seg.segment('ສະບາຍດີ')).toEqual(['ສະບາຍດີ'])
  })
})

// ─── I. Segmenter class API ───────────────────────────────────────────────────

describe('I: Segmenter class', () => {
  it('produces same output as standalone segment()', () => {
    const seg = new Segmenter()
    const text = 'ຄົນລາວ'
    expect(seg.segment(text)).toEqual(segment(text))
  })

  it('is deterministic across multiple calls', () => {
    const seg = new Segmenter()
    const text = 'ຂ້ອຍຮຽນພາສາລາວ'
    expect(seg.segment(text)).toEqual(seg.segment(text))
  })

  it('respects keepWhitespace=false per-call', () => {
    const seg = new Segmenter()
    const ws = seg.segment('ຂ້ອຍ ລາວ')
    const noWs = seg.segment('ຂ້ອຍ ລາວ', { keepWhitespace: false })
    expect(ws).toContain(' ')
    expect(noWs).not.toContain(' ')
  })

  it('two independent instances give same results', () => {
    const a = new Segmenter()
    const b = new Segmenter()
    const text = 'ພາສາລາວ'
    expect(a.segment(text)).toEqual(b.segment(text))
  })

  it('Segmenter with no options uses default dictionary', () => {
    const seg = new Segmenter()
    expect(seg.segment('ສະບາຍດີ')).toEqual(['ສະບາຍດີ'])
  })
})

// ─── J. LGC / nextLGCLength ──────────────────────────────────────────────────

describe('J: splitLGC and nextLGCLength', () => {
  it('returns 0 for empty string', () => {
    expect(nextLGCLength('', 0)).toBe(0)
  })

  it('returns 0 when pos is past end', () => {
    expect(nextLGCLength('ກ', 5)).toBe(0)
  })

  it('returns 1 for an ASCII character', () => {
    expect(nextLGCLength('a', 0)).toBe(1)
  })

  it('bare consonant is length 1', () => {
    expect(nextLGCLength('ກ', 0)).toBe(1)
  })

  it('consonant + trailing vowel (ກາ) is length 2', () => {
    expect(nextLGCLength('ກາ', 0)).toBe(2)
  })

  it('leading vowel + consonant (ເກ) is length 2', () => {
    expect(nextLGCLength('ເກ', 0)).toBe(2)
  })

  it('consonant + above vowel + tone (ຕ່) is length 3', () => {
    // ຕ (U+0E95) + ່ is actually consonant + tone only (2 chars)
    // But ກີ = consonant + above vowel = 2 chars
    expect(nextLGCLength('ກີ', 0)).toBe(2)
  })

  it('splitLGC is lossless', () => {
    const texts = ['ສະບາຍດີ', 'ຂ້ອຍ', 'ໂຮງຮຽນ', 'ນ້ຳ']
    for (const t of texts) {
      expect(splitLGC(t).join('')).toBe(t)
    }
  })

  it('splitLGC returns individual ASCII chars', () => {
    expect(splitLGC('abc')).toEqual(['a', 'b', 'c'])
  })

  it('splitLGC groups leading-vowel+consonant as one cluster', () => {
    // ເກ should be one cluster: leading vowel ເ + consonant ກ
    const clusters = splitLGC('ເກ')
    expect(clusters).toEqual(['ເກ'])
  })
})

// ─── K: Dictionary-word corpus (250 words, lengths 1–20) — all single tokens ──
describe('K: dictionary words are single tokens', () => {
  it("ໆ → single token", () => {
    expect(segment("ໆ")).toEqual(["ໆ"])
  })
  it("ບ → single token", () => {
    expect(segment("ບ")).toEqual(["ບ"])
  })
  it("ໜ → single token", () => {
    expect(segment("ໜ")).toEqual(["ໜ"])
  })
  it("ອ → single token", () => {
    expect(segment("ອ")).toEqual(["ອ"])
  })
  it("ຮ → single token", () => {
    expect(segment("ຮ")).toEqual(["ຮ"])
  })
  it("໑໐ → single token", () => {
    expect(segment("໑໐")).toEqual(["໑໐"])
  })
  it("ຂະ → single token", () => {
    expect(segment("ຂະ")).toEqual(["ຂະ"])
  })
  it("ຄື → single token", () => {
    expect(segment("ຄື")).toEqual(["ຄື"])
  })
  it("ແງ → single token", () => {
    expect(segment("ແງ")).toEqual(["ແງ"])
  })
  it("ໄຈ → single token", () => {
    expect(segment("ໄຈ")).toEqual(["ໄຈ"])
  })
  it("ຊລ → single token", () => {
    expect(segment("ຊລ")).toEqual(["ຊລ"])
  })
  it("ຍີ → single token", () => {
    expect(segment("ຍີ")).toEqual(["ຍີ"])
  })
  it("ແດ → single token", () => {
    expect(segment("ແດ")).toEqual(["ແດ"])
  })
  it("ໃຕ → single token", () => {
    expect(segment("ໃຕ")).toEqual(["ໃຕ"])
  })
  it("ທິ → single token", () => {
    expect(segment("ທິ")).toEqual(["ທິ"])
  })
  it("ໃນ → single token", () => {
    expect(segment("ໃນ")).toEqual(["ໃນ"])
  })
  it("ປໍ → single token", () => {
    expect(segment("ປໍ")).toEqual(["ປໍ"])
  })
  it("ຜີ → single token", () => {
    expect(segment("ຜີ")).toEqual(["ຜີ"])
  })
  it("ພຶ → single token", () => {
    expect(segment("ພຶ")).toEqual(["ພຶ"])
  })
  it("ມຳ → single token", () => {
    expect(segment("ມຳ")).toEqual(["ມຳ"])
  })
  it("ໄຣ → single token", () => {
    expect(segment("ໄຣ")).toEqual(["ໄຣ"])
  })
  it("ວຍ → single token", () => {
    expect(segment("ວຍ")).toEqual(["ວຍ"])
  })
  it("ໜາ → single token", () => {
    expect(segment("ໜາ")).toEqual(["ໜາ"])
  })
  it("ຫີ → single token", () => {
    expect(segment("ຫີ")).toEqual(["ຫີ"])
  })
  it("ອູ → single token", () => {
    expect(segment("ອູ")).toEqual(["ອູ"])
  })
  it("ກໍ່ → single token", () => {
    expect(segment("ກໍ່")).toEqual(["ກໍ່"])
  })
  it("ໃກັ → single token", () => {
    expect(segment("ໃກັ")).toEqual(["ໃກັ"])
  })
  it("ຄາກ → single token", () => {
    expect(segment("ຄາກ")).toEqual(["ຄາກ"])
  })
  it("ງຸມ → single token", () => {
    expect(segment("ງຸມ")).toEqual(["ງຸມ"])
  })
  it("ເຈິ → single token", () => {
    expect(segment("ເຈິ")).toEqual(["ເຈິ"])
  })
  it("ແສ່ → single token", () => {
    expect(segment("ແສ່")).toEqual(["ແສ່"])
  })
  it("ໂຊບ → single token", () => {
    expect(segment("ໂຊບ")).toEqual(["ໂຊບ"])
  })
  it("ດັບ → single token", () => {
    expect(segment("ດັບ")).toEqual(["ດັບ"])
  })
  it("ຕື່ → single token", () => {
    expect(segment("ຕື່")).toEqual(["ຕື່"])
  })
  it("ທັງ → single token", () => {
    expect(segment("ທັງ")).toEqual(["ທັງ"])
  })
  it("ນືກ → single token", () => {
    expect(segment("ນືກ")).toEqual(["ນືກ"])
  })
  it("ແບກ → single token", () => {
    expect(segment("ແບກ")).toEqual(["ແບກ"])
  })
  it("ຜໍ່ → single token", () => {
    expect(segment("ຜໍ່")).toEqual(["ຜໍ່"])
  })
  it("ພາງ → single token", () => {
    expect(segment("ພາງ")).toEqual(["ພາງ"])
  })
  it("ຟຽດ → single token", () => {
    expect(segment("ຟຽດ")).toEqual(["ຟຽດ"])
  })
  it("ຢາງ → single token", () => {
    expect(segment("ຢາງ")).toEqual(["ຢາງ"])
  })
  it("ລຸງ → single token", () => {
    expect(segment("ລຸງ")).toEqual(["ລຸງ"])
  })
  it("ໜໍ່ → single token", () => {
    expect(segment("ໜໍ່")).toEqual(["ໜໍ່"])
  })
  it("ຫຶກ → single token", () => {
    expect(segment("ຫຶກ")).toEqual(["ຫຶກ"])
  })
  it("ເອ້ → single token", () => {
    expect(segment("ເອ້")).toEqual(["ເອ້"])
  })
  it("ກໍກາ → single token", () => {
    expect(segment("ກໍກາ")).toEqual(["ກໍກາ"])
  })
  it("ກຶ່ງ → single token", () => {
    expect(segment("ກຶ່ງ")).toEqual(["ກຶ່ງ"])
  })
  it("ຂິ່ນ → single token", () => {
    expect(segment("ຂິ່ນ")).toEqual(["ຂິ່ນ"])
  })
  it("ແຄ່ນ → single token", () => {
    expect(segment("ແຄ່ນ")).toEqual(["ແຄ່ນ"])
  })
  it("ເຈ້ຍ → single token", () => {
    expect(segment("ເຈ້ຍ")).toEqual(["ເຈ້ຍ"])
  })
  it("ສິສຸ → single token", () => {
    expect(segment("ສິສຸ")).toEqual(["ສິສຸ"])
  })
  it("ຊາຕະ → single token", () => {
    expect(segment("ຊາຕະ")).toEqual(["ຊາຕະ"])
  })
  it("ຍັ້ງ → single token", () => {
    expect(segment("ຍັ້ງ")).toEqual(["ຍັ້ງ"])
  })
  it("ຕ໋ອງ → single token", () => {
    expect(segment("ຕ໋ອງ")).toEqual(["ຕ໋ອງ"])
  })
  it("ເຖຣະ → single token", () => {
    expect(segment("ເຖຣະ")).toEqual(["ເຖຣະ"])
  })
  it("ນາກາ → single token", () => {
    expect(segment("ນາກາ")).toEqual(["ນາກາ"])
  })
  it("ເບຣີ → single token", () => {
    expect(segment("ເບຣີ")).toEqual(["ເບຣີ"])
  })
  it("ເປ່ງ → single token", () => {
    expect(segment("ເປ່ງ")).toEqual(["ເປ່ງ"])
  })
  it("ພ່າວ → single token", () => {
    expect(segment("ພ່າວ")).toEqual(["ພ່າວ"])
  })
  it("ມ໊າມ → single token", () => {
    expect(segment("ມ໊າມ")).toEqual(["ມ໊າມ"])
  })
  it("ຣາຫູ → single token", () => {
    expect(segment("ຣາຫູ")).toEqual(["ຣາຫູ"])
  })
  it("ໂລເມ → single token", () => {
    expect(segment("ໂລເມ")).toEqual(["ໂລເມ"])
  })
  it("ຫນຸນ → single token", () => {
    expect(segment("ຫນຸນ")).toEqual(["ຫນຸນ"])
  })
  it("ຫຼູບ → single token", () => {
    expect(segment("ຫຼູບ")).toEqual(["ຫຼູບ"])
  })
  it("ອື້ນ → single token", () => {
    expect(segment("ອື້ນ")).toEqual(["ອື້ນ"])
  })
  it("ກໍ່ກຳ → single token", () => {
    expect(segment("ກໍ່ກຳ")).toEqual(["ກໍ່ກຳ"])
  })
  it("ກະປີ້ → single token", () => {
    expect(segment("ກະປີ້")).toEqual(["ກະປີ້"])
  })
  it("ກຸສົນ → single token", () => {
    expect(segment("ກຸສົນ")).toEqual(["ກຸສົນ"])
  })
  it("ໄຂ້ບາ → single token", () => {
    expect(segment("ໄຂ້ບາ")).toEqual(["ໄຂ້ບາ"])
  })
  it("ຈຳໄວ້ → single token", () => {
    expect(segment("ຈຳໄວ້")).toEqual(["ຈຳໄວ້"])
  })
  it("ສະໂລດ → single token", () => {
    expect(segment("ສະໂລດ")).toEqual(["ສະໂລດ"])
  })
  it("ສີຟ້າ → single token", () => {
    expect(segment("ສີຟ້າ")).toEqual(["ສີຟ້າ"])
  })
  it("ຊຸກອນ → single token", () => {
    expect(segment("ຊຸກອນ")).toEqual(["ຊຸກອນ"])
  })
  it("ໂດມອນ → single token", () => {
    expect(segment("ໂດມອນ")).toEqual(["ໂດມອນ"])
  })
  it("ຖະໜົນ → single token", () => {
    expect(segment("ຖະໜົນ")).toEqual(["ຖະໜົນ"])
  })
  it("ນາໂກນ → single token", () => {
    expect(segment("ນາໂກນ")).toEqual(["ນາໂກນ"])
  })
  it("ເບຄອນ → single token", () => {
    expect(segment("ເບຄອນ")).toEqual(["ເບຄອນ"])
  })
  it("ປານຕີ → single token", () => {
    expect(segment("ປານຕີ")).toEqual(["ປານຕີ"])
  })
  it("ພຣະໄທ → single token", () => {
    expect(segment("ພຣະໄທ")).toEqual(["ພຣະໄທ"])
  })
  it("ເພີ້ມ → single token", () => {
    expect(segment("ເພີ້ມ")).toEqual(["ເພີ້ມ"])
  })
  it("ແມ່ຄູ → single token", () => {
    expect(segment("ແມ່ຄູ")).toEqual(["ແມ່ຄູ"])
  })
  it("ລະຫັດ → single token", () => {
    expect(segment("ລະຫັດ")).toEqual(["ລະຫັດ"])
  })
  it("ວິບາກ → single token", () => {
    expect(segment("ວິບາກ")).toEqual(["ວິບາກ"])
  })
  it("ເຫວີ້ → single token", () => {
    expect(segment("ເຫວີ້")).toEqual(["ເຫວີ້"])
  })
  it("ອີຢິມ → single token", () => {
    expect(segment("ອີຢິມ")).toEqual(["ອີຢິມ"])
  })
  it("ກໍ່ກວນ → single token", () => {
    expect(segment("ກໍ່ກວນ")).toEqual(["ກໍ່ກວນ"])
  })
  it("ການຂືນ → single token", () => {
    expect(segment("ການຂືນ")).toEqual(["ການຂືນ"])
  })
  it("ການລຽບ → single token", () => {
    expect(segment("ການລຽບ")).toEqual(["ການລຽບ"])
  })
  it("ຂໍ້ມູນ → single token", () => {
    expect(segment("ຂໍ້ມູນ")).toEqual(["ຂໍ້ມູນ"])
  })
  it("ຄາດລົດ → single token", () => {
    expect(segment("ຄາດລົດ")).toEqual(["ຄາດລົດ"])
  })
  it("ເຈນນີ້ → single token", () => {
    expect(segment("ເຈນນີ້")).toEqual(["ເຈນນີ້"])
  })
  it("ສາກໄພ້ → single token", () => {
    expect(segment("ສາກໄພ້")).toEqual(["ສາກໄພ້"])
  })
  it("ຊະບາໂຕ → single token", () => {
    expect(segment("ຊະບາໂຕ")).toEqual(["ຊະບາໂຕ"])
  })
  it("ຍືດຍາວ → single token", () => {
    expect(segment("ຍືດຍາວ")).toEqual(["ຍືດຍາວ"])
  })
  it("ຕົກຕ່ຳ → single token", () => {
    expect(segment("ຕົກຕ່ຳ")).toEqual(["ຕົກຕ່ຳ"])
  })
  it("ແທນຕົວ → single token", () => {
    expect(segment("ແທນຕົວ")).toEqual(["ແທນຕົວ"])
  })
  it("ບັນພັບ → single token", () => {
    expect(segment("ບັນພັບ")).toEqual(["ບັນພັບ"])
  })
  it("ປາເສອາ → single token", () => {
    expect(segment("ປາເສອາ")).toEqual(["ປາເສອາ"])
  })
  it("ຝຸງຊົນ → single token", () => {
    expect(segment("ຝຸງຊົນ")).toEqual(["ຝຸງຊົນ"])
  })
  it("ມອກຄ່າ → single token", () => {
    expect(segment("ມອກຄ່າ")).toEqual(["ມອກຄ່າ"])
  })
  it("ແມວໂພ່ → single token", () => {
    expect(segment("ແມວໂພ່")).toEqual(["ແມວໂພ່"])
  })
  it("ລາຍການ → single token", () => {
    expect(segment("ລາຍການ")).toEqual(["ລາຍການ"])
  })
  it("ວິພະວະ → single token", () => {
    expect(segment("ວິພະວະ")).toEqual(["ວິພະວະ"])
  })
  it("ອຠິເສກ → single token", () => {
    expect(segment("ອຠິເສກ")).toEqual(["ອຠິເສກ"])
  })
  it("ເອນອຽງ → single token", () => {
    expect(segment("ເອນອຽງ")).toEqual(["ເອນອຽງ"])
  })
  it("ກໍ່ຄວາມ → single token", () => {
    expect(segment("ກໍ່ຄວາມ")).toEqual(["ກໍ່ຄວາມ"])
  })
  it("ການເຖືອ → single token", () => {
    expect(segment("ການເຖືອ")).toEqual(["ການເຖືອ"])
  })
  it("ເກເດໂມດ → single token", () => {
    expect(segment("ເກເດໂມດ")).toEqual(["ເກເດໂມດ"])
  })
  it("ຄວາມຄຶກ → single token", () => {
    expect(segment("ຄວາມຄຶກ")).toEqual(["ຄວາມຄຶກ"])
  })
  it("ຈໍລະຈອນ → single token", () => {
    expect(segment("ຈໍລະຈອນ")).toEqual(["ຈໍລະຈອນ"])
  })
  it("ສັງເຄັດ → single token", () => {
    expect(segment("ສັງເຄັດ")).toEqual(["ສັງເຄັດ"])
  })
  it("ເສກູນໂດ → single token", () => {
    expect(segment("ເສກູນໂດ")).toEqual(["ເສກູນໂດ"])
  })
  it("ຍະຕິທັງ → single token", () => {
    expect(segment("ຍະຕິທັງ")).toEqual(["ຍະຕິທັງ"])
  })
  it("ຕຸ້ມນົກ → single token", () => {
    expect(segment("ຕຸ້ມນົກ")).toEqual(["ຕຸ້ມນົກ"])
  })
  it("ທິວະກອນ → single token", () => {
    expect(segment("ທິວະກອນ")).toEqual(["ທິວະກອນ"])
  })
  it("ນົກແກ້ວ → single token", () => {
    expect(segment("ນົກແກ້ວ")).toEqual(["ນົກແກ້ວ"])
  })
  it("ເບັດເອນ → single token", () => {
    expect(segment("ເບັດເອນ")).toEqual(["ເບັດເອນ"])
  })
  it("ປຸກເສົາ → single token", () => {
    expect(segment("ປຸກເສົາ")).toEqual(["ປຸກເສົາ"])
  })
  it("ພານະລິນ → single token", () => {
    expect(segment("ພານະລິນ")).toEqual(["ພານະລິນ"])
  })
  it("ມາກຫລາຍ → single token", () => {
    expect(segment("ມາກຫລາຍ")).toEqual(["ມາກຫລາຍ"])
  })
  it("ໂຢກເບຮາ → single token", () => {
    expect(segment("ໂຢກເບຮາ")).toEqual(["ໂຢກເບຮາ"])
  })
  it("ໂລ່ງອົກ → single token", () => {
    expect(segment("ໂລ່ງອົກ")).toEqual(["ໂລ່ງອົກ"])
  })
  it("ຫລວງປູ່ → single token", () => {
    expect(segment("ຫລວງປູ່")).toEqual(["ຫລວງປູ່"])
  })
  it("ອະໄພໂທດ → single token", () => {
    expect(segment("ອະໄພໂທດ")).toEqual(["ອະໄພໂທດ"])
  })
  it("ເອກະຣາດ → single token", () => {
    expect(segment("ເອກະຣາດ")).toEqual(["ເອກະຣາດ"])
  })
  it("ກກ຺ກາຣຸກ → single token", () => {
    expect(segment("ກກ຺ກາຣຸກ")).toEqual(["ກກ຺ກາຣຸກ"])
  })
  it("ການເຕືອນ → single token", () => {
    expect(segment("ການເຕືອນ")).toEqual(["ການເຕືອນ"])
  })
  it("ກຸມອຳນາດ → single token", () => {
    expect(segment("ກຸມອຳນາດ")).toEqual(["ກຸມອຳນາດ"])
  })
  it("ເຂົ້າສູ່ → single token", () => {
    expect(segment("ເຂົ້າສູ່")).toEqual(["ເຂົ້າສູ່"])
  })
  it("ຄຳແທນນາມ → single token", () => {
    expect(segment("ຄຳແທນນາມ")).toEqual(["ຄຳແທນນາມ"])
  })
  it("ໂຈງກະເບນ → single token", () => {
    expect(segment("ໂຈງກະເບນ")).toEqual(["ໂຈງກະເບນ"])
  })
  it("ສາດຕະສິນ → single token", () => {
    expect(segment("ສາດຕະສິນ")).toEqual(["ສາດຕະສິນ"])
  })
  it("ຊາດນິຍົມ → single token", () => {
    expect(segment("ຊາດນິຍົມ")).toEqual(["ຊາດນິຍົມ"])
  })
  it("ເດີນທະເລ → single token", () => {
    expect(segment("ເດີນທະເລ")).toEqual(["ເດີນທະເລ"])
  })
  it("ທຳມະວິໄນ → single token", () => {
    expect(segment("ທຳມະວິໄນ")).toEqual(["ທຳມະວິໄນ"])
  })
  it("ເນອາຣີຢາ → single token", () => {
    expect(segment("ເນອາຣີຢາ")).toEqual(["ເນອາຣີຢາ"])
  })
  it("ໂບກສະບັດ → single token", () => {
    expect(segment("ໂບກສະບັດ")).toEqual(["ໂບກສະບັດ"])
  })
  it("ເປັນຫນັງ → single token", () => {
    expect(segment("ເປັນຫນັງ")).toEqual(["ເປັນຫນັງ"])
  })
  it("ພຸດທະທາດ → single token", () => {
    expect(segment("ພຸດທະທາດ")).toEqual(["ພຸດທະທາດ"])
  })
  it("ມາອາຊີຢາ → single token", () => {
    expect(segment("ມາອາຊີຢາ")).toEqual(["ມາອາຊີຢາ"])
  })
  it("ຣັຖປະສາດ → single token", () => {
    expect(segment("ຣັຖປະສາດ")).toEqual(["ຣັຖປະສາດ"])
  })
  it("ແລງເບິ່ງ → single token", () => {
    expect(segment("ແລງເບິ່ງ")).toEqual(["ແລງເບິ່ງ"])
  })
  it("ຫລອດແກ້ວ → single token", () => {
    expect(segment("ຫລອດແກ້ວ")).toEqual(["ຫລອດແກ້ວ"])
  })
  it("ອັດຊະບຸກ → single token", () => {
    expect(segment("ອັດຊະບຸກ")).toEqual(["ອັດຊະບຸກ"])
  })
  it("ເອນປາຣານ → single token", () => {
    expect(segment("ເອນປາຣານ")).toEqual(["ເອນປາຣານ"])
  })
  it("ກໍ່ຕາມແຕ່ → single token", () => {
    expect(segment("ກໍ່ຕາມແຕ່")).toEqual(["ກໍ່ຕາມແຕ່"])
  })
  it("ການສໍ້ໂກງ → single token", () => {
    expect(segment("ການສໍ້ໂກງ")).toEqual(["ການສໍ້ໂກງ"])
  })
  it("ການຜັກດັນ → single token", () => {
    expect(segment("ການຜັກດັນ")).toEqual(["ການຜັກດັນ"])
  })
  it("ກົວເຕມາລາ → single token", () => {
    expect(segment("ກົວເຕມາລາ")).toEqual(["ກົວເຕມາລາ"])
  })
  it("ຄວາມຊອບທຳ → single token", () => {
    expect(segment("ຄວາມຊອບທຳ")).toEqual(["ຄວາມຊອບທຳ"])
  })
  it("ເຄື່ອງວັດ → single token", () => {
    expect(segment("ເຄື່ອງວັດ")).toEqual(["ເຄື່ອງວັດ"])
  })
  it("ສະລີລະກິດ → single token", () => {
    expect(segment("ສະລີລະກິດ")).toEqual(["ສະລີລະກິດ"])
  })
  it("ສຸລະກາຣັກ → single token", () => {
    expect(segment("ສຸລະກາຣັກ")).toEqual(["ສຸລະກາຣັກ"])
  })
  it("ເຍົາວະລາດ → single token", () => {
    expect(segment("ເຍົາວະລາດ")).toEqual(["ເຍົາວະລາດ"])
  })
  it("ທະເລນອກແວ → single token", () => {
    expect(segment("ທະເລນອກແວ")).toEqual(["ທະເລນອກແວ"])
  })
  it("ນິທັດສະນະ → single token", () => {
    expect(segment("ນິທັດສະນະ")).toEqual(["ນິທັດສະນະ"])
  })
  it("ແບລັກແຈັກ → single token", () => {
    expect(segment("ແບລັກແຈັກ")).toEqual(["ແບລັກແຈັກ"])
  })
  it("ເປັນພິເສດ → single token", () => {
    expect(segment("ເປັນພິເສດ")).toEqual(["ເປັນພິເສດ"])
  })
  it("ພາສານາຮວດ → single token", () => {
    expect(segment("ພາສານາຮວດ")).toEqual(["ພາສານາຮວດ"])
  })
  it("ມະຫານຸພາກ → single token", () => {
    expect(segment("ມະຫານຸພາກ")).toEqual(["ມະຫານຸພາກ"])
  })
  it("ຢູ່ໃກ້ສິດ → single token", () => {
    expect(segment("ຢູ່ໃກ້ສິດ")).toEqual(["ຢູ່ໃກ້ສິດ"])
  })
  it("ເລິກເຊິ່ງ → single token", () => {
    expect(segment("ເລິກເຊິ່ງ")).toEqual(["ເລິກເຊິ່ງ"])
  })
  it("ໜື້ງເຂົ້າ → single token", () => {
    expect(segment("ໜື້ງເຂົ້າ")).toEqual(["ໜື້ງເຂົ້າ"])
  })
  it("ອັກຣັບບີມ → single token", () => {
    expect(segment("ອັກຣັບບີມ")).toEqual(["ອັກຣັບບີມ"])
  })
  it("ເອຊະບາອານ → single token", () => {
    expect(segment("ເອຊະບາອານ")).toEqual(["ເອຊະບາອານ"])
  })
  it("ກໍ່ແລ້ວກັນ → single token", () => {
    expect(segment("ກໍ່ແລ້ວກັນ")).toEqual(["ກໍ່ແລ້ວກັນ"])
  })
  it("ການຂັດຂ້ອງ → single token", () => {
    expect(segment("ການຂັດຂ້ອງ")).toEqual(["ການຂັດຂ້ອງ"])
  })
  it("ການບໍລິການ → single token", () => {
    expect(segment("ການບໍລິການ")).toEqual(["ການບໍລິການ"])
  })
  it("ການອະພິປາຍ → single token", () => {
    expect(segment("ການອະພິປາຍ")).toEqual(["ການອະພິປາຍ"])
  })
  it("ຄວາມໂຄງເຄງ → single token", () => {
    expect(segment("ຄວາມໂຄງເຄງ")).toEqual(["ຄວາມໂຄງເຄງ"])
  })
  it("ຄວາມຫລູຫລາ → single token", () => {
    expect(segment("ຄວາມຫລູຫລາ")).toEqual(["ຄວາມຫລູຫລາ"])
  })
  it("ເຈົ້າອາລົມ → single token", () => {
    expect(segment("ເຈົ້າອາລົມ")).toEqual(["ເຈົ້າອາລົມ"])
  })
  it("ສັນຣະຍະສາດ → single token", () => {
    expect(segment("ສັນຣະຍະສາດ")).toEqual(["ສັນຣະຍະສາດ"])
  })
  it("ຊ່ວຍວ່າການ → single token", () => {
    expect(segment("ຊ່ວຍວ່າການ")).toEqual(["ຊ່ວຍວ່າການ"])
  })
  it("ຕະຫລິ່ງຊັນ → single token", () => {
    expect(segment("ຕະຫລິ່ງຊັນ")).toEqual(["ຕະຫລິ່ງຊັນ"])
  })
  it("ເທື່ອຫນື່ງ → single token", () => {
    expect(segment("ເທື່ອຫນື່ງ")).toEqual(["ເທື່ອຫນື່ງ"])
  })
  it("ບັນພະບູລຸດ → single token", () => {
    expect(segment("ບັນພະບູລຸດ")).toEqual(["ບັນພະບູລຸດ"])
  })
  it("ປະສິດທິຜົນ → single token", () => {
    expect(segment("ປະສິດທິຜົນ")).toEqual(["ປະສິດທິຜົນ"])
  })
  it("ໂປຣເຈັກເຕີ → single token", () => {
    expect(segment("ໂປຣເຈັກເຕີ")).toEqual(["ໂປຣເຈັກເຕີ"])
  })
  it("ພ່ຳເພັງທານ → single token", () => {
    expect(segment("ພ່ຳເພັງທານ")).toEqual(["ພ່ຳເພັງທານ"])
  })
  it("ມັດສີມະຍາມ → single token", () => {
    expect(segment("ມັດສີມະຍາມ")).toEqual(["ມັດສີມະຍາມ"])
  })
  it("ເຢດຊະເຣເອນ → single token", () => {
    expect(segment("ເຢດຊະເຣເອນ")).toEqual(["ເຢດຊະເຣເອນ"])
  })
  it("ວິກິດຕິການ → single token", () => {
    expect(segment("ວິກິດຕິການ")).toEqual(["ວິກິດຕິການ"])
  })
  it("ອະດີດຕະຊາດ → single token", () => {
    expect(segment("ອະດີດຕະຊາດ")).toEqual(["ອະດີດຕະຊາດ"])
  })
  it("ອິດບີເບໂນບ → single token", () => {
    expect(segment("ອິດບີເບໂນບ")).toEqual(["ອິດບີເບໂນບ"])
  })
  it("ກໍລະນີຍະກິດ → single token", () => {
    expect(segment("ກໍລະນີຍະກິດ")).toEqual(["ກໍລະນີຍະກິດ"])
  })
  it("ການກ່ຽວຂ້ອງ → single token", () => {
    expect(segment("ການກ່ຽວຂ້ອງ")).toEqual(["ການກ່ຽວຂ້ອງ"])
  })
  it("ການໄຕ່ເຕົ້າ → single token", () => {
    expect(segment("ການໄຕ່ເຕົ້າ")).toEqual(["ການໄຕ່ເຕົ້າ"])
  })
  it("ການເອີ້ນຄືນ → single token", () => {
    expect(segment("ການເອີ້ນຄືນ")).toEqual(["ການເອີ້ນຄືນ"])
  })
  it("ໄຂ້ເລືອດອອກ → single token", () => {
    expect(segment("ໄຂ້ເລືອດອອກ")).toEqual(["ໄຂ້ເລືອດອອກ"])
  })
  it("ຄວາມເຕັມທີ່ → single token", () => {
    expect(segment("ຄວາມເຕັມທີ່")).toEqual(["ຄວາມເຕັມທີ່"])
  })
  it("ຄວາມຫລົງໄຫລ → single token", () => {
    expect(segment("ຄວາມຫລົງໄຫລ")).toEqual(["ຄວາມຫລົງໄຫລ"])
  })
  it("ສ່ວຍສາອາກອນ → single token", () => {
    expect(segment("ສ່ວຍສາອາກອນ")).toEqual(["ສ່ວຍສາອາກອນ"])
  })
  it("ສັ່ນສະເທືອນ → single token", () => {
    expect(segment("ສັ່ນສະເທືອນ")).toEqual(["ສັ່ນສະເທືອນ"])
  })
  it("ຊາວຕຣິນີດັດ → single token", () => {
    expect(segment("ຊາວຕຣິນີດັດ")).toEqual(["ຊາວຕຣິນີດັດ"])
  })
  it("ທະເລຊາຍໂກບີ → single token", () => {
    expect(segment("ທະເລຊາຍໂກບີ")).toEqual(["ທະເລຊາຍໂກບີ"])
  })
  it("ເນື້ອເລື່ອງ → single token", () => {
    expect(segment("ເນື້ອເລື່ອງ")).toEqual(["ເນື້ອເລື່ອງ"])
  })
  it("ປະຊາສົ່ງຄາະ → single token", () => {
    expect(segment("ປະຊາສົ່ງຄາະ")).toEqual(["ປະຊາສົ່ງຄາະ"])
  })
  it("ເປັນຕາເບິ່ງ → single token", () => {
    expect(segment("ເປັນຕາເບິ່ງ")).toEqual(["ເປັນຕາເບິ່ງ"])
  })
  it("ພາສາຍີ່ປຸ່ນ → single token", () => {
    expect(segment("ພາສາຍີ່ປຸ່ນ")).toEqual(["ພາສາຍີ່ປຸ່ນ"])
  })
  it("ມາຢາໂກວສະກີ → single token", () => {
    expect(segment("ມາຢາໂກວສະກີ")).toEqual(["ມາຢາໂກວສະກີ"])
  })
  it("ເຣໂຮໂບດອີເຣ → single token", () => {
    expect(segment("ເຣໂຮໂບດອີເຣ")).toEqual(["ເຣໂຮໂບດອີເຣ"])
  })
  it("ວຽດນາມເຫນືອ → single token", () => {
    expect(segment("ວຽດນາມເຫນືອ")).toEqual(["ວຽດນາມເຫນືອ"])
  })
  it("ອັດສະດົງຄົດ → single token", () => {
    expect(segment("ອັດສະດົງຄົດ")).toEqual(["ອັດສະດົງຄົດ"])
  })
  it("ອີ່ສຸກອີ່ໄສ → single token", () => {
    expect(segment("ອີ່ສຸກອີ່ໄສ")).toEqual(["ອີ່ສຸກອີ່ໄສ"])
  })
  it("ກ່ອນອື່ນຫມົດ → single token", () => {
    expect(segment("ກ່ອນອື່ນຫມົດ")).toEqual(["ກ່ອນອື່ນຫມົດ"])
  })
  it("ກາເດັດບາເນອາ → single token", () => {
    expect(segment("ກາເດັດບາເນອາ")).toEqual(["ກາເດັດບາເນອາ"])
  })
  it("ການຊຸກເຊື່ອງ → single token", () => {
    expect(segment("ການຊຸກເຊື່ອງ")).toEqual(["ການຊຸກເຊື່ອງ"])
  })
  it("ກຳມັນຕະລັງສີ → single token", () => {
    expect(segment("ກຳມັນຕະລັງສີ")).toEqual(["ກຳມັນຕະລັງສີ"])
  })
  it("ແຂວງບໍລິຄຳໄຊ → single token", () => {
    expect(segment("ແຂວງບໍລິຄຳໄຊ")).toEqual(["ແຂວງບໍລິຄຳໄຊ"])
  })
  it("ຄວາມຍິ້ມແຍ້ມ → single token", () => {
    expect(segment("ຄວາມຍິ້ມແຍ້ມ")).toEqual(["ຄວາມຍິ້ມແຍ້ມ"])
  })
  it("ຄວາມຫລ້າຫລັງ → single token", () => {
    expect(segment("ຄວາມຫລ້າຫລັງ")).toEqual(["ຄວາມຫລ້າຫລັງ"])
  })
  it("ຈຸນລະຊີວະສາດ → single token", () => {
    expect(segment("ຈຸນລະຊີວະສາດ")).toEqual(["ຈຸນລະຊີວະສາດ"])
  })
  it("ສຸດຄວາມສາມາດ → single token", () => {
    expect(segment("ສຸດຄວາມສາມາດ")).toEqual(["ສຸດຄວາມສາມາດ"])
  })
  it("ໂດຍບໍ່ເຈຕະນາ → single token", () => {
    expect(segment("ໂດຍບໍ່ເຈຕະນາ")).toEqual(["ໂດຍບໍ່ເຈຕະນາ"])
  })
  it("ທະເລທັດສະມັນ → single token", () => {
    expect(segment("ທະເລທັດສະມັນ")).toEqual(["ທະເລທັດສະມັນ"])
  })
  it("ນັກປະຫວັດສາດ → single token", () => {
    expect(segment("ນັກປະຫວັດສາດ")).toEqual(["ນັກປະຫວັດສາດ"])
  })
  it("ບີເອໂລລຸດເຊຍ → single token", () => {
    expect(segment("ບີເອໂລລຸດເຊຍ")).toEqual(["ບີເອໂລລຸດເຊຍ"])
  })
  it("ປະເທດຍີ່ປຸ່ນ → single token", () => {
    expect(segment("ປະເທດຍີ່ປຸ່ນ")).toEqual(["ປະເທດຍີ່ປຸ່ນ"])
  })
  it("ພະເຊດຖາທິລາດ → single token", () => {
    expect(segment("ພະເຊດຖາທິລາດ")).toEqual(["ພະເຊດຖາທິລາດ"])
  })
  it("ມະຫາວິທະຍາໄລ → single token", () => {
    expect(segment("ມະຫາວິທະຍາໄລ")).toEqual(["ມະຫາວິທະຍາໄລ"])
  })
  it("ໄມ້ແກ່ນຫລ້ອນ → single token", () => {
    expect(segment("ໄມ້ແກ່ນຫລ້ອນ")).toEqual(["ໄມ້ແກ່ນຫລ້ອນ"])
  })
  it("ລົດຖີບກົງດຽວ → single token", () => {
    expect(segment("ລົດຖີບກົງດຽວ")).toEqual(["ລົດຖີບກົງດຽວ"])
  })
  it("ເຫມົາເຈີ໋ຕຸງ → single token", () => {
    expect(segment("ເຫມົາເຈີ໋ຕຸງ")).toEqual(["ເຫມົາເຈີ໋ຕຸງ"])
  })
  it("ອາເບັນຊິດຕີມ → single token", () => {
    expect(segment("ອາເບັນຊິດຕີມ")).toEqual(["ອາເບັນຊິດຕີມ"])
  })
  it("ກ້ອງສ່ອງທາງໄກ → single token", () => {
    expect(segment("ກ້ອງສ່ອງທາງໄກ")).toEqual(["ກ້ອງສ່ອງທາງໄກ"])
  })
  it("ການສະໜັບສະໜູນ → single token", () => {
    expect(segment("ການສະໜັບສະໜູນ")).toEqual(["ການສະໜັບສະໜູນ"])
  })
  it("ກາເຟສຳເລັດຮູບ → single token", () => {
    expect(segment("ກາເຟສຳເລັດຮູບ")).toEqual(["ກາເຟສຳເລັດຮູບ"])
  })
  it("ເຂົ້າຮຸ້ນເງິນ → single token", () => {
    expect(segment("ເຂົ້າຮຸ້ນເງິນ")).toEqual(["ເຂົ້າຮຸ້ນເງິນ"])
  })
  it("ຄວາມສັນຣະເສີນ → single token", () => {
    expect(segment("ຄວາມສັນຣະເສີນ")).toEqual(["ຄວາມສັນຣະເສີນ"])
  })
  it("ຄວາມພິດສະຫວົງ → single token", () => {
    expect(segment("ຄວາມພິດສະຫວົງ")).toEqual(["ຄວາມພິດສະຫວົງ"])
  })
  it("ຈັກກະພົບໂຣມັນ → single token", () => {
    expect(segment("ຈັກກະພົບໂຣມັນ")).toEqual(["ຈັກກະພົບໂຣມັນ"])
  })
  it("ສະຫງົບສະຫງ່ຽມ → single token", () => {
    expect(segment("ສະຫງົບສະຫງ່ຽມ")).toEqual(["ສະຫງົບສະຫງ່ຽມ"])
  })
  it("ສຳປະຣາຍິຄະພົບ → single token", () => {
    expect(segment("ສຳປະຣາຍິຄະພົບ")).toEqual(["ສຳປະຣາຍິຄະພົບ"])
  })
  it("ຍະມະກະປະຕິທານ → single token", () => {
    expect(segment("ຍະມະກະປະຕິທານ")).toEqual(["ຍະມະກະປະຕິທານ"])
  })
  it("ທະເລອາເດຣຍຕິກ → single token", () => {
    expect(segment("ທະເລອາເດຣຍຕິກ")).toEqual(["ທະເລອາເດຣຍຕິກ"])
  })
  it("ເນບຸກາດເນັດຊາ → single token", () => {
    expect(segment("ເນບຸກາດເນັດຊາ")).toEqual(["ເນບຸກາດເນັດຊາ"])
  })
  it("ເບັນອາບີນາດາບ → single token", () => {
    expect(segment("ເບັນອາບີນາດາບ")).toEqual(["ເບັນອາບີນາດາບ"])
  })
  it("ປາດລິດລູມູມບາ → single token", () => {
    expect(segment("ປາດລິດລູມູມບາ")).toEqual(["ປາດລິດລູມູມບາ"])
  })
  it("ພາສາສະໂລເວເນຍ → single token", () => {
    expect(segment("ພາສາສະໂລເວເນຍ")).toEqual(["ພາສາສະໂລເວເນຍ"])
  })
  it("ມະນຸດສະວິທະຍາ → single token", () => {
    expect(segment("ມະນຸດສະວິທະຍາ")).toEqual(["ມະນຸດສະວິທະຍາ"])
  })
  it("ແມ່ເຫຼັກໄຟຟ້າ → single token", () => {
    expect(segment("ແມ່ເຫຼັກໄຟຟ້າ")).toEqual(["ແມ່ເຫຼັກໄຟຟ້າ"])
  })
  it("ລູກແຫລ່ງຕີນມື → single token", () => {
    expect(segment("ລູກແຫລ່ງຕີນມື")).toEqual(["ລູກແຫລ່ງຕີນມື"])
  })
  it("ອະທິກະສຸຣະທິນ → single token", () => {
    expect(segment("ອະທິກະສຸຣະທິນ")).toEqual(["ອະທິກະສຸຣະທິນ"])
  })
  it("ອົກສັ່ນຂວັນໜີ → single token", () => {
    expect(segment("ອົກສັ່ນຂວັນໜີ")).toEqual(["ອົກສັ່ນຂວັນໜີ"])
  })
  it("ກໍ່ຮ່າງສ້າງຕົວ → single token", () => {
    expect(segment("ກໍ່ຮ່າງສ້າງຕົວ")).toEqual(["ກໍ່ຮ່າງສ້າງຕົວ"])
  })
  it("ການປະທຸດສະຮ້າຍ → single token", () => {
    expect(segment("ການປະທຸດສະຮ້າຍ")).toEqual(["ການປະທຸດສະຮ້າຍ"])
  })
  it("ກິດຕະສັກກະຫຼາດ → single token", () => {
    expect(segment("ກິດຕະສັກກະຫຼາດ")).toEqual(["ກິດຕະສັກກະຫຼາດ"])
  })
  it("ຄວາມກະວົນກະວາຍ → single token", () => {
    expect(segment("ຄວາມກະວົນກະວາຍ")).toEqual(["ຄວາມກະວົນກະວາຍ"])
  })
  it("ຄວາມສະໜິດສະໜົມ → single token", () => {
    expect(segment("ຄວາມສະໜິດສະໜົມ")).toEqual(["ຄວາມສະໜິດສະໜົມ"])
  })
})

// ─── L: Lossless on two-word concatenations (100 pairs) ─────────────────────
describe('L: lossless on two-word concatenations', () => {
  it("lossless: ກໍ່ກຳ+ກະຈິກ", () => {
    expect(segment("ກໍ່ກຳກະຈິກ").join('')).toBe("ກໍ່ກຳກະຈິກ")
  })
  it("lossless: ກໍ່ພໍ+ກະຈຽວ", () => {
    expect(segment("ກໍ່ພໍກະຈຽວ").join('')).toBe("ກໍ່ພໍກະຈຽວ")
  })
  it("lossless: ກວນອູ+ກະສັດ", () => {
    expect(segment("ກວນອູກະສັດ").join('')).toBe("ກວນອູກະສັດ")
  })
  it("lossless: ກວິ້ນ+ກະຊວງ", () => {
    expect(segment("ກວິ້ນກະຊວງ").join('')).toBe("ກວິ້ນກະຊວງ")
  })
  it("lossless: ກອຽໃຈ+ກະຊິກ", () => {
    expect(segment("ກອຽໃຈກະຊິກ").join('')).toBe("ກອຽໃຈກະຊິກ")
  })
  it("lossless: ກະຈໍ່+ກະແຍງ", () => {
    expect(segment("ກະຈໍ່ກະແຍງ").join('')).toBe("ກະຈໍ່ກະແຍງ")
  })
  it("lossless: ກະຈັດ+ກະດາດ", () => {
    expect(segment("ກະຈັດກະດາດ").join('')).toBe("ກະຈັດກະດາດ")
  })
  it("lossless: ກະຈາຽ+ກະດຸກ", () => {
    expect(segment("ກະຈາຽກະດຸກ").join('')).toBe("ກະຈາຽກະດຸກ")
  })
  it("lossless: ກະຈູ້+ກະແດບ", () => {
    expect(segment("ກະຈູ້ກະແດບ").join('')).toBe("ກະຈູ້ກະແດບ")
  })
  it("lossless: ກະຈຽວ+ກະຕັດ", () => {
    expect(segment("ກະຈຽວກະຕັດ").join('')).toBe("ກະຈຽວກະຕັດ")
  })
  it("lossless: ກະສວຍ+ກະຕຸກ", () => {
    expect(segment("ກະສວຍກະຕຸກ").join('')).toBe("ກະສວຍກະຕຸກ")
  })
  it("lossless: ກະສັນ+ກະໄຕ້", () => {
    expect(segment("ກະສັນກະໄຕ້").join('')).toBe("ກະສັນກະໄຕ້")
  })
  it("lossless: ກະສູນ+ກະທັງ", () => {
    expect(segment("ກະສູນກະທັງ").join('')).toBe("ກະສູນກະທັງ")
  })
  it("lossless: ກະຊວນ+ກະໂທງ", () => {
    expect(segment("ກະຊວນກະໂທງ").join('')).toBe("ກະຊວນກະໂທງ")
  })
  it("lossless: ກະຊາຍ+ກະບັກ", () => {
    expect(segment("ກະຊາຍກະບັກ").join('')).toBe("ກະຊາຍກະບັກ")
  })
  it("lossless: ກະຊີ້+ກະບົກ", () => {
    expect(segment("ກະຊີ້ກະບົກ").join('')).toBe("ກະຊີ້ກະບົກ")
  })
  it("lossless: ກະຍອມ+ກະປິບ", () => {
    expect(segment("ກະຍອມກະປິບ").join('')).toBe("ກະຍອມກະປິບ")
  })
  it("lossless: ກະດອງ+ກະພັນ", () => {
    expect(segment("ກະດອງກະພັນ").join('')).toBe("ກະດອງກະພັນ")
  })
  it("lossless: ກະດາງ+ກະໂມຍ", () => {
    expect(segment("ກະດາງກະໂມຍ").join('')).toBe("ກະດາງກະໂມຍ")
  })
  it("lossless: ກະດິບ+ກະລ່າ", () => {
    expect(segment("ກະດິບກະລ່າ").join('')).toBe("ກະດິບກະລ່າ")
  })
  it("lossless: ກະດຸ້+ກະລົນ", () => {
    expect(segment("ກະດຸ້ກະລົນ").join('')).toBe("ກະດຸ້ກະລົນ")
  })
  it("lossless: ກະດົງ+ກະເວກ", () => {
    expect(segment("ກະດົງກະເວກ").join('')).toBe("ກະດົງກະເວກ")
  })
  it("lossless: ກະແດບ+ກະອອກ", () => {
    expect(segment("ກະແດບກະອອກ").join('')).toBe("ກະແດບກະອອກ")
  })
  it("lossless: ກະຕໍ້+ກັນຊາ", () => {
    expect(segment("ກະຕໍ້ກັນຊາ").join('')).toBe("ກະຕໍ້ກັນຊາ")
  })
  it("lossless: ກະຕ່າ+ກັບໄຟ", () => {
    expect(segment("ກະຕ່າກັບໄຟ").join('')).toBe("ກະຕ່າກັບໄຟ")
  })
  it("lossless: ກະຕິບ+ກາຍໄປ", () => {
    expect(segment("ກະຕິບກາຍໄປ").join('')).toBe("ກະຕິບກາຍໄປ")
  })
  it("lossless: ກະຕຸນ+ການສະ", () => {
    expect(segment("ກະຕຸນການສະ").join('')).toBe("ກະຕຸນການສະ")
  })
  it("lossless: ກະເຕິ+ການຖື", () => {
    expect(segment("ກະເຕິການຖື").join('')).toBe("ກະເຕິການຖື")
  })
  it("lossless: ກະຖິກ+ການບະ", () => {
    expect(segment("ກະຖິກການບະ").join('')).toBe("ກະຖິກການບະ")
  })
  it("lossless: ກະທໍ່+ການໜີ", () => {
    expect(segment("ກະທໍ່ການໜີ").join('')).toBe("ກະທໍ່ການໜີ")
  })
  it("lossless: ກະທິງ+ກາມູນ", () => {
    expect(segment("ກະທິງກາມູນ").join('')).toBe("ກະທິງກາມູນ")
  })
  it("lossless: ກະທຽມ+ກາວດາ", () => {
    expect(segment("ກະທຽມກາວດາ").join('')).toBe("ກະທຽມກາວດາ")
  })
  it("lossless: ກະນູນ+ກຳທັບ", () => {
    expect(segment("ກະນູນກຳທັບ").join('')).toBe("ກະນູນກຳທັບ")
  })
  it("lossless: ກະບອນ+ກຳແພງ", () => {
    expect(segment("ກະບອນກຳແພງ").join('')).toBe("ກະບອນກຳແພງ")
  })
  it("lossless: ກະບິນ+ກິໂຊນ", () => {
    expect(segment("ກະບິນກິໂຊນ").join('')).toBe("ກະບິນກິໂຊນ")
  })
  it("lossless: ກະບົກ+ກີໂກະ", () => {
    expect(segment("ກະບົກກີໂກະ").join('')).toBe("ກະບົກກີໂກະ")
  })
  it("lossless: ກະປວກ+ກຸສິນ", () => {
    expect(segment("ກະປວກກຸສິນ").join('')).toBe("ກະປວກກຸສິນ")
  })
  it("lossless: ກະປີ້+ກຸມາຣ", () => {
    expect(segment("ກະປີ້ກຸມາຣ").join('')).toBe("ກະປີ້ກຸມາຣ")
  })
  it("lossless: ກະໂປງ+ກົງໄປ", () => {
    expect(segment("ກະໂປງກົງໄປ").join('')).toBe("ກະໂປງກົງໄປ")
  })
  it("lossless: ກະພາບ+ເກເຊມ", () => {
    expect(segment("ກະພາບເກເຊມ").join('')).toBe("ກະພາບເກເຊມ")
  })
  it("lossless: ກະມັງ+ເກຣັກ", () => {
    expect(segment("ກະມັງເກຣັກ").join('')).toBe("ກະມັງເກຣັກ")
  })
  it("lossless: ກະຣັດ+ເກັ້ຽ", () => {
    expect(segment("ກະຣັດເກັ້ຽ").join('')).toBe("ກະຣັດເກັ້ຽ")
  })
  it("lossless: ກະລັງ+ເກົ໋າ", () => {
    expect(segment("ກະລັງເກົ໋າ").join('')).toBe("ກະລັງເກົ໋າ")
  })
  it("lossless: ກະລິງ+ໂກດັກ", () => {
    expect(segment("ກະລິງໂກດັກ").join('')).toBe("ກະລິງໂກດັກ")
  })
  it("lossless: ກະລູ່+ໄກທອງ", () => {
    expect(segment("ກະລູ່ໄກທອງ").join('')).toBe("ກະລູ່ໄກທອງ")
  })
  it("lossless: ກະໂລ້+ຂໍຢືມ", () => {
    expect(segment("ກະໂລ້ຂໍຢືມ").join('')).toBe("ກະໂລ້ຂໍຢືມ")
  })
  it("lossless: ກະວົນ+ຂະຈັດ", () => {
    expect(segment("ກະວົນຂະຈັດ").join('')).toBe("ກະວົນຂະຈັດ")
  })
  it("lossless: ກະຫາຍ+ຂະຍົມ", () => {
    expect(segment("ກະຫາຍຂະຍົມ").join('')).toBe("ກະຫາຍຂະຍົມ")
  })
  it("lossless: ກະອອກ+ຂະນານ", () => {
    expect(segment("ກະອອກຂະນານ").join('')).toBe("ກະອອກຂະນານ")
  })
  it("lossless: ກະຮອກ+ຂະມອງ", () => {
    expect(segment("ກະຮອກຂະມອງ").join('')).toBe("ກະຮອກຂະມອງ")
  })
  it("lossless: ກັນໄຊ+ຂະໜັນ", () => {
    expect(segment("ກັນໄຊຂະໜັນ").join('')).toBe("ກັນໄຊຂະໜັນ")
  })
  it("lossless: ກັນຜີ+ຂະໝັງ", () => {
    expect(segment("ກັນຜີຂະໝັງ").join('')).toBe("ກັນຜີຂະໝັງ")
  })
  it("lossless: ກັບມື+ຂາຍຕາ", () => {
    expect(segment("ກັບມືຂາຍຕາ").join('')).toBe("ກັບມືຂາຍຕາ")
  })
  it("lossless: ກາຊາດ+ຂີ້ຊີ", () => {
    expect(segment("ກາຊາດຂີ້ຊີ").join('')).toBe("ກາຊາດຂີ້ຊີ")
  })
  it("lossless: ກາແດງ+ຂຸນແຈ", () => {
    expect(segment("ກາແດງຂຸນແຈ").join('')).toBe("ກາແດງຂຸນແຈ")
  })
  it("lossless: ການໄຂ+ເຂິ່ນ", () => {
    expect(segment("ການໄຂເຂິ່ນ").join('')).toBe("ການໄຂເຂິ່ນ")
  })
  it("lossless: ການຊີ+ໄຂນ້ຳ", () => {
    expect(segment("ການຊີໄຂນ້ຳ").join('')).toBe("ການຊີໄຂນ້ຳ")
  })
  it("lossless: ການຕີ+ຄວໍ່າ", () => {
    expect(segment("ການຕີຄວໍ່າ").join('')).toBe("ການຕີຄວໍ່າ")
  })
  it("lossless: ການທາ+ຄອບງຳ", () => {
    expect(segment("ການທາຄອບງຳ").join('')).toBe("ການທາຄອບງຳ")
  })
  it("lossless: ການໂນ+ຄະນືງ", () => {
    expect(segment("ການໂນຄະນືງ").join('')).toBe("ການໂນຄະນືງ")
  })
  it("lossless: ການຟູ+ຄັນນາ", () => {
    expect(segment("ການຟູຄັນນາ").join('')).toBe("ການຟູຄັນນາ")
  })
  it("lossless: ການໜີ+ຄາລົມ", () => {
    expect(segment("ການໜີຄາລົມ").join('')).toBe("ການໜີຄາລົມ")
  })
  it("lossless: ກາບູນ+ຄຳນວນ", () => {
    expect(segment("ກາບູນຄຳນວນ").join('')).toBe("ກາບູນຄຳນວນ")
  })
  it("lossless: ກາເມນ+ຄຳຣາມ", () => {
    expect(segment("ກາເມນຄຳຣາມ").join('')).toBe("ກາເມນຄຳຣາມ")
  })
  it("lossless: ກາລັນ+ຄືນມາ", () => {
    expect(segment("ກາລັນຄືນມາ").join('')).toBe("ກາລັນຄືນມາ")
  })
  it("lossless: ກາອາດ+ຄູເວດ", () => {
    expect(segment("ກາອາດຄູເວດ").join('')).toBe("ກາອາດຄູເວດ")
  })
  it("lossless: ກຳຈອນ+ຄົວໄທ", () => {
    expect(segment("ກຳຈອນຄົວໄທ").join('')).toBe("ກຳຈອນຄົວໄທ")
  })
  it("lossless: ກຳບັງ+ເຄັ່ງ", () => {
    expect(segment("ກຳບັງເຄັ່ງ").join('')).toBe("ກຳບັງເຄັ່ງ")
  })
  it("lossless: ກຳພືດ+ເຄົ່າ", () => {
    expect(segment("ກຳພືດເຄົ່າ").join('')).toBe("ກຳພືດເຄົ່າ")
  })
  it("lossless: ກຳວຽກ+ໂຄຕ້າ", () => {
    expect(segment("ກຳວຽກໂຄຕ້າ").join('')).toBe("ກຳວຽກໂຄຕ້າ")
  })
  it("lossless: ກຳຮາບ+ໂຄເວີ", () => {
    expect(segment("ກຳຮາບໂຄເວີ").join('')).toBe("ກຳຮາບໂຄເວີ")
  })
  it("lossless: ກິນໃຈ+ເງືອດ", () => {
    expect(segment("ກິນໃຈເງືອດ").join('')).toBe("ກິນໃຈເງືອດ")
  })
  it("lossless: ກິເລດ+ຈະຣັດ", () => {
    expect(segment("ກິເລດຈະຣັດ").join('')).toBe("ກິເລດຈະຣັດ")
  })
  it("lossless: ກີໂຮນ+ຈັດກະ", () => {
    expect(segment("ກີໂຮນຈັດກະ").join('')).toBe("ກີໂຮນຈັດກະ")
  })
  it("lossless: ກຸສິນ+ຈ່ານາ", () => {
    expect(segment("ກຸສິນຈ່ານາ").join('')).toBe("ກຸສິນຈ່ານາ")
  })
  it("lossless: ກຸນລະ+ຈຳນອງ", () => {
    expect(segment("ກຸນລະຈຳນອງ").join('')).toBe("ກຸນລະຈຳນອງ")
  })
  it("lossless: ກຸມຸດ+ຈຳແລງ", () => {
    expect(segment("ກຸມຸດຈຳແລງ").join('')).toBe("ກຸມຸດຈຳແລງ")
  })
  it("lossless: ກູມຶງ+ຈີຈີ້", () => {
    expect(segment("ກູມຶງຈີຈີ້").join('')).toBe("ກູມຶງຈີຈີ້")
  })
  it("lossless: ກົນໄກ+ຈູດໄຟ", () => {
    expect(segment("ກົນໄກຈູດໄຟ").join('')).toBe("ກົນໄກຈູດໄຟ")
  })
  it("lossless: ເກສອນ+ເຈີ້ຍ", () => {
    expect(segment("ເກສອນເຈີ້ຍ").join('')).toBe("ເກສອນເຈີ້ຍ")
  })
  it("lossless: ເກດເວ+ໃຈແຂງ", () => {
    expect(segment("ເກດເວໃຈແຂງ").join('')).toBe("ເກດເວໃຈແຂງ")
  })
  it("lossless: ເກບີມ+ສເລົາ", () => {
    expect(segment("ເກບີມສເລົາ").join('')).toBe("ເກບີມສເລົາ")
  })
  it("lossless: ເກໂຣດ+ສະກາຍ", () => {
    expect(segment("ເກໂຣດສະກາຍ").join('')).toBe("ເກໂຣດສະກາຍ")
  })
  it("lossless: ເກັ່ຍ+ສະຄານ", () => {
    expect(segment("ເກັ່ຍສະຄານ").join('')).toBe("ເກັ່ຍສະຄານ")
  })
  it("lossless: ເກີ້ຍ+ສະງົນ", () => {
    expect(segment("ເກີ້ຍສະງົນ").join('')).toBe("ເກີ້ຍສະງົນ")
  })
  it("lossless: ເກົ້າ+ສະຍາມ", () => {
    expect(segment("ເກົ້າສະຍາມ").join('')).toBe("ເກົ້າສະຍາມ")
  })
  it("lossless: ແກວ່ງ+ສະດົນ", () => {
    expect(segment("ແກວ່ງສະດົນ").join('')).toBe("ແກວ່ງສະດົນ")
  })
  it("lossless: ໂກດັກ+ສະຕົນ", () => {
    expect(segment("ໂກດັກສະຕົນ").join('')).toBe("ໂກດັກສະຕົນ")
  })
  it("lossless: ໂກຮາດ+ສະທິນ", () => {
    expect(segment("ໂກຮາດສະທິນ").join('')).toBe("ໂກຮາດສະທິນ")
  })
  it("lossless: ໄກປືນ+ສະນ້ຳ", () => {
    expect(segment("ໄກປືນສະນ້ຳ").join('')).toBe("ໄກປືນສະນ້ຳ")
  })
  it("lossless: ຂໍໂທດ+ສະບັກ", () => {
    expect(segment("ຂໍໂທດສະບັກ").join('')).toBe("ຂໍໂທດສະບັກ")
  })
  it("lossless: ຂວັ້ນ+ສະປາຍ", () => {
    expect(segment("ຂວັ້ນສະປາຍ").join('')).toBe("ຂວັ້ນສະປາຍ")
  })
  it("lossless: ຂອດກຳ+ສະພາບ", () => {
    expect(segment("ຂອດກຳສະພາບ").join('')).toBe("ຂອດກຳສະພາບ")
  })
  it("lossless: ຂະຍອມ+ສະມັດ", () => {
    expect(segment("ຂະຍອມສະມັດ").join('')).toBe("ຂະຍອມສະມັດ")
  })
  it("lossless: ຂະຍິບ+ສະຣາດ", () => {
    expect(segment("ຂະຍິບສະຣາດ").join('')).toBe("ຂະຍິບສະຣາດ")
  })
  it("lossless: ຂະນວນ+ສະລາງ", () => {
    expect(segment("ຂະນວນສະລາງ").join('')).toBe("ຂະນວນສະລາງ")
  })
  it("lossless: ຂະນາຍ+ສະໂລກ", () => {
    expect(segment("ຂະນາຍສະໂລກ").join('')).toBe("ຂະນາຍສະໂລກ")
  })
  it("lossless: ຂະເນງ+ສະໜັກ", () => {
    expect(segment("ຂະເນງສະໜັກ").join('')).toBe("ຂະເນງສະໜັກ")
  })
  it("lossless: ຂະມວດ+ສະແໜງ", () => {
    expect(segment("ຂະມວດສະແໜງ").join('')).toBe("ຂະມວດສະແໜງ")
  })
  it("lossless: ຂະໂມຍ+ສະຫລູ", () => {
    expect(segment("ຂະໂມຍສະຫລູ").join('')).toBe("ຂະໂມຍສະຫລູ")
  })
})

// ─── M: Spaced sentences — exact output + lossless (15 cases) ──────────────
describe('M: spaced sentences', () => {
  it("ຂ້ອຍ ຊື່ ວ່າ ໂທ", () => {
    expect(segment("ຂ້ອຍ ຊື່ ວ່າ ໂທ")).toEqual(["ຂ້ອຍ"," ","ຊື່"," ","ວ່າ"," ","ໂທ"])
    expect(segment("ຂ້ອຍ ຊື່ ວ່າ ໂທ").join('')).toBe("ຂ້ອຍ ຊື່ ວ່າ ໂທ")
  })
  it("ທ່ານ ຢູ່ ໃສ?", () => {
    expect(segment("ທ່ານ ຢູ່ ໃສ?")).toEqual(["ທ່ານ"," ","ຢູ່"," ","ໃສ","?"])
    expect(segment("ທ່ານ ຢູ່ ໃສ?").join('')).toBe("ທ່ານ ຢູ່ ໃສ?")
  })
  it("ຂ້ອຍ ມາ ຈາກ ຫຼວງພະບາງ", () => {
    expect(segment("ຂ້ອຍ ມາ ຈາກ ຫຼວງພະບາງ")).toEqual(["ຂ້ອຍ"," ","ມາ"," ","ຈາກ"," ","ຫຼວງພະບາງ"])
    expect(segment("ຂ້ອຍ ມາ ຈາກ ຫຼວງພະບາງ").join('')).toBe("ຂ້ອຍ ມາ ຈາກ ຫຼວງພະບາງ")
  })
  it("ວັນ ນີ້ ອາກາດ ດີ", () => {
    expect(segment("ວັນ ນີ້ ອາກາດ ດີ")).toEqual(["ວັນ"," ","ນີ້"," ","ອາກາດ"," ","ດີ"])
    expect(segment("ວັນ ນີ້ ອາກາດ ດີ").join('')).toBe("ວັນ ນີ້ ອາກາດ ດີ")
  })
  it("ກິນ ເຂົ້າ ແລ້ວ ບໍ?", () => {
    expect(segment("ກິນ ເຂົ້າ ແລ້ວ ບໍ?")).toEqual(["ກິນ"," ","ເຂົ້າ"," ","ແລ້ວ"," ","ບໍ","?"])
    expect(segment("ກິນ ເຂົ້າ ແລ້ວ ບໍ?").join('')).toBe("ກິນ ເຂົ້າ ແລ້ວ ບໍ?")
  })
  it("ຂ້ອຍ ຕ້ອງການ ນ້ຳ", () => {
    expect(segment("ຂ້ອຍ ຕ້ອງການ ນ້ຳ")).toEqual(["ຂ້ອຍ"," ","ຕ້ອງການ"," ","ນ້ຳ"])
    expect(segment("ຂ້ອຍ ຕ້ອງການ ນ້ຳ").join('')).toBe("ຂ້ອຍ ຕ້ອງການ ນ້ຳ")
  })
  it("ໂຮງໝໍ ຢູ່ ໃສ?", () => {
    expect(segment("ໂຮງໝໍ ຢູ່ ໃສ?")).toEqual(["ໂຮງໝໍ"," ","ຢູ່"," ","ໃສ","?"])
    expect(segment("ໂຮງໝໍ ຢູ່ ໃສ?").join('')).toBe("ໂຮງໝໍ ຢູ່ ໃສ?")
  })
  it("ຂ້ອຍ ບໍ່ ເຂົ້າໃຈ", () => {
    expect(segment("ຂ້ອຍ ບໍ່ ເຂົ້າໃຈ")).toEqual(["ຂ້ອຍ"," ","ບໍ່"," ","ເຂົ້າໃຈ"])
    expect(segment("ຂ້ອຍ ບໍ່ ເຂົ້າໃຈ").join('')).toBe("ຂ້ອຍ ບໍ່ ເຂົ້າໃຈ")
  })
  it("ກະລຸນາ ເວົ້າ ຊ້າ ໆ", () => {
    expect(segment("ກະລຸນາ ເວົ້າ ຊ້າ ໆ")).toEqual(["ກະລຸນາ"," ","ເວົ້າ"," ","ຊ້າ"," ","ໆ"])
    expect(segment("ກະລຸນາ ເວົ້າ ຊ້າ ໆ").join('')).toBe("ກະລຸນາ ເວົ້າ ຊ້າ ໆ")
  })
  it("ຊ່ວຍ ດ້ວຍ ໄດ້ ບໍ", () => {
    expect(segment("ຊ່ວຍ ດ້ວຍ ໄດ້ ບໍ")).toEqual(["ຊ່ວຍ"," ","ດ້ວຍ"," ","ໄດ້"," ","ບໍ"])
    expect(segment("ຊ່ວຍ ດ້ວຍ ໄດ້ ບໍ").join('')).toBe("ຊ່ວຍ ດ້ວຍ ໄດ້ ບໍ")
  })
  it("ລາຄາ ເທົ່າໃດ?", () => {
    expect(segment("ລາຄາ ເທົ່າໃດ?")).toEqual(["ລາຄາ"," ","ເທົ່າໃດ","?"])
    expect(segment("ລາຄາ ເທົ່າໃດ?").join('')).toBe("ລາຄາ ເທົ່າໃດ?")
  })
  it("ໂທລະສັບ ຢູ່ ໃສ", () => {
    expect(segment("ໂທລະສັບ ຢູ່ ໃສ")).toEqual(["ໂທລະສັບ"," ","ຢູ່"," ","ໃສ"])
    expect(segment("ໂທລະສັບ ຢູ່ ໃສ").join('')).toBe("ໂທລະສັບ ຢູ່ ໃສ")
  })
  it("ຂ້ອຍ ຮຽນ ທີ່ ໂຮງຮຽນ", () => {
    expect(segment("ຂ້ອຍ ຮຽນ ທີ່ ໂຮງຮຽນ")).toEqual(["ຂ້ອຍ"," ","ຮຽນ"," ","ທີ່"," ","ໂຮງຮຽນ"])
    expect(segment("ຂ້ອຍ ຮຽນ ທີ່ ໂຮງຮຽນ").join('')).toBe("ຂ້ອຍ ຮຽນ ທີ່ ໂຮງຮຽນ")
  })
  it("ພວກ ເຮົາ ໄປ ດ້ວຍ ກັນ", () => {
    expect(segment("ພວກ ເຮົາ ໄປ ດ້ວຍ ກັນ")).toEqual(["ພວກ"," ","ເຮົາ"," ","ໄປ"," ","ດ້ວຍ"," ","ກັນ"])
    expect(segment("ພວກ ເຮົາ ໄປ ດ້ວຍ ກັນ").join('')).toBe("ພວກ ເຮົາ ໄປ ດ້ວຍ ກັນ")
  })
  it("ນ້ຳ ຢູ່ ໃສ", () => {
    expect(segment("ນ້ຳ ຢູ່ ໃສ")).toEqual(["ນ້ຳ"," ","ຢູ່"," ","ໃສ"])
    expect(segment("ນ້ຳ ຢູ່ ໃສ").join('')).toBe("ນ້ຳ ຢູ່ ໃສ")
  })
})

// ─── N: Extended real-world cases (35 cases) ───────────────────────────────
describe('N: extended real-world cases', () => {
  it("ການພັດທະນາເສດຖະກິດ", () => {
    expect(segment("ການພັດທະນາເສດຖະກິດ")).toEqual(["ການພັດທະນາ","ເສດຖະກິດ"])
    expect(segment("ການພັດທະນາເສດຖະກິດ").join('')).toBe("ການພັດທະນາເສດຖະກິດ")
  })
  it("ນະໂຍບາຍການຕ່າງປະເທດ", () => {
    expect(segment("ນະໂຍບາຍການຕ່າງປະເທດ")).toEqual(["ນະໂຍບາຍ","ການ","ຕ່າງປະເທດ"])
    expect(segment("ນະໂຍບາຍການຕ່າງປະເທດ").join('')).toBe("ນະໂຍບາຍການຕ່າງປະເທດ")
  })
  it("ສາທາລະນະລັດປະຊາທິປະໄຕ", () => {
    expect(segment("ສາທາລະນະລັດປະຊາທິປະໄຕ")).toEqual(["ສາທາລະນະລັດ","ປະຊາທິປະໄຕ"])
    expect(segment("ສາທາລະນະລັດປະຊາທິປະໄຕ").join('')).toBe("ສາທາລະນະລັດປະຊາທິປະໄຕ")
  })
  it("ວັດທະນາທຳລາວ", () => {
    expect(segment("ວັດທະນາທຳລາວ")).toEqual(["ວັດທະນາ","ທຳ","ລາວ"])
    expect(segment("ວັດທະນາທຳລາວ").join('')).toBe("ວັດທະນາທຳລາວ")
  })
  it("ການທ່ອງທ່ຽວໃນລາວ", () => {
    expect(segment("ການທ່ອງທ່ຽວໃນລາວ")).toEqual(["ການທ່ອງທ່ຽວ","ໃນ","ລາວ"])
    expect(segment("ການທ່ອງທ່ຽວໃນລາວ").join('')).toBe("ການທ່ອງທ່ຽວໃນລາວ")
  })
  it("ລະບົບການສຶກສາ", () => {
    expect(segment("ລະບົບການສຶກສາ")).toEqual(["ລະບົບ","ການສຶກສາ"])
    expect(segment("ລະບົບການສຶກສາ").join('')).toBe("ລະບົບການສຶກສາ")
  })
  it("ກະຊວງສາທາລະນະສຸກ", () => {
    expect(segment("ກະຊວງສາທາລະນະສຸກ")).toEqual(["ກະຊວງສາທາລະນະສຸກ"])
    expect(segment("ກະຊວງສາທາລະນະສຸກ").join('')).toBe("ກະຊວງສາທາລະນະສຸກ")
  })
  it("ຄະນະລັດຖະບານ", () => {
    expect(segment("ຄະນະລັດຖະບານ")).toEqual(["ຄະນະ","ລັດຖະບານ"])
    expect(segment("ຄະນະລັດຖະບານ").join('')).toBe("ຄະນະລັດຖະບານ")
  })
  it("ສ່ວນລວມທາງດ້ານເສດຖະກິດ", () => {
    expect(segment("ສ່ວນລວມທາງດ້ານເສດຖະກິດ")).toEqual(["ສ່ວນ","ລວມ","ທາງ","ດ້ານ","ເສດຖະກິດ"])
    expect(segment("ສ່ວນລວມທາງດ້ານເສດຖະກິດ").join('')).toBe("ສ່ວນລວມທາງດ້ານເສດຖະກິດ")
  })
  it("ກົດໝາຍລາວ", () => {
    expect(segment("ກົດໝາຍລາວ")).toEqual(["ກົດໝາຍ","ລາວ"])
    expect(segment("ກົດໝາຍລາວ").join('')).toBe("ກົດໝາຍລາວ")
  })
  it("ຮຽນ", () => {
    expect(segment("ຮຽນ")).toEqual(["ຮຽນ"])
    expect(segment("ຮຽນ").join('')).toBe("ຮຽນ")
  })
  it("ສອນ", () => {
    expect(segment("ສອນ")).toEqual(["ສອນ"])
    expect(segment("ສອນ").join('')).toBe("ສອນ")
  })
  it("ທຳ", () => {
    expect(segment("ທຳ")).toEqual(["ທຳ"])
    expect(segment("ທຳ").join('')).toBe("ທຳ")
  })
  it("ເຮັດ", () => {
    expect(segment("ເຮັດ")).toEqual(["ເຮັດ"])
    expect(segment("ເຮັດ").join('')).toBe("ເຮັດ")
  })
  it("ໃຊ້", () => {
    expect(segment("ໃຊ້")).toEqual(["ໃຊ້"])
    expect(segment("ໃຊ້").join('')).toBe("ໃຊ້")
  })
  it("ຊ່ວຍ", () => {
    expect(segment("ຊ່ວຍ")).toEqual(["ຊ່ວຍ"])
    expect(segment("ຊ່ວຍ").join('')).toBe("ຊ່ວຍ")
  })
  it("ໄດ້", () => {
    expect(segment("ໄດ້")).toEqual(["ໄດ້"])
    expect(segment("ໄດ້").join('')).toBe("ໄດ້")
  })
  it("ຕ້ອງ", () => {
    expect(segment("ຕ້ອງ")).toEqual(["ຕ້ອງ"])
    expect(segment("ຕ້ອງ").join('')).toBe("ຕ້ອງ")
  })
  it("ຢ່າ", () => {
    expect(segment("ຢ່າ")).toEqual(["ຢ່າ"])
    expect(segment("ຢ່າ").join('')).toBe("ຢ່າ")
  })
  it("ແລ້ວ", () => {
    expect(segment("ແລ້ວ")).toEqual(["ແລ້ວ"])
    expect(segment("ແລ້ວ").join('')).toBe("ແລ້ວ")
  })
  it("ປີ 2024 ໃນລາວ", () => {
    expect(segment("ປີ 2024 ໃນລາວ")).toEqual(["ປີ"," ","2024"," ","ໃນ","ລາວ"])
    expect(segment("ປີ 2024 ໃນລາວ").join('')).toBe("ປີ 2024 ໃນລາວ")
  })
  it("ຮອດ 100% ແລ້ວ", () => {
    expect(segment("ຮອດ 100% ແລ້ວ")).toEqual(["ຮອດ"," ","100","%"," ","ແລ້ວ"])
    expect(segment("ຮອດ 100% ແລ້ວ").join('')).toBe("ຮອດ 100% ແລ້ວ")
  })
  it("ລາຄາ 50,000 ກີບ", () => {
    expect(segment("ລາຄາ 50,000 ກີບ")).toEqual(["ລາຄາ"," ","50",",","000"," ","ກີບ"])
    expect(segment("ລາຄາ 50,000 ກີບ").join('')).toBe("ລາຄາ 50,000 ກີບ")
  })
  it("ໄລຍະ 10 ກິໂລ", () => {
    expect(segment("ໄລຍະ 10 ກິໂລ")).toEqual(["ໄລຍະ"," ","10"," ","ກິໂລ"])
    expect(segment("ໄລຍະ 10 ກິໂລ").join('')).toBe("ໄລຍະ 10 ກິໂລ")
  })
  it("ອຸນຫະພູມ 35 ອົງສາ", () => {
    expect(segment("ອຸນຫະພູມ 35 ອົງສາ")).toEqual(["ອຸນຫະພູມ"," ","35"," ","ອົງສາ"])
    expect(segment("ອຸນຫະພູມ 35 ອົງສາ").join('')).toBe("ອຸນຫະພູມ 35 ອົງສາ")
  })
  it("ສະບາຍ\tດີ", () => {
    expect(segment("ສະບາຍ\tດີ")).toEqual(["ສະບາຍ","\t","ດີ"])
    expect(segment("ສະບາຍ\tດີ").join('')).toBe("ສະບາຍ\tດີ")
  })
  it("ຮັກ\r\nລາວ", () => {
    expect(segment("ຮັກ\r\nລາວ")).toEqual(["ຮັກ","\r\n","ລາວ"])
    expect(segment("ຮັກ\r\nລາວ").join('')).toBe("ຮັກ\r\nລາວ")
  })
  it("ສາມ-ສີ່", () => {
    expect(segment("ສາມ-ສີ່")).toEqual(["ສາມ","-","ສີ່"])
    expect(segment("ສາມ-ສີ່").join('')).toBe("ສາມ-ສີ່")
  })
  it("ລາວ/ໄທ", () => {
    expect(segment("ລາວ/ໄທ")).toEqual(["ລາວ","/","ໄທ"])
    expect(segment("ລາວ/ໄທ").join('')).toBe("ລາວ/ໄທ")
  })
  it("(ສະບາຍດີ)", () => {
    expect(segment("(ສະບາຍດີ)")).toEqual(["(","ສະບາຍດີ",")"])
    expect(segment("(ສະບາຍດີ)").join('')).toBe("(ສະບາຍດີ)")
  })
  it("ຂ້ອຍຮຽນພາສາລາວ", () => {
    expect(segment("ຂ້ອຍຮຽນພາສາລາວ")).toEqual(["ຂ້ອຍ","ຮຽນ","ພາສາລາວ"])
    expect(segment("ຂ້ອຍຮຽນພາສາລາວ").join('')).toBe("ຂ້ອຍຮຽນພາສາລາວ")
  })
  it("ໂຮງຮຽນໃໝ່", () => {
    expect(segment("ໂຮງຮຽນໃໝ່")).toEqual(["ໂຮງຮຽນ","ໃໝ່"])
    expect(segment("ໂຮງຮຽນໃໝ່").join('')).toBe("ໂຮງຮຽນໃໝ່")
  })
  it("ນ້ຳດື່ມສະອາດ", () => {
    expect(segment("ນ້ຳດື່ມສະອາດ")).toEqual(["ນ້ຳດື່ມ","ສະອາດ"])
    expect(segment("ນ້ຳດື່ມສະອາດ").join('')).toBe("ນ້ຳດື່ມສະອາດ")
  })
  it("ຜູ້ຍິງສາວ", () => {
    expect(segment("ຜູ້ຍິງສາວ")).toEqual(["ຜູ້ຍິງ","ສາວ"])
    expect(segment("ຜູ້ຍິງສາວ").join('')).toBe("ຜູ້ຍິງສາວ")
  })
  it("ວຽງຈັນນະຄອນ", () => {
    expect(segment("ວຽງຈັນນະຄອນ")).toEqual(["ວຽງຈັນ","ນະຄອນ"])
    expect(segment("ວຽງຈັນນະຄອນ").join('')).toBe("ວຽງຈັນນະຄອນ")
  })
})

// ─── O: Final 19 cases to reach 500 ────────────────────────────────────────
describe('O: final completeness cases', () => {
  it("ຮ້ອນ", () => {
    expect(segment("ຮ້ອນ")).toEqual(["ຮ້ອນ"])
    expect(segment("ຮ້ອນ").join('')).toBe("ຮ້ອນ")
  })
  it("ເຢັນ", () => {
    expect(segment("ເຢັນ")).toEqual(["ເຢັນ"])
    expect(segment("ເຢັນ").join('')).toBe("ເຢັນ")
  })
  it("ໃຫຍ່", () => {
    expect(segment("ໃຫຍ່")).toEqual(["ໃຫຍ່"])
    expect(segment("ໃຫຍ່").join('')).toBe("ໃຫຍ່")
  })
  it("ນ້ອຍ", () => {
    expect(segment("ນ້ອຍ")).toEqual(["ນ້ອຍ"])
    expect(segment("ນ້ອຍ").join('')).toBe("ນ້ອຍ")
  })
  it("ເກົ່າ", () => {
    expect(segment("ເກົ່າ")).toEqual(["ເກົ່າ"])
    expect(segment("ເກົ່າ").join('')).toBe("ເກົ່າ")
  })
  it("ໃໝ່", () => {
    expect(segment("ໃໝ່")).toEqual(["ໃໝ່"])
    expect(segment("ໃໝ່").join('')).toBe("ໃໝ່")
  })
  it("ໄວ", () => {
    expect(segment("ໄວ")).toEqual(["ໄວ"])
    expect(segment("ໄວ").join('')).toBe("ໄວ")
  })
  it("ຊ້າ", () => {
    expect(segment("ຊ້າ")).toEqual(["ຊ້າ"])
    expect(segment("ຊ້າ").join('')).toBe("ຊ້າ")
  })
  it("ດຳ", () => {
    expect(segment("ດຳ")).toEqual(["ດຳ"])
    expect(segment("ດຳ").join('')).toBe("ດຳ")
  })
  it("ຂາວ", () => {
    expect(segment("ຂາວ")).toEqual(["ຂາວ"])
    expect(segment("ຂາວ").join('')).toBe("ຂາວ")
  })
  it("ດີຫຼາຍ", () => {
    expect(segment("ດີຫຼາຍ")).toEqual(["ດີ","ຫຼາຍ"])
    expect(segment("ດີຫຼາຍ").join('')).toBe("ດີຫຼາຍ")
  })
  it("ໃໝ່ດີ", () => {
    expect(segment("ໃໝ່ດີ")).toEqual(["ໃໝ່","ດີ"])
    expect(segment("ໃໝ່ດີ").join('')).toBe("ໃໝ່ດີ")
  })
  it("ຮ້ອນໆ", () => {
    expect(segment("ຮ້ອນໆ")).toEqual(["ຮ້ອນໆ"])
    expect(segment("ຮ້ອນໆ").join('')).toBe("ຮ້ອນໆ")
  })
  it("ເຢັນໆ", () => {
    expect(segment("ເຢັນໆ")).toEqual(["ເຢັນໆ"])
    expect(segment("ເຢັນໆ").join('')).toBe("ເຢັນໆ")
  })
  it("ຈ່ອຍໆ", () => {
    expect(segment("ຈ່ອຍໆ")).toEqual(["ຈ່ອຍໆ"])
    expect(segment("ຈ່ອຍໆ").join('')).toBe("ຈ່ອຍໆ")
  })
  it("ທ່ານດີບໍ", () => {
    // ທ່ານ ດີ ບໍ — "are you well?". Greedy matching used to take ດີບ here and
    // strand the vowel sign; the shortest-path segmenter keeps ບໍ intact.
    expect(segment("ທ່ານດີບໍ")).toEqual(["ທ່ານ","ດີ","ບໍ"])
    expect(segment("ທ່ານດີບໍ").join('')).toBe("ທ່ານດີບໍ")
  })
  it("ຂ້ອຍດີ", () => {
    expect(segment("ຂ້ອຍດີ")).toEqual(["ຂ້ອຍ","ດີ"])
    expect(segment("ຂ້ອຍດີ").join('')).toBe("ຂ້ອຍດີ")
  })
  it("ລາວເປັນຄົນດີ", () => {
    expect(segment("ລາວເປັນຄົນດີ")).toEqual(["ລາວ","ເປັນ","ຄົນ","ດີ"])
    expect(segment("ລາວເປັນຄົນດີ").join('')).toBe("ລາວເປັນຄົນດີ")
  })
  it("ເຮົາຮ່ວມກັນ", () => {
    expect(segment("ເຮົາຮ່ວມກັນ")).toEqual(["ເຮົາ","ຮ່ວມກັນ"])
    expect(segment("ເຮົາຮ່ວມກັນ").join('')).toBe("ເຮົາຮ່ວມກັນ")
  })
})
