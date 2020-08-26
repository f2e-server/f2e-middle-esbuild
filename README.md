# f2e-middle-esbuild
f2e-server middleware for esbuild

## install
- `npm i f2e-middle-esbuild`
- `cp ./node_modules/f2e-middle-esbuild/.esbuildrc.js`

## config
`.f2econfig.js` 中添加:
```js
module.exports = {
    ...
    middleware: [
        ...
        { middleware: 'esbuild' }
    ]
}
```

## options
`.esbuildrc.js` 参考 [esbuild.ts](https://github.com/evanw/esbuild/blob/master/lib/types.ts#L27) and [esbuild.md](https://github.com/evanw/esbuild#command-line-usage)
```js
// @ts-check

/**
 * @type { import('f2e-middle-esbuild').BuildOptions }
 */
let config = {
    // 针对哪些文件监听修改
    watches: [/\.[jet]?sx?$/],
    sourcemap: 'external',
    external: [
        'serve/interface.ts',
        'react',
        'react-dom',
    ],
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
```

## external 相关
一般需要前置引入第三方库 例如: `src/libs.js`
> `$include["dev模式引入资源"]["build模式引入资源"]` 是 [f2e-server](https://github.com/shy2850/f2e-server/blob/master/lib/middleware/include.js) 内置工具
```js
require = function (key) {
    return ({
        'react': React,
        'react-dom': ReactDOM,
    })[key]
};
$include['../node_modules/react/umd/react.development.js']['../node_modules/react/umd/react.production.min.js'];
$include['../node_modules/react-dom/umd/react-dom.development.js']['../node_modules/react-dom/umd/react-dom.production.min.js'];
```
`index.html`
```html
<html>
    <body>
        <script src="/src/lib.js?v1.0.0"></script>
        <script src="/static/bundle.js?v1.0.0"></script>
    </body>
</html>
```