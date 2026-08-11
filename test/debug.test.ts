import { describe, it, expect } from 'vitest'
import { getRawDict, getLaoWords, getDefaultTrie, DICTIONARY_SIZE } from '../src/index.js'
import { decodeWordList, parseWordList } from '../src/wordlist.js'
import { PACKED_WORDS } from '../src/generated/dictionary-data.js'

describe('built-in dictionary', () => {
  it('getRawDict() returns the word list as text', () => {
    const raw = getRawDict()
    expect(raw.length).toBeGreaterThan(0)
    expect(raw.slice(0, 3)).not.toBe('/da') // should not be a URL
    expect(raw).toContain('ການ')
  })

  it('getLaoWords() decodes every word', () => {
    const words = getLaoWords()
    expect(words.length).toBe(DICTIONARY_SIZE)
    expect(words.length).toBeGreaterThan(30000)
    expect(words).toContain('ການ')
    expect(words).toContain('ສະບາຍດີ')
  })

  it('getLaoWords() is memoised (same array identity)', () => {
    expect(getLaoWords()).toBe(getLaoWords())
  })

  it('every decoded word is non-empty and free of whitespace', () => {
    for (const w of getLaoWords()) {
      expect(w.length).toBeGreaterThan(0)
      expect(/\s/.test(w)).toBe(false)
    }
  })

  it('front-coded payload round-trips through decodeWordList()', () => {
    const decoded = decodeWordList(PACKED_WORDS)
    expect(decoded.length).toBe(DICTIONARY_SIZE)
    // sorted, no duplicates
    const unique = new Set(decoded)
    expect(unique.size).toBe(decoded.length)
    for (let i = 1; i < decoded.length; i++) {
      expect(decoded[i] > decoded[i - 1]).toBe(true)
    }
  })

  it('trie has ການ and gives correct longestMatch', () => {
    const trie = getDefaultTrie()
    expect(trie.has('ການ')).toBe(true)
    expect(trie.longestMatch('ການ', 0)).toBe(3)
  })

  it('getDefaultTrie() is cached', () => {
    expect(getDefaultTrie()).toBe(getDefaultTrie())
  })

  it('parseWordList() ignores comments and blank lines', () => {
    expect(parseWordList('# hi\n\nສະບາຍ\n  ດີ  \n')).toEqual(['ສະບາຍ', 'ດີ'])
  })

  it('decodeWordList() handles an empty payload', () => {
    expect(decodeWordList('')).toEqual([])
  })
})
