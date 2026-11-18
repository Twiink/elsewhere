import { SRGBColorSpace } from 'three';
import { useTexture } from '../../../hooks/useMediaTexture';
import { useTextureCopy } from '../../../hooks/useTextureCopy';
import { FIDELITY_ART } from '../../../config/fidelityArtwork';

export default function EntranceHardware({ materialRef, paintedRef, mirror = false }) {
    const map = useTextureCopy(useTexture(FIDELITY_ART.handle), { colorSpace: SRGBColorSpace });
    return <group position={[mirror ? 0.09 : -0.09, 0, 0]} scale={[mirror ? -1 : 1, 1, 1]}>
        <mesh ref={paintedRef} position={[0, 0, -0.001]} visible={false}>
            <planeGeometry args={[0.42, 0.28]} />
            <meshBasicMaterial map={map} transparent alphaTest={0.45} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh>
            <planeGeometry args={[0.42, 0.28]} />
            <revealMaterial ref={materialRef} map={map} color="#e0c8a9" transparent alphaTest={0.45} depthWrite={false} toneMapped={false} uProgress={0} />
        </mesh>
    </group>;
}
