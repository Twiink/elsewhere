import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

// 本地字体；troika 需要 TTF 格式。
const RUBIK_SCRIBBLE_URL = '/fonts/RubikScribble-Regular.ttf';
const CABIN_SKETCH_URL = '/fonts/LXGWWenKaiLite-Regular.ttf';

// 全局标记：每次页面加载只执行一次绘制动画。
let hasPlayedDrawAnimation = false;

/**
 * HeroText：使用手绘字体的标题组件。
 * 
 * 面向 Awwwards 每日最佳网站的视觉效果：
 * - ITOM 使用 Rubik Scribble，滚动时拆分为字母。
 * - “创意开发者”使用本地中文字体，滚动时同样拆分。
 * - 轻微漂浮动画。
 * - 视差拆分效果。
 * - 移动端缩小尺寸。
 */
const HeroText = ({ position = [0, 0.3, 0] }) => {
    const groupRef = useRef();
    const letterRefs = useRef([]);
    const taglineRefs = useRef([]);
    const { camera } = useThree();

    // 按屏幕宽度连续缩放，不使用断点。
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            const width = window.innerWidth;
            const minWidth = 320;
            const maxWidth = 1200;
            const minScale = 0.65;
            const maxScale = 1.0;

            const clampedWidth = Math.max(minWidth, Math.min(maxWidth, width));
            const t = (clampedWidth - minWidth) / (maxWidth - minWidth);
            setScale(minScale + t * (maxScale - minScale));
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    // 拆分与躲避状态。
    const splitAmount = useRef(0);
    const targetSplit = useRef(0);
    const floatY = useRef(0);
    // 预先分配 Vector3，避免逐帧垃圾回收。
    const worldPosVec = useRef(new THREE.Vector3());

    // ITOM 拆分效果的字母位置。
    const letters = useMemo(() => [
        { char: 'I', baseX: -0.95, splitDir: -1.6, delay: 0 },
        { char: 'T', baseX: -0.43, splitDir: -0.6, delay: 0 },
        { char: 'O', baseX: 0.23, splitDir: 0.6, delay: 0 },
        { char: 'M', baseX: 0.95, splitDir: 1.8, delay: 0 },
    ], []);

    // 标语拆分效果的词语。
    const taglineWords = useMemo(() => [
        { text: '<', baseX: -0.85, splitDir: -1.5, delay: 0 },
        { text: "创意", baseX: -0.4, splitDir: -0.8, delay: 0 },
        { text: "开发者", baseX: 0.4, splitDir: 0.8, delay: 0 },
        { text: '/>', baseX: 0.85, splitDir: 1.5, delay: 0 },
    ], []);

    // 动画循环。
    useFrame((state, delta) => {
        if (!groupRef.current) return;

        const time = state.clock.elapsedTime;

        // 按相机距离拆分。
        groupRef.current.getWorldPosition(worldPosVec.current);
        const distance = camera.position.z - worldPosVec.current.z;

        const SPLIT_START = 3;
        const SPLIT_PEAK = 0;
        const SPLIT_END = -2;
        const SPLIT_AMOUNT = 0.9;

        if (distance > SPLIT_PEAK && distance < SPLIT_START) {
            const t = (SPLIT_START - distance) / (SPLIT_START - SPLIT_PEAK);
            targetSplit.current = SPLIT_AMOUNT * easeOutQuad(t);
        } else if (distance <= SPLIT_PEAK && distance > SPLIT_END) {
            const t = (distance - SPLIT_END) / (SPLIT_PEAK - SPLIT_END);
            targetSplit.current = SPLIT_AMOUNT * easeOutQuad(t);
        } else {
            targetSplit.current = 0;
        }

        splitAmount.current = THREE.MathUtils.lerp(splitAmount.current, targetSplit.current, 0.08);

        // 对 ITOM 每个字母应用拆分。
        letterRefs.current.forEach((ref, i) => {
            if (ref) {
                // 确保透明度为 1。
                if (ref.material) ref.material.opacity = 1;
                ref.scale.setScalar(1); // 确保缩放为 1，不残留弹出效果。

                const letter = letters[i];
                ref.position.x = letter.baseX + letter.splitDir * splitAmount.current;
                ref.position.y = 0.2 + Math.sin(time * 0.7 + i * 0.5) * 0.015;
                ref.rotation.z = Math.sin(time * 0.5 + i) * 0.02 * (1 + splitAmount.current);
            }
        });

        // 对标语词语应用拆分。
        taglineRefs.current.forEach((ref, i) => {
            if (ref) {
                // 确保透明度为 1。
                if (ref.material) ref.material.opacity = 1;

                const word = taglineWords[i];
                ref.position.x = word.baseX + word.splitDir * splitAmount.current * 0.6;
                ref.position.y = -0.45 + Math.sin(time * 0.6 + i * 0.3) * 0.008;
            }
        });

        // 漂浮动画。
        floatY.current = Math.sin(time * 0.5) * 0.02;
        // 在基础 Y 位置上叠加，不完全覆盖。
        groupRef.current.position.y = position[1] + floatY.current;
    });

    return (
        <group ref={groupRef} position={position} scale={[scale, scale, 1]}>
            {/* ITOM 字母：Rubik Scribble 字体与淡入动画。 */}
            {letters.map((letter, i) => (
                <Text
                    key={letter.char}
                    ref={(el) => (letterRefs.current[i] = el)}
                    position={[letter.baseX, 0.2, 0]}
                    fontSize={0.9}
                    font={RUBIK_SCRIBBLE_URL}
                    color="#ffffff"
                    outlineWidth={0.012}
                    outlineColor="#1a1a1a"
                    anchorX="center"
                    anchorY="middle"
                    letterSpacing={0}
                >
                    {letter.char}
                </Text>
            ))}

            {/* 标语词语：本地中文字体与淡入动画。 */}
            {taglineWords.map((word, i) => (
                <Text
                    key={word.text}
                    ref={(el) => (taglineRefs.current[i] = el)}
                    position={[word.baseX, -0.55, 0.3]}
                    fontSize={0.16}
                    font={CABIN_SKETCH_URL}
                    color="#555555"
                    anchorX="center"
                    anchorY="middle"
                    letterSpacing={0.04}
                >
                    {word.text}
                </Text>
            ))}

            {/* 标题周围的小涂鸦。 */}
            <SmallStar position={[-1.2, 0.55, 0]} scale={0.07} />
            <SmallStar position={[1.25, 0.45, 0]} scale={0.05} />
            <SmallStar position={[-1.0, -0.6, 0]} scale={0.04} />
            <SmallStar position={[1.1, -0.55, 0]} scale={0.035} />
        </group>
    );
};

// 缓动函数。
const easeOutQuad = (t) => t * (2 - t);

/**
 * 静态小星星装饰，避免 useFrame 开销。
 * 父组件 HeroText 已处理全部动画。
 */
const SmallStar = ({ position, scale = 0.1 }) => {
    return (
        <group position={position} scale={scale}>
            {[0, 1, 2, 3].map((i) => (
                <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
                    <planeGeometry args={[1, 0.12]} />
                    <meshBasicMaterial color="#333" transparent opacity={0.6} side={2} />
                </mesh>
            ))}
        </group>
    );
};

export default HeroText;
