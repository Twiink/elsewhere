import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

/**
 * PaperBackground 纸张背景组件。
 * 
 * 使用纸张纹理营造手绘速写本质感。
 * 通过简单平面的排列产生层次。
 */
const PaperBackground = () => {
    // 加载纸张纹理。
    const paperTexture = useTexture('https://media.secknow-ai.com/space/textures/paper-texture.png');

    useMemo(() => {
        paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
        paperTexture.repeat.set(2, 2);
        paperTexture.colorSpace = THREE.SRGBColorSpace;
    }, [paperTexture]);

    return (
        <group>
            {/* 主背景平面，置于远处。 */}
            <mesh position={[0, 0, -8]}>
                <planeGeometry args={[25, 18]} />
                <meshBasicMaterial
                    map={paperTexture}
                    color="#fafafa"
                    roughness={1}
                    metalness={0}
                />
            </mesh>

            {/* 带网格效果的地面平面。 */}
            <mesh position={[0, -2.5, -2]} rotation={[-Math.PI / 2.5, 0, 0]}>
                <planeGeometry args={[20, 15]} />
                <meshBasicMaterial
                    color="#f5f5f5"
                    roughness={1}
                    metalness={0}
                    transparent
                    opacity={0.9}
                />
            </mesh>

            {/* 地面透视网格线。 */}
            <GridLines />

            {/* 用角落平面营造轻微暗角。 */}
            <VignetteCorners />
        </group>
    );
};

/**
 * 笔记本风格的透视网格线。
 */
const GridLines = () => {
    const lines = useMemo(() => {
        const result = [];
        // 水平线。
        for (let i = -5; i <= 5; i++) {
            result.push({
                position: [0, -2.5 + i * 0.02, -2 - i * 0.8],
                width: 15,
                opacity: 0.15 - Math.abs(i) * 0.01
            });
        }
        return result;
    }, []);

    return (
        <group>
            {lines.map((line, i) => (
                <mesh
                    key={i}
                    position={line.position}
                    rotation={[-Math.PI / 2.5, 0, 0]}
                >
                    <planeGeometry args={[line.width, 0.01]} />
                    <meshBasicMaterial
                        color="#cccccc"
                        transparent
                        opacity={line.opacity}
                    />
                </mesh>
            ))}
        </group>
    );
};

/**
 * 用角落阴影营造轻微暗角。
 */
const VignetteCorners = () => {
    return (
        <group>
            {/* 顶部角落。 */}
            <mesh position={[-6, 4, 0]}>
                <circleGeometry args={[3, 32]} />
                <meshBasicMaterial
                    color="#000000"
                    transparent
                    opacity={0.03}
                />
            </mesh>
            <mesh position={[6, 4, 0]}>
                <circleGeometry args={[3, 32]} />
                <meshBasicMaterial
                    color="#000000"
                    transparent
                    opacity={0.03}
                />
            </mesh>
        </group>
    );
};

export default PaperBackground;
