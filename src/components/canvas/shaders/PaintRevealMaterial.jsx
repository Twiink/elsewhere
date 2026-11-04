import * as THREE from 'three';
import { extend } from '@react-three/fiber';

/**
 * PaintRevealMaterial：扩展 MeshStandardMaterial，实现笔刷上色显现。
 * 
 * 通过混合基础速写纹理 map 与彩色纹理 uMapPainted，
 * 实现颜色过渡，
 * 使用与其他显现材质相同的噪声笔刷遮罩。
 * 
 * 用法：<paintRevealMaterial map={sketchTex} uMapPainted={paintedTex} uProgress={0-1} />
 * uProgress 从 0 到 1 时，像素沿噪声边缘从速写过渡为彩色。
 */
class PaintRevealMaterial extends THREE.MeshBasicMaterial {
    constructor(params = {}) {
        // 传入 super 前先提取自定义参数。
        const { uMapPainted, ...standardParams } = params;
        super(standardParams);
        this._uProgress = 0.0;
        this._uMapPainted = uMapPainted || null;
        this._shader = null;
    }

    get uProgress() { return this._uProgress; }
    set uProgress(v) {
        this._uProgress = v;
        if (this._shader) {
            this._shader.uniforms.uProgress.value = v;
        }
    }

    get uMapPainted() { return this._uMapPainted; }
    set uMapPainted(v) {
        this._uMapPainted = v;
        if (this._shader) {
            this._shader.uniforms.uMapPainted.value = v;
        }
    }

    customProgramCacheKey() {
        return 'PaintRevealMaterial_v1';
    }

    onBeforeCompile(shader) {
        this._shader = shader;
        shader.uniforms.uProgress = { value: this._uProgress };
        shader.uniforms.uMapPainted = { value: this._uMapPainted };

        // 向片元着色器注入 uniform 和噪声函数。
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            /* glsl */`#include <common>
            uniform float uProgress;
            uniform sampler2D uMapPainted;

            float paintRand(vec2 n) { 
                return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
            }

            float paintNoise(vec2 p){
                vec2 ip = floor(p);
                vec2 u = fract(p);
                u = u*u*(3.0-2.0*u);
                float res = mix(
                    mix(paintRand(ip),paintRand(ip+vec2(1.0,0.0)),u.x),
                    mix(paintRand(ip+vec2(0.0,1.0)),paintRand(ip+vec2(1.0,1.0)),u.x),u.y);
                return res*res;
            }
            `
        );

        // 基础纹理经 map 片段采样到 sampledDiffuseColor 后，
        // 按 uProgress 混合彩色纹理。
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            /* glsl */`#include <map_fragment>

            // 笔刷混合：逐渐从速写切换到彩色。
            if (uProgress > 0.001) {
                vec4 paintedColor = texture2D(uMapPainted, vMapUv);
                float rn = paintNoise(vMapUv * 15.0) * 0.15;
                // 从左下向右上显现，营造自然感。
                float maskValue = (1.0 - vMapUv.y) + rn;
                float threshold = uProgress * 1.5;
                if (maskValue < threshold) {
                    // 用彩色版本替换 diffuseColor。
                    diffuseColor = vec4(paintedColor.rgb, 1.0);
                }
            }
            `
        );
    }
}

// 注册后，R3F 可使用 <paintRevealMaterial />。
extend({ PaintRevealMaterial });

export { PaintRevealMaterial };
