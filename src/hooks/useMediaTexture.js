import { useLayoutEffect, useMemo } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import { MediaTextureLoader, getRendererTextureLoader, preloadMediaTextures, clearMediaTextures } from '../media/MediaTextureLoader';
import { getPreparationRenderers } from '../utils/renderPreparation';

// 保留 useTexture 的单图、数组、命名对象及预加载接口，共用带回退的加载器。
export function useTexture(input, onLoad, { upload = true } = {}) {
    const renderer = useThree(state => state.gl);
    const keyed = input !== null && typeof input === 'object' && !Array.isArray(input);
    const textures = useLoader(upload ? getRendererTextureLoader(renderer) : MediaTextureLoader, keyed ? Object.values(input) : input);
    useLayoutEffect(() => { onLoad?.(textures); }, [onLoad, textures]);
    return useMemo(() => keyed ? Object.fromEntries(Object.keys(input).map((key, index) => [key, textures[index]])) : textures, [input, keyed, textures]);
}

const urlsFor = input => typeof input === 'string' ? [input] : Object.values(input);
useTexture.preload = input => { void preloadMediaTextures(urlsFor(input)).catch(() => {}); };
useTexture.clear = input => {
    const urls = urlsFor(input);
    clearMediaTextures(urls);
    useLoader.clear(MediaTextureLoader, urls);
    for (const renderer of getPreparationRenderers()) useLoader.clear(getRendererTextureLoader(renderer), urls);
};
