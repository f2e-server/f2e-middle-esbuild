import { MiddlewareCreater } from 'f2e-server'
import * as esbuild from 'esbuild'
import * as path from 'path'
import * as zlib from 'zlib'

const fixPathArr = (pathname: string): string[] => pathname ? (pathname.match(/[^\\/]+/g) || []) : []
const fixPath = (pathname: string): string => fixPathArr(pathname).join('/')

namespace creater {
    export interface BuildOptions extends esbuild.BuildOptions {
        watches?: RegExp[]
    }
}
const creater: MiddlewareCreater = (conf, options = {}) => {
    const { root, gzip, build } = conf
    const { esbuildrc = '.esbuildrc.js', options: runtimeOptions } = options
    const {
        watches = [/\.[jet]?sx?$/],
        entryPoints,
        ...base_config
    }: creater.BuildOptions = Object.assign({}, require(path.join(root, esbuildrc)), runtimeOptions);

    const entries = Object.entries(entryPoints)
    const data_map = new Map<string, any>()
    // 编译中的文件
    const building_set = new Set<string>()
    // 等待编译的文件
    const needbuilds = new Set<string>()
    return {
        onSet: async (pathname, data, store) => {
            const entry = entries.find(([k, v]) => v === pathname)
            if (entry) {
                try {
                    const [k, v] = entry
                    const result = await esbuild.build({
                        ...base_config,
                        entryPoints: isNaN(Number(k)) ? [v] : {[k]: v},
                        write: false,
                        minify: build
                    });
                    const outputFiles = result.outputFiles;
                    if (outputFiles && outputFiles.length) {
                        for (let i = 0; i < outputFiles.length; i++) {
                            const outputFile = outputFiles[i];
                            const outputPath = fixPath(path.relative(root, outputFile.path));
                            let info = Buffer.concat([outputFile.contents]);
                            if (outputPath.endsWith('.js')) {
                                let map_file = "\n//# sourceMappingURL=" + outputPath.split('/').pop().replace('.js', '.js.map') + '\n'
                                info = Buffer.concat([outputFile.contents, new Uint8Array(map_file.split('').map(c => c.charCodeAt(0)))])
                            }
                            store._set(outputPath, info);
                            data_map.set(outputPath, info);
                        }
                    }
                }
                catch (e) {
                    console.log(e)
                    return data;
                }
            }
            return data;
        },
        onRoute: (pathname, req, resp) => {
            const data = data_map.get(pathname)
            if (gzip && data) {
                resp.writeHead(200, {
                    'Content-Type': 'application/javascript; charset=utf-8',
                    'Content-Encoding': gzip ? 'gzip' : 'utf-8',
                })
                resp.end(gzip ? zlib.gzipSync(data): data)
                return false
            }
        },
        buildWatcher: async (pathname, type, build) => {
            const find = watches.find(reg => reg.test(pathname))
            if (find) {
                entries.forEach(async ([k, entry]) => {
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
                })
            }
        }
    }
}
export = creater


