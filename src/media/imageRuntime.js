import { LOADING_TIMEOUT_MS } from '../utils/loadingTimeout';

// 与场景共用加载时限，给并发图片下载及浏览器排队留出时间。
export function createMediaRuntime({ timeoutMs = LOADING_TIMEOUT_MS } = {}) {
    const pending = new Map();

    function loadImage(url) {
        if (!pending.has(url)) {
            const promise = new Promise((resolve, reject) => {
                const image = new Image();
                const finish = error => {
                    clearTimeout(timer);
                    image.onload = image.onerror = null;
                    if (error) {
                        image.src = '';
                        reject(new Error(`图片加载失败：${url}`, { cause: error }));
                    } else resolve(image);
                };
                const timer = setTimeout(() => finish(new Error('图片加载超时')), timeoutMs);
                image.crossOrigin = 'anonymous';
                image.onload = () => finish();
                image.onerror = finish;
                image.src = url;
            }).catch(error => {
                pending.delete(url);
                throw error;
            });
            pending.set(url, promise);
        }
        return pending.get(url);
    }

    return { loadImage };
}
