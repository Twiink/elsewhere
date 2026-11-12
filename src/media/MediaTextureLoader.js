import { Loader } from 'three';
import { loadImage } from './index';
import { createTextureCache } from './textureCache';
import { prepareTexture, preparePrefetchedTextures } from '../utils/renderPreparation';

const textures = createTextureCache(loadImage);
const rendererLoaders = new WeakMap();

export function getRendererTextureLoader(renderer) {
    if (!rendererLoaders.has(renderer)) rendererLoaders.set(renderer, new MediaTextureLoader(undefined, renderer));
    return rendererLoaders.get(renderer);
}

export async function preloadMediaTextures(urls, { upload = true } = {}) {
    const loaded = await Promise.all(urls.map(url => textures.get(url).promise));
    if (upload) await preparePrefetchedTextures(loaded);
    return loaded;
}

export function clearMediaTextures(urls) {
    urls.forEach(url => textures.clear(url));
}

export class MediaTextureLoader extends Loader {
    constructor(manager, renderer) {
        super(manager);
        this.renderer = renderer;
    }

    load(url, onLoad, _onProgress, onError) {
        const source = this.manager.resolveURL((this.path || '') + url);
        const entry = textures.get(source);
        this.manager.itemStart(source);
        entry.promise.then(async texture => {
            if (this.renderer) await prepareTexture(this.renderer, texture);
            return texture;
        }).then(texture => {
            try { onLoad?.(texture); }
            finally { this.manager.itemEnd(source); }
        }, error => {
            this.manager.itemError(source);
            try { onError?.(error); }
            finally { this.manager.itemEnd(source); }
        });
        return entry.texture;
    }
}
