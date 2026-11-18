import { SRGBColorSpace } from 'three';
import { useWorldTheme } from '../../context/contexts';
import { useTexture } from '../../hooks/useMediaTexture';
import { useTextureCopy } from '../../hooks/useTextureCopy';
import { WORLD_ART } from '../../config/worldAppearance';

function WindowRoom({ visible }) {
    const map = useTextureCopy(useTexture(WORLD_ART.windowRoom), { colorSpace: SRGBColorSpace });
    return <mesh name="entrance-window-interior" position={[2.5, 0, 0.038]} visible={visible} raycast={() => null}>
        <planeGeometry args={[1.48, 1.48]} />
        <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>;
}

export default function MoonlitWindow() {
    const { theme } = useWorldTheme();
    return <WindowRoom visible={theme === 'moonlight'} />;
}
