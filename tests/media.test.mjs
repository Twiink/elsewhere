import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createMediaRuntime } from '../src/media/imageRuntime.js';

const manifest = { cdnBase: 'https://cdn.example/space/', images: { 'photo.png': '/media/images/photo.jpg' } };
const cdn = `${manifest.cdnBase}photo.png`;
const local = manifest.images['photo.png'];

function fakeImages(t, behavior) {
    const requests = [];
    const OriginalImage = globalThis.Image;
    globalThis.Image = class {
        set src(value) {
            this.url = value;
            if (!value) return;
            requests.push(value);
            queueMicrotask(() => {
                const result = behavior(value);
                if (result === 'load') this.onload?.();
                if (result === 'error') this.onerror?.(new Error('network failure'));
            });
        }
        get src() { return this.url; }
    };
    t.after(() => { globalThis.Image = OriginalImage; });
    return requests;
}

test('CDN 正常时只请求 CDN，并合并相同图片的并发请求', async t => {
    const requests = fakeImages(t, () => 'load');
    const runtime = createMediaRuntime(manifest);
    const [one, two] = await Promise.all([runtime.loadImage(cdn), runtime.loadImage(cdn)]);
    assert.equal(one, two);
    assert.deepEqual(requests, [cdn]);
});

test('CDN 失败后请求本地副本，其他查询参数的请求直接使用备用文件', async t => {
    const requests = fakeImages(t, url => url.startsWith('https:') ? 'error' : 'load');
    const runtime = createMediaRuntime(manifest);
    assert.equal((await runtime.loadImage(`${cdn}?size=10`)).src, local);
    assert.equal((await runtime.loadImage(`${cdn}?size=20`)).src, local);
    assert.deepEqual(requests, [`${cdn}?size=10`, local, local]);
});

test('同张图片的不同尺寸同时失败，都能完成本地回退', async t => {
    fakeImages(t, url => url.startsWith('https:') ? 'error' : 'load');
    const runtime = createMediaRuntime(manifest);
    const images = await Promise.all([runtime.loadImage(`${cdn}?a`), runtime.loadImage(`${cdn}?b`)]);
    assert.deepEqual(images.map(image => image.src), [local, local]);
});

test('CDN 请求悬挂时超时回退', async t => {
    const requests = fakeImages(t, url => url === local ? 'load' : 'pending');
    const runtime = createMediaRuntime(manifest, { timeoutMs: 15 });
    assert.equal((await runtime.loadImage(cdn)).src, local);
    assert.deepEqual(requests, [cdn, local]);
});

test('CDN 与本地同时失败会结束加载，后续重试不会反复请求 CDN', async t => {
    const requests = fakeImages(t, () => 'error');
    const runtime = createMediaRuntime(manifest);
    await assert.rejects(runtime.loadImage(cdn), /图片加载失败/);
    await assert.rejects(runtime.loadImage(cdn), /图片加载失败/);
    assert.deepEqual(requests, [cdn, local, local]);
});

test('外部地址和 data 图片不生成无效的本地回退路径', async t => {
    const requests = fakeImages(t, () => 'error');
    const runtime = createMediaRuntime(manifest);
    await assert.rejects(runtime.loadImage('https://other.example/photo.png'));
    assert.equal(runtime.localImageUrl('data:image/png;base64,AA'), null);
    assert.equal(requests.length, 1);
});

test('发布清单的每份本地文件都位于统一 media 目录并实际存在', async () => {
    const index = JSON.parse(await readFile(new URL('../public/media/manifest.json', import.meta.url), 'utf8'));
    const paths = [...new Set(['images', 'audio', 'video', 'fonts', 'cursors'].flatMap(kind => Object.values(index[kind])))];
    await Promise.all(paths.map(async path => {
        assert.ok(path.startsWith('/media/'), path);
        assert.equal((await stat(new URL(`../public${path}`, import.meta.url))).isFile(), true, path);
    }));
    const content = JSON.parse(await readFile(new URL('../src/data/content.json', import.meta.url), 'utf8'));
    function check(value) {
        if (Array.isArray(value)) value.forEach(check);
        else if (value && typeof value === 'object') Object.values(value).forEach(check);
        else if (typeof value === 'string' && value.startsWith(index.cdnBase) && /\.(png|jpe?g|svg|webp)(\?|$)/.test(value)) {
            assert.ok(index.images[value.slice(index.cdnBase.length).split('?')[0]], value);
        }
    }
    check(content);
});
