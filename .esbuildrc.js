// @ts-check

/**
 * @type { import('.').BuildOptions }
 */
let config = {
    watches: [/\.[jet]?sx?$/],
    sourcemap: 'external',
    external: ['serve/interface.ts'],
    entryPoints: ['src/index.tsx'],
    outfile: 'static/bundle.js',
    target: 'esnext',
    jsxFactory: 'React.createElement',
    bundle: true,
    format: 'iife',
    loader: {
        '.tsx': 'tsx',
        '.ts': 'ts'
    },
    tsconfig: './tsconfig.json',
};

module.exports = config