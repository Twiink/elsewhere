import { Loader, Texture } from 'three';
import { loadImage } from './index';

export class MediaTextureLoader extends Loader {
    load(url, onLoad, _onProgress, onError) {
        const source = this.manager.resolveURL((this.path || '') + url);
        const texture = new Texture();
        this.manager.itemStart(source);
        loadImage(source).then(image => {
            texture.image = image;
            texture.needsUpdate = true;
            try { onLoad?.(texture); }
            finally { this.manager.itemEnd(source); }
        }, error => {
            this.manager.itemError(source);
            try { onError?.(error); }
            finally { this.manager.itemEnd(source); }
        });
        return texture;
    }
}
