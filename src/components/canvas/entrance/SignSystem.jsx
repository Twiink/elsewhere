import { useTexture } from '../../../hooks/useMediaTexture';
import Text from '../SiteText';
import { useRef, useState } from 'react';


import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldTheme } from '../../../context/contexts';
import { useTextureCopy } from '../../../hooks/useTextureCopy';
import { FIDELITY_ART } from '../../../config/fidelityArtwork';

const SignSystem = (props) => {
    const groupRef = useRef();
    const { theme } = useWorldTheme();
    const moonlight = theme === 'moonlight';
    const [signTexture, mountTexture] = useTexture([
        '/media/images/textures/entrance/sign-creative-workshop.png',
        '/media/images/textures/entrance/belka.webp',
    ]);
    const paintedSign = useTextureCopy(useTexture(moonlight ? FIDELITY_ART.sign : '/media/images/textures/entrance/sign-creative-workshop.png'), { colorSpace: THREE.SRGBColorSpace });


    // 物理参数。
    const [timeOffset] = useState(() => Math.random() * 100);

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
                <group visible={moonlight}>
                    {[-0.7, 0.7].flatMap(x => [0, 1, 2, 3].map(link => <mesh key={`${x}-${link}`} position={[x, 0.02 - link * 0.055, 0.025]} scale={[0.7, 1, 1]} raycast={() => null}>
                        <torusGeometry args={[0.026, 0.006, 4, 10]} />
                        <meshBasicMaterial color="#866344" toneMapped={false} userData={{ worldPreserveColor: true }} />
                    </mesh>))}
                </group>
                {/* 3. 修正旋转轴。 */}
                {/* 几何体向下平移，使链条所在的上边缘位于组的 (0,0,0)。 */}
                <mesh
                    position={[0, -0.5, 0]} // 下移半个高度，假定总高约 1。
                >
                    {/* 宽 2.6，较窄；高 1。 */}
                    <planeGeometry args={[2, 1]} />
                    <meshBasicMaterial color={moonlight ? '#ffffff' : '#e0e0e0'} toneMapped={!moonlight}
                        map={moonlight ? paintedSign : signTexture}
                        transparent={true}
                        side={THREE.DoubleSide}
                        depthWrite={false} // 修正透明区域后方物体不可见的问题。
                    />
                </mesh>
                <Text visible={moonlight} position={[0, -0.5, 0.02]} fontSize={0.27} maxWidth={1.8} color="#69442e" anchorX="center" anchorY="middle" material-toneMapped={false}>创意工坊</Text>
            </group>
        </group>
    );
};

export default SignSystem;
