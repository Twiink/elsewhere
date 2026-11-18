import { useEffect, useMemo } from 'react';
import { PlaneGeometry, RepeatWrapping } from 'three';
import { useTexture } from '../../../hooks/useMediaTexture';
import { useTextureCopy } from '../../../hooks/useTextureCopy';

const FLOOR_WIDTH = 25;
const FLOOR_DEPTH = 40;
const FLAT_GROUND_Z = 1;
const GROUND_DROP = 0.45;

export default function CourtyardFloor({ floorY, facadeZ }) {
    const floorSource = useTexture('/media/images/textures/entrance/floor_paper.webp');
    const floorTexture = useTextureCopy(floorSource, {
        wrapS: RepeatWrapping, wrapT: RepeatWrapping, repeatX: 6.6, repeatY: 20,
    });
    const geometry = useMemo(() => {
        // 门槛和立面下方齐平，庭院地面在树前回落到原来的高度。
        const rows = [[0, 0], [facadeZ, 0], [FLAT_GROUND_Z, -GROUND_DROP], [FLOOR_DEPTH, -GROUND_DROP]];
        const floor = new PlaneGeometry(FLOOR_WIDTH, FLOOR_DEPTH, 1, rows.length - 1);
        const { position, uv } = floor.attributes;
        rows.forEach(([z, y], row) => {
            for (let column = 0; column < 2; column++) {
                const vertex = row * 2 + column;
                position.setY(vertex, y);
                position.setZ(vertex, z);
                uv.setY(vertex, 1 - z / FLOOR_DEPTH);
            }
        });
        floor.computeVertexNormals();
        return floor;
    }, [facadeZ]);
    useEffect(() => () => geometry.dispose(), [geometry]);

    return (
        <mesh name="courtyard-floor" position={[0, floorY, 0]} geometry={geometry} raycast={() => null}>
            <meshBasicMaterial color="#e0e0e0" map={floorTexture} />
        </mesh>
    );
}
