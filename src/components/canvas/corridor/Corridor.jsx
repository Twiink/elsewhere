import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Corridor：手绘风格走廊组件。
 * 
 * 偏速写、纸张质感的视觉风格。
 */
const Corridor = ({ length = 100 }) => {
    const corridorWidth = 4;
    const corridorHeight = 3.5;

    // 加载纸张纹理。
    const paperTexture = useTexture('https://media.secknow-ai.com/space/textures/paper-texture.png');

    useMemo(() => {
        paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
        paperTexture.colorSpace = THREE.SRGBColorSpace;
    }, [paperTexture]);

    const zOffset = -length / 2 + 5;

    return (
        <group>
            {/* 地面：奶油色纸张。 */}
            <mesh
                position={[0, -corridorHeight / 2, zOffset]}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <planeGeometry args={[corridorWidth, length]} />
                <meshBasicMaterial
                    color="#f5f2eb"
                    roughness={1}
                    metalness={0}
                />
            </mesh>

            {/* 地面网格：笔记本风格。 */}
            <gridHelper
                args={[length, length * 2, '#d0d0d0', '#e5e5e5']}
                position={[0, -corridorHeight / 2 + 0.01, zOffset]}
                rotation={[0, Math.PI / 2, 0]}
            />

            {/* 天花板。 */}
            <mesh
                position={[0, corridorHeight / 2, zOffset]}
                rotation={[Math.PI / 2, 0, 0]}
            >
                <planeGeometry args={[corridorWidth, length]} />
                <meshBasicMaterial
                    color="#fefefe"
                    roughness={1}
                />
            </mesh>

            {/* 左墙。 */}
            <mesh
                position={[-corridorWidth / 2, 0, zOffset]}
                rotation={[0, Math.PI / 2, 0]}
            >
                <planeGeometry args={[length, corridorHeight]} />
                <meshBasicMaterial
                    color="#faf8f5"
                    roughness={1}
                />
            </mesh>

            {/* 右墙。 */}
            <mesh
                position={[corridorWidth / 2, 0, zOffset]}
                rotation={[0, -Math.PI / 2, 0]}
            >
                <planeGeometry args={[length, corridorHeight]} />
                <meshBasicMaterial
                    color="#faf8f5"
                    roughness={1}
                />
            </mesh>

            {/* 速写风格装饰。 */}
            <SketchDecorations
                corridorWidth={corridorWidth}
                corridorHeight={corridorHeight}
                length={length}
                zOffset={zOffset}
            />

            {/* 尽头墙面。 */}
            <mesh position={[0, 0, zOffset - length / 2 + 0.5]}>
                <planeGeometry args={[corridorWidth, corridorHeight]} />
                <meshBasicMaterial color="#f0ede8" roughness={1} />
            </mesh>
        </group>
    );
};

/**
 * 速写装饰：手绘线条与笔触。
 */
const SketchDecorations = ({ corridorWidth, corridorHeight, length, zOffset }) => {
    // 墙面装饰：竖向速写线。
    const wallLines = useMemo(() => {
        const lines = [];
        for (let z = -5; z > -length + 10; z -= 12) {
            lines.push(z + zOffset + length / 2);
        }
        return lines;
    }, [length, zOffset]);

    return (
        <group>
            {/* 踢脚线速写。 */}
            <mesh position={[-corridorWidth / 2 + 0.01, -corridorHeight / 2 + 0.08, zOffset]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[length, 0.06]} />
                <meshBasicMaterial color="#ccc" side={2} />
            </mesh>
            <mesh position={[corridorWidth / 2 - 0.01, -corridorHeight / 2 + 0.08, zOffset]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[length, 0.06]} />
                <meshBasicMaterial color="#ccc" side={2} />
            </mesh>

            {/* 顶角线速写。 */}
            <mesh position={[-corridorWidth / 2 + 0.01, corridorHeight / 2 - 0.05, zOffset]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[length, 0.04]} />
                <meshBasicMaterial color="#ddd" side={2} />
            </mesh>
            <mesh position={[corridorWidth / 2 - 0.01, corridorHeight / 2 - 0.05, zOffset]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[length, 0.04]} />
                <meshBasicMaterial color="#ddd" side={2} />
            </mesh>

            {/* 墙面的竖向装饰线。 */}
            {wallLines.map((z, i) => (
                <group key={i}>
                    <mesh position={[-corridorWidth / 2 + 0.01, 0, z]}>
                        <planeGeometry args={[0.015, corridorHeight * 0.6]} />
                        <meshBasicMaterial color="#e0e0e0" side={2} />
                    </mesh>
                    <mesh position={[corridorWidth / 2 - 0.01, 0, z]}>
                        <planeGeometry args={[0.015, corridorHeight * 0.6]} />
                        <meshBasicMaterial color="#e0e0e0" side={2} />
                    </mesh>
                </group>
            ))}

            {/* 墙面随机速写痕迹，类似铅笔笔触。 */}
            <SketchMarks corridorWidth={corridorWidth} zOffset={zOffset} length={length} />
        </group>
    );
};

/**
 * 墙面随机铅笔笔触。
 */
const SketchMarks = ({ corridorWidth, zOffset, length }) => {
    const marks = useMemo(() => {
        const m = [];
        for (let i = 0; i < 15; i++) {
            m.push({
                x: Math.random() > 0.5 ? -corridorWidth / 2 + 0.02 : corridorWidth / 2 - 0.02,
                y: (Math.random() - 0.5) * 2,
                z: zOffset + length / 2 - Math.random() * (length - 10),
                rotation: (Math.random() - 0.5) * 0.5,
                width: 0.05 + Math.random() * 0.1,
                opacity: 0.1 + Math.random() * 0.15
            });
        }
        return m;
    }, [corridorWidth, zOffset, length]);

    return (
        <group>
            {marks.map((mark, i) => (
                <mesh
                    key={i}
                    position={[mark.x, mark.y, mark.z]}
                    rotation={[0, mark.x < 0 ? Math.PI / 2 : -Math.PI / 2, mark.rotation]}
                >
                    <planeGeometry args={[mark.width, 0.008]} />
                    <meshBasicMaterial color="#999" transparent opacity={mark.opacity} side={2} />
                </mesh>
            ))}
        </group>
    );
};

export default Corridor;
