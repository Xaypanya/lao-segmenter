#!/usr/bin/env node
/**
 * Rebuild data/lao-words.txt by downloading source dictionaries and merging them.
 *
 * Usage:
 *   node scripts/build-dict.mjs
 *
 * Sources (trusted — added as-is):
 *   - Lao-Dictionary.txt           BSD 3-Clause   github.com/wannaphong/LaoNLP
 *   - wiktionary-20210720.txt      CC-BY-SA 3.0   github.com/wannaphong/LaoNLP
 *   - lo_spellcheck_dict.txt       Apache 2.0     github.com/google/language-resources
 *
 * Sources (filtered — compounds of existing words are rejected):
 *   - lao-eng-dictionary.csv       check repo     github.com/wannaphong/LaoNLP
 *   - kaikki.org Wiktionary dump   CC-BY-SA 4.0   kaikki.org
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Only Lao Unicode block characters
const LAO_ONLY = /^[\u0E80-\u0EFF]+$/

async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

async function fetchWordlist(url) {
  const text = await fetchText(url)
  const words = []
  for (const line of text.split('\n')) {
    const w = line.trim()
    if (w && !w.startsWith('#') && LAO_ONLY.test(w)) words.push(w)
  }
  return words
}

// CSV: format is ID,LaoWord,English,... — Lao word is column index 1
async function fetchCSV(url) {
  const text = await fetchText(url)
  const words = []
  for (const line of text.split('\n')) {
    const cols = line.split(',')
    const w = (cols[1] || '').replace(/^"|"$/g, '').trim()
    if (w && LAO_ONLY.test(w)) words.push(w)
  }
  return words
}

// kaikki.org JSONL: each line is { word, ... }
async function fetchKaikki(url) {
  const text = await fetchText(url)
  const words = []
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    try {
      const obj = JSON.parse(line)
      const w = (obj.word || '').trim()
      if (w && LAO_ONLY.test(w)) words.push(w)
    } catch {}
  }
  return words
}

/**
 * Maximal matching: find the longest prefix of `text` (from position `pos`)
 * that exists in `dict`. Returns the matched string or null.
 */
function longestMatch(text, pos, dict) {
  let match = null
  for (let end = text.length; end > pos; end--) {
    const chunk = text.slice(pos, end)
    if (dict.has(chunk)) { match = chunk; break }
  }
  return match
}

/**
 * Returns true if maximal matching splits `word` into 2+ tokens using `dict`.
 * This mirrors the real segmenter — only rejects genuine compound phrases.
 */
function isCompound(word, dict) {
  if (!dict.has(word.slice(0, 1)) && !dict.has(word)) {
    // Quick check: if nothing matches at position 0, it's a new word
    const m = longestMatch(word, 0, dict)
    if (!m) return false
  }
  let pos = 0
  let tokens = 0
  while (pos < word.length) {
    const m = longestMatch(word, pos, dict)
    if (!m) return false   // gap in coverage → not a clean compound
    tokens++
    pos += m.length
  }
  return tokens >= 2
}

const TRUSTED_SOURCES = [
  {
    name: 'LaoNLP — Lao-Dictionary.txt (BSD 3-Clause)',
    url: 'https://raw.githubusercontent.com/wannaphong/LaoNLP/master/laonlp/corpus/Lao-Dictionary.txt',
    fetch: fetchWordlist,
  },
  {
    name: 'LaoNLP — wiktionary-20210720.txt (CC-BY-SA 3.0)',
    url: 'https://raw.githubusercontent.com/wannaphong/LaoNLP/master/laonlp/corpus/wiktionary-20210720.txt',
    fetch: fetchWordlist,
  },
  {
    name: 'Google Language Resources — lo_spellcheck_dict.txt (Apache 2.0)',
    url: 'https://raw.githubusercontent.com/wannaphong/LaoNLP/master/laonlp/corpus/lo_spellcheck_dict.txt',
    fetch: fetchWordlist,
  },
]

const FILTERED_SOURCES = [
  {
    name: 'LaoNLP — lao-eng-dictionary.csv',
    url: 'https://raw.githubusercontent.com/wannaphong/LaoNLP/master/laonlp/corpus/lao-eng-dictionary.csv',
    fetch: fetchCSV,
  },
  {
    name: 'kaikki.org — Wiktionary Lao dump (CC-BY-SA 4.0)',
    url: 'https://kaikki.org/dictionary/Lao/kaikki.org-dictionary-Lao.jsonl',
    fetch: fetchKaikki,
  },
]

async function main() {
  const words = new Set()

  // Step 1: add trusted sources as-is
  console.log('── Trusted sources ──────────────────────────')
  for (const source of TRUSTED_SOURCES) {
    process.stdout.write(`Fetching ${source.name} … `)
    try {
      const result = await source.fetch(source.url)
      const before = words.size
      for (const w of result) words.add(w)
      console.log(`+${words.size - before} new words`)
    } catch (err) {
      console.log(`SKIPPED (${err.message})`)
    }
  }

  // Step 2: add filtered sources — reject compounds of existing words
  console.log('\n── Filtered sources (compounds rejected) ────')
  for (const source of FILTERED_SOURCES) {
    process.stdout.write(`Fetching ${source.name} … `)
    try {
      const candidates = await source.fetch(source.url)
      let added = 0, skipped = 0
      for (const w of candidates) {
        if (words.has(w)) continue
        if (isCompound(w, words)) { skipped++; continue }
        words.add(w)
        added++
      }
      console.log(`+${added} new words (${skipped} compounds rejected)`)
    } catch (err) {
      console.log(`SKIPPED (${err.message})`)
    }
  }

  // Sort longest-first: maximal matching finds longer matches faster
  const sorted = [...words].sort((a, b) => b.length - a.length || a.localeCompare(b))

  const out = join(__dirname, '..', 'data', 'lao-words.txt')
  writeFileSync(out, sorted.join('\n') + '\n', 'utf-8')
  console.log(`\nWrote ${sorted.length} unique words → ${out}`)
}

main().catch(err => { console.error(err); process.exit(1) })
