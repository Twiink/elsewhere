import { useMemo } from 'react';
import { CanvasTexture } from 'three';

const prepared = new WeakMap();

function drawTriangle(ctx, image, vertices, second) {
    const [a, b, c] = vertices;
    const u = second ? [b[0] - c[0], b[1] - c[1]] : [b[0] - a[0], b[1] - a[1]];
    const v = second ? [c[0] - a[0], c[1] - a[1]] : [c[0] - b[0], c[1] - b[1]];
    ctx.save();
    ctx.beginPath();
    // 半像素重叠填平两三角形的抗锯齿接缝。
    const center = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
    vertices.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x + Math.sign(x - center[0]) * 0.4, y + Math.sign(y - center[1]) * 0.4));
    ctx.closePath();
    ctx.clip();
    ctx.transform(u[0] / image.width, u[1] / image.width, v[0] / image.height, v[1] / image.height, a[0], a[1]);
    ctx.drawImage(image, 0, 0);
    ctx.restore();
}

function prepareArtwork(source, artwork, paper) {
    if (!prepared.has(source)) prepared.set(source, new WeakMap());
    const cache = prepared.get(source);
    if (cache.has(artwork)) return cache.get(artwork);
    const canvas = document.createElement('canvas');
    canvas.width = source.image.width;
    canvas.height = source.image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(source.image, 0, 0);
    const [a, b, c, d] = paper.map(([u, v]) => [u * canvas.width, v * canvas.height]);
    // 只在现有纸张内部投影新画面，原纸边、信槽和航空信封边纹均保留。
    ctx.save();
    ctx.beginPath();
    [a, b, c, d].forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y));
    ctx.closePath(); ctx.clip();
    drawTriangle(ctx, artwork.image, [a, b, c], false);
    drawTriangle(ctx, artwork.image, [a, c, d], true);
    ctx.restore();
    const texture = new CanvasTexture(canvas, source.mapping, source.wrapS, source.wrapT, source.magFilter, source.minFilter, source.format, source.type, source.anisotropy);
    texture.colorSpace = source.colorSpace;
    texture.flipY = source.flipY;
    texture.name = 'door-annotation-artwork';
    cache.set(artwork, texture);
    const dispose = () => {
        texture.dispose(); cache.delete(artwork);
        source.removeEventListener('dispose', dispose);
    };
    source.addEventListener('dispose', dispose);
    return texture;
}

export function useDoorArtworkTexture(source, artwork, paper) {
    return useMemo(() => artwork ? prepareArtwork(source, artwork, paper) : source, [source, artwork, paper]);
}
