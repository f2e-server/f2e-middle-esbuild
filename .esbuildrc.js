// @ts-check

/**
 * @type { import('f2e-middle-esbuild').BuildOptions[] }
 */
let config = [
    {
        sourcemap: true,
        /**
         * 启动时生成 .esbuild/external.ts 
         */
        external: [
            'react',
            'react-dom',
        ],
        /**
         * 设置为true时， 不生成 .esbuild/external.ts
         * @description 自定义参数
         */
        ignore_external: false,
        
        entryPoints: {
            index: 'src/index.tsx'
        },
        target: 'chrome70',
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