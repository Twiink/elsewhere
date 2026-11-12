import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { FramebufferTexture, LinearFilter, NoBlending, ShaderMaterial, UniformsUtils } from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { usePerformance, useScene } from '../../context/contexts';

function SceneAntialias() {
    const { gl, scene, camera, size, viewport } = useThree();
    const width = Math.max(1, Math.floor(size.width * viewport.dpr));
    const height = Math.max(1, Math.floor(size.height * viewport.dpr));
    const pipeline = useMemo(() => {
        const texture = new FramebufferTexture(width, height);
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        const material = new ShaderMaterial({
            uniforms: UniformsUtils.clone(FXAAShader.uniforms),
            vertexShader: FXAAShader.vertexShader,
            fragmentShader: FXAAShader.fragmentShader,
            depthTest: false, depthWrite: false, toneMapped: false, blending: NoBlending,
        });
        material.uniforms.tDiffuse.value = texture;
        material.uniforms.resolution.value.set(1 / width, 1 / height);
        return { texture, material, quad: new FullScreenQuad(material) };
    }, [width, height]);

    useEffect(() => () => {
        pipeline.texture.dispose();
        pipeline.material.dispose();
        pipeline.quad.dispose();
    }, [pipeline]);

    // 仅抗锯齿启用时接管渲染；降到低档后卸载，恢复单次直接渲染。
    useFrame(() => {
        gl.setRenderTarget(null);
        gl.render(scene, camera);
        // 从已完成色彩处理的画面做 GPU 内复制，纸白、墨色和纸背保持一致。
        gl.copyFramebufferToTexture(pipeline.texture);
        pipeline.quad.render(gl);
    }, 1);
    return null;
}

export default function AdaptiveQuality() {
    const { settings } = usePerformance();
    const { currentRoom, hasEntered } = useScene();
    const { scene, gl } = useThree();
    useEffect(() => {
        const anisotropy = Math.min(settings.textureAnisotropy, gl.capabilities.getMaxAnisotropy());
        const adjust = object => {
            for (const material of [object.material].flat()) {
                if (!material) continue;
                for (const value of Object.values(material)) {
                    if (value?.isTexture && value.anisotropy !== anisotropy) {
                        value.anisotropy = anisotropy;
                        value.needsUpdate = true;
                    }
                }
            }
        };
        scene.traverse(adjust);
    }, [scene, gl, settings.textureAnisotropy, currentRoom, hasEntered]);
    return settings.antialias ? <SceneAntialias /> : null;
}
