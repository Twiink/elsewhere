import { SRGBColorSpace } from 'three';
import { useTexture } from '../../../hooks/useMediaTexture';
import { useTextureCopy } from '../../../hooks/useTextureCopy';
import { FIDELITY_ART } from '../../../config/fidelityArtwork';

const KEEP_COLOR = { worldPreserveColor: true };
const NO_RAYCAST = () => null;

export function WatercolorHandle({ side }) {
    const direction = side === 'left' ? -1 : 1;
    return <group>
        <mesh position={[0, 0, 0.018]} raycast={NO_RAYCAST}>
            <sphereGeometry args={[0.056, 12, 8]} />
            <meshBasicMaterial color="#8c5932" userData={KEEP_COLOR} />
        </mesh>
        <mesh position={[0, 0, 0.047]} raycast={NO_RAYCAST}>
            <sphereGeometry args={[0.037, 12, 8]} />
            <meshBasicMaterial color="#e5b66e" userData={KEEP_COLOR} />
        </mesh>
        <mesh position={[direction * 0.075, 0.002, 0.06]} rotation={[0, 0, Math.PI / 2]} raycast={NO_RAYCAST}>
            <capsuleGeometry args={[0.025, 0.14, 4, 8]} />
            <meshBasicMaterial color="#ba8244" userData={KEEP_COLOR} />
        </mesh>
        <mesh position={[direction * 0.07, 0.016, 0.079]} rotation={[0, 0, Math.PI / 2]} raycast={NO_RAYCAST}>
            <capsuleGeometry args={[0.009, 0.1, 3, 6]} />
            <meshBasicMaterial color="#f6d39b" userData={KEEP_COLOR} />
        </mesh>
    </group>;
}

// 灯画附着在共用门墙上，不改变门洞或相机的通道。
export default function WatercolorSconce({ position, visible }) {
    const lamp = useTextureCopy(useTexture(FIDELITY_ART.lamp), { colorSpace: SRGBColorSpace });
    const glow = useTextureCopy(useTexture('/media/images/textures/moonlight/fidelity/light-pool.webp'), { colorSpace: SRGBColorSpace });
    return <group name="watercolor-wall-sconce" position={position} visible={visible}>
        <mesh position={[0, -0.32, -0.01]} raycast={NO_RAYCAST}>
            <planeGeometry args={[0.9, 1.5]} />
            <meshBasicMaterial map={glow} transparent opacity={0.2} depthWrite={false} toneMapped={false} userData={KEEP_COLOR} />
        </mesh>
        <mesh raycast={NO_RAYCAST}>
            <planeGeometry args={[0.4, 0.6]} />
            <meshBasicMaterial map={lamp} transparent alphaTest={0.04} depthWrite={false} toneMapped={false} userData={KEEP_COLOR} />
        </mesh>
        <mesh position={[0.25, -2.994, 0.8]} rotation={[-Math.PI / 2, 0, 0]} raycast={NO_RAYCAST}>
            <planeGeometry args={[1.5, 2]} />
            <meshBasicMaterial map={glow} transparent opacity={0.28} depthWrite={false} toneMapped={false} userData={KEEP_COLOR} />
        </mesh>
    </group>;
}
