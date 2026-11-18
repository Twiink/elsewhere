import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, Vector2, RepeatWrapping, SRGBColorSpace } from 'three';
import { useTexture } from '../../hooks/useMediaTexture';
import { useTextureCopy } from '../../hooks/useTextureCopy';
import { WORLD_ART, WORLD_PALETTES, worldSurfaceFor } from '../../config/worldAppearance';
import { addWorldPigment } from '../../utils/worldMaterialShader';

const callbackIds = new WeakMap();
let nextCallback = 0;
function callbackId(callback) {
    if (!callbackIds.has(callback)) callbackIds.set(callback, ++nextCallback);
    return callbackIds.get(callback);
}

export default function WorldAppearance() {
    const { scene } = useThree();
    const art = useTexture(WORLD_ART);
    const sky = useTextureCopy(art.sky, { colorSpace: SRGBColorSpace });
    const records = useRef(new Map());
    const palettes = useMemo(() => Object.fromEntries(Object.entries(WORLD_PALETTES).map(([key, colors]) => [key, colors.map(color => new Color(color))])), []);

    useLayoutEffect(() => {
        const background = scene.background;
        const fogColor = scene.fog?.color.clone();
        scene.background = sky;
        if (scene.fog) scene.fog.color.set('#70799c');
        const materials = records.current;
        return () => {
            scene.background = background;
            if (scene.fog && fogColor) scene.fog.color.copy(fogColor);
            for (const [material, entry] of materials) {
                material.removeEventListener('dispose', entry.release);
                material.onBeforeCompile = entry.originalCompile;
                material.customProgramCacheKey = entry.originalKey;
                material.toneMapped = entry.originalToneMapped;
                material.needsUpdate = true;
            }
            materials.clear();
        };
    }, [scene, sky]);

    // 在原场景渲染前处理新挂载的材质，不替换 mesh、事件、ref 或动画时间线。
    useFrame(() => {
        scene.traverse(object => {
            if (!object.isMesh || !object.material || !object.geometry?.attributes.uv) return;
            const list = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of list) {
                if ((!material.isMeshBasicMaterial && !material.isMeshStandardMaterial) || material.isTroikaTextMaterial || material.userData.worldPreserveColor) continue;
                const previous = records.current.get(material);
                if (previous && material.onBeforeCompile === previous.wrapped && material.map === previous.map) continue;
                const underpainting = material.userData.worldUnderpainting;
                const surface = underpainting ? { role: 'paper' } : worldSurfaceFor(material.map, object.userData.worldSurface);
                if (!surface) continue;
                const [paper, accent, ink] = palettes[surface.role];
                const originalCompile = previous?.originalCompile ?? material.onBeforeCompile;
                const originalKey = previous?.originalKey ?? material.customProgramCacheKey;
                const originalToneMapped = previous?.originalToneMapped ?? material.toneMapped;
                const baseKey = previous?.baseKey ?? originalKey.call(material);
                const artwork = underpainting ?? art[surface.artwork] ?? art.grain;
                if (surface.repeat && (artwork.wrapS !== RepeatWrapping || artwork.wrapT !== RepeatWrapping)) {
                    artwork.wrapS = RepeatWrapping; artwork.wrapT = RepeatWrapping; artwork.needsUpdate = true;
                }
                const registeredSprite = surface.artwork && !surface.repeat;
                const mode = underpainting ? 4 : surface.tintOnly ? 3 : registeredSprite ? 2 : surface.artwork ? 1 : 0;
                const wrapped = function (shader, renderer) {
                    originalCompile.call(this, shader, renderer);
                    addWorldPigment(shader, {
                        uWorldPaper: { value: paper }, uWorldAccent: { value: accent }, uWorldInk: { value: ink },
                        uWorldGrain: { value: art.grain }, uWorldArtwork: { value: artwork },
                        uWorldSky: { value: sky }, uWorldFacade: { value: Number(Boolean(surface.facade)) },
                        uWorldRepeat: { value: new Vector2(...(surface.repeat ?? [1, 1])) },
                        uWorldMode: { value: mode }, uWorldTree: { value: Number(surface.role === 'tree') },
                        uWorldArtworkAlpha: { value: Number(registeredSprite && !underpainting) },
                    });
                };
                material.onBeforeCompile = wrapped;
                material.customProgramCacheKey = () => `world-pigment-v2:${surface.role}:${mode}:${callbackId(originalCompile)}:${baseKey}`;
                material.toneMapped = false;
                material.needsUpdate = true;
                if (previous) material.removeEventListener('dispose', previous.release);
                const release = () => {
                    material.onBeforeCompile = originalCompile;
                    material.customProgramCacheKey = originalKey;
                    material.toneMapped = originalToneMapped;
                    material.removeEventListener('dispose', release);
                    records.current.delete(material);
                };
                material.addEventListener('dispose', release);
                records.current.set(material, { originalCompile, originalKey, originalToneMapped, baseKey, wrapped, release, map: material.map });
            }
        });
    }, -100);
    return null;
}
