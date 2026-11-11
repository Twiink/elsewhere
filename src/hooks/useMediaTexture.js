import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import { MediaTextureLoader } from '../media/MediaTextureLoader';

// 保留 useTexture 的单图、数组、命名对象及预加载接口，共用带回退的加载器。
export function useTexture(input, onLoad) {
    const renderer = useThree(state => state.gl);
    const keyed = input !== null && typeof input === 'object' && !Array.isArray(input);
    const textures = useLoader(MediaTextureLoader, keyed ? Object.values(input) : input);
    useLayoutEffect(() => { onLoad?.(textures); }, [onLoad, textures]);
    useEffect(() => {
        if (renderer.initTexture) {
            for (const texture of Array.isArray(textures) ? textures : [textures]) renderer.initTexture(texture);
        }
    }, [renderer, textures]);
    return useMemo(() => keyed ? Object.fromEntries(Object.keys(input).map((key, index) => [key, textures[index]])) : textures, [input, keyed, textures]);
}

useTexture.preload = input => useLoader.preload(MediaTextureLoader, input);
useTexture.clear = input => useLoader.clear(MediaTextureLoader, input);
