import { useTexture } from '../../../../hooks/useMediaTexture';
import Text from '../../SiteText';
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';


import * as THREE from 'three';
import gsap from 'gsap';
import '../../shaders/RevealMaterial';
import { isTouchDevice } from '../../../../utils/deviceDetect';

// 复用 Vector3，避免 useFrame 中分配对象。
const _tempScale = new THREE.Vector3();

const SocialBarrel = ({ position, rotation = [0, 0, 0], texturePath, label, onClick, scale = [2.12, 2.3], paintOnBeforeCompile, paintUniforms }) => {
    const meshRef = useRef();
    const materialRef = useRef();
    const paintedRef = useRef();
    const hideDelayRef = useRef();

    // 根据属性加载纹理。
    // 注意：运行时切换纹理可能触发挂起。
    // 最好预加载纹理或保持纹理稳定。
    const texture = useTexture(texturePath);
    // 由基础纹理路径推导彩色纹理路径。
    const isTouch = isTouchDevice();
    const paintedTexturePath = isTouch ? texturePath : texturePath.replace('.png', '_painted.png').replace('.webp', '_painted.webp');
    const texturePainted = useTexture(paintedTexturePath);
    const textRef = useRef();

    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (meshRef.current) {
            const time = state.clock.getElapsedTime();

            // 与海浪同步，速度约 0.8、振幅约 0.15。
            // 按 X 位置加入相位偏移，避免所有木桶完全同步浮动。
            const phaseOffset = position[0] * 0.5;
            meshRef.current.position.y = position[1] + Math.sin(time * 0.8 + phaseOffset) * 0.15;

            // 轻微左右漂移。
            meshRef.current.position.x = position[0] + Math.sin(time * 0.4 + phaseOffset) * 0.2;

            // 轻微旋转漂移。
            meshRef.current.rotation.z = rotation[2] + Math.sin(time * 0.6 + phaseOffset) * 0.05;

            // 悬停缩放。
            const targetScale = hovered ? 1.1 : 1;
            // 实际缩放 = 基础缩放 × 悬停系数。
            meshRef.current.scale.lerp(_tempScale.set(targetScale, targetScale, 1), 0.1);

            // 文字上色过渡。
            if (paintUniforms && textRef.current) {
                const localPos = meshRef.current.position;
                const revealDir = new THREE.Vector3(1.0, 0.0, -0.1).normalize();
                
                const pStartDist = -5.0;
                const pEndDist = 55.0;
                const pTargetDist = THREE.MathUtils.lerp(pStartDist, pEndDist, paintUniforms.uPaintProgress.value);
                const pDistFromPlane = pTargetDist - localPos.dot(revealDir);
                
                textRef.current.fillOpacity = THREE.MathUtils.clamp(pDistFromPlane, 0, 1);
            }
        }
    });

    const handlePointerOver = () => {
        if (isTouch) return;
        document.body.style.cursor = 'var(--cursor-pointer)';
        setHovered(true);

        if (materialRef.current) {
            gsap.to(materialRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        }

        if (hideDelayRef.current) hideDelayRef.current.kill();
        if (paintedRef.current) paintedRef.current.visible = true;
    };

    const handlePointerOut = () => {
        if (isTouch) return;
        document.body.style.cursor = 'var(--cursor-default)';
        setHovered(false);

        if (materialRef.current) {
            gsap.to(materialRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }

        hideDelayRef.current = gsap.delayedCall(0.55, () => {
            if (paintedRef.current) paintedRef.current.visible = false;
        });
    };

    return (
        <group
            ref={meshRef}
            position={position}
            rotation={rotation}
            onClick={(e) => {
                e.stopPropagation();
                onClick && onClick();
            }}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
        >
            {/* 后方彩色层。 */}
            <mesh ref={paintedRef} position={[0, 0, -0.001]} visible={false}>
                <planeGeometry args={scale} />
                <meshBasicMaterial color="#e0e0e0"
                    map={texturePainted}
                    transparent={true}
                    alphaTest={0.5}
                    side={THREE.DoubleSide}
                    onBeforeCompile={paintOnBeforeCompile}
                    needsUpdate={!!paintOnBeforeCompile}
                />
            </mesh>

            {/* 前方速写叠加层，通过笔刷丢弃露出底层彩色图。 */}
            <mesh position={[0, 0, 0]}>
                <planeGeometry args={scale} />
                <revealMaterial color="#e0e0e0"
                    ref={materialRef}
                    map={texture}
                    transparent={true}
                    alphaTest={0.1}
                    uProgress={0.0}
                    paintUniforms={paintUniforms}
                    paintConfig={{dirX: 1.0, dirY: 0.0, dirZ: -0.1, startDist: -5.0, endDist: 55.0, noiseAxes: 'yz'}}
                />
            </mesh>

            {label && (
                <Text
                    ref={textRef}
                    position={[0, scale[1] * 0.26, 0.05]} // 调整 Y，让文字落在木桶顶部木牌上。
                    rotation={[0, 0, 0.03]} // 轻微倾斜，匹配手绘木牌。
                    fontSize={scale[0] * 0.14}
                    font="/media/fonts/LXGWWenKaiLite-site.woff"
                    color="#111111"
                    fillOpacity={paintUniforms ? 0 : 1}
                    anchorX="center"
                    anchorY="middle"
                >
                    {label}
                </Text>
            )
            }
        </group >
    );
};

export default SocialBarrel;
