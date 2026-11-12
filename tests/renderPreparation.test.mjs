import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Mesh, PlaneGeometry, MeshBasicMaterial, PerspectiveCamera, Texture } from 'three';
import { createTextureCache } from '../src/media/textureCache.js';
import { createFrameQueue } from '../src/utils/frameQueue.js';
import { prepareScene } from '../src/utils/renderPreparation.js';

test('单图预取和不同数组组合复用同一纹理，采样副本互不影响', async () => {
    const loads = [];
    const cache = createTextureCache(async url => { loads.push(url); return { src: url, width: 32, height: 32 }; });
    const prefetched = cache.get('/a.webp');
    const [a, b, aAgain] = await Promise.all(['/a.webp', '/b.webp', '/a.webp'].map(url => cache.get(url).promise));
    assert.equal(a, await prefetched.promise);
    assert.equal(a, aAgain);
    assert.notEqual(a, b);
    assert.deepEqual(loads, ['/a.webp', '/b.webp']);
    const cropped = a.clone();
    cropped.repeat.set(0.5, 0.25);
    cropped.offset.set(0.1, 0.2);
    assert.deepEqual(a.repeat.toArray(), [1, 1]);
    assert.deepEqual(a.offset.toArray(), [0, 0]);
});

test('失败的纹理不会污染缓存，后续请求能够重新加载', async () => {
    let attempts = 0;
    const cache = createTextureCache(async () => {
        if (++attempts === 1) throw new Error('offline');
        return { width: 32, height: 32 };
    });
    const first = cache.get('/retry.webp');
    await assert.rejects(first.promise, /offline/);
    const next = cache.get('/retry.webp');
    assert.notEqual(first.texture, next.texture);
    assert.equal(await next.promise, next.texture);
    assert.equal(attempts, 2);
});

test('预热超出帧预算后让出下一帧，前台请求优先执行', async () => {
    const frames = [];
    let time = 0;
    const queue = createFrameQueue({ requestFrame: callback => frames.push(callback), now: () => time, budgetMs: 4 });
    const order = [];
    const background = queue.enqueue(() => { order.push('background'); time += 5; }, 1);
    const foreground = queue.enqueue(() => { order.push('foreground'); time += 5; });
    frames.shift()();
    assert.deepEqual(order, ['foreground']);
    assert.equal(frames.length, 1);
    frames.shift()();
    await Promise.all([background.promise, foreground.promise]);
    assert.deepEqual(order, ['foreground', 'background']);
});

test('前台进入可提升已排队的预取任务，单次失败不阻塞其他任务', async () => {
    const frames = [];
    const queue = createFrameQueue({ requestFrame: callback => frames.push(callback), now: () => 0 });
    const order = [];
    const first = queue.enqueue(() => order.push('first'), 1);
    const promoted = queue.enqueue(() => order.push('promoted'), 1);
    promoted.prioritize();
    frames.shift()();
    await Promise.all([first.promise, promoted.promise]);
    assert.deepEqual(order, ['promoted', 'first']);
    const failed = queue.enqueue(() => { throw new Error('upload failed'); });
    const rejection = assert.rejects(failed.promise, /upload failed/);
    const next = queue.enqueue(() => order.push('next'));
    frames.shift()();
    await Promise.all([rejection, next.promise]);
    assert.equal(order.at(-1), 'next');
});

test('分批编译读取字体更新后的当前材质，不克隆或重新挂载场景对象', async t => {
    const frames = [];
    const previous = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = callback => frames.push(callback);
    t.after(() => { globalThis.requestAnimationFrame = previous; });
    const scene = new Scene();
    const oldMaterial = new MeshBasicMaterial();
    const currentMaterial = new MeshBasicMaterial();
    const mesh = new Mesh(new PlaneGeometry(1, 1), oldMaterial);
    mesh.clone = () => { throw new Error('text must not be cloned'); };
    scene.add(mesh);
    const compiled = [];
    const renderer = { compile(batch) { batch.traverse(object => compiled.push(object.material)); } };
    const pending = prepareScene(renderer, scene, new PerspectiveCamera(), scene);
    mesh.material = currentMaterial;
    oldMaterial.dispose();
    await Promise.resolve();
    frames.shift()();
    await pending;
    assert.deepEqual(compiled, [currentMaterial]);
    assert.equal(mesh.parent, scene);
    mesh.geometry.dispose();
    currentMaterial.dispose();
});

test('纸卡在编译时绑定的背面纹理会在就绪前完成上传', async t => {
    const frames = [];
    const previous = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = callback => frames.push(callback);
    t.after(() => { globalThis.requestAnimationFrame = previous; });
    const scene = new Scene();
    const material = new MeshBasicMaterial();
    const geometry = new PlaneGeometry(1, 1);
    const back = new Texture();
    scene.add(new Mesh(geometry, material));
    const uploaded = [];
    const renderer = {
        compile() { material.userData.shader = { uniforms: { mapBack: { value: back } } }; },
        initTexture(texture) { uploaded.push(texture); },
    };
    let ready = false;
    const pending = prepareScene(renderer, scene, new PerspectiveCamera(), scene).then(() => { ready = true; });
    for (let turn = 0; turn < 20 && !ready; turn++) {
        await Promise.resolve();
        if (frames.length) frames.shift()();
    }
    await pending;
    assert.deepEqual(uploaded, [back]);
    geometry.dispose();
    material.dispose();
    back.dispose();
});
