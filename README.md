# f2e-middle-esbuild
f2e-server middleware for esbuild

## install
- `npm i --save-dev f2e-server f2e-middle-esbuild`
- `cp ./node_modules/f2e-middle-esbuild/.esbuildrc.js ./`

## config
`.f2econfig.js` 中添加:
```js
module.exports = {
    ...
    middleware: [
        ...
        {
            middleware: 'esbuild',
            // 针对哪些文件监听修改
            watches: [/\.[jet]?sx?$/],
        }
    ]
}
```
更多参数请参考: [src/index.ts](src/index.ts#L16)

## options
`.esbuildrc.js` 参考 [esbuild.ts](https://github.com/evanw/esbuild/blob/master/lib/types.ts#L27) and [esbuild.md](https://github.com/evanw/esbuild#command-line-usage)
```js
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
```

## import
`index.html`
```html
<html>
    <body>
        <script src=".esbuild/external.ts"></script>
        <script src="src/index.tsx"></script>
    </body>
</html>
```

## Bundle Size Analyzer
访问 [http://localhost:2850/static/index.js.html](http://localhost:2850/static/libs.js.html)
看到如下图：
![Bundle Size Analyzer](pages/analyze.png)