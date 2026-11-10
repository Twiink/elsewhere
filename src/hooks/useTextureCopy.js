import { useEffect, useMemo } from 'react';

// useTexture 的缓存可被多个场景共用；需要调整采样参数时使用独占副本。
export function useTextureCopy(source, { wrapS, wrapT, colorSpace, repeatX = 1, repeatY = 1, offsetX = 0, offsetY = 0, rotation = 0, centerX = 0, centerY = 0 } = {}) {
    const texture = useMemo(() => {
        const copy = source.clone();
        if (wrapS !== undefined) copy.wrapS = wrapS;
        if (wrapT !== undefined) copy.wrapT = wrapT;
        if (colorSpace !== undefined) copy.colorSpace = colorSpace;
        copy.repeat.set(repeatX, repeatY);
        copy.offset.set(offsetX, offsetY);
        copy.rotation = rotation;
        copy.center.set(centerX, centerY);
        copy.needsUpdate = true;
        return copy;
    }, [source, wrapS, wrapT, colorSpace, repeatX, repeatY, offsetX, offsetY, rotation, centerX, centerY]);

    useEffect(() => () => texture.dispose(), [texture]);
    return texture;
}
