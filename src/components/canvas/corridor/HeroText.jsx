import { useActiveFrame as useFrame } from '../../../hooks/useActiveFrame';
import Text from '../SiteText';
import { useRef, useMemo, useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';

import * as THREE from 'three';
import { siteInfo } from '../../../data/content';
import { useWorldTheme } from '../../../context/contexts';
import { useTexture } from '../../../hooks/useMediaTexture';
import { useTextureCopy } from '../../../hooks/useTextureCopy';
import { FIDELITY_ART } from '../../../config/fidelityArtwork';

// 品牌字母使用原有字体，中文使用自动生成的 WOFF 子集。
const RUBIK_SCRIBBLE_URL = '/media/fonts/RubikScribble-Regular.ttf';
const CABIN_SKETCH_URL = '/media/fonts/LXGWWenKaiLite-site.woff';
const EMPTY_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function TitleLetter({ letter, index, objectRef, night }) {
    const map = useTextureCopy(useTexture(night ? FIDELITY_ART.title : EMPTY_IMAGE), {
        colorSpace: THREE.SRGBColorSpace, repeatX: 1 / 3, repeatY: 0.5,
        offsetX: (index % 3) / 3, offsetY: index < 3 ? 0.5 : 0,
    });
    return <group ref={objectRef} position={[letter.baseX, 0.2, 0]}>
        <Text visible={!night} fontSize={0.74} font={RUBIK_SCRIBBLE_URL} color="#ffffff" outlineWidth={0.012} outlineColor="#1a1a1a" anchorX="center" anchorY="middle" letterSpacing={0}>{letter.char}</Text>
        <mesh name={`watercolor-letter-${index}`} visible={night} position={[0, 0, 0.01]} raycast={() => null}>
            <planeGeometry args={[0.68, 0.8]} />
            <meshBasicMaterial map={map} transparent alphaTest={0.4} depthWrite={false} toneMapped={false} userData={{ worldPreserveColor: true }} />
        </mesh>
    </group>;
}

function TaglinePaper({ night }) {
    const narrow = useThree(state => state.size.width < 640);
    const map = useTextureCopy(useTexture(night ? FIDELITY_ART.tagline : EMPTY_IMAGE), { colorSpace: THREE.SRGBColorSpace });
    return <mesh name="tagline-watercolor-paper" visible={night} position={[0, 0.105, -0.02]} raycast={() => null}>
        <planeGeometry args={[narrow ? 2.6 : 2.85, 0.8]} />
        <meshBasicMaterial map={map} transparent alphaTest={0.1} depthWrite={false} toneMapped={false} userData={{ worldPreserveColor: true }} />
    </mesh>;
}
/**
 * HeroText：使用手绘字体的标题组件。
 * 
 * 面向 Awwwards 每日最佳网站的视觉效果：
 * - Twiink 使用 Rubik Scribble，滚动时拆分为字母。
 * - 网站名称与介绍使用本地中文字体。
 * - 轻微漂浮动画。
 * - 视差拆分效果。
 * - 移动端缩小尺寸。
 */
const HeroText = ({ position = [0, 0.3, 0] }) => {
    const groupRef = useRef();
    const letterRefs = useRef([]);
    const taglineRefs = useRef([]);
    const { camera } = useThree();
    const { theme } = useWorldTheme();
    const isMoonlight = theme === 'moonlight';

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

    // 昵称的六个字母分别保留滚动拆分效果。
    const letters = useMemo(() => [
        { char: 'T', baseX: -1.0, splitDir: -1.6 },
        { char: 'w', baseX: -0.54, splitDir: -1.0 },
        { char: 'i', baseX: -0.15, splitDir: -0.4 },
        { char: 'i', baseX: 0.13, splitDir: 0.4 },
        { char: 'n', baseX: 0.48, splitDir: 1.0 },
        { char: 'k', baseX: 0.92, splitDir: 1.6 },
    ], []);

    // 标语拆分效果的词语。
    const taglineWords = useMemo(() => [
        { text: "'s Space", baseX: 0, baseY: -0.35, splitDir: 0.8, fontSize: 0.26 },
        { text: siteInfo.siteDescription, baseX: 0, baseY: -0.75, splitDir: -0.8, fontSize: 0.12 },
    ], []);

    // 动画循环。
    useFrame((state) => {
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

        // 对昵称的每个字母应用拆分。
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
                ref.position.y = word.baseY + Math.sin(time * 0.6 + i * 0.3) * 0.008;
            }
        });

        // 漂浮动画。
        floatY.current = Math.sin(time * 0.5) * 0.02;
        // 在基础 Y 位置上叠加，不完全覆盖。
        groupRef.current.position.y = position[1] + floatY.current;
    });

    return (
        <group ref={groupRef} name="corridor-hero" position={position} scale={[scale, scale, 1]}>
            {/* 昵称字母：保留手绘字体与拆分动画。 */}
            {letters.map((letter, i) => <TitleLetter
                    key={`${i}-${letter.char}`}
                    letter={letter} index={i} night={isMoonlight}
                    objectRef={(el) => (letterRefs.current[i] = el)}
                />
            )}

            {/* 标语词语：本地中文字体与淡入动画。 */}
            {taglineWords.map((word, i) => <group
                    key={word.text}
                    ref={(el) => (taglineRefs.current[i] = el)}
                    position={[word.baseX, word.baseY, 0.3]}
                >
                {i === 1 && <TaglinePaper night={isMoonlight} />}
                <Text
                    fontSize={word.fontSize}
                    font={CABIN_SKETCH_URL}
                    color={isMoonlight ? '#604033' : '#555555'}
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={2.5}
                    textAlign="center"
                    lineHeight={1.5}
                >
                    {word.text}
                </Text>
                </group>
            )}

            {/* 标题周围的小涂鸦。 */}
            <SmallStar position={[-1.2, 0.55, 0]} scale={0.07} color={isMoonlight ? '#f6d7a2' : '#333'} />
            <SmallStar position={[1.25, 0.45, 0]} scale={0.05} color={isMoonlight ? '#f6d7a2' : '#333'} />
            <SmallStar position={[-1.0, -0.6, 0]} scale={0.04} color={isMoonlight ? '#f6d7a2' : '#333'} />
            <SmallStar position={[1.1, -0.55, 0]} scale={0.035} color={isMoonlight ? '#f6d7a2' : '#333'} />
        </group>
    );
};

// 缓动函数。
const easeOutQuad = (t) => t * (2 - t);

/**
 * 静态小星星装饰，避免 useFrame 开销。
 * 父组件 HeroText 已处理全部动画。
 */
const SmallStar = ({ position, scale = 0.1, color = '#333' }) => {
    return (
        <group position={position} scale={scale}>
            {[0, 1, 2, 3].map((i) => (
                <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
                    <planeGeometry args={[1, 0.12]} />
                    <meshBasicMaterial color={color} transparent opacity={color === '#333' ? 0.6 : 0.8} side={2} />
                </mesh>
            ))}
        </group>
    );
};

export default HeroText;
