import { Group } from 'three';
import { createFrameQueue } from './frameQueue.js';

const renderers = new WeakMap();
const activeRenderers = new Set();

function stateFor(renderer) {
    if (!renderers.has(renderer)) renderers.set(renderer, { queue: createFrameQueue(), textures: new WeakMap() });
    return renderers.get(renderer);
}

export function registerPreparationRenderer(renderer) {
    activeRenderers.add(renderer);
    return () => activeRenderers.delete(renderer);
}

export function getPreparationRenderers() {
    return activeRenderers.values();
}

export function prepareTexture(renderer, texture, priority = 0) {
    const state = stateFor(renderer);
    const cached = state.textures.get(texture);
    if (cached?.version === texture.version) {
        if (priority === 0) cached.job.prioritize();
        return cached.job.promise;
    }
    let record;
    const job = state.queue.enqueue(() => {
        if (state.textures.get(texture) === record) renderer.initTexture(texture);
    }, priority);
    record = { version: texture.version, job };
    state.textures.set(texture, record);
    const disposed = () => { state.textures.delete(texture); texture.removeEventListener('dispose', disposed); };
    texture.addEventListener('dispose', disposed);
    job.promise.catch(() => {
        if (state.textures.get(texture) === record) state.textures.delete(texture);
        texture.removeEventListener('dispose', disposed);
    });
    return job.promise;
}

export function preparePrefetchedTextures(textures) {
    return Promise.all([...activeRenderers].flatMap(renderer => textures.map(texture => prepareTexture(renderer, texture, 1))));
}

export async function prepareScene(renderer, root, camera, scene, isActive = () => true) {
    const objects = [];
    const textures = new Set();
    root.traverse(object => {
        if (!(object.isMesh || object.isPoints || object.isLine || object.isSprite)) return;
        objects.push(object);
        for (const material of [object.material].flat()) {
            if (!material) continue;
            Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
            Object.values(material.uniforms ?? {}).forEach(uniform => {
                if (uniform.value?.isTexture) textures.add(uniform.value);
            });
        }
    });
    await Promise.all([...textures].map(texture => prepareTexture(renderer, texture)));
    if (!isActive()) return;

    const { queue } = stateFor(renderer);
    const batches = [];
    for (let index = 0; index < objects.length; index += 16) {
        const batch = objects.slice(index, index + 16);
        batches.push(queue.enqueue(() => {
            if (!isActive()) return;
            const group = new Group();
            // 只读遍历当前对象，不克隆或重挂载文字；材质在同一任务内读取并编译。
            group.traverse = visit => batch.forEach(visit);
            renderer.compile(group, camera, scene);
        }).promise);
    }
    await Promise.all(batches);
    if (!isActive()) return;
    // 纸卡等材质在 onBeforeCompile 中绑定背面和彩色图，继续预热这些纹理。
    const shaderTextures = new Set();
    objects.forEach(object => {
        [object.material].flat().forEach(material => {
            Object.values(material?.userData?.shader?.uniforms ?? {}).forEach(uniform => {
                if (uniform.value?.isTexture) shaderTextures.add(uniform.value);
            });
        });
    });
    await Promise.all([...shaderTextures].map(texture => prepareTexture(renderer, texture)));
}
