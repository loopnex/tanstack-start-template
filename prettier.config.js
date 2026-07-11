//  @ts-check

/** @type {import('prettier').Config} */
const config = {
  plugins: ['prettier-plugin-organize-imports', 'prettier-plugin-tailwindcss'],
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  tailwindStylesheet: './src/styles.css',
  tailwindFunctions: ['cva', 'cn'],
}

export default config
