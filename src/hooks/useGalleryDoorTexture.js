import { useMemo } from 'react';
import { CanvasTexture } from 'three';

// 同一张门底图只整理一次；无限走廊中的画廊门共用结果。
const prepared = new WeakMap();

function prepareBlueprint(source, artwork) {
    if (!prepared.has(source)) prepared.set(source, new WeakMap());
    const cache = prepared.get(source);
    if (cache.has(artwork)) return cache.get(artwork);

    const canvas = document.createElement('canvas');
    canvas.width = source.image.width;
    canvas.height = source.image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source.image, 0, 0);

    // 只整理原有下方图纸的内部，纸边和四角胶带仍取自原图。
    const x = Math.round(canvas.width * 0.267);
    const y = Math.round(canvas.height * 0.629);
    const width = Math.round(canvas.width * 0.533);
    const height = Math.round(canvas.height * 0.192);
    const original = ctx.getImageData(x, y, width, height);
    const paperTone = ctx.getImageData(Math.round(canvas.width * 0.5), y, 1, 1).data;
    const art = artwork.image;
    ctx.drawImage(art, art.width * 0.13, 0, art.width * 0.74, art.height, x, y, width, height);
    const drawing = ctx.getImageData(x, y, width, height);
    const artToneIndex = (Math.floor(height * 0.94) * width + Math.floor(width / 2)) * 4;
    const artTone = drawing.data[artToneIndex];

    // 蓝色像素连同其铅笔边线一并保留，避免新图覆盖胶带。
    const tape = new Uint8Array(width * height);
    const padding = Math.max(2, Math.round(canvas.width / 220));
    for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
            const i = (py * width + px) * 4;
            if (original.data[i + 2] - original.data[i] < 18 || original.data[i + 1] - original.data[i] < 8) continue;
            for (let dy = -padding; dy <= padding; dy++) {
                const row = py + dy;
                if (row < 0 || row >= height) continue;
                tape.fill(1, row * width + Math.max(0, px - padding), row * width + Math.min(width, px + padding + 1));
            }
        }
    }
    for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
            const pixel = py * width + px;
            const i = pixel * 4;
            const blend = tape[pixel] ? 0 : Math.min(1, px / 2, py / 2, (width - px - 1) / 2, (height - py - 1) / 2);
            const graphite = drawing.data[i] * 0.299 + drawing.data[i + 1] * 0.587 + drawing.data[i + 2] * 0.114;
            for (let channel = 0; channel < 3; channel++) {
                const tone = Math.min(255, Math.max(0, paperTone[channel] - (artTone - graphite) * 1.35));
                drawing.data[i + channel] = original.data[i + channel] * (1 - blend) + tone * blend;
            }
            drawing.data[i + 3] = original.data[i + 3];
        }
    }
    ctx.putImageData(drawing, x, y);

    // 独立 Source，不改写 loader 缓存中的原始图片。
    const texture = new CanvasTexture(canvas, source.mapping, source.wrapS, source.wrapT, source.magFilter, source.minFilter, source.format, source.type, source.anisotropy);
    texture.colorSpace = source.colorSpace;
    texture.flipY = source.flipY;
    texture.name = 'gallery-door-blueprint';
    cache.set(artwork, texture);
    const dispose = () => {
        texture.dispose();
        cache.delete(artwork);
        source.removeEventListener('dispose', dispose);
    };
    source.addEventListener('dispose', dispose);
    return texture;
}

export function useGalleryDoorTexture(source, artwork) {
    return useMemo(() => artwork ? prepareBlueprint(source, artwork) : source, [source, artwork]);
}
