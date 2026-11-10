import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression';
import { generateSeoHtml } from './seo-plugin.js';
import { publishAssets } from './scripts/publish-assets.mjs';

const START_PAGE_PATHS = new Set(['/start', '/start/']);

function rewriteStartPage(req, _res, next) {
  const [pathname, query = ''] = req.url.split('?');

  if (START_PAGE_PATHS.has(pathname)) {
    req.url = `/start/index.html${query ? `?${query}` : ''}`;
  }

  next();
}

function serveStaticStartPage() {
  return {
    name: 'serve-static-start-page',
    configureServer(server) {
      server.middlewares.use(rewriteStartPage);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewriteStartPage);
    }
  };
}

export default defineConfig({
  plugins: [
    serveStaticStartPage(), react(), publishAssets(), generateSeoHtml(),
    ...(process.env.BUILD_PRECOMPRESS === '1' ? [
      viteCompression({ algorithm: 'gzip' }),
      viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
    ] : []),
  ],
  build: {
    copyPublicDir: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('commonjsHelpers.js')) return 'runtime';
          if (id.includes('/node_modules/three/')) return 'three';
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          if (/\/node_modules\/(@react-three\/fiber|react-reconciler)\//.test(id)) return 'fiber';
        },
      },
    },
  },
})
