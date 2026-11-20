import { Group } from 'three';
import { createFrameQueue } from './frameQueue.js';

const renderers = new WeakMap();
const activeRenderers = new Set();

function stateFor(renderer) {
    if (!renderers.has(renderer)) renderers.set(renderer, { queue: createFrameQueue(), textures: new WeakMap(), anisotropy: 1 });
    return renderers.get(renderer);
}

function collectTextures(object, textures) {
    for (const material of [object.material].flat()) {
        if (!material) continue;
        Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
        for (const uniforms of [material.uniforms, material.userData?.shader?.uniforms]) {
            Object.values(uniforms ?? {}).forEach(uniform => {
                if (uniform.value?.isTexture) textures.add(uniform.value);
            });
        }
    }
}

export function prepareTextureQuality(renderer, root, anisotropy) {
    stateFor(renderer).anisotropy = Math.min(anisotropy, renderer.capabilities.getMaxAnisotropy());
    const textures = new Set();
    root.traverse(object => collectTextures(object, textures));
    // 档位变化也通过准备队列逐张更新，避免下一帧集中重新上传。
    return Promise.all([...textures].map(texture => prepareTexture(renderer, texture)));
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
    if (cached && (!cached.ready || (cached.version === texture.version && cached.anisotropy === state.anisotropy))) {
        if (priority === 0) cached.job.prioritize();
        return cached.job.promise;
    }
    let record;
    const job = state.queue.enqueue(() => {
        if (state.textures.get(texture) !== record) return;
        // 首次上传就采用最终采样参数；入场后无需再改写已预热的纹理。
        if (texture.anisotropy !== state.anisotropy) {
            texture.anisotropy = state.anisotropy;
            texture.needsUpdate = true;
        }
        renderer.initTexture(texture);
        record.version = texture.version;
        record.anisotropy = state.anisotropy;
        record.ready = true;
    }, priority);
    record = { ready: false, job };
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
        collectTextures(object, textures);
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
