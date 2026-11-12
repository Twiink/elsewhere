export function createMediaRuntime({ timeoutMs = 8000 } = {}) {
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
