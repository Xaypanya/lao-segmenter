/**
 * Tests for the dictionary-free `lao-segmenter/core` entry point and the
 * extended Segmenter API.
 */

import { describe, it, expect } from 'vitest'
import {
  Segmenter as CoreSegmenter,
  segmentWith,
  buildTrie,
  parseWordList,
  decodeWordList,
  buildCustomTrie,
  splitLGC,
} from '../src/core.js'
import { Segmenter, segment, getDefaultTrie, getLaoWords } from '../src/index.js'

describe('core entry: no built-in dictionary', () => {
  it('segmentWith() works with a hand-built trie', () => {
    const trie = buildTrie(['ສະບາຍ', 'ດີ'])
    expect(segmentWith('ສະບາຍດີ', trie)).toEqual(['ສະບາຍ', 'ດີ'])
  })

  it('Segmenter requires words or trie', () => {
    expect(() => new CoreSegmenter()).toThrow(/pass `words` or `trie`/)
  })

  it('Segmenter accepts a word list', () => {
    const seg = new CoreSegmenter({ words: ['ສະບາຍ', 'ດີ'] })
    expect(seg.segment('ສະບາຍດີ')).toEqual(['ສະບາຍ', 'ດີ'])
  })

  it('Segmenter accepts a prebuilt trie', () => {
    const trie = buildCustomTrie(['ນ້ຳ'])
    const seg = new CoreSegmenter({ trie })
    expect(seg.trie).toBe(trie)
    expect(seg.has('ນ້ຳ')).toBe(true)
  })

  it('words + customWords are merged', () => {
    const seg = new CoreSegmenter({ words: ['ດີ'], customWords: ['ສະບາຍ'] })
    expect(seg.segment('ສະບາຍດີ')).toEqual(['ສະບາຍ', 'ດີ'])
  })

  it('keepWhitespace can be set as a constructor default', () => {
    const seg = new CoreSegmenter({ words: ['ດີ'], keepWhitespace: false })
    expect(seg.segment('ດີ ດີ')).toEqual(['ດີ', 'ດີ'])
    // per-call override wins
    expect(seg.segment('ດີ ດີ', { keepWhitespace: true })).toEqual(['ດີ', ' ', 'ດີ'])
  })

  it('addWords() extends the dictionary in place', () => {
    const seg = new CoreSegmenter({ words: ['ດີ'] })
    expect(seg.segment('ສະບາຍດີ')).not.toEqual(['ສະບາຍ', 'ດີ'])
    seg.addWords(['ສະບາຍ'])
    expect(seg.segment('ສະບາຍດີ')).toEqual(['ສະບາຍ', 'ດີ'])
  })

  it('re-exports the word-list helpers', () => {
    expect(parseWordList('ກ\nຂ')).toEqual(['ກ', 'ຂ'])
    expect(decodeWordList('0ກາ\n2ນ')).toEqual(['ກາ', 'ການ'])
    expect(splitLGC('ດີ').length).toBe(1)
  })
})

describe('main entry: dictionary-backed', () => {
  it('Segmenter defaults to the built-in dictionary', () => {
    const seg = new Segmenter()
    expect(seg.segment('ຂ້ອຍຮຽນພາສາລາວ')).toEqual(['ຂ້ອຍ', 'ຮຽນ', 'ພາສາລາວ'])
  })

  it('bare Segmenter() reuses the cached default trie', () => {
    expect(new Segmenter().trie).toBe(getDefaultTrie())
  })

  it('customWords extend rather than replace the dictionary', () => {
    const seg = new Segmenter({ customWords: ['ຊາວໜຸ່ມລາວ'] })
    expect(seg.has('ຊາວໜຸ່ມລາວ')).toBe(true)
    expect(seg.has('ການ')).toBe(true) // built-in word still present
    expect(seg.trie).not.toBe(getDefaultTrie()) // default trie not mutated
    expect(getDefaultTrie().has('ຊາວໜຸ່ມລາວ')).toBe(false)
  })

  it('customWords on a Segmenter do not leak into segment()', () => {
    // eslint-disable-next-line no-new
    new Segmenter({ customWords: ['ຂຂຂຂຂ'] })
    expect(segment('ຂຂຂຂຂ').length).toBeGreaterThan(1)
  })

  it('words option fully replaces the dictionary', () => {
    const seg = new Segmenter({ words: ['ດີ'] })
    expect(seg.has('ການ')).toBe(false)
  })

  it('is a subclass of the core Segmenter', () => {
    expect(new Segmenter()).toBeInstanceOf(CoreSegmenter)
  })

  it('getLaoWords() and the trie agree', () => {
    const words = getLaoWords()
    const trie = getDefaultTrie()
    for (const w of [words[0], words[100], words[words.length - 1]]) {
      expect(trie.has(w)).toBe(true)
    }
  })
})
