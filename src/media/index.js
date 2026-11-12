import manifest from 'virtual:media-manifest';
import { createMediaRuntime } from './imageRuntime';

export const media = manifest;
export const { loadImage } = createMediaRuntime();

export function localImagePath(sourcePath) {
    const key = String(sourcePath).replace(/^\/+/, '').split(/[?#]/, 1)[0];
    const path = manifest.images[key];
    if (!path) throw new Error(`本地图片未登记：${key}`);
    return path;
}
