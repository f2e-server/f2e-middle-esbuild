// @ts-check

/**
 * @type { import('.').BuildOptions | import('.').BuildOptions[] }
 */
let config = {
    sourcemap: true,
    external: ['serve/interface.ts'],
    entryPoints: {
        index: 'src/index.tsx'
    },
    outdir: 'static',
    target: 'chrome70',
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