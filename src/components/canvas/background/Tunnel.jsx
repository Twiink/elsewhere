import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Tunnel 隧道组件。
 * 
 * 使用内翻圆柱体与纸张纹理营造无限隧道，
 * 末端逐渐融入白雾。
 */
const Tunnel = ({ parallax = { x: 0, y: 0 } }) => {
    const meshRef = useRef();

    // 加载纸张纹理。
    const paperTexture = useTexture('/textures/paper-texture.webp');

    // 配置纹理平铺。
    useMemo(() => {
        paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
        paperTexture.repeat.set(3, 6);
        paperTexture.colorSpace = THREE.SRGBColorSpace;
    }, [paperTexture]);

    // 根据视差驱动隧道旋转。
    useFrame((state, delta) => {
        if (!meshRef.current) return;

        // 随鼠标视差轻微旋转。
        const targetRotationZ = parallax.x * 0.08;
        const targetRotationX = Math.PI / 2 + parallax.y * 0.04;

        // 平滑插值。
        meshRef.current.rotation.z = THREE.MathUtils.lerp(
            meshRef.current.rotation.z,
            targetRotationZ,
            delta * 2
        );
        meshRef.current.rotation.x = THREE.MathUtils.lerp(
            meshRef.current.rotation.x,
            targetRotationX,
            delta * 2
        );
    });

    return (
        <mesh
            ref={meshRef}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0, -15]}
        >
            <cylinderGeometry args={[10, 10, 40, 64, 1, true]} />
            <meshBasicMaterial
                map={paperTexture}
                side={THREE.BackSide}
                roughness={1}
                metalness={0}
                color="#e0e0e0"
            />
        </mesh>
    );
};

export default Tunnel;
