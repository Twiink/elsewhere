import * as THREE from 'three';

/**
 * 创建边缘不规则的撕纸几何体。
 * 
 * @param {number} width - 纸张宽度。
 * @param {number} height - 纸张高度。
 * @param {number} segmentsX - 水平分段数，越多撕边越平滑。
 * @param {number} segmentsY - 竖向分段数。
 * @param {number} tearIntensity - 边缘锯齿强度，范围 0..1。
 * @returns {THREE.BufferGeometry}
 */
export function createTornPaperGeometry(
    width = 1.2,
    height = 1.6,
    segmentsX = 20,
    segmentsY = 26,
    tearIntensity = 0.04
) {
    // 从平面开始。
    const geometry = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
    const positions = geometry.attributes.position;

    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // 用于稳定随机结果的种子。
    const seed = 12345;
    const seededRandom = (i) => {
        const x = Math.sin(seed + i * 9999) * 10000;
        return x - Math.floor(x);
    };

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);

        // 检查顶点是否在边缘上。
        const onLeftEdge = Math.abs(x + halfWidth) < 0.01;
        const onRightEdge = Math.abs(x - halfWidth) < 0.01;
        const onTopEdge = Math.abs(y - halfHeight) < 0.01;
        const onBottomEdge = Math.abs(y + halfHeight) < 0.01;

        if (onLeftEdge || onRightEdge || onTopEdge || onBottomEdge) {
            // 应用撕裂位移。
            const tearX = (seededRandom(i) - 0.5) * tearIntensity;
            const tearY = (seededRandom(i + 1000) - 0.5) * tearIntensity;

            // 左边缘撕裂更明显，模拟笔记本撕页。
            const leftMultiplier = onLeftEdge ? 2.5 : 1;

            positions.setX(i, x + tearX * leftMultiplier);
            positions.setY(i, y + tearY * leftMultiplier);

            // 少量 Z 位移，增加立体感。
            const tearZ = seededRandom(i + 2000) * 0.01;
            positions.setZ(i, tearZ);
        }

        // 添加轻微整体纸张弯曲。
        const warpZ = Math.sin(x * 3) * Math.cos(y * 2) * 0.015;
        positions.setZ(i, positions.getZ(i) + warpZ);
    }

    geometry.computeVertexNormals();
    geometry.attributes.position.needsUpdate = true;

    return geometry;
}

/**
 * 生成横线纸效果的简单线条位置。
 * 返回各横线的 Y 位置数组。
 */
export function getRuledLinePositions(height, lineCount = 8, topMargin = 0.15, bottomMargin = 0.2) {
    const usableHeight = height - topMargin - bottomMargin;
    const spacing = usableHeight / (lineCount + 1);
    const startY = (height / 2) - topMargin - spacing;

    const lines = [];
    for (let i = 0; i < lineCount; i++) {
        lines.push(startY - i * spacing);
    }
    return lines;
}

export default createTornPaperGeometry;
