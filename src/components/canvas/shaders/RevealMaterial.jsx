import * as THREE from 'three';
import { extend } from '@react-three/fiber';

/**
 * RevealMaterial：扩展 MeshBasicMaterial，实现笔刷显现。
 * 
 * 关键：只修改透明度丢弃逻辑，不修改颜色和光照。
 * 颜色与光照完全沿用 MeshBasicMaterial 标准管线。
 * 自定义着色器只决定沿噪声笔刷边缘隐藏哪些像素。
 * 
 * 用法：<revealMaterial color="#e0e0e0" map={sketchTex} uProgress={0-1} transparent={true} ... />
 * 速写层叠加在彩色纹理网格上方；uProgress 增大时，
 * 速写像素自下而上沿噪声边缘丢弃，露出底层彩色门。
 */
class RevealMaterial extends THREE.MeshBasicMaterial {
    constructor(params = {}) {
        super(params);
        this._uProgress = 0.0;
        this._shader = null;
        this._paintProgress = null;
        this._roomOrigin = null;
        this._paintConfig = {
            dirX: 0.0, dirY: -1.0, dirZ: 0.0,
            startDist: -25.0, endDist: 25.0,
            noiseAxes: 'xz'
        };
    }

    get uProgress() { return this._uProgress; }
    set uProgress(v) {
        this._uProgress = v;
        if (this._shader) {
            this._shader.uniforms.uProgress.value = v;
        }
    }

    get paintUniforms() { return { uPaintProgress: this._paintProgress, uRoomOrigin: this._roomOrigin }; }
    set paintUniforms(v) {
        if (!v) return;
        this._paintProgress = v.uPaintProgress;
        this._roomOrigin = v.uRoomOrigin;
    }

    get paintConfig() { return this._paintConfig; }
    set paintConfig(v) {
        if (!v) return;
        this._paintConfig = { ...this._paintConfig, ...v };
    }

    // 确保 Three.js 不复用缓存的标准着色器程序。
    customProgramCacheKey() {
        return this._paintProgress ? 'RevealMaterial_v3_paint' : 'RevealMaterial_v3';
    }

    onBeforeCompile(shader) {
        this._shader = shader;
        shader.uniforms.uProgress = { value: this._uProgress };

        const hasPaint = !!this._paintProgress;
        if (hasPaint) {
            shader.uniforms.uPaintProgress = this._paintProgress;
            shader.uniforms.uRoomOrigin = this._roomOrigin;
        }

        if (hasPaint) {
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
        }

        const paintUniformsStr = hasPaint ? `
            uniform float uPaintProgress;
            uniform vec3 uRoomOrigin;
            varying vec3 vWorldPositionColor;
        ` : '';

        // 向片元着色器注入 uProgress 和噪声函数。
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            /* glsl */`#include <common>
            uniform float uProgress;
            ${paintUniformsStr}

            float revealRand(vec2 n) { 
                return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
            }

            float revealNoise(vec2 p){
                vec2 ip = floor(p);
                vec2 u = fract(p);
                u = u*u*(3.0-2.0*u);
                float res = mix(
                    mix(revealRand(ip),revealRand(ip+vec2(1.0,0.0)),u.x),
                    mix(revealRand(ip+vec2(0.0,1.0)),revealRand(ip+vec2(1.0,1.0)),u.x),u.y);
                return res*res;
            }
            `
        );

        // 标准透明度测试处理速写透明边缘后，
        // 再按 uProgress 执行笔刷式渐进像素丢弃。
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <alphatest_fragment>',
            /* glsl */`#include <alphatest_fragment>

            // 笔刷显现：逐渐自下而上丢弃像素。
            if (uProgress > 0.001) {
                float rn = revealNoise(vMapUv * 15.0) * 0.15;
                float maskValue = (1.0 - vMapUv.y) + rn;
                float threshold = uProgress * 1.5;
                if (maskValue < threshold) discard;
            }
            `
        );

        if (hasPaint) {
            const noiseComp = this._paintConfig.noiseAxes === 'xz' ? 'localPos.xz' 
                : this._paintConfig.noiseAxes === 'xy' ? 'localPos.xy' : 'localPos.yz';

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                /* glsl */`#include <dithering_fragment>

                // 上色过渡。
                vec3 localPos = vWorldPositionColor - uRoomOrigin;
                vec3 revealDir = normalize(vec3(${this._paintConfig.dirX.toFixed(1)}, ${this._paintConfig.dirY.toFixed(1)}, ${this._paintConfig.dirZ.toFixed(1)}));
                
                float pStartDist = ${this._paintConfig.startDist.toFixed(1)};
                float pEndDist = ${this._paintConfig.endDist.toFixed(1)};
                float pTargetDist = mix(pStartDist, pEndDist, uPaintProgress);
                float pDistFromPlane = pTargetDist - dot(localPos, revealDir);
                
                float pn = revealNoise(${noiseComp} * 2.0) * 2.0;
                float pn2 = revealNoise(${noiseComp} * 8.0) * 0.5;
                float pBoundary = pDistFromPlane + pn + pn2;
                
                if (pBoundary < 0.0) {
                    discard;
                }
                
                if (uPaintProgress < 0.999 && pBoundary < 2.0) {
                    float pGlow = smoothstep(2.0, 0.0, pBoundary);
                    gl_FragColor.rgb += vec3(pGlow * 0.4, pGlow * 0.5, pGlow * 0.7);
                }
                `
            );
        }
    }
}

// 注册后，R3F 可使用 <revealMaterial color="#e0e0e0" />。
extend({ RevealMaterial });

export { RevealMaterial };
