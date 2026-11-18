import { DoubleSide, SRGBColorSpace } from 'three';
import { useWorldTheme } from '../../context/contexts';
import { useTexture } from '../../hooks/useMediaTexture';
import { useTextureCopy } from '../../hooks/useTextureCopy';
import { WORLD_ART } from '../../config/worldAppearance';

function FloralCutout(props) {
    const map = useTextureCopy(useTexture(WORLD_ART.flowers), { colorSpace: SRGBColorSpace });
    return <mesh {...props} raycast={() => null}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={map} transparent alphaTest={0.03} depthWrite={false} toneMapped={false} side={DoubleSide} />
    </mesh>;
}

export default function MoonlitFlowers(props) {
    const { theme } = useWorldTheme();
    return theme === 'moonlight' ? <FloralCutout {...props} /> : null;
}
