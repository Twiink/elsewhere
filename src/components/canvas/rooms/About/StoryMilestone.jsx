import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

// 复用 Vector3，避免 useFrame 中分配对象。
const _worldPos = new THREE.Vector3();

/**
 * StoryMilestone 故事里程碑组件。
 * 
 * 飞行时出现在天空中的故事段落。
 * 靠近时淡入，穿过时淡出。
 * 物体朝相机移动，相机保持在 z=0。
 */

// 淡入淡出距离，使用世界 Z。
// 物体从远处的负 Z 向 0 移动。
const FADE_IN_START = -50;   // 开始淡入。
const FADE_IN_END = -25;     // 完全可见。
const FADE_OUT_START = -8;   // 靠近时开始淡出。
const FADE_OUT_END = -2;     // 完全不可见。

const StoryMilestone = ({
    position = [0, 0, -30],
    title = "标题",
    subtitle = "",
    type = "intro",  // 介绍、奖项、经历、技能。
    children
}) => {
    const groupRef = useRef();

    // 跟踪透明度，产生平滑过渡。
    const currentOpacity = useRef(0);

    // 文字材质引用。
    const titleRef = useRef();
    const subtitleRef = useRef();
    const decorRef = useRef();
    const avatarRef = useRef();

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        // 获取里程碑世界位置，复用向量以减少垃圾回收压力。
        groupRef.current.getWorldPosition(_worldPos);

        // 物体朝相机移动，相机 Z 约为 0。
        // worldPos.z 从远处的较大负值增加到越过相机后的正值。
        const z = _worldPos.z;

        // 按 Z 位置计算目标透明度。
        let targetOpacity = 0;

        if (z < FADE_IN_START) {
            // 过远，尚不可见。
            targetOpacity = 0;
        } else if (z >= FADE_IN_START && z <= FADE_IN_END) {
            // 正在靠近并淡入。
            const t = (z - FADE_IN_START) / (FADE_IN_END - FADE_IN_START);
            targetOpacity = t;
        } else if (z > FADE_IN_END && z < FADE_OUT_START) {
            // 位于最佳区域，完全可见。
            targetOpacity = 1;
        } else if (z >= FADE_OUT_START && z <= FADE_OUT_END) {
            // 非常接近并穿过，正在淡出。
            const t = 1 - (z - FADE_OUT_START) / (FADE_OUT_END - FADE_OUT_START);
            targetOpacity = t;
        } else {
            // 已经经过，不可见。
            targetOpacity = 0;
        }

        // 平滑插值。
        currentOpacity.current = THREE.MathUtils.lerp(
            currentOpacity.current,
            targetOpacity,
            1 - Math.pow(0.05, delta)
        );

        const opacity = currentOpacity.current;

        // 将透明度应用到文字元素。
        if (titleRef.current) {
            titleRef.current.fillOpacity = opacity;
        }
        if (subtitleRef.current) {
            subtitleRef.current.fillOpacity = opacity;
        }
        if (decorRef.current) {
            decorRef.current.opacity = opacity * 0.3;
        }
        if (avatarRef.current) {
            avatarRef.current.opacity = opacity * 0.5;
        }

        // 靠近时略微放大。
        const scale = 0.8 + opacity * 0.2;
        groupRef.current.scale.setScalar(scale);
    });

    // 按类型设置样式。
    const styles = useMemo(() => {
        switch (type) {
            case 'intro':
                return {
                    titleSize: 1.8,
                    titleColor: '#1a1a1a',
                    subtitleSize: 0.4,
                    subtitleColor: '#4a4a4a',
                    decorColor: '#e0e0e0'
                };
            case 'awards':
                return {
                    titleSize: 1.5,
                    titleColor: '#2a2a2a',
                    subtitleSize: 0.35,
                    subtitleColor: '#666666',
                    decorColor: '#ffd700'
                };
            case 'journey':
                return {
                    titleSize: 1.5,
                    titleColor: '#2a2a2a',
                    subtitleSize: 0.35,
                    subtitleColor: '#666666',
                    decorColor: '#87CEEB'
                };
            case 'skills':
                return {
                    titleSize: 1.5,
                    titleColor: '#2a2a2a',
                    subtitleSize: 0.35,
                    subtitleColor: '#666666',
                    decorColor: '#90EE90'
                };
            default:
                return {
                    titleSize: 1.5,
                    titleColor: '#2a2a2a',
                    subtitleSize: 0.35,
                    subtitleColor: '#666666',
                    decorColor: '#e0e0e0'
                };
        }
    }, [type]);

    return (
        <group ref={groupRef} position={position}>
            {/* 背景装饰元素。 */}
            <mesh position={[0, 0, 0.5]}>
                <planeGeometry args={[8, 5]} />
                <meshBasicMaterial
                    ref={decorRef}
                    color={styles.decorColor}
                    transparent
                    opacity={0}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* 主标题。 */}
            <Text
                ref={titleRef}
                position={[0, 0.5, 0]}
                fontSize={styles.titleSize}
                color={styles.titleColor}
                anchorX="center"
                anchorY="middle"
                font="/fonts/LXGWWenKaiLite-Regular.ttf"
                fillOpacity={0}
            >
                {title}
            </Text>

            {/* 副标题。 */}
            {subtitle && (
                <Text
                    ref={subtitleRef}
                    position={[0, -0.5, 0]}
                    fontSize={styles.subtitleSize}
                    color={styles.subtitleColor}
                    anchorX="center"
                    anchorY="middle"
                    font="/fonts/LXGWWenKaiLite-Regular.ttf"
                    fillOpacity={0}
                >
                    {subtitle}
                </Text>
            )}

            {/* 介绍区域的人物占位。 */}
            {type === 'intro' && (
                <mesh position={[0, -1.5, 0]}>
                    <circleGeometry args={[0.8, 32]} />
                    <meshBasicMaterial
                        ref={avatarRef}
                        color="#cccccc"
                        transparent
                        opacity={0}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}

            {/* 自定义子内容。 */}
            {children}
        </group>
    );
};

export default StoryMilestone;
