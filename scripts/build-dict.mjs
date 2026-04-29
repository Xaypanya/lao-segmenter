#!/usr/bin/env node
/**
 * Rebuild data/lao-words.txt by downloading the source dictionaries from
 * LaoNLP and Google Language Resources, then merging and deduplicating them.
 *
 * Usage:
 *   node scripts/build-dict.mjs
 *
 * Sources (all open-source / permissive licences):
 *   - Lao-Dictionary.txt      BSD 3-Clause   github.com/wannaphong/LaoNLP
 *   - wiktionary-20210720.txt CC-BY-SA 3.0   github.com/wannaphong/LaoNLP
 *   - lo_spellcheck_dict.txt  Apache 2.0     github.com/google/language-resources
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SOURCES = [
  'https://raw.githubusercontent.com/wannaphong/LaoNLP/master/laonlp/corpus/Lao-Dictionary.txt',
  'https://raw.githubusercontent.com/wannaphong/LaoNLP/master/laonlp/corpus/wiktionary-20210720.txt',
  'https://raw.githubusercontent.com/wannaphong/LaoNLP/master/laonlp/corpus/lo_spellcheck_dict.txt',
]

// Only allow strings composed entirely of Lao Unicode block characters
const LAO_ONLY = /^[\u0E80-\u0EFF]+$/

async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

async function main() {
  const words = new Set()

  for (const url of SOURCES) {
    console.log(`Fetching ${url} …`)
    const text = await fetchText(url)
    let kept = 0
    for (const line of text.split('\n')) {
      const w = line.trim()
      if (w && !w.startsWith('#') && LAO_ONLY.test(w)) {
        words.add(w)
        kept++
      }
    }
    console.log(`  kept ${kept} words`)
  }

  // Sort longest-first: maximal matching finds longer matches faster
  const sorted = [...words].sort((a, b) => b.length - a.length || a.localeCompare(b))

  const out = join(__dirname, '..', 'data', 'lao-words.txt')
  writeFileSync(out, sorted.join('\n') + '\n', 'utf-8')
  console.log(`\nWrote ${sorted.length} unique words to ${out}`)
}

main().catch(err => { console.error(err); process.exit(1) })
