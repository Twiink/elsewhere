import { useRef, useMemo } from 'react';
import { Text, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { siteInfo } from '../../../data/content';

const SignSystem = (props) => {
    const groupRef = useRef();
    const signTexture = useTexture('https://media.secknow-ai.com/space/textures/entrance/sign-creative-workshop.png');
    const mountTexture = useTexture('https://media.secknow-ai.com/space/textures/entrance/belka.png');

    // 物理参数。
    const timeOffset = useMemo(() => Math.random() * 100, []);

    useFrame((state) => {
        if (groupRef.current) {
            // 简单风摆，仅用于待机动画。
            const time = state.clock.elapsedTime + timeOffset;
            const windSway = Math.sin(time * 2) * 0.05; // 持续轻柔摆动。

            groupRef.current.rotation.x = windSway;
            groupRef.current.rotation.y = 0;
        }
    });

    return (
        <group {...props}>
            <Text
                position={[0, 0.78, 0.65]}
                font="/fonts/LXGWWenKaiLite-Regular.ttf"
                fontSize={0.13}
                color="#333333"
                anchorX="center"
                anchorY="middle"
                maxWidth={3}
                textAlign="center"
            >
                {siteInfo.siteTitle}
            </Text>
            {/* 1. 安装架：视觉锚点。 */}
            {/* 纹理为横向，宽 3.5、高 0.4，近似保持比例。 */}
            {/* 纹理本身已为横向，无需旋转。 */}
            <mesh position={[-0.05, 2.05, 0.65]}>
                <planeGeometry args={[2.7, 0.4]} />
                <meshBasicMaterial color="#e0e0e0" map={mountTexture} transparent={true} side={THREE.DoubleSide} />
            </mesh>

            {/* 2. 标牌组 SignGroup。 */}
            {/* 精确位于安装横杆中心。 */}
            <group
                ref={groupRef}
                position={[0, 1.9, 0.60]}
            >
                {/* 3. 修正旋转轴。 */}
                {/* 几何体向下平移，使链条所在的上边缘位于组的 (0,0,0)。 */}
                <mesh
                    position={[0, -0.5, 0]} // 下移半个高度，假定总高约 1。
                >
                    {/* 宽 2.6，较窄；高 1。 */}
                    <planeGeometry args={[2, 1]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={signTexture}
                        transparent={true}
                        side={THREE.DoubleSide}
                        depthWrite={false} // 修正透明区域后方物体不可见的问题。
                    />
                </mesh>
            </group>
        </group>
    );
};

export default SignSystem;
