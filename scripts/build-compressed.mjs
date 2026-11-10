import { build } from 'vite';

process.env.BUILD_PRECOMPRESS = '1';
await build();
