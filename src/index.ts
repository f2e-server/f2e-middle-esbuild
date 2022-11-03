import { MiddlewareCreater } from 'f2e-server'
import * as esbuild from 'esbuild'
import * as path from 'path'

const pathname_fixer = (str = '') => (str.match(/[^/\\]+/g) || []).join('/')

namespace creater {
    export interface BuildOptions extends esbuild.BuildOptions {
        watches?: RegExp[]
    }
}
const creater: MiddlewareCreater = (conf, options = {}) => {
    const { root, build } = conf
    const { esbuildrc = '.esbuildrc.js', options: runtimeOptions } = options
    const {
        watches = [/\.[jet]?sx?$/],
        entryPoints,
        ...base_config
    }: creater.BuildOptions = Object.assign({}, require(path.join(root, esbuildrc)), runtimeOptions);
    
    const entries = Object.entries(entryPoints)

    /** 缓存的编译配置，增量执行 */
    const result_map = new Map<string, esbuild.BuildIncremental>()
    /** 文件依赖，前面是entries */
    const deps_map = new Map<string, string[]>()
    // 编译中的文件
    const building_set = new Set<string>()
    // 等待编译的文件
    const needbuilds = new Set<string>()
    return {
        onSet: async (pathname, data, store) => {
            try {
                const provider = result_map.get(pathname)
                let result = provider as any
                
                if (provider) {
                    result = await provider.rebuild()
                } else {
                    const entry = entries.find(([k, v]) => v === pathname)
                    if (entry) {
                        const [k, v] = entry
                        result = await esbuild.build({
                            incremental: true,
                            ...base_config,
                            entryPoints: isNaN(Number(k)) ? {[k]: v} : [v],
                            write: false,
                            metafile: true,
                            minify: build
                        });
                        result_map.set(pathname, result)
                    }
                }
                if (result) {
                    const outputFiles = result.outputFiles;
                    if (outputFiles && outputFiles.length) {
                        for (let i = 0; i < outputFiles.length; i++) {
                            const outputFile = outputFiles[i];
                            const outputPath = pathname_fixer(path.relative(root, outputFile.path));
                            let info = Buffer.concat([outputFile.contents]);
                            if (outputPath.endsWith('.js')) {
                                let map_file = "\n//# sourceMappingURL=" + outputPath.split('/').pop().replace('.js', '.js.map') + '\n'
                                info = Buffer.concat([outputFile.contents, new Uint8Array(map_file.split('').map(c => c.charCodeAt(0)))])
                            }
                            store._set(outputPath, info);
                            deps_map.set(pathname, Object.keys(result.metafile.inputs || {}).map(i => pathname_fixer(i)));
                        }
                    }
                }
            }
            catch (e) {
                console.log(e)
                return data;
            }
            return data;
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


