import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Group, Mesh, MeshBasicMaterial, Texture } from 'three';
import { prepareTexture, prepareTextureQuality } from '../src/utils/renderPreparation.js';

function fixture(t, maxAnisotropy = 8) {
    const frames = [];
    const previous = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = callback => frames.push(callback);
    t.after(() => {
        if (previous) globalThis.requestAnimationFrame = previous;
        else delete globalThis.requestAnimationFrame;
    });
    const uploads = [];
    const renderer = {
        capabilities: { getMaxAnisotropy: () => maxAnisotropy },
        initTexture: texture => uploads.push({ texture, anisotropy: texture.anisotropy }),
    };
    return {
        renderer, uploads,
        flush() { while (frames.length) frames.shift()(); },
    };
}

test('first upload uses final quality and repeated preparation reuses it', async t => {
    const { renderer, uploads, flush } = fixture(t);
    await prepareTextureQuality(renderer, new Group(), 4);
    const texture = new Texture();
    texture.needsUpdate = true;
    const first = prepareTexture(renderer, texture, 1);
    assert.equal(prepareTexture(renderer, texture), first);
    flush();
    await first;
    assert.deepEqual(uploads.map(upload => upload.anisotropy), [4]);
    await prepareTexture(renderer, texture);
    assert.equal(uploads.length, 1);

    texture.needsUpdate = true;
    const changed = prepareTexture(renderer, texture);
    flush();
    await changed;
    assert.equal(uploads.length, 2);
});

test('quality changes wait for the queue and include shader textures', async t => {
    const { renderer, uploads, flush } = fixture(t, 2);
    const map = new Texture();
    const shaderMap = new Texture();
    const material = new MeshBasicMaterial({ map });
    material.userData.shader = { uniforms: { back: { value: shaderMap } } };
    const scene = new Group();
    scene.add(new Mesh(undefined, material));
    const first = prepareTextureQuality(renderer, scene, 4);
    assert.equal(uploads.length, 0);
    flush();
    await first;
    assert.deepEqual(uploads.map(upload => upload.anisotropy), [2, 2]);

    const changed = prepareTextureQuality(renderer, scene, 1);
    assert.equal(map.anisotropy, 2);
    assert.equal(shaderMap.anisotropy, 2);
    flush();
    await changed;
    assert.deepEqual(uploads.map(upload => upload.anisotropy), [2, 2, 1, 1]);
    await prepareTextureQuality(renderer, scene, 1);
    assert.equal(uploads.length, 4);
});

test('pending uploads use the latest quality and disposed textures are skipped', async t => {
    const { renderer, uploads, flush } = fixture(t);
    const map = new Texture();
    const scene = new Group();
    scene.add(new Mesh(undefined, new MeshBasicMaterial({ map })));
    const first = prepareTextureQuality(renderer, scene, 4);
    const latest = prepareTextureQuality(renderer, scene, 2);
    flush();
    await Promise.all([first, latest]);
    assert.deepEqual(uploads.map(upload => upload.anisotropy), [2]);

    const disposed = new Texture();
    const pending = prepareTexture(renderer, disposed);
    disposed.dispose();
    flush();
    await pending;
    assert.equal(uploads.length, 1);
});
