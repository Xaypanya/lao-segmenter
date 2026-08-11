#!/usr/bin/env node
/**
 * Package-level smoke test: pack the tarball, install it into a scratch
 * directory, and exercise every way a consumer can load it.
 *
 * This is what guards the "works in every framework" promise. Frameworks
 * differ in *how* they load a package, not in what they do with it, so we
 * check the loaders themselves:
 *
 *   1. Node ESM       `import { segment } from 'lao-segmenter'`   (Nuxt/Next server, Remix, Astro SSR)
 *   2. Node CJS       `require('lao-segmenter')`                  (legacy Node, Jest, older webpack)
 *   3. Subpath ESM    `lao-segmenter/core`, `lao-segmenter/dictionary`
 *   4. Browser bundle esbuild `platform: 'browser'` with no externals
 *                     (Vite, Rollup, webpack, Parcel, Astro/SvelteKit client)
 *   5. Edge/neutral   esbuild `platform: 'neutral'` — fails on any Node built-in
 *                     (Cloudflare Workers, Vercel Edge, Deno Deploy)
 *   6. IIFE global    `<script src>` → window.LaoSegmenter
 *   7. Type resolution under both `bundler` and `node16` moduleResolution
 *
 * Usage: node scripts/verify-package.mjs   (run `npm run build` first)
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const SAMPLE = 'ຂ້ອຍຮຽນພາສາລາວ'
const EXPECTED = ['ຂ້ອຍ', 'ຮຽນ', 'ພາສາລາວ']

let failures = 0
const pass = (name, extra = '') => console.log(`  ✓ ${name}${extra ? ` — ${extra}` : ''}`)
const fail = (name, err) => {
  failures++
  console.error(`  ✗ ${name}\n      ${String(err).split('\n').slice(0, 6).join('\n      ')}`)
}

function check(name, fn) {
  try {
    const extra = fn()
    pass(name, extra)
  } catch (err) {
    fail(name, err)
  }
}

function run(cmd, args, cwd) {
  return execFileSync(cmd, args, {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' },
  })
}

const scratch = mkdtempSync(join(tmpdir(), 'lao-segmenter-verify-'))
console.log(`scratch: ${scratch}\n`)

try {
  // ─── Pack + install ────────────────────────────────────────────────────────
  console.log('packing and installing the tarball…')
  const packOut = run('npm', ['pack', '--pack-destination', scratch, '--silent'], ROOT)
  const tarball = packOut.trim().split('\n').pop().trim()
  const tarballPath = join(scratch, tarball)

  writeFileSync(
    join(scratch, 'package.json'),
    JSON.stringify({ name: 'verify-consumer', version: '1.0.0', private: true }, null, 2)
  )
  run('npm', ['install', '--no-audit', '--no-fund', '--silent', tarballPath], scratch)
  console.log(`installed ${tarball}\n`)

  const pkgDir = join(scratch, 'node_modules', 'lao-segmenter')

  // ─── 1–3. Node loaders ─────────────────────────────────────────────────────
  console.log('node loaders:')

  const esmProbe = `
import { segment, Segmenter, getLaoWords, DICTIONARY_SIZE } from 'lao-segmenter'
import { Segmenter as CoreSeg, buildTrie } from 'lao-segmenter/core'
import { getLaoWords as dictWords } from 'lao-segmenter/dictionary'
import laoDefault from 'lao-segmenter'

const out = segment(${JSON.stringify(SAMPLE)})
if (JSON.stringify(out) !== ${JSON.stringify(JSON.stringify(EXPECTED))}) throw new Error('segment(): ' + JSON.stringify(out))
if (getLaoWords().length !== DICTIONARY_SIZE) throw new Error('dictionary size mismatch')
if (dictWords().length !== DICTIONARY_SIZE) throw new Error('subpath dictionary mismatch')
if (new Segmenter().segment(${JSON.stringify(SAMPLE)}).length !== 3) throw new Error('Segmenter')
if (new CoreSeg({ trie: buildTrie(['ດີ']) }).segment('ດີ')[0] !== 'ດີ') throw new Error('core')
if (typeof laoDefault.segment !== 'function') throw new Error('default export')
console.log('ESM_OK ' + DICTIONARY_SIZE)
`
  writeFileSync(join(scratch, 'probe.mjs'), esmProbe)
  check('ESM import (.mjs)', () => run('node', ['probe.mjs'], scratch).trim())

  const cjsProbe = `
const { segment, Segmenter, getLaoWords } = require('lao-segmenter')
const core = require('lao-segmenter/core')
const dict = require('lao-segmenter/dictionary')

const out = segment(${JSON.stringify(SAMPLE)})
if (JSON.stringify(out) !== ${JSON.stringify(JSON.stringify(EXPECTED))}) throw new Error('segment(): ' + JSON.stringify(out))
if (typeof Segmenter !== 'function') throw new Error('Segmenter missing')
if (getLaoWords().length !== dict.DICTIONARY_SIZE) throw new Error('dictionary mismatch')
if (typeof core.buildTrie !== 'function') throw new Error('core subpath')
console.log('CJS_OK ' + dict.DICTIONARY_SIZE)
`
  writeFileSync(join(scratch, 'probe.cjs'), cjsProbe)
  check('CJS require (.cjs)', () => run('node', ['probe.cjs'], scratch).trim())

  // ─── 4–5. Bundler / edge compatibility ─────────────────────────────────────
  console.log('\nbundlers and edge runtimes:')

  // esbuild ships with tsup, so it is already on disk.
  const esbuild = (await import('esbuild')).default ?? (await import('esbuild'))

  const bundleEntry = join(scratch, 'entry.js')
  writeFileSync(
    bundleEntry,
    `import { segment } from 'lao-segmenter'\nglobalThis.__out = segment(${JSON.stringify(SAMPLE)})\n`
  )

  for (const platform of ['browser', 'neutral']) {
    check(`esbuild bundle (platform: ${platform})`, () => {
      const result = esbuild.buildSync({
        entryPoints: [bundleEntry],
        bundle: true,
        write: false,
        format: 'esm',
        platform,
        absWorkingDir: scratch,
        conditions: platform === 'neutral' ? ['worker', 'browser', 'import'] : undefined,
        logLevel: 'silent',
      })
      const code = result.outputFiles[0].text
      for (const forbidden of ['require("fs")', 'node:fs', 'node:path', '__dirname', '__filename']) {
        if (code.includes(forbidden)) throw new Error(`bundle contains ${forbidden}`)
      }
      // The bundle must actually run with no Node globals available.
      const ctx = { globalThis: undefined, console }
      ctx.globalThis = ctx
      vm.createContext(ctx)
      vm.runInContext(
        esbuild.transformSync(code, { format: 'iife' }).code,
        ctx
      )
      if (JSON.stringify(ctx.__out) !== JSON.stringify(EXPECTED)) {
        throw new Error('bundled output: ' + JSON.stringify(ctx.__out))
      }
      return `${(code.length / 1024).toFixed(0)} KB, runs with no Node globals`
    })
  }

  check('core subpath tree-shakes the dictionary away', () => {
    const coreEntry = join(scratch, 'core-entry.js')
    writeFileSync(
      coreEntry,
      `import { Segmenter, buildTrie } from 'lao-segmenter/core'\nglobalThis.__seg = new Segmenter({ trie: buildTrie(['ດີ']) })\n`
    )
    const result = esbuild.buildSync({
      entryPoints: [coreEntry],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      minify: true,
      absWorkingDir: scratch,
      logLevel: 'silent',
    })
    const kb = result.outputFiles[0].text.length / 1024
    if (kb > 20) throw new Error(`core bundle is ${kb.toFixed(0)} KB — dictionary leaked in`)
    return `${kb.toFixed(1)} KB minified`
  })

  // ─── 6. IIFE global build ──────────────────────────────────────────────────
  console.log('\nbrowser global (<script src>):')
  check('IIFE exposes window.LaoSegmenter', () => {
    const iife = readFileSync(join(pkgDir, 'dist', 'lao-segmenter.global.js'), 'utf-8')
    const ctx = { console }
    ctx.window = ctx
    ctx.globalThis = ctx
    ctx.self = ctx
    vm.createContext(ctx)
    vm.runInContext(iife, ctx)
    const api = ctx.LaoSegmenter
    if (!api || typeof api.segment !== 'function') throw new Error('window.LaoSegmenter.segment missing')
    if (typeof api.Segmenter !== 'function') throw new Error('window.LaoSegmenter.Segmenter missing')
    const out = api.segment(SAMPLE)
    if (JSON.stringify(out) !== JSON.stringify(EXPECTED)) throw new Error(JSON.stringify(out))
    return `${(iife.length / 1024).toFixed(0)} KB`
  })

  // ─── 7. TypeScript resolution ──────────────────────────────────────────────
  console.log('\ntypescript:')
  const tsSrc = `
import { segment, Segmenter, getLaoWords } from 'lao-segmenter'
import { Segmenter as CoreSegmenter, buildTrie, type SegmentOptions } from 'lao-segmenter/core'
import { DICTIONARY_SIZE } from 'lao-segmenter/dictionary'

const opts: SegmentOptions = { keepWhitespace: false }
const tokens: string[] = segment('ສະບາຍດີ', opts)
const seg: Segmenter = new Segmenter({ customWords: ['ກກ'] })
const core: CoreSegmenter = new CoreSegmenter({ trie: buildTrie(['ກ']) })
const size: number = DICTIONARY_SIZE
const words: readonly string[] = getLaoWords()
export { tokens, seg, core, size, words }
`
  writeFileSync(join(scratch, 'probe.ts'), tsSrc)

  const tscBin = join(ROOT, 'node_modules', '.bin', 'tsc')
  for (const [resolution, module] of [
    ['bundler', 'esnext'],
    ['node16', 'node16'],
  ]) {
    check(`tsc --moduleResolution ${resolution}`, () => {
      writeFileSync(
        join(scratch, `tsconfig.${resolution}.json`),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            target: 'es2020',
            module,
            moduleResolution: resolution,
            types: [],
          },
          files: ['probe.ts'],
        })
      )
      run('node', [tscBin, '-p', `tsconfig.${resolution}.json`], scratch)
      return 'types resolve'
    })
  }

  // ─── Tarball contents ──────────────────────────────────────────────────────
  console.log('\ntarball:')
  check('ships all entry points', () => {
    const files = readdirSync(join(pkgDir, 'dist'))
    const required = [
      'index.mjs',
      'index.cjs',
      'index.d.ts',
      'index.d.cts',
      'core.mjs',
      'core.cjs',
      'core.d.ts',
      'dictionary.mjs',
      'dictionary.cjs',
      'dictionary.d.ts',
      'lao-segmenter.global.js',
    ]
    const missing = required.filter((f) => !files.includes(f))
    if (missing.length) throw new Error(`missing: ${missing.join(', ')}`)
    return `${files.length} files`
  })
} finally {
  rmSync(scratch, { recursive: true, force: true })
}

console.log('')
if (failures > 0) {
  console.error(`${failures} check(s) failed`)
  process.exit(1)
}
console.log('all package checks passed')
