# lao-segmenter

![lao-segmenter banner](./banner.png)

A Lao word segmenter for Node.js and the browser. It splits unsegmented Lao text into words using a dictionary of **34,000 Lao words** and a maximal matching algorithm — the same technique used by [PyThaiNLP](https://github.com/PyThaiNLP/pythainlp) for Thai text.

```js
import { segment } from 'lao-segmenter'

segment('ຂ້ອຍຮຽນພາສາລາວ')
// → ['ຂ້ອຍ', 'ຮຽນ', 'ພາສາລາວ']
// → ['I',    'study', 'Lao language']
```

---

## Why this package exists

Lao script has no spaces between words — just like Thai or Khmer. This makes it hard for computers to know where one word ends and the next begins. Until now, no Lao word segmenter existed for JavaScript. This package fills that gap.

---

## Install

```bash
npm install lao-segmenter
```

Works with **Node.js 16+**, Bun, and Deno. Zero runtime dependencies.

---

## Quick start

```js
import { segment } from 'lao-segmenter'

// Basic segmentation
segment('ສະບາຍດີ')
// → ['ສະບາຍດີ']  (one dictionary word)

segment('ຄົນລາວ')
// → ['ຄົນ', 'ລາວ']  (two words: "person" + "Lao")

segment('ຂ້ອຍໄປຮຽນທີ່ໂຮງຮຽນ')
// → ['ຂ້ອຍ', 'ໄປ', 'ຮຽນ', 'ທີ່', 'ໂຮງຮຽນ']
// → ['I',    'go',  'study', 'at', 'school']
```

Mixed Lao and English:

```js
segment('ພາສາລາວ hello world')
// → ['ພາສາລາວ', ' ', 'hello', ' ', 'world']
```

Numbers and prices:

```js
segment('ລາຄາ 1000 ກີບ')
// → ['ລາຄາ', ' ', '1000', ' ', 'ກີບ']
// → ['price', ' ', '1000', ' ', 'kip']
```

---

## API

### `segment(text, options?)`

Splits a string into an array of tokens.

```ts
segment(text: string, options?: SegmentOptions): string[]
```

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `keepWhitespace` | `boolean` | `true` | Include space tokens in the result |
| `customWords` | `string[]` | `[]` | Extra words to add to the dictionary |
| `trie` | `Trie` | — | Bring your own pre-built Trie |

**Examples:**

```js
// Remove spaces from the output
segment('ຂ້ອຍ ຮຽນ ພາສາ', { keepWhitespace: false })
// → ['ຂ້ອຍ', 'ຮຽນ', 'ພາສາ']

// Add custom words not in the default dictionary
segment('ໂຄ້ດດິ້ງລາວ', { customWords: ['ໂຄ້ດດິ້ງ'] })
// → ['ໂຄ້ດດິ້ງ', 'ລາວ']
```

---

### `new Segmenter(options?)`

A reusable class that builds the dictionary index once and reuses it across many calls. Faster when you segment a lot of text.

```js
import { Segmenter } from 'lao-segmenter'

const seg = new Segmenter({ customWords: ['ຊາວໜຸ່ມ'] })

seg.segment('ຊາວໜຸ່ມລາວ')
// → ['ຊາວໜຸ່ມ', 'ລາວ']

seg.segment('ຂ້ອຍຮຽນ')
// → ['ຂ້ອຍ', 'ຮຽນ']
```

---

### `splitLGC(text)`

A lower-level function that splits text into **Lao Grapheme Clusters** — the smallest atomic units of Lao script (roughly one syllable per cluster). Useful when you need character-level control.

```js
import { splitLGC } from 'lao-segmenter'

splitLGC('ເກາະ')
// → ['ເກາະ']  (one cluster: leading vowel + consonant + trailing vowel)
```

---

## How it works

1. **Trie lookup** — the 34,000-word dictionary is loaded into a prefix tree (trie) for fast lookups.
2. **Maximal matching** — at each position, the algorithm finds the longest word that matches the dictionary.
3. **LGC fallback** — if no dictionary match is found, the segmenter advances one Lao Grapheme Cluster so it never gets stuck on unknown words.
4. **ໆ absorption** — the Lao repetition mark ໆ is always merged with the word before it (e.g. `ຕ່າງໆ` stays as one token).

This is the same algorithm family as PyThaiNLP's `newmm` tokenizer, adapted for Lao Unicode.

---

## Dictionary sources

The built-in dictionary combines three open-source word lists:

| Source | Words | License |
|---|---|---|
| [Lao Dictionary](https://github.com/wannaphong/LaoNLP) by Brian Wilson | ~11,000 | BSD 3-Clause |
| [Wiktionary Lao](https://github.com/wannaphong/LaoNLP) snapshot 2021 | ~13,000 | CC-BY-SA 3.0 |
| [Google Language Resources](https://github.com/google/language-resources) spell-check | ~21,000 | Apache 2.0 |

After deduplication: **33,996 unique words**, sorted longest-first for best matching performance.

---

## CommonJS usage

```js
const { segment } = require('lao-segmenter')

segment('ສະບາຍດີ')
// → ['ສະບາຍດີ']
```

---

## TypeScript

This package ships with full TypeScript types.

```ts
import { segment, Segmenter, SegmentOptions } from 'lao-segmenter'

const options: SegmentOptions = { keepWhitespace: false }
const tokens: string[] = segment('ຂ້ອຍຮຽນ', options)
```

---

## Rebuild the dictionary

If you want to update the dictionary from the original sources:

```bash
node scripts/build-dict.mjs
```

This downloads the latest word lists and regenerates `data/lao-words.txt`.

---

## Related projects

- [LaoNLP](https://github.com/wannaphong/LaoNLP) — Lao NLP library for Python
- [PyThaiNLP](https://github.com/PyThaiNLP/pythainlp) — Thai NLP library (inspiration for the algorithm)
- [Awesome Lao NLP](https://github.com/wannaphong/Awesome-Lao-NLP) — curated list of Lao language resources

---

## License

MIT © [Xaypanya Phongsa](https://github.com/Xaypanya)

The bundled dictionary files have separate licenses — see [Dictionary sources](#dictionary-sources) above.
