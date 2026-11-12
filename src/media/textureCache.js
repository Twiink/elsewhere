import { Texture } from 'three';

// 图片预取、单图和数组加载共用同一个基础纹理；采样参数由调用处的副本持有。
export function createTextureCache(loadImage) {
    const entries = new Map();

    return {
        get(url) {
            if (!entries.has(url)) {
                const texture = new Texture();
                const promise = Promise.resolve().then(() => loadImage(url)).then(image => {
                    texture.image = image;
                    texture.needsUpdate = true;
                    return texture;
                }).catch(error => {
                    if (entries.get(url)?.texture === texture) entries.delete(url);
                    texture.dispose();
                    throw error;
                });
                entries.set(url, { texture, promise });
            }
            return entries.get(url);
        },
        clear(url) {
            // 已挂载的场景可能仍在使用该纹理，清除缓存时不销毁它。
            entries.delete(url);
        },
    };
}
