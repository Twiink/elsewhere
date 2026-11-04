import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

/**
 * usePaintMaterial 上色材质 Hook。
 * 暴露材质引用，并编译基于噪声的过渡效果。
 * 
 * 通过 uRoomOrigin 让显现效果与绝对位置无关：
 * 着色器使用相对房间原点的坐标。
 * 修复远处走廊分段中上色动画失效的问题。
 * 
 * 选项：
 *   dirX、dirY、dirZ：显现方向向量，左侧画廊默认 (-1, 0, 0.1)。
 *   startDist、endDist：显现进度映射范围。
 *   noiseAxes：噪声采样轴，默认 yz，也支持 xz、xy。
 */
export const usePaintMaterial = (options = {}) => {
    const {
        dirX = -1.0,
        dirY = 0.0,
        dirZ = 0.1,
        startDist = -5.0,
        endDist = 55.0,
        noiseAxes = 'yz'
    } = options;

    const uniformsData = useMemo(() => ({
        uPaintProgress: { value: 0.0 },
        uRoomOrigin: { value: new THREE.Vector3(0, 0, 0) }
    }), []);

    // 按 noiseAxes 构造噪声采样代码。
    const noiseComponent1 = noiseAxes === 'xz' ? 'localPos.xz' : noiseAxes === 'xy' ? 'localPos.xy' : 'localPos.yz';
    const noiseComponent2 = noiseComponent1;

    const onBeforeCompile = useMemo(() => (shader) => {
        // 添加 uniform。
        shader.uniforms.uPaintProgress = uniformsData.uPaintProgress;
        shader.uniforms.uRoomOrigin = uniformsData.uRoomOrigin;

        // 1. 顶点着色器：注入 varying 并计算世界位置。
        shader.vertexShader = `
            varying vec3 vWorldPositionColor;
            ${shader.vertexShader}
        `;
        shader.vertexShader = shader.vertexShader.replace(
            '#include <worldpos_vertex>',
            `
            #include <worldpos_vertex>
            vWorldPositionColor = (modelMatrix * vec4(position, 1.0)).xyz;
            `
        );

        // 2. 片元着色器：在公共区块注入 varying 与噪声函数。
        shader.fragmentShader = `
            uniform float uPaintProgress;
            uniform vec3 uRoomOrigin;
            varying vec3 vWorldPositionColor;
            ${shader.fragmentShader}
        `;

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `
            #include <common>

            // 简单二维噪声。
            float paintHash(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }
            float paintNoise(vec2 x) {
                vec2 i = floor(x); vec2 f = fract(x);
                float a = paintHash(i);
                float b = paintHash(i + vec2(1.0, 0.0));
                float c = paintHash(i + vec2(0.0, 1.0));
                float d = paintHash(i + vec2(1.0, 1.0));
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }
            `
        );

        // 3. 片元着色器：注入像素丢弃与边缘发光逻辑。
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `
            #include <dithering_fragment>

            // 上色方向。
            // 相对于房间原点计算位置，使效果
            // 不受房间所在走廊分段的影响。
            vec3 localPos = vWorldPositionColor - uRoomOrigin;

            vec3 revealDir = normalize(vec3(${dirX.toFixed(1)}, ${dirY.toFixed(1)}, ${dirZ.toFixed(1)}));

            // 将进度映射为沿向量的距离。
            float startDist = ${startDist.toFixed(1)}; 
            float endDist = ${endDist.toFixed(1)};
            float targetDist = mix(startDist, endDist, uPaintProgress);
            
            // 像素沿选定方向的距离，相对于房间原点。
            float distFromPlane = targetDist - dot(localPos, revealDir);
            
            // 噪声采样轴按房间配置。
            float n = paintNoise(${noiseComponent1} * 2.0) * 2.0;
            float n2 = paintNoise(${noiseComponent2} * 8.0) * 0.5;
            float combinedNoise = n + n2;

            // 用噪声调制边界。
            float boundary = distFromPlane + combinedNoise;

            // 丢弃前留出足够边距，形成不规则边缘。
            if (boundary < 0.0) {
                discard;
            }

            // 创建发光的湿颜料边缘。
            float glow = smoothstep(2.0, 0.0, boundary);
            
            // 提亮边缘，呈现新鲜数字颜料效果。
            if (uPaintProgress < 0.999 && boundary < 2.0) {
                gl_FragColor.rgb += vec3(glow * 0.4, glow * 0.5, glow * 0.7);
            }
            `
        );
    }, [uniformsData]);

    // 触发过渡的动画方法。
    const animatePaint = (delay = 0, duration = 2.5) => {
        gsap.to(uniformsData.uPaintProgress, {
            value: 1.0,
            duration: duration,
            delay: delay,
            ease: 'power2.inOut',
            overwrite: 'auto'
        });
    };

    const resetPaint = () => {
        uniformsData.uPaintProgress.value = 0.0;
    };

    // 由组引用的世界位置更新房间原点。
    const updateRoomOrigin = (groupRef) => {
        if (groupRef?.current) {
            groupRef.current.getWorldPosition(uniformsData.uRoomOrigin.value);
        }
    };

    return {
        onBeforeCompile,
        uniformsData,
        animatePaint,
        resetPaint,
        updateRoomOrigin,
        transparent: true,
        needsUpdate: true
    };
};
