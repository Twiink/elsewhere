import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Avatar：手绘速写风格人物组件。
 * 
 * 速写人物的视觉效果：
 * - 随滚动产生景深视差。
 * - 手绘线条与入口风格一致。
 * - 相机靠近时躲避。
 * - 逐帧往返动画：1→6→1。
 */
const Avatar = ({ position = [10, -20, 30] }) => {
    const meshRef = useRef();
    const groupRef = useRef();
    const [dimensions, setDimensions] = useState({ width: 1.2, height: 2.4 });
    const { camera } = useThree();

    // 躲避状态。
    const dodgeX = useRef(0);
    const targetDodgeX = useRef(0);
    const worldPosVec = useRef(new THREE.Vector3());

    // 逐帧往返动画。
    const TOTAL_FRAMES = 9;
    const framePaths = Array.from({ length: TOTAL_FRAMES }, (_, i) => `/textures/corridor/avatar_anim/${i + 1}.webp`);

    // 加载全部纹理帧。
    const textures = useTexture(framePaths);

    // 动画控制引用。
    // 从索引 0 开始，对应 1.webp。
    const currentFrame = useRef(0);
    const isReversing = useRef(false);
    const frameTimer = useRef(0);

    // 一次性设置色彩空间并计算尺寸。
    useEffect(() => {
        textures.forEach(tex => tex.colorSpace = THREE.SRGBColorSpace);

        if (textures[0] && textures[0].image) {
            const aspectRatio = textures[0].image.width / textures[0].image.height;
            const baseHeight = 2.3; // 固定尺寸。
            setDimensions({
                width: baseHeight * aspectRatio,
                height: baseHeight
            });
        }

        // 设置初始纹理以避免白色闪烁，但不使用声明式绑定，
        // 防止 React 覆盖 useFrame 中的修改。
        if (meshRef.current && textures[currentFrame.current]) {
            meshRef.current.material.map = textures[currentFrame.current];
            meshRef.current.material.needsUpdate = true;
        }
    }, [textures]);

    // 主动画循环。
    useFrame((state, delta) => {
        if (!groupRef.current || !meshRef.current) return;

        // 躲避逻辑。
        groupRef.current.getWorldPosition(worldPosVec.current);
        const distance = camera.position.z - worldPosVec.current.z;

        const DODGE_START = 3;
        const DODGE_PEAK = 0;
        const DODGE_END = -2;
        const DODGE_AMOUNT = -1.5;

        if (distance > DODGE_PEAK && distance < DODGE_START) {
            const t = (DODGE_START - distance) / (DODGE_START - DODGE_PEAK);
            targetDodgeX.current = DODGE_AMOUNT * easeOutQuad(t);
        } else if (distance <= DODGE_PEAK && distance > DODGE_END) {
            const t = (distance - DODGE_END) / (DODGE_PEAK - DODGE_END);
            targetDodgeX.current = DODGE_AMOUNT * easeOutQuad(t);
        } else {
            targetDodgeX.current = 0;
        }

        dodgeX.current = THREE.MathUtils.lerp(dodgeX.current, targetDodgeX.current, 0.08);

        groupRef.current.position.x = position[0] + dodgeX.current;
        groupRef.current.position.y = position[1];

        // 往返逐帧动画逻辑。
        // 使用 delta，保证不同刷新率下速度一致。
        const FPS = 20; // 挥手速度，每秒帧数。
        const frameDuration = 1 / FPS;

        frameTimer.current += delta;

        if (frameTimer.current >= frameDuration) {
            frameTimer.current = 0; // 重置计时器。

            // 到达最右侧帧后，向左播放。
            if (currentFrame.current >= TOTAL_FRAMES - 1) {
                isReversing.current = true;
            }
            // 到达索引 0（1.webp）后，向右播放。
            else if (currentFrame.current <= 0) {
                isReversing.current = false;
            }

            // 切换帧。
            if (isReversing.current) {
                currentFrame.current -= 1;
            } else {
                currentFrame.current += 1;
            }

            // 防止索引越界，最低不小于 0。
            const safeIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, currentFrame.current));

            // 应用纹理。
            meshRef.current.material.map = textures[safeIndex];
            meshRef.current.material.needsUpdate = true;
        }
    });

    return (
        <group ref={groupRef} position={position}>
            <mesh ref={meshRef}>
                <planeGeometry args={[dimensions.width, dimensions.height]} />
                <meshBasicMaterial color="#ffffff"
                    transparent={true}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>
        </group>
    );
};

// 缓动函数。
const easeOutQuad = (t) => t * (2 - t);

export default Avatar;
