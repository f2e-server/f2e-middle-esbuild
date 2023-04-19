import * as path from 'path'
import * as fs from 'fs'
import { BuildOptions } from 'esbuild'

export const html = {
    analyze: fs.readFileSync(path.join(__dirname, '../pages/analyze.html')).toString()
}
export const pathname_fixer = (str = '') => (str.match(/[^/\\]+/g) || []).join('/')
export const UUID = (prefix = '_') => prefix + Date.now().toFixed(36) + '-' + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toFixed(36)
const line_import = (item: string, index: number) => `import * as Item${index + 1} from '${item}';`
const line_export = (item: string, index: number) => `    '${item}': Item${index + 1},`
export const createExternal = (external: string[]) => {
    const content = external.map(line_import).join('\n') + `\nmodule.exports = {\n${
        external.map(line_export).join('\n')
    }\n};`
    return content
}

export const defaultOptions = (root: string): BuildOptions =>  {
    return {
        write: false,
        treeShaking: false,
        sourcemap: true,
        bundle: true,
        outdir: 'static',
        loader: {
            '.tsx': 'tsx',
            '.ts': 'ts',
        },
        format: 'iife',
        tsconfig: `${root}/tsconfig.json`,
    }
}

export const defaultTsconfig = (root: string) => {
    return {
        "compilerOptions": {
            "moduleResolution": "node",
            "module": "esnext",
            "resolveJsonModule": true,
            "sourceMap": true,
            "target": "esnext"
        },
        "include": [
            root
        ]
    }
}