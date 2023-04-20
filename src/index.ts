import { MiddlewareCreater, SetResult } from 'f2e-server'
import * as esbuild from 'esbuild'
import * as path from 'path'
import * as fs from 'fs'
import { createExternal, defaultOptions, defaultTsconfig, html, pathname_fixer } from './utils'

namespace creater {
    export interface BuildOptions extends esbuild.BuildOptions {
        ignore_external?: boolean
    }
}

const creater: MiddlewareCreater = (conf, options = {}) => {
    const { root, build } = conf
    const {
        /** 默认配置文件地址 */
        esbuildrc = '.esbuildrc.js',
        /** 针对哪些文件监听修改 */
        watches = [/\.[jet]?sx?$/],
        /** 临时文件地址，需要添加到 .gitignore */
        cacheRoot = '.esbuild',
        /** external文件名称生成方式 */
        externalName = (index: number) => `external${index > 0 ? `.${index}` : ''}.ts`,
        /** external导出变量名 */
        moduleName = (index: number) => `__LIBS_${index}__`,
        /** 运行时修改的通用esbuild编译参数不含 external 包 */
        options: runtimeOptions,
        /** 运行时修改的external编译参数 */
        externalOptions = {},
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
            ignore_external = false,
            ...base_config
        }: creater.BuildOptions = Object.assign({}, op, runtimeOptions);

        const { external = [] } = base_config
        const globalName = moduleName(index)

        if (external.length > 0 && !ignore_external) {
            const libname = externalName(index)
            fs.writeFileSync(path.join(cache_root, libname), createExternal(external))
            const entry = `${cacheRoot}/${libname}`
            all.set(entry, {
                ...require(cache_esbuild),
                ...externalOptions,
                minify: build,
                entryPoints: [entry],
                globalName,
                footer: {
                    js: `require = function (n) {
                        var m = ${globalName}[n];
                        if (!m && '.' != n[0]) {
                            console.error('module not found:', n);
                        }
                        if (m.default) {
                            m = Object.assign(m.default, m)
                        }
                        return m;
                    };\n`
                },
            })
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
            let result_js: SetResult = {
                outputPath: pathname,
                data,
            }
            const entry = option_map.get(pathname)
            if (!entry) {
                return result_js
            }
            const options: esbuild.BuildOptions = {
                write: false,
                metafile: true,
                minify: build,
                ...entry,
            }
            try {
                const result = await (async function (build) {
                    if (build) {
                        return esbuild.build(options)
                    }
                    let ctx = ctx_map.get(pathname)
                    if (!ctx) {
                        ctx = await esbuild.context(options)
                        ctx_map.set(pathname, ctx)
                    }
                    return ctx.rebuild()
                })(build)

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
                                    end: true,
                                }
                                
                            }
                        }
                    }
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

