// 主站与独立起始页共用此实现；发布插件将同一个函数输出为独立浏览器脚本。
export function createMediaRuntime(manifest, { timeoutMs = 8000 } = {}) {
    const pending = new Map();
    const failed = new Set();
    let installed = false;

    function imageKey(url) {
        return typeof url === 'string' && url.startsWith(manifest.cdnBase)
            ? url.slice(manifest.cdnBase.length).split(/[?#]/)[0]
            : null;
    }

    function localImageUrl(url) {
        return manifest.images[imageKey(url)] || null;
    }

    function preferredImageUrl(url) {
        return failed.has(imageKey(url)) ? localImageUrl(url) || url : url;
    }

    function requestImage(url) {
        return new Promise((resolve, reject) => {
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
        });
    }

    // 预取、CSS 背景与三维纹理共用请求；只有 CDN 失败/超时后才请求本地文件。
    function loadImage(url) {
        if (!pending.has(url)) {
            const primary = preferredImageUrl(url);
            const promise = requestImage(primary).catch(error => {
                const local = localImageUrl(url);
                if (!local || primary === local) throw error;
                failed.add(imageKey(url));
                return requestImage(local);
            }).catch(error => {
                pending.delete(url);
                throw error;
            });
            pending.set(url, promise);
        }
        return pending.get(url);
    }

    function install() {
        if (installed) return;
        installed = true;
        const timers = new WeakMap();
        const styles = new WeakSet();
        const posters = new WeakMap();
        const icons = new WeakSet();
        const clearTimer = image => clearTimeout(timers.get(image));
        const fallbackImage = image => {
            clearTimer(image);
            const src = image.getAttribute('src');
            const local = localImageUrl(src);
            if (!local) return;
            failed.add(imageKey(src));
            image.removeAttribute('srcset');
            image.src = local;
        };
        const startTimer = image => {
            clearTimer(image);
            if (localImageUrl(image.getAttribute('src')) && !image.complete) {
                timers.set(image, setTimeout(() => fallbackImage(image), timeoutMs));
            }
        };
        const lazyObserver = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
            for (const entry of entries) if (entry.isIntersecting) {
                lazyObserver.unobserve(entry.target);
                startTimer(entry.target);
            }
        });

        function watchImage(image) {
            clearTimer(image);
            const src = image.getAttribute('src');
            if (!localImageUrl(src)) return;
            if (failed.has(imageKey(src)) || (image.complete && !image.naturalWidth)) fallbackImage(image);
            else if (image.loading === 'lazy') lazyObserver?.observe(image);
            else startTimer(image);
        }

        function watchPoster(video) {
            const src = video.getAttribute('poster');
            if (!localImageUrl(src) || posters.get(video) === src) return;
            posters.set(video, src);
            loadImage(src).then(image => {
                if (video.getAttribute('poster') === src) video.poster = image.src;
            }).catch(() => {});
        }

        function watchIcon(icon) {
            if (icons.has(icon) || !localImageUrl(icon.href)) return;
            icons.add(icon);
            loadImage(icon.href).then(image => { icon.href = image.src; }).catch(() => {});
        }

        // 遍历同源 CSS，兼顾伪元素、自定义属性及延迟加载的样式表。
        function watchStyle(style) {
            if (styles.has(style)) return;
            styles.add(style);
            for (const property of Array.from(style)) {
                const value = style.getPropertyValue(property);
                for (const match of value.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
                    const url = match[1];
                    if (!localImageUrl(url)) continue;
                    loadImage(url).then(image => {
                        if (image.src !== url) {
                            style.setProperty(property, style.getPropertyValue(property).split(url).join(image.src), style.getPropertyPriority(property));
                        }
                    }).catch(() => {});
                }
            }
        }

        function watchRules(sheet) {
            let rules;
            try { rules = sheet.cssRules; } catch { return; }
            for (const rule of rules || []) {
                if (rule.style) watchStyle(rule.style);
                if (rule.cssRules) watchRules(rule);
                if (rule.styleSheet) watchRules(rule.styleSheet);
            }
        }

        function watchElement(node) {
            if (node.nodeType !== 1) return;
            if (node.matches('img')) watchImage(node);
            if (node.matches('video[poster]')) watchPoster(node);
            if (node.matches('link[rel~="icon"], link[rel="apple-touch-icon"]')) watchIcon(node);
            if (node.matches('style, link[rel="stylesheet"]') && node.sheet) watchRules(node.sheet);
            if (node.hasAttribute('style')) watchStyle(node.style);
        }

        function watchNode(node) {
            if (node.nodeType !== 1) return;
            watchElement(node);
            node.querySelectorAll('img, video[poster], link[rel~="icon"], link[rel="apple-touch-icon"], style, link[rel="stylesheet"], [style]').forEach(watchElement);
        }

        document.addEventListener('error', event => {
            if (event.target instanceof HTMLImageElement) fallbackImage(event.target);
        }, true);
        document.addEventListener('load', event => {
            if (event.target instanceof HTMLImageElement) clearTimer(event.target);
            if (event.target instanceof HTMLLinkElement && event.target.sheet) watchRules(event.target.sheet);
        }, true);
        document.addEventListener('click', event => {
            const link = event.target.closest?.('a[href]');
            if (link) {
                const preferred = preferredImageUrl(link.href);
                if (preferred !== link.href) link.href = preferred;
            }
        }, true);
        new MutationObserver(records => {
            for (const record of records) {
                if (record.type === 'attributes') watchNode(record.target);
                else record.addedNodes.forEach(watchNode);
            }
        }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset', 'poster'] });
        Array.from(document.styleSheets).forEach(watchRules);
        watchNode(document.documentElement);
    }

    return { loadImage, localImageUrl, preferredImageUrl, install };
}
