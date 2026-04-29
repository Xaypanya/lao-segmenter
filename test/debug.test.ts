import { describe, it, expect } from 'vitest'
import { getRawDict, getDefaultTrie } from '../src/dict.js'

describe('debug dict loading', () => {
  it('getRawDict() returns file content', () => {
    const raw = getRawDict()
    expect(raw.length).toBeGreaterThan(0)
    expect(raw.slice(0, 3)).not.toBe('/da') // should not be a URL
  })
  it('trie has ການ and gives correct longestMatch', () => {
    const trie = getDefaultTrie()
    expect(trie.has('ການ')).toBe(true)
    expect(trie.longestMatch('ການ', 0)).toBe(3)
  })
})
