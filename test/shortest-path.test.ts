/**
 * Regression tests for the shortest-path (newmm-style) segmenter.
 *
 * Greedy longest-match commits to the longest word at each position and never
 * backtracks, so it strands whatever is left over. These cases all have a
 * locally-longest match that leads to a worse overall split.
 */

import { describe, it, expect } from 'vitest'
import { segment, Segmenter, getDefaultTrie } from '../src/index.js'
import { buildTrie, segmentWith } from '../src/core.js'

describe('shortest-path beats greedy longest-match', () => {
  it('ຊິນອນ → ຊິ + ນອນ, not ຊິນ + ອ + ນ', () => {
    // ຊິນ, ອ and ນ are all dictionary entries, so greedy takes ຊິນ first and
    // is left with ອນ — which is not a word — producing three tokens.
    const trie = getDefaultTrie()
    expect(trie.has('ຊິນ')).toBe(true)
    expect(trie.has('ອ')).toBe(true)
    expect(trie.has('ນ')).toBe(true)
    expect(trie.has('ອນ')).toBe(false)

    expect(segment('ຊິນອນ')).toEqual(['ຊິ', 'ນອນ'])
  })

  it('segments the full reported sentence', () => {
    expect(segment('ຢຸດຮ້ອງເພງດູຊິນອນ')).toEqual(['ຢຸດ', 'ຮ້ອງເພງ', 'ດູ', 'ຊິ', 'ນອນ'])
  })

  it('ທ່ານດີບໍ → ທ່ານ + ດີ + ບໍ, not ດີບ + ໍ', () => {
    expect(segment('ທ່ານດີບໍ')).toEqual(['ທ່ານ', 'ດີ', 'ບໍ'])
  })

  it('ເຈົ້າຊິກິນເຂົ້າບໍ keeps ຊິ and ບໍ intact', () => {
    expect(segment('ເຈົ້າຊິກິນເຂົ້າບໍ')).toEqual(['ເຈົ້າ', 'ຊິ', 'ກິນເຂົ້າ', 'ບໍ'])
  })

  it('prefers the left-most long word when two splits tie', () => {
    // ຫົວໃຈ + ດີ and ຫົວ + ໃຈດີ are both two tokens; the left-greedy
    // tie-break picks the first.
    expect(segment('ຫົວໃຈດີ')).toEqual(['ຫົວໃຈ', 'ດີ'])
    expect(segment('ລາວກິນເຂົ້າທຸກວັນ')).toEqual(['ລາວ', 'ກິນເຂົ້າ', 'ທຸກ', 'ວັນ'])
  })

  it('minimises token count on a synthetic dictionary', () => {
    // abc, a, b, c and bcd are words. Greedy: abc|d(unknown). Best: a|bcd.
    const trie = buildTrie(['ກຂຄ', 'ກ', 'ຂຄງ'])
    expect(segmentWith('ກຂຄງ', trie)).toEqual(['ກ', 'ຂຄງ'])
  })

  it('prefers dictionary coverage over a shorter unknown-heavy path', () => {
    const trie = buildTrie(['ກຂ', 'ຄງຈ'])
    // ກຂ + ຄງຈ covers everything; any other split leaves unknown clusters.
    expect(segmentWith('ກຂຄງຈ', trie)).toEqual(['ກຂ', 'ຄງຈ'])
  })

  it('never stalls on text with no dictionary matches', () => {
    const trie = buildTrie(['ບໍ່ມີ'])
    const out = segmentWith('ຂ້ອຍຮຽນ', trie)
    expect(out.join('')).toBe('ຂ້ອຍຮຽນ')
    expect(out.length).toBeGreaterThan(0)
  })

  it('is lossless across a mixed-script paragraph', () => {
    const text = 'ຂ້ອຍຊິໄປຕະຫຼາດ 3 ໂມງ, then home — ດີບໍ?\nສະບາຍດີ ໑໒໓ ຕ່າງໆ'
    expect(segment(text).join('')).toBe(text)
    expect(segment(text, { keepWhitespace: false }).join('').length).toBeLessThan(text.length)
  })

  it('still glues the repetition mark ໆ to the word before it', () => {
    expect(segment('ຕ່າງໆ')).toEqual(['ຕ່າງໆ'])
    expect(segment('ຄົນຕ່າງໆກັນ').every((t) => !t.startsWith('ໆ'))).toBe(true)
  })

  it('custom words steer the path', () => {
    const seg = new Segmenter({ customWords: ['ຊິນອນ'] })
    expect(seg.segment('ຊິນອນ')).toEqual(['ຊິນອນ'])
  })

  it('handles a long run without blowing up', () => {
    const text = 'ຂ້ອຍຮຽນພາສາລາວ'.repeat(200)
    const t0 = Date.now()
    const out = segment(text)
    expect(out.join('')).toBe(text)
    expect(Date.now() - t0).toBeLessThan(2000)
  })
})

describe('Trie.allMatches', () => {
  it('returns every prefix match in ascending order', () => {
    const trie = buildTrie(['ກ', 'ກຂ', 'ກຂຄ'])
    expect(trie.allMatches('ກຂຄງ', 0)).toEqual([1, 2, 3])
  })

  it('returns an empty array when nothing matches', () => {
    expect(buildTrie(['ກຂ']).allMatches('ຄງ', 0)).toEqual([])
  })

  it('respects the limit argument', () => {
    const trie = buildTrie(['ກ', 'ກຂ', 'ກຂຄ'])
    expect(trie.allMatches('ກຂຄ', 0, 2)).toEqual([1, 2])
  })
})
