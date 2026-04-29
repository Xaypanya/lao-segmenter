import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  // Inline the dictionary .txt file as a string constant so the package
  // works in both Node.js and browsers without file-system access.
  loader: { '.txt': 'text' },
})
