import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import subsetFont from 'subset-font';
import { create as readFont } from 'fontkit';

export const PUBLISH_PATHS = [
  'start/index.html', 'start/style.css', 'start/script.js',
  'scripts/resume-download.js',
  'robots.txt', 'sitemap.xml',
];
export const FONT_FILES = {
  scene: 'media/fonts/LXGWWenKaiLite-site.woff',
  dom: 'media/fonts/LXGWWenKaiLite-site.woff2',
  full: 'media/fonts/LXGWWenKaiLite-Regular.ttf',
};

const readMediaManifest = async root => JSON.parse(await readFile(resolve(root, 'public/media/manifest.json'), 'utf8'));
async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => {
    const child = resolve(path, entry.name);
    return entry.isDirectory() ? walk(child) : [child];
  }))).flat().sort();
}

export async function collectFontText(root) {
  const files = [resolve(root, 'index.html'), ...await walk(resolve(root, 'src')), ...await walk(resolve(root, 'public/start'))]
    .filter(file => /\.(?:jsx?|json|scss|html|css)$/.test(file));
  const text = (await Promise.all(files.map(file => readFile(file, 'utf8')))).join('\n');
  // 列表与 details 的浏览器默认标记也会使用页面字体。
  return [...new Set([...text, ...Array.from({ length: 95 }, (_, i) => String.fromCodePoint(32 + i)), ...'•◦▪▶▼▸▾', '\u00a0'])]
    .filter(char => char.codePointAt(0) >= 32)
    .sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join('');
}

function unicodeRanges(codepoints) {
  const ranges = [];
  for (const point of codepoints) {
    const last = ranges.at(-1);
    if (last && point === last[1] + 1) last[1] = point;
    else ranges.push([point, point]);
  }
  return ranges.map(([a, b]) => `U+${a.toString(16)}${a === b ? '' : `-${b.toString(16)}`}`).join(',');
}

export async function prepareFonts(root) {
  const original = await readFile(resolve(root, 'public', FONT_FILES.full));
  const text = await collectFontText(root);
  const sourceFont = readFont(original);
  const characters = [...text].filter(char => sourceFont.hasGlyphForCodePoint(char.codePointAt(0))).join('');
  const unavailable = [...text].filter(char => !sourceFont.hasGlyphForCodePoint(char.codePointAt(0))).join('');
  const key = createHash('sha256').update('site-font-v2').update(original).update(characters).update(unavailable).digest('hex');
  const directory = resolve(root, '.cache/fonts', key);
  const buffers = {};
  await mkdir(directory, { recursive: true });
  for (const format of ['woff', 'woff2']) {
    const file = resolve(directory, `site.${format}`);
    try { buffers[format] = await readFile(file); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      buffers[format] = await subsetFont(original, characters, { targetFormat: format });
      await writeFile(file, buffers[format]);
    }
    const font = readFont(buffers[format]);
    const missing = [...characters].filter(char => !font.hasGlyphForCodePoint(char.codePointAt(0)));
    if (missing.length) throw new Error(`字体子集缺字：${missing.join('')}`);
  }
  const points = [...characters].map(char => char.codePointAt(0));
  const included = new Set(points);
  const fullRange = unicodeRanges(sourceFont.characterSet.filter(point => !included.has(point)).sort((a, b) => a - b));
  const face = (url, format, range) => `@font-face{font-family:'霞鹜文楷';src:url('/${url}') format('${format}');font-weight:400;font-style:normal;font-display:swap;unicode-range:${range}}`;
  const css = face(FONT_FILES.dom, 'woff2', unicodeRanges(points)) + '\n' + face(FONT_FILES.full, 'truetype', fullRange);
  return { key, characters, unavailable, buffers, css, originalBytes: original.length };
}

export async function getPublishFiles(root) {
  const manifest = await readMediaManifest(root);
  const mediaFiles = ['media/manifest.json', ...['images', 'audio', 'video', 'fonts', 'cursors']
    .flatMap(kind => Object.values(manifest[kind]).map(path => path.replace(/^\//, '')))];
  return [...new Set([...PUBLISH_PATHS, ...mediaFiles])].map(name => ({ file: resolve(root, 'public', name), name }));
}

export function publishAssets() {
  const virtualId = '\0virtual:site-font';
  const mediaId = '\0virtual:media-manifest';
  let root;
  let fontsPromise;
  const fonts = () => fontsPromise ??= prepareFonts(root);
  return {
    name: 'site-publish-assets',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      if (id === 'virtual:site-font') return virtualId;
      if (id === 'virtual:media-manifest') return mediaId;
    },
    async load(id) {
      if (id === mediaId) return `export default ${JSON.stringify(await readMediaManifest(root))};`;
      if (id !== virtualId) return;
      const data = await fonts();
      return `export const characters=${JSON.stringify(data.characters)};export const unavailable=${JSON.stringify(data.unavailable)};export const sceneFont='/${FONT_FILES.scene}';export const fullFont='/${FONT_FILES.full}';`;
    },
    transformIndexHtml() {
      return [{ tag: 'link', attrs: { rel: 'stylesheet', href: '/media/fonts/site-font.css' }, injectTo: 'head' }];
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        const format = path === `/${FONT_FILES.scene}` ? 'woff' : path === `/${FONT_FILES.dom}` ? 'woff2' : null;
        if (!format && path !== '/media/fonts/site-font.css') return next();
        try {
          const data = await fonts();
          res.setHeader('Content-Type', format ? `font/${format}` : 'text/css; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(format ? data.buffers[format] : data.css);
        } catch (error) { next(error); }
      });
    },
    async hotUpdate(context) {
      const path = relative(root, context.file).replaceAll('\\', '/');
      if (path === 'public/media/manifest.json') {
        const module = context.server.moduleGraph.getModuleById(mediaId);
        if (module) context.server.moduleGraph.invalidateModule(module);
        context.server.ws.send({ type: 'full-reload' });
        return [];
      }
      if (!(path.startsWith('src/') || path.startsWith('public/start/') || path === 'index.html')) return;
      const previous = await fonts();
      fontsPromise = prepareFonts(root);
      const next = await fonts();
      if (previous.key !== next.key) {
        const module = context.server.moduleGraph.getModuleById(virtualId);
        if (module) context.server.moduleGraph.invalidateModule(module);
        context.server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
    async generateBundle() {
      const data = await fonts();
      for (const { file, name } of await getPublishFiles(root)) {
        this.emitFile({ type: 'asset', fileName: name, source: await readFile(file) });
      }
      this.emitFile({ type: 'asset', fileName: FONT_FILES.scene, source: data.buffers.woff });
      this.emitFile({ type: 'asset', fileName: FONT_FILES.dom, source: data.buffers.woff2 });
      this.emitFile({ type: 'asset', fileName: 'media/fonts/site-font.css', source: data.css });
      this.emitFile({ type: 'asset', fileName: 'media/fonts/site-font-coverage.json', source: JSON.stringify({ characters: data.characters, unavailable: data.unavailable }) });
    },
    async writeBundle(_options, bundle) {
      const required = [...(await getPublishFiles(root)).map(item => item.name), ...Object.values(FONT_FILES), 'media/fonts/site-font.css', 'media/fonts/site-font-coverage.json', 'index.html', 'llms.txt'];
      for (const name of required) {
        if (!bundle[name]) this.error(`发布文件缺失：${name}`);
      }
      for (const name of Object.keys(bundle)) {
        if (!name.startsWith('assets/') && !required.includes(name)) this.error(`发布清单外的文件：${name}`);
      }

      const chunks = Object.values(bundle).filter(item => item.type === 'chunk');
      const startup = new Set();
      const visit = chunk => {
        if (startup.has(chunk.fileName)) return;
        startup.add(chunk.fileName);
        chunk.imports.forEach(name => { if (bundle[name]?.type === 'chunk') visit(bundle[name]); });
      };
      chunks.filter(chunk => chunk.isEntry || chunk.facadeModuleId?.endsWith('/Experience.jsx')).forEach(visit);
      for (const room of ['Gallery', 'Studio', 'About', 'Contact']) {
        const file = `/rooms/${room}/${room}Room.jsx`;
        const chunk = chunks.find(item => item.facadeModuleId?.endsWith(file));
        if (!chunk?.isDynamicEntry) this.error(`${room} 房间需要独立加载`);
        for (const name of startup) {
          if (Object.keys(bundle[name].modules).some(module => module.endsWith(file))) this.error(`${room} 房间进入了首屏依赖`);
        }
      }

      const total = Object.values(bundle).reduce((sum, item) => sum + Buffer.byteLength(item.type === 'chunk' ? item.code : item.source), 0);
      const initialScripts = new Set(startup);
      for (const match of String(bundle['index.html'].source).matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)) {
        const name = match[1].replace(/^\//, '');
        if (bundle[name]) initialScripts.add(name);
      }
      const startupGzip = [...initialScripts].reduce((sum, name) => {
        const item = bundle[name];
        return sum + gzipSync(item.type === 'chunk' ? item.code : item.source).length;
      }, 0);
      const data = await fonts();
      const chineseBytes = data.buffers.woff.length + data.buffers.woff2.length;
      console.info(`\n发布汇总：${(total / 1024 ** 2).toFixed(2)} MiB，清单 ${new Set(required).size} 项`);
      console.info(`入口与走廊 JS gzip（含共享依赖）：${(startupGzip / 1024).toFixed(2)} KiB`);
      console.info(`中文字体首次加载：${(chineseBytes / 1024).toFixed(2)} KiB，较原始字体减少 ${(100 - chineseBytes / data.originalBytes * 100).toFixed(1)}%\n`);
    },
  };
}
