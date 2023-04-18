// @ts-check

/**
 * @type { import('f2e-middle-esbuild').BuildOptions[] }
 */
let config = [
    {
        sourcemap: true,
        treeShaking: false,
        entryPoints: {
            libs: 'src/index.libs.tsx',
        },
        outdir: 'static',
        target: 'chrome70',
        bundle: true,
        format: 'iife',
        globalName: '__LIBS__',
        loader: {
            '.tsx': 'tsx',
            '.ts': 'ts',
        },
        tsconfig: './tsconfig.json',
    }, {
        sourcemap: true,
        external: [
            'react',
            'react-dom',
        ],
        inject: ['src/inject.js'],
        entryPoints: {
            index: 'src/index.tsx'
        },
        target: 'esnext',
        jsxFactory: 'React.createElement',
        bundle: true,
        format: 'iife',
        loader: {
            '.tsx': 'tsx',
            '.ts': 'ts'
        },
        tsconfig: './tsconfig.json',
    },
];

module.exports = config