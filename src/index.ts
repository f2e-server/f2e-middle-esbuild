import { MiddlewareCreater } from 'f2e-server'
import * as esbuild from 'esbuild'
import * as path from 'path'
import * as zlib from 'zlib'

namespace creater {
    export interface BuildOptions extends esbuild.BuildOptions {
        watches?: RegExp[]
    }
}
const creater: MiddlewareCreater = (conf, options = {}) => {
    const { root, gzip, build } = conf
    const { esbuildrc = '.esbuildrc.js' } = options
    const {
        watches = [/\.[jet]?sx?$/],
        entryPoints,
        ...base_config
    }: creater.BuildOptions = require(path.join(root, esbuildrc));

    const data_map = new Map<string, any>()
    const building_set = new Set<string>()
    return {
        onSet: async (pathname, data, store) => {
            if (entryPoints.includes(pathname)) {
                building_set.add(pathname);
                try {
                    const result = await esbuild.build({
                        ...base_config,
                        entryPoints: [path.join(root, pathname)],
                        write: false,
                        minify: build
                    });
                    const outputFiles = result.outputFiles;
                    if (outputFiles && outputFiles.length) {
                        for (let i = 0; i < outputFiles.length; i++) {
                            const outputFile = outputFiles[i];
                            const outputPath = path.relative(root, outputFile.path);
                            let info: any = outputFile.contents
                            if (outputFile.path.endsWith('.js')) {
                                let map_file = "\n//# sourceMappingURL=" + outputFile.path.split('/').pop().replace('.js', '.js.map') + '\n'
                                info = Buffer.concat([info, new Uint8Array(map_file.split('').map(c => c.charCodeAt(0)))]).buffer
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
                building_set.delete(pathname);
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
                for (let i = 0; i < entryPoints.length; i++) {
                    if (!building_set.has(entryPoints[i])) {
                        const key = `esbuild: ${entryPoints[i]}`
                        console.time(key)
                        await build(entryPoints[i])
                        console.timeEnd(key)
                    }
                }
            }
        }
    }
}
export = creater


