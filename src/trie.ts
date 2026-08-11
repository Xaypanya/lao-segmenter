/**
 * Trie (prefix tree) data structure for fast dictionary lookup.
 *
 * Each node stores a map of children keyed by individual characters.
 * The `isEnd` flag marks that the path from root to this node forms a word.
 *
 * This is the same core structure used by PyThaiNLP's newmm tokenizer.
 */

export class TrieNode {
  readonly children = new Map<string, TrieNode>()
  isEnd = false
}

export class Trie {
  readonly root = new TrieNode()

  insert(word: string): void {
    let node = this.root
    for (const ch of word) {
      let next = node.children.get(ch)
      if (!next) {
        next = new TrieNode()
        node.children.set(ch, next)
      }
      node = next
    }
    node.isEnd = true
  }

  has(word: string): boolean {
    let node = this.root
    for (const ch of word) {
      const next = node.children.get(ch)
      if (!next) return false
      node = next
    }
    return node.isEnd
  }

  /**
   * Returns the length (in string chars) of the longest word in the trie
   * that is a prefix of `text` starting at `pos`.
   * Returns 0 if no match exists.
   */
  longestMatch(text: string, pos: number): number {
    let node = this.root
    let lastMatch = 0
    let i = pos
    while (i < text.length) {
      const next = node.children.get(text[i])
      if (!next) break
      node = next
      i++
      if (node.isEnd) lastMatch = i - pos
    }
    return lastMatch
  }

  /**
   * Returns the lengths of *every* word in the trie that is a prefix of `text`
   * starting at `pos`, in ascending order. Empty when nothing matches.
   *
   * The segmenter needs all candidates, not just the longest one: picking the
   * longest match greedily can strand the rest of the syllable. For example
   * "ຊິນອນ" greedily yields ຊິນ + ອ + ນ, while the shorter first match gives
   * the better ຊິ + ນອນ.
   *
   * Pass `limit` to stop scanning after that many characters.
   */
  allMatches(text: string, pos: number, limit = text.length): number[] {
    const matches: number[] = []
    const end = Math.min(text.length, pos + limit)
    let node = this.root
    let i = pos
    while (i < end) {
      const next = node.children.get(text[i])
      if (!next) break
      node = next
      i++
      if (node.isEnd) matches.push(i - pos)
    }
    return matches
  }
}

export function buildTrie(words: Iterable<string>): Trie {
  const trie = new Trie()
  for (const word of words) {
    if (word.length > 0) trie.insert(word)
  }
  return trie
}
