import { useTexture } from '../../../hooks/useMediaTexture';
import { usePerformance } from '../../../context/contexts';
import { useActiveFrame as useFrame } from '../../../hooks/useActiveFrame';
import { useRef } from 'react';


import * as THREE from 'three';


/**
 * Doodles：手绘速写装饰组件。
 * 
 * 面向 Awwwards 每日最佳网站的视觉效果：
 * - 速写纸元素：纸团、纸飞机、铅笔和咖啡。
 * - 带有物理感的漂浮动画。
 * - 统一的手绘美感。
 * - 为提升性能已移除交互。
 */
const Doodles = () => {
    const groupRef = useRef();
    const { tier } = usePerformance();
    const isLowTier = tier === 'LOW';

    // 加载全部速写纹理。
    const textures = useTexture({
        paperBall: '/media/images/textures/corridor/decorations/paper_ball.webp',
        paperAirplane: '/media/images/textures/corridor/decorations/paper_airplane.webp',
        pencil: '/media/images/textures/corridor/decorations/pencil.webp',
        coffeeCup: '/media/images/textures/corridor/decorations/coffee_cup.webp',
    });

    // 设置所有纹理的色彩空间。
    Object.values(textures).forEach(tex => {
        tex.colorSpace = THREE.SRGBColorSpace;
    });

    return (
        <group ref={groupRef}>
            {/* 放大的纸飞机，位于头顶。 */}
            <SketchElement
                texture={textures.paperAirplane}
                position={[0.5, 0.8, 0.3]}
                scale={0.55}
                rotationSpeed={0.15}
                floatSpeed={0.7}
                floatAmount={0.04}
            />

            {/* 放大的纸团，位于“创意开发者”文字左下方。 */}
            <SketchElement
                texture={textures.paperBall}
                position={[-0.9, -0.7, 0.4]}
                scale={0.4}
                rotationSpeed={0.4}
                floatSpeed={0.5}
                floatAmount={0.02}
            />

            {/* 第二个大纸团，位于左上方。 */}
            <SketchElement
                texture={textures.paperBall}
                position={[-1.3, 0.5, -0.2]}
                scale={0.3}
                rotationSpeed={-0.3}
                floatSpeed={0.6}
                floatAmount={0.03}
            />

            {/* 放大的铅笔，位于“创意开发者”文字下方。 */}
            <SketchElement
                texture={textures.pencil}
                position={[0.7, -0.8, 0.5]}
                scale={0.5}
                rotationSpeed={0.1}
                floatSpeed={0.4}
                floatAmount={0.02}
                initialRotation={-0.4}
            />

            {/* 放大的咖啡杯，位于右上方。 */}
            <SketchElement
                texture={textures.coffeeCup}
                position={[1.2, 0.6, -0.1]}
                scale={0.35}
                rotationSpeed={0.05}
                floatSpeed={0.35}
                floatAmount={0.025}
            />

            {/* 低性能档隐藏次要装饰，以降低开销。 */}
            {!isLowTier && (
                <>
                    {/* 带动画的手绘星星。 */}
                    <AnimatedStar position={[-1.5, 1.2, 0]} scale={0.1} speed={0.4} />
                    <AnimatedStar position={[1.6, 0.8, -0.5]} scale={0.08} speed={0.5} />
                    <AnimatedStar position={[-1.2, 0.1, 0.5]} scale={0.06} speed={0.3} />
                    <AnimatedStar position={[1.3, 1.4, -1]} scale={0.07} speed={0.6} />

                    {/* 手绘圆圈。 */}
                    <DoodleCircle position={[1.2, -0.2, 0.2]} scale={0.05} />
                    <DoodleCircle position={[-1.3, 1.0, 0.3]} scale={0.04} />

                    {/* 弯曲装饰线。 */}
                    <Squiggle position={[-1.6, 0.5, -0.3]} rotation={0.2} />
                    <Squiggle position={[1.4, 0.3, 0.2]} rotation={-0.3} />

                    {/* 人物旁的思考气泡。 */}
                    <ThoughtBubble position={[0.9, 0.7, 0.5]} />
                </>
            )}
        </group>
    );
};

/**
 * 速写元素：带漂浮动画的二维纹理元素。
 */
const SketchElement = ({
    texture,
    position,
    scale = 0.3,
    rotationSpeed = 0.1,
    floatSpeed = 0.5,
    floatAmount = 0.03,
    initialRotation = 0
}) => {
    const ref = useRef();
    const aspectRatio = texture.image ? texture.image.width / texture.image.height : 1;
    const dimensions = { width: scale * aspectRatio, height: scale };

    useFrame((state) => {
        if (!ref.current) return;

        const time = state.clock.elapsedTime;

        // 简单轻柔的漂浮。
        ref.current.position.y = position[1] + Math.sin(time * floatSpeed + position[0]) * floatAmount;

        // 旋转动画。
        ref.current.rotation.z = initialRotation + Math.sin(time * rotationSpeed) * 0.1;

        // 轻微缩放脉动。
        const pulse = 1 + Math.sin(time * 1.5 + position[0] * 2) * 0.03;
        ref.current.scale.setScalar(pulse);
    });

    return (
        <group ref={ref} position={position}>
            {/* 阴影层。 */}
            <mesh position={[0.01, -0.01, -0.01]}>
                <planeGeometry args={[dimensions.width, dimensions.height]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={texture}
                    transparent={true}
                    opacity={0.15}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    alphaTest={0.5}
                />
            </mesh>
            {/* 主元素。 */}
            <mesh>
                <planeGeometry args={[dimensions.width, dimensions.height]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={texture}
                    transparent={true}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    alphaTest={0.5}
                />
            </mesh>
        </group>
    );
};


/**
 * 手绘风格的旋转星星动画。
 */
const AnimatedStar = ({ position, scale = 0.1, speed = 0.5 }) => {
    const ref = useRef();

    useFrame((state) => {
        if (ref.current) {
            const time = state.clock.elapsedTime;
            ref.current.rotation.z = time * speed;
            ref.current.position.y = position[1] + Math.sin(time * 0.8 + position[0]) * 0.03;
            ref.current.scale.setScalar(scale * (1 + Math.sin(time * 2) * 0.15));
        }
    });

    return (
        <group ref={ref} position={position} scale={scale}>
            {[0, 1, 2, 3].map((i) => (
                <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
                    <planeGeometry args={[1, 0.12]} />
                    <meshBasicMaterial color="#2a2a2a" transparent opacity={0.7} side={2} />
                </mesh>
            ))}
        </group>
    );
};

/**
 * 弯曲手绘线。
 */
const Squiggle = ({ position, rotation = 0 }) => {
    const ref = useRef();

    useFrame((state) => {
        if (ref.current) {
            const time = state.clock.elapsedTime;
            ref.current.position.x = position[0] + Math.sin(time * 0.5) * 0.02;
        }
    });

    return (
        <group ref={ref} position={position} rotation={[0, 0, rotation]}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <mesh key={i} position={[i * 0.07, Math.sin(i * 1.5) * 0.035, 0]}>
                    <circleGeometry args={[0.015, 8]} />
                    <meshBasicMaterial color="#444" transparent opacity={0.5} />
                </mesh>
            ))}
        </group>
    );
};

/**
 * 带脉动动画的手绘圆。
 */
const DoodleCircle = ({ position, scale = 0.08 }) => {
    const ref = useRef();

    useFrame((state) => {
        if (ref.current) {
            const time = state.clock.elapsedTime;
            const pulse = 1 + Math.sin(time * 2) * 0.1;
            ref.current.scale.setScalar(scale * pulse);
        }
    });

    return (
        <mesh ref={ref} position={position}>
            <ringGeometry args={[0.6, 1, 12]} />
            <meshBasicMaterial color="#333" transparent opacity={0.4} side={2} />
        </mesh>
    );
};

/**
 * 思考气泡：含动态内容的漫画风格。
 */
const ThoughtBubble = ({ position }) => {
    const ref = useRef();
    const contentRef = useRef();

    useFrame((state) => {
        if (ref.current) {
            const time = state.clock.elapsedTime;
            ref.current.position.y = position[1] + Math.sin(time * 0.6) * 0.02;
        }

        if (contentRef.current) {
            // 气泡内的脉动内容。
            const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
            contentRef.current.material.opacity = pulse;
        }
    });

    return (
        <group ref={ref} position={position}>
            {/* 主气泡。 */}
            <mesh>
                <circleGeometry args={[0.12, 16]} />
                <meshBasicMaterial color="#fff" />
            </mesh>
            <mesh>
                <ringGeometry args={[0.11, 0.13, 16]} />
                <meshBasicMaterial color="#333" />
            </mesh>

            {/* 通向主气泡的小气泡。 */}
            <mesh position={[-0.1, -0.1, 0]}>
                <circleGeometry args={[0.035, 8]} />
                <meshBasicMaterial color="#fff" />
            </mesh>
            <mesh position={[-0.1, -0.1, 0]}>
                <ringGeometry args={[0.03, 0.04, 8]} />
                <meshBasicMaterial color="#333" />
            </mesh>

            {/* 气泡内部的代码图标。 */}
            <mesh ref={contentRef} position={[0, 0, 0.01]}>
                <planeGeometry args={[0.05, 0.06]} />
                <meshBasicMaterial color="#111111" transparent opacity={0.9} />
            </mesh>
        </group>
    );
};

export default Doodles;
