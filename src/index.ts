import { MiddlewareCreater } from 'f2e-server'
import * as esbuild from 'esbuild'
import * as path from 'path'
import * as fs from 'fs'
import { createExternal, defaultOptions, defaultTsconfig, html, pathname_fixer } from './utils'

namespace creater {
    export type BuildOptions = esbuild.BuildOptions
}

const creater: MiddlewareCreater = (conf, options = {}) => {
    const { root, build } = conf
    const {
        esbuildrc = '.esbuildrc.js',
        watches = [/\.[jet]?sx?$/],
        cacheRoot = '.esbuild',
        externalName = (index: number) => `external${index > 0 ? `.${index}` : ''}.ts`,
        moduleName = (index: number) => `__LIBS_${index}__`,
        scope = 'window',
        options: runtimeOptions,
    } = options
    const cache_root = path.join(root, cacheRoot)
    if (!fs.existsSync(cache_root)) {
        fs.mkdirSync(cache_root)
    }
    const cache_esbuild = path.join(cache_root, 'esbuild.json')
    if (!fs.existsSync(cache_esbuild)) {
        fs.writeFileSync(cache_esbuild, JSON.stringify(defaultOptions(cacheRoot), null, 2))
    }
    const cache_tsconfig = path.join(cache_root, 'tsconfig.json')
    // 写入默认打包tsconfig
    if (!fs.existsSync(cache_tsconfig)) {
        fs.writeFileSync(cache_tsconfig, JSON.stringify(defaultTsconfig(cacheRoot), null, 2))
    }
    const option_map = ([].concat(require(path.join(root, esbuildrc))) as creater.BuildOptions[]).reduce((all, op, index) => {
        const {
            entryPoints,
            ...base_config
        }: creater.BuildOptions = Object.assign({}, op, runtimeOptions);

        const { external = [] } = base_config
        const globalName = moduleName(index)

        if (external.length > 0) {
            const libname = externalName(index)
            fs.writeFileSync(path.join(cache_root, libname), createExternal(external))
            const entry = `${cacheRoot}/${libname}`
            all.set(entry, {
                ...require(cache_esbuild),
                entryPoints: [entry],
                globalName,
                footer: {
                    js: `\n${scope}['${globalName}'] = ${globalName};\n`
                },
            })
            base_config.banner = {
                js: `require = function (n) {
                    var m = ${scope}['${globalName}'][n];
                    if (!m && '.' != n[0]) {
                        console.error('module not found:', n);
                    }
                    if (m.default) {
                        m = Object.assign(m.default, m)
                    }
                    return m;
                };\n`,
            }
        }

        const entries = Object.entries(entryPoints)
        entries.forEach(([k, v]) => {
            if (typeof k === 'number') {
                all.set(v, {
                    entryPoints: [v],
                    ...base_config,
                })
            } else {
                all.set(v, {
                    entryPoints: { [k]: v },
                    ...base_config,
                })
            }
        })
        return all
    }, new Map<string, esbuild.BuildOptions>())

    /** 缓存的编译配置，增量执行 */
    const ctx_map = new Map<string, esbuild.BuildContext>()
    /** 文件依赖，前面是entries */
    const deps_map = new Map<string, string[]>()
    // 编译中的文件
    const building_set = new Set<string>()
    // 等待编译的文件
    const needbuilds = new Set<string>()
    return {
        onSet: async (pathname, data, store) => {
            try {
                let ctx = ctx_map.get(pathname)
                if (!ctx) {
                    const entry = option_map.get(pathname)
                    const options: esbuild.BuildOptions = {
                        write: false,
                        metafile: true,
                        minify: build,
                        ...entry,
                    }
                    ctx = await esbuild.context(options)
                }
                const result = await ctx.rebuild()
                let result_js = {
                    outputPath: pathname,
                    data,
                }
                if (result) {
                    const outputFiles = result.outputFiles;
                    if (outputFiles && outputFiles.length) {
                        for (let i = 0; i < outputFiles.length; i++) {
                            const outputFile = outputFiles[i];
                            const outputPath = pathname_fixer(path.relative(root, outputFile.path));
                            if (!build && /\.js$/.test(outputPath)) {
                                const meta_json = JSON.stringify(result.metafile)
                                store._set(outputPath + '.json', meta_json);
                                store._set(outputPath + '.html', html.analyze);
                            }
                            deps_map.set(pathname, Object.keys(result.metafile.inputs || {}).map(i => pathname_fixer(i)));
                            
                            let data = Buffer.concat([outputFile.contents]);
                            store._set(outputPath, data);
                            if (/\.js$/.test(outputPath)) {
                                result_js = {
                                    outputPath,
                                    data,
                                }
                                
                            }
                        }
                    }
                }
                if (build) {
                    ctx.dispose()
                }
                return result_js
            }
            catch (e) {
                console.log(e)
                return data;
            }
        },
        buildWatcher: async (pathname, type, build) => {
            const find = watches.find(reg => reg.test(pathname))
            if (find) {
                deps_map.forEach(async (deps, entry) => {
                    if (deps.includes(pathname)) {
                        if (!building_set.has(entry)) {
                            building_set.add(entry);
                            await build(entry)
                            if (needbuilds.has(entry)) {
                                needbuilds.delete(entry)
                                await build(entry)
                            }
                            building_set.delete(entry);
                        } else {
                            needbuilds.add(entry)
                        }
                    }
                })
            }
        }
    }
}
export = creater

