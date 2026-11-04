import { useState, useRef, useMemo, useEffect } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { Text, PositionalAudio } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import SkyChunk, { CHUNK_LENGTH, ROOM_Z } from './SkyChunk';
import { useScene } from '../../../../context/SceneContext';
import '../../shaders/RevealBasicMaterial'; // 注册 BasicMaterial 的笔刷显现效果。
import { isTouchDevice } from '../../../../utils/deviceDetect';
import { useAwards } from '../../../../hooks/useContentData';

// 复用 Vector3，避免事件处理时分配对象。
const _tempVec3 = new THREE.Vector3();

/**
 * InfiniteSkyManager 无限天空管理组件。
 * 
 * 动态生成和移除天空分块，实现无限滚动。
 * 世界组随滚动移动，分块相对于该组保持固定位置。
 * 故事里程碑也随内容循环。
 */

import { useAudio } from '../../../../context/AudioManager';

export const BALLOON_AUDIO_SETTINGS = {
    volume: 1.0,
    distance: 2,
    rolloff: 2
};

/**
 * 可复用按钮，支持悬停与笔刷显现效果。
 */
const AwardButton = ({ onClick, texture, paintedTexture, width, height, position, onHoverChange }) => {
    const isTouch = isTouchDevice();
    const meshRef = useRef();
    const buttonRevealRef = useRef(); // 按钮速写的 RevealBasicMaterial 引用。
    const paintedRef = useRef(); // 彩色按钮网格的可见状态。
    const hideDelayRef = useRef(); // 跟踪待执行的 gsap.delayedCall。
    const [hovered, setHovered] = useState(false);

    useFrame((state, delta) => {
        if (meshRef.current) {
            // 按悬停状态平滑插值缩放。
            const targetScale = hovered ? 1.05 : 1.0;
            const lerpFactor = 10 * delta;

            meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, lerpFactor);
            meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, targetScale, lerpFactor);
            meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, targetScale, lerpFactor);
        }
    });

    const handlePointerOver = () => {
        if (isTouch) return;
        setHovered(true);
        document.body.style.cursor = 'pointer';
        onHoverChange?.(true);

        // 笔刷显现按钮。
        if (buttonRevealRef.current) {
            gsap.to(buttonRevealRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (hideDelayRef.current) hideDelayRef.current.kill();
        if (paintedRef.current) {
            paintedRef.current.visible = true;
            if (paintedRef.current.material) paintedRef.current.material.opacity = 1;
        }
    };

    const handlePointerOut = () => {
        if (isTouch) return;
        setHovered(false);
        document.body.style.cursor = 'auto';
        onHoverChange?.(false);

        // 反向显现。
        if (buttonRevealRef.current) {
            gsap.to(buttonRevealRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }
        hideDelayRef.current = gsap.delayedCall(0.55, () => {
            if (paintedRef.current && paintedRef.current.material) {
                paintedRef.current.material.opacity = 0;
            }
        });
    };

    return (
        <group ref={meshRef} position={position}>
            {/* 彩色按钮位于后方，悬停前隐藏。 */}
            <mesh ref={paintedRef} position={[0, 0, -0.001]} visible={true}>
                <planeGeometry args={[width, height]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={paintedTexture}
                    transparent
                    opacity={0}
                    side={THREE.DoubleSide}
                    alphaTest={0.5}
                    depthWrite={false}
                />
            </mesh>
            {/* 带显现效果的前方速写按钮。 */}
            <mesh
                onClick={onClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
            >
                <planeGeometry args={[width, height]} />
                <revealBasicMaterial
                    ref={buttonRevealRef}
                    map={texture}
                    transparent
                    side={THREE.DoubleSide}
                    alphaTest={0.1}
                    depthWrite={false}
                    uProgress={0.0}
                />
            </mesh>
            <Text
                position={[0, 0, 0.05]}
                fontSize={0.25}
                color="#1a1a1a"
                anchorX="center"
                anchorY="middle"
                font="/fonts/LXGWWenKaiLite-Regular.ttf"
            >
                查看
            </Text>
        </group>
    );
};

// 故事里程碑配置。
// 每个故事周期出现一次，即 4 个分块、160 单位。
const STORY_CYCLE_LENGTH = 160;

// 世界空间中里程碑的硬裁切边界。
// 关于我房间位于 Z=-25，门也位于此处。
// -27 表示门后深入房间 2 米，必须与 SkyChunk 的 CORRIDOR_CLIP_Z 一致。
const MILESTONE_CORRIDOR_CLIP_Z = -8.0;

const InfiniteSkyManager = ({ scrollProgressRef }) => {
    // 按 scrollProgress=0 预先计算。
    // currentChunk=floor(0/40)=0，对应 [-1, 0, 1, 2]。
    const [activeChunks, setActiveChunks] = useState([-1, 0, 1, 2]);
    // currentStoryCycle=floor(0/160)=0，对应 [-1, 0, 1]。
    const [activeStoryCycles, setActiveStoryCycles] = useState([-1, 0, 1]);
    const worldRef = useRef();

    // 跟踪当前分块以循环复用。
    const getCurrentChunk = (worldZ) => {
        return Math.floor(worldZ / CHUNK_LENGTH);
    };

    // 跟踪当前故事周期。
    const getCurrentStoryCycle = (worldZ) => {
        return Math.floor(worldZ / STORY_CYCLE_LENGTH);
    };

    // 按世界位置更新分块。
    useFrame(() => {
        if (!worldRef.current) return;

        const scrollProgress = scrollProgressRef?.current || 0;

        // 直接移动世界组。
        worldRef.current.position.z = scrollProgress;

        // 计算当前所在分块。
        const currentChunk = getCurrentChunk(scrollProgress);
        const shouldBeActiveChunks = [
            currentChunk - 1,
            currentChunk,
            currentChunk + 1,
            currentChunk + 2,
        ];

        const chunksNeedUpdate = shouldBeActiveChunks.some(c => !activeChunks.includes(c)) ||
            activeChunks.some(c => !shouldBeActiveChunks.includes(c));

        if (chunksNeedUpdate) {
            setActiveChunks(shouldBeActiveChunks);
        }

        // 更新故事周期。
        const currentStoryCycle = getCurrentStoryCycle(scrollProgress);
        const shouldBeActiveCycles = [
            currentStoryCycle - 1,
            currentStoryCycle,
            currentStoryCycle + 1,
        ];

        const cyclesNeedUpdate = shouldBeActiveCycles.some(c => !activeStoryCycles.includes(c)) ||
            activeStoryCycles.some(c => !shouldBeActiveCycles.includes(c));

        if (cyclesNeedUpdate) {
            setActiveStoryCycles(shouldBeActiveCycles);
        }
    });

    return (
        <group ref={worldRef}>
            {/* 带云层的天空分块。 */}
            {activeChunks.map((chunkIndex) => (
                <SkyChunk
                    key={`sky-chunk-${chunkIndex}`}
                    chunkIndex={chunkIndex}
                    seed={42}
                    scrollProgressRef={scrollProgressRef}
                />
            ))}

            {/* 故事里程碑，每 160 单位循环。 */}
            {activeStoryCycles.map((cycleIndex) => (
                <group key={`story-cycle-${cycleIndex}`}>
                    {/* 自我介绍里程碑。 */}
                    <IntroMilestone
                        z={-(cycleIndex * STORY_CYCLE_LENGTH + 15)}
                        scrollProgressRef={scrollProgressRef}
                    />

                    {/* 奖项里程碑。 */}
                    <AwardsMilestone
                        z={-(cycleIndex * STORY_CYCLE_LENGTH + 55)}
                        scrollProgressRef={scrollProgressRef}
                    />

                    {/* 经历里程碑。 */}
                    <JourneyMilestone
                        z={-(cycleIndex * STORY_CYCLE_LENGTH + 95)}
                        scrollProgressRef={scrollProgressRef}
                    />

                    {/* 技能里程碑。 */}

                    <SkillsMilestone
                        z={-(cycleIndex * STORY_CYCLE_LENGTH + 135)}
                        scrollProgressRef={scrollProgressRef}
                    />
                </group>
            ))}
        </group>
    );
};

/**
 * 自我介绍里程碑的详细布局。
 * 元素靠近相机时向两侧散开。
 */
const IntroMilestone = ({ z, scrollProgressRef }) => {
    // 加载人物纹理。
    const avatarTexture = useLoader(THREE.TextureLoader, '/textures/about/awatarnachmurce.webp');
    const { camera, viewport } = useThree();
    const isTouch = isTouchDevice();

    // 全部动画元素的引用。
    const groupRef = useRef();
    const titleRef = useRef();
    const brandRef = useRef();
    const avatarRef = useRef();
    const motto1Ref = useRef();
    const motto2Ref = useRef();

    // 基础位置。
    const baseY = 2;

    // 计算宽高比。
    // 使用原始尺寸 2816×1536，避免拉伸。
    const legacyAspectRatio = 2816 / 1536; 
    const avatarWidth = 6; // 增大云上人物的尺寸。
    const avatarHeight = avatarWidth / legacyAspectRatio;

    // 动画：漂浮，靠近时散开。
    useFrame((state) => {
        if (!groupRef.current) return;

        const time = state.clock.elapsedTime;

        // 硬裁切线，手动计算世界 Z。
        // 世界 Z = 房间位置 -25 + scrollProgress + 里程碑局部位置。
        const scrollProgress = scrollProgressRef?.current || 0;
        const worldZ = ROOM_Z + scrollProgress + z;
        groupRef.current.visible = worldZ < MILESTONE_CORRIDOR_CLIP_Z;

        // 不可见时跳过后续处理。
        if (!groupRef.current.visible) return;

        // 使用 scrollProgress 加偏移得到一致距离。
        // 保证无论分块或相机位置如何，动画行为都相同。
        // 基础起点 Z=-15，加滚动 0，减偏移 55，结果 -70，与第 0 分块一致。
        const distanceZ = z + scrollProgress - 55;

        // 散开效果从 z=-25 开始，在 z=-5 完全展开。
        // 让元素到达相机前就散开。
        // 在此编辑自我介绍。
        // 增大 Start 与 End 的差值可减慢动画。
        const spreadStart = -70; // 更早开始。
        const spreadEnd = -50;   // 更晚结束。
        let spreadFactor = 0;

        if (distanceZ > spreadStart && distanceZ < spreadEnd) {
            // 计算散开进度：spreadStart 时为 0，spreadEnd 时为 1。
            spreadFactor = (distanceZ - spreadStart) / (spreadEnd - spreadStart);
            spreadFactor = Math.min(1, Math.max(0, spreadFactor));
            // 缓出使动画更平滑。
            spreadFactor = spreadFactor * spreadFactor;
        } else if (distanceZ >= spreadEnd) {
            spreadFactor = 1;
        }

        // 元素向左右散开，幅度更大。
        const maxSpread = 15; // 元素散开距离，已增大。

        if (titleRef.current) {
            titleRef.current.position.x = -spreadFactor * maxSpread * 0.8;
        }
        if (brandRef.current) {
            brandRef.current.position.x = spreadFactor * maxSpread * 0.6;
        }
        if (avatarRef.current) {
            // 人物漂浮并向上散开。
            avatarRef.current.position.y = baseY + Math.sin(time * 0.8) * 0.15 + spreadFactor * 3;
            avatarRef.current.position.x = -spreadFactor * maxSpread * 0.3;
        }
        if (motto1Ref.current) {
            motto1Ref.current.position.x = spreadFactor * maxSpread * 0.7;
        }
        if (motto2Ref.current) {
            motto2Ref.current.position.x = -spreadFactor * maxSpread * 0.5;
        }
    });

    return (
        <group ref={groupRef} position={[0, 0, z]}>
            {/* 姓名主标题，向左散开。 */}
            <Text
                ref={titleRef}
                position={[0, 5, 0.1]}
                fontSize={0.8}
                color="#1a1a1a"
                anchorX="center"
                anchorY="middle"
                font="/fonts/LXGWWenKaiLite-Regular.ttf"
            >
                TOMASZ SZMAJDA
            </Text>

            {/* 品牌副标题，向右散开。 */}
            <Text
                ref={brandRef}
                position={[0, 4.3, 0.1]}
                fontSize={0.45}
                color="#4a4a4a"
                anchorX="center"
                anchorY="middle"
                font="/fonts/LXGWWenKaiLite-Regular.ttf"
            >
                (ITOM)
            </Text>

            {/* 云上人物漂浮并向左上散开。 */}
            <mesh ref={avatarRef} position={[0, baseY, 0]}>
                <planeGeometry args={[avatarWidth, avatarHeight]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={avatarTexture}
                    transparent
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>

            {/* 座右铭第一行，向右散开。 */}
            <Text
                ref={motto1Ref}
                position={[0, 0, 0.1]}
                fontSize={0.32}
                color="#555555"
                anchorX="center"
                anchorY="middle"
                font="/fonts/LXGWWenKaiLite-Regular.ttf"
                fontStyle="italic"
            >
                “用代码创造
            </Text>

            {/* 座右铭第二行，向左散开。 */}
            <Text
                ref={motto2Ref}
                position={[0, -0.5, 0]}
                fontSize={0.32}
                color="#555555"
                anchorX="center"
                anchorY="middle"
                font="/fonts/LXGWWenKaiLite-Regular.ttf"
                fontStyle="italic"
            >
                跨越想象的数字体验”
            </Text>
        </group>
    );
};




/**
 * 奖项里程碑：漂浮卡片。
 * 年度最佳居中，日奖、月奖和精选位于后方。
 */
const AwardsMilestone = ({ z, scrollProgressRef }) => {
    const awardsData = useAwards();

    const { camera, viewport } = useThree();
    const isTouch = isTouchDevice();
    const { openOverlay } = useScene();
    const groupRef = useRef();
    const sotyRef = useRef();
    const sotdRef = useRef();
    const sotmRef = useRef();

    // 卡片显现引用，由按钮悬停驱动。
    const sotdCardRevealRef = useRef();
    const sotdCardPaintedRef = useRef();
    const sotdHideDelayRef = useRef();
    const sotmCardRevealRef = useRef();
    const sotmCardPaintedRef = useRef();
    const sotmHideDelayRef = useRef();
    const sotyCardRevealRef = useRef();
    const sotyCardPaintedRef = useRef();
    const sotyHideDelayRef = useRef();

    // 加载纹理。
    const sotyTexture = useLoader(THREE.TextureLoader, '/textures/about/SOTY.webp');
    const sotdTexture = useLoader(THREE.TextureLoader, '/textures/about/SOTD.webp');
    const sotmTexture = useLoader(THREE.TextureLoader, '/textures/about/SOTM.webp');
    const sotyPaintedTexture = useLoader(THREE.TextureLoader, isTouch ? '/textures/about/SOTY.webp' : '/textures/about/SOTY_painted.webp');
    const sotdPaintedTexture = useLoader(THREE.TextureLoader, isTouch ? '/textures/about/SOTD.webp' : '/textures/about/SOTD_painted.webp');
    const sotmPaintedTexture = useLoader(THREE.TextureLoader, isTouch ? '/textures/about/SOTM.webp' : '/textures/about/SOTM_painted.webp');
    const buttonTexture = useLoader(THREE.TextureLoader, '/textures/about/button.webp');
    const buttonPaintedTexture = useLoader(THREE.TextureLoader, isTouch ? '/textures/about/button.webp' : '/textures/about/button_painted.webp');

    // 色彩空间修正。
    sotyTexture.colorSpace = THREE.SRGBColorSpace;
    sotdTexture.colorSpace = THREE.SRGBColorSpace;
    sotmTexture.colorSpace = THREE.SRGBColorSpace;
    sotyPaintedTexture.colorSpace = THREE.SRGBColorSpace;
    sotdPaintedTexture.colorSpace = THREE.SRGBColorSpace;
    sotmPaintedTexture.colorSpace = THREE.SRGBColorSpace;
    buttonTexture.colorSpace = THREE.SRGBColorSpace;
    buttonPaintedTexture.colorSpace = THREE.SRGBColorSpace;

    // 计算宽高比。
    // 使用原始尺寸：卡片 2400×1760，按钮 894×208。
    const cardLegacyAspect = 2400 / 1760;
    const buttonLegacyAspect = 894 / 208;

    // 卡片基础高度。
    const cardHeight = 2.5;

    // 按钮尺寸。
    const buttonHeight = 0.35;
    const buttonWidth = buttonHeight * buttonLegacyAspect;
    const buttonY = -cardHeight / 2 - buttonHeight / 2 + 0.5;

    // 卡片悬停处理函数工厂。
    const makeCardHoverHandler = (revealRef, paintedRef, hideDelayRef) => (isHovered) => {
        if (isTouch) return;
        if (isHovered) {
            if (revealRef.current) {
                gsap.to(revealRef.current, {
                    uProgress: 1.0,
                    duration: 0.8,
                    ease: 'power2.out',
                    overwrite: true
                });
            }
            if (hideDelayRef.current) hideDelayRef.current.kill();
            if (paintedRef.current) {
                paintedRef.current.visible = true;
                if (paintedRef.current.material) paintedRef.current.material.opacity = 1;
            }
        } else {
            if (revealRef.current) {
                gsap.to(revealRef.current, {
                    uProgress: 0.0,
                    duration: 0.5,
                    ease: 'power2.out',
                    overwrite: true
                });
            }
            hideDelayRef.current = gsap.delayedCall(0.55, () => {
                if (paintedRef.current && paintedRef.current.material) {
                    paintedRef.current.material.opacity = 0;
                }
            });
        }
    };

    useFrame((state) => {
        if (!groupRef.current) return;

        const scrollProgress = scrollProgressRef?.current || 0;
        const worldZ = ROOM_Z + scrollProgress + z;
        groupRef.current.visible = worldZ < MILESTONE_CORRIDOR_CLIP_Z;
        if (!groupRef.current.visible) return;

        const distanceZ = z + scrollProgress - 55;

        const revealStart = -120;
        const revealEnd = -50;
        let revealFactor = 0;

        if (distanceZ > revealStart && distanceZ < revealEnd) {
            revealFactor = (distanceZ - revealStart) / (revealEnd - revealStart);
            revealFactor = Math.min(1, Math.max(0, revealFactor));
            revealFactor = revealFactor * revealFactor;
        } else if (distanceZ >= revealEnd) {
            revealFactor = 1;
        }

        const sotyStart = -80;
        const sotyEnd = -20;
        let sotyFactor = 0;

        if (distanceZ > sotyStart && distanceZ < sotyEnd) {
            sotyFactor = (distanceZ - sotyStart) / (sotyEnd - sotyStart);
            sotyFactor = Math.min(1, Math.max(0, sotyFactor));
            sotyFactor = 1 - Math.pow(1 - sotyFactor, 2);
        } else if (distanceZ >= sotyEnd) {
            sotyFactor = 1;
        }

        const spreadX = 5;

        if (sotdRef.current) {
            sotdRef.current.position.x = -revealFactor * spreadX;
        }
        if (sotmRef.current) {
            sotmRef.current.position.x = revealFactor * spreadX;
        }

        if (sotyRef.current) {
            sotyRef.current.position.y = 0.5 + sotyFactor * 2.5;
        }
    });

    return (
        <group ref={groupRef} position={[0, 2, z]}>
            {/* 标题。 */}
            <Text
                position={[0, 4, 0]}
                fontSize={1.2}
                color="#1a1a1a"
                anchorX="center"
                anchorY="middle"
                font="/fonts/LXGWWenKaiLite-Regular.ttf"
            >
                奖项
            </Text>

            {/* 日奖位于年度奖后方，第二个渲染。 */}
            <group ref={sotdRef} position={[0, 0.5, -0.5]}>
                {/* 后方彩色卡片，按钮悬停前隐藏。 */}
                <mesh ref={sotdCardPaintedRef} position={[0, 0, -0.001]} visible={true}>
                    <planeGeometry args={[cardHeight * cardLegacyAspect, cardHeight]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={sotdPaintedTexture}
                        transparent
                        opacity={0}
                        side={THREE.DoubleSide}
                        alphaTest={0.5}
                    />
                </mesh>
                {/* 前方速写卡片，支持显现效果。 */}
                <mesh>
                    <planeGeometry args={[cardHeight * cardLegacyAspect, cardHeight]} />
                    <revealBasicMaterial
                        ref={sotdCardRevealRef}
                        map={sotdTexture}
                        transparent
                        side={THREE.DoubleSide}
                        uProgress={0.0}
                    />
                </mesh>
                {/* 按钮。 */}
                <AwardButton
                    onClick={(e) => {
                        e.stopPropagation();
                        openOverlay(awardsData.sotd);
                    }}
                    texture={buttonTexture}
                    paintedTexture={buttonPaintedTexture}
                    width={buttonWidth}
                    height={buttonHeight}
                    position={[0, buttonY, 0.05]}
                    onHoverChange={makeCardHoverHandler(sotdCardRevealRef, sotdCardPaintedRef, sotdHideDelayRef)}
                />
                {/* 奖项标签。 */}
                <Text
                    position={[0, 0.95, 0.01]}
                    fontSize={0.45}
                    color="#1a1a1a"
                    anchorX="center"
                    anchorY="middle"
                    font="/fonts/LXGWWenKaiLite-Regular.ttf"
                >
                    每日最佳
                </Text>
                {/* 奖项数量。 */}
                <Text
                    position={[-0.05, 0, 0.01]}
                    fontSize={0.8}
                    color="#1a1a1a"
                    anchorX="center"
                    anchorY="middle"
                    font="/fonts/LXGWWenKaiLite-Regular.ttf"
                >
                    {awardsData.sotd.items.length}
                </Text>
            </group>

            {/* 月奖位于年度奖后方，第三个渲染。 */}
            <group ref={sotmRef} position={[0, 0.5, -0.2]}>
                {/* 后方彩色卡片，按钮悬停前隐藏。 */}
                <mesh ref={sotmCardPaintedRef} position={[0, 0, -0.001]} visible={true}>
                    <planeGeometry args={[cardHeight * cardLegacyAspect, cardHeight]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={sotmPaintedTexture}
                        transparent
                        opacity={0}
                        side={THREE.DoubleSide}
                        alphaTest={0.5}
                    />
                </mesh>
                {/* 前方速写卡片，支持显现效果。 */}
                <mesh>
                    <planeGeometry args={[cardHeight * cardLegacyAspect, cardHeight]} />
                    <revealBasicMaterial
                        ref={sotmCardRevealRef}
                        map={sotmTexture}
                        transparent
                        side={THREE.DoubleSide}
                        uProgress={0.0}
                    />
                </mesh>
                {/* 按钮。 */}
                <AwardButton
                    onClick={(e) => {
                        e.stopPropagation();
                        openOverlay(awardsData.sotm);
                    }}
                    texture={buttonTexture}
                    paintedTexture={buttonPaintedTexture}
                    width={buttonWidth}
                    height={buttonHeight}
                    position={[0, buttonY, 0.05]}
                    onHoverChange={makeCardHoverHandler(sotmCardRevealRef, sotmCardPaintedRef, sotmHideDelayRef)}
                />
                {/* 奖项标签。 */}
                <Text
                    position={[0, 0.95, 0.01]}
                    fontSize={0.45}
                    color="#1a1a1a"
                    anchorX="center"
                    anchorY="middle"
                    font="/fonts/LXGWWenKaiLite-Regular.ttf"
                >
                    每月最佳
                </Text>
                {/* 奖项数量。 */}
                <Text
                    position={[-0.05, 0, 0.01]}
                    fontSize={0.8}
                    color="#1a1a1a"
                    anchorX="center"
                    anchorY="middle"
                    font="/fonts/LXGWWenKaiLite-Regular.ttf"
                >
                    {awardsData.sotm.items.length}
                </Text>
            </group>

            {/* 年度奖位于前方中央，最后渲染，始终在顶层。 */}
            <group ref={sotyRef} position={[0, 0.5, 0]}>
                {/* 后方彩色卡片，按钮悬停前隐藏。 */}
                <mesh ref={sotyCardPaintedRef} position={[0, 0, -0.001]} visible={true}>
                    <planeGeometry args={[cardHeight * cardLegacyAspect, cardHeight]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={sotyPaintedTexture}
                        transparent
                        opacity={0}
                        side={THREE.DoubleSide}
                        alphaTest={0.5}
                    />
                </mesh>
                {/* 前方速写卡片，支持显现效果。 */}
                <mesh>
                    <planeGeometry args={[cardHeight * cardLegacyAspect, cardHeight]} />
                    <revealBasicMaterial
                        ref={sotyCardRevealRef}
                        map={sotyTexture}
                        transparent
                        side={THREE.DoubleSide}
                    />
                </mesh>
                {/* 按钮。 */}
                <AwardButton
                    onClick={(e) => {
                        e.stopPropagation();
                        openOverlay(awardsData.other);
                    }}
                    texture={buttonTexture}
                    paintedTexture={buttonPaintedTexture}
                    width={buttonWidth}
                    height={buttonHeight}
                    position={[0, buttonY, 0.05]}
                    onHoverChange={makeCardHoverHandler(sotyCardRevealRef, sotyCardPaintedRef, sotyHideDelayRef)}
                />
                {/* 奖项标签。 */}
                <Text
                    position={[0, 0.95, 0.01]}
                    fontSize={0.45}
                    color="#1a1a1a"
                    anchorX="center"
                    anchorY="middle"
                    font="/fonts/LXGWWenKaiLite-Regular.ttf"
                >
                    其他荣誉
                </Text>
                {/* 奖项数量。 */}
                <Text
                    position={[-0.05, 0, 0.01]}
                    fontSize={0.8}
                    color="#1a1a1a"
                    anchorX="center"
                    anchorY="middle"
                    font="/fonts/LXGWWenKaiLite-Regular.ttf"
                >
                    {awardsData.other.items.length}
                </Text>
            </group>
        </group>
    );
};

/**
 * 经历里程碑：漂浮岛屿。
 * 左侧大学岛与右侧自由职业岛漂浮在云中。
 */
const JourneyMilestone = ({ z, scrollProgressRef }) => {
    const { camera, viewport } = useThree();
    const isTouch = isTouchDevice();
    const groupRef = useRef();
    const uoRef = useRef();
    const freelanceRef = useRef();

    // 加载纹理。
    const uoTexture = useLoader(THREE.TextureLoader, '/textures/about/uowyspa.webp');
    const freelanceTexture = useLoader(THREE.TextureLoader, '/textures/about/freelancewyspa.webp');

    // 纹理设置。
    uoTexture.colorSpace = THREE.SRGBColorSpace;
    freelanceTexture.colorSpace = THREE.SRGBColorSpace;

    // 计算宽高比，保持图片原比例，避免拉伸。
    // 使用原始尺寸 2816×1536。
    const islandLegacyAspect = 2816 / 1536;
    const uoAspect = islandLegacyAspect;
    const freelanceAspect = islandLegacyAspect;

    // 岛屿基础高度，宽度自动调整。
    const islandHeight = 4.5;

    useFrame((state) => {
        if (!groupRef.current) return;

        // 硬裁切线，手动计算世界 Z。
        const scrollProgress = scrollProgressRef?.current || 0;
        const worldZ = ROOM_Z + scrollProgress + z;
        groupRef.current.visible = worldZ < MILESTONE_CORRIDOR_CLIP_Z;
        if (!groupRef.current.visible) return;

        const time = state.clock.elapsedTime;

        // 使用 scrollProgress 加偏移得到一致距离。
        const distanceZ = z + scrollProgress - 55;

        // 显现效果：岛屿从云下升起。
        // 在此编辑经历。
        const revealStart = -100; // 更早开始。
        const revealEnd = -20;
        let revealFactor = 0;

        if (distanceZ > revealStart && distanceZ < revealEnd) {
            revealFactor = (distanceZ - revealStart) / (revealEnd - revealStart);
            revealFactor = Math.min(1, Math.max(0, revealFactor));
            revealFactor = 1 - Math.pow(1 - revealFactor, 2);
        } else if (distanceZ >= revealEnd) {
            revealFactor = 1;
        }

        // 上下浮动动画。
        // 左侧大学岛。
        if (uoRef.current) {
            // 在此编辑大学岛位置。
            const startY = -2;
            const endY = 1.5;

            const currentBaseY = startY + revealFactor * (endY - startY);
            uoRef.current.position.y = currentBaseY + Math.sin(time * 0.5) * 0.2;
            uoRef.current.rotation.z = Math.sin(time * 0.3) * 0.05;
        }

        // 右侧自由职业岛。
        if (freelanceRef.current) {
            // 在此编辑自由职业岛位置。
            const startY = -1;
            const endY = 2.5;

            const currentBaseY = startY + revealFactor * (endY - startY);
            freelanceRef.current.position.y = currentBaseY + Math.sin(time * 0.4 + 2) * 0.25;
            freelanceRef.current.rotation.z = Math.sin(time * 0.2 + 1) * -0.05;
        }
    });

    return (
        <group ref={groupRef} position={[0, 0, z]}>
            {/* 标题。 */}
            <Text
                position={[0, 5, 0.3]}
                fontSize={1.2}
                color="#1a1a1a"
                anchorX="center"
                anchorY="middle"
                font="/fonts/LXGWWenKaiLite-Regular.ttf"
            >
                历程
            </Text>

            {/* 副标题。 */}
            <Text
                position={[0, 4.2, 0.3]}
                fontSize={0.35}
                color="#555555"
                anchorX="center"
                anchorY="middle"
                font="/fonts/LXGWWenKaiLite-Regular.ttf"
            >
                一路走来的经历……
            </Text>

            {/* 左侧大学岛。 */}
            <group ref={uoRef} position={[-3.5, -1, 0]}>
                <mesh>
                    <planeGeometry args={[islandHeight * uoAspect, islandHeight]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={uoTexture}
                        transparent
                        side={THREE.DoubleSide}
                    />
                </mesh>
                {/* 在此编辑大学岛上的文字。 */}
                <Text
                    position={[0.1, -0.85, 0.1]} // 位置（X、Y、Z）。
                    fontSize={0.4}           // 尺寸。
                    color="#1a1a1a"
                    anchorX="center"
                    anchorY="middle"
                    font="/fonts/LXGWWenKaiLite-Regular.ttf"
                >
                    2025—至今
                </Text>
            </group>

            {/* 右侧自由职业岛。 */}
            <group ref={freelanceRef} position={[3.5, -2, 0.5]}>
                <mesh>
                    <planeGeometry args={[islandHeight * freelanceAspect, islandHeight]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={freelanceTexture}
                        transparent
                        side={THREE.DoubleSide}
                    />
                </mesh>
                {/* 在此编辑自由职业岛上的文字。 */}
                <Text
                    position={[0, -0.65, 0.1]} // 位置（X、Y、Z）。
                    fontSize={0.5}           // 尺寸。
                    color="#1a1a1a"
                    anchorX="center"
                    anchorY="middle"
                    font="/fonts/LXGWWenKaiLite-Regular.ttf"
                >
                    2023—至今
                </Text>
            </group>
        </group>
    );
};

/**
 * 技能里程碑：漂浮气球。
 * 彩色气球向上飘，每个代表一项技能。
 */

// 气球配置：尺寸类别、纹理路径、位置偏移。
// 修改每个气球的 y 值可调整高度。
const BALLOON_CONFIG = [
    // 大气球代表主要技能，位于前方中央。
    { texture: '/textures/about/reactduzybalon.webp', paintedTexture: '/textures/about/reactduzybalon_painted.webp', label: 'React', size: 'large', x: -2.5, y: 2, z: 0.3, phase: 0 },
    { texture: '/textures/about/threejsduzybalon.webp', paintedTexture: '/textures/about/threejsduzybalon_painted.webp', label: 'Three.js', size: 'large', x: 2.5, y: 2.5, z: 0.2, phase: 1.5 },
    { texture: '/textures/about/GSAPduzybalon.webp', paintedTexture: '/textures/about/GSAPduzybalon_painted.webp', label: 'GSAP', size: 'large', x: 0, y: 3, z: 0.5, phase: 3 },

    // 中气球散布四周。
    { texture: '/textures/about/JSSREDNIBALON.webp', paintedTexture: '/textures/about/JSSREDNIBALON_painted.webp', label: 'JavaScript', size: 'medium', x: -4, y: 1, z: -0.3, phase: 0.8 },
    { texture: '/textures/about/csssrednibalon.webp', paintedTexture: '/textures/about/csssrednibalon_painted.webp', label: 'CSS', size: 'medium', x: 4, y: 1.5, z: -0.2, phase: 2.2 },
    { texture: '/textures/about/nextjssrednibalon.webp', paintedTexture: '/textures/about/nextjssrednibalon_painted.webp', label: 'Next.js', size: 'medium', x: 0, y: 0.5, z: -0.4, phase: 4 },

    // 小气球作为背景点缀。
    { texture: '/textures/about/htmlmalybalon.webp', paintedTexture: '/textures/about/htmlmalybalon_painted.webp', label: 'HTML', size: 'small', x: -5.5, y: 2.5, z: -0.8, phase: 1.2 },
    { texture: '/textures/about/gitmalybalon.webp', paintedTexture: '/textures/about/gitmalybalon_painted.webp', label: 'Git', size: 'small', x: 5.5, y: 3, z: -0.7, phase: 2.8 },
    { texture: '/textures/about/figmamalybalon.webp', paintedTexture: '/textures/about/figmamalybalon_painted.webp', label: 'Figma', size: 'small', x: -3, y: 4.5, z: -0.5, phase: 3.5 },
    { texture: '/textures/about/firebasemalybalon.webp', paintedTexture: '/textures/about/firebasemalybalon_painted.webp', label: 'Firebase', size: 'small', x: 3.5, y: 4, z: -0.6, phase: 4.5 },
];

// 各气球类别的尺寸倍率。
const SIZE_MULTIPLIERS = {
    large: 3.0,
    medium: 2.2,
    small: 1.6,
};

// 单个气球组件。
const SkillBalloon = ({ config, revealFactorRef, spreadFactorRef, timeRef }) => {
    const { viewport } = useThree();
    const isTouch = isTouchDevice();
    const texture = useLoader(THREE.TextureLoader, config.texture);
    const paintedTextureUrl = isTouch ? config.texture : config.paintedTexture;
    const paintedTexture = useLoader(THREE.TextureLoader, paintedTextureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    paintedTexture.colorSpace = THREE.SRGBColorSpace;

    const [isPopping, setIsPopping] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [isFadingOutText, setIsFadingOutText] = useState(false);
    const popRef = useRef(0);
    const textFadeRef = useRef(1); // 1 为完全可见，0 为隐藏。
    const respawnOffsetRef = useRef(0); // 用于重生后向上漂浮。
    const balloonMatRef = useRef();
    const balloonRevealRef = useRef(); // 速写的 RevealBasicMaterial 引用。
    const paintedMeshRef = useRef(); // 彩色气球网格的可见状态。
    const paintedMatRef = useRef(); // 彩色气球材质的透明度控制。
    const hideDelayRef = useRef(); // 跟踪待执行的 gsap.delayedCall。
    const textRef = useRef();

    // 音频引用。
    const balloonAudioRef = useRef();
    const { globalVolume, isMuted } = useAudio();

    const playBalloonSound = () => {
        if (balloonAudioRef.current) {
            const vol = isMuted ? 0 : BALLOON_AUDIO_SETTINGS.volume * globalVolume;
            balloonAudioRef.current.setVolume(vol);
            if (balloonAudioRef.current.isPlaying) balloonAudioRef.current.stop();
            balloonAudioRef.current.play();
        }
    };

    // 使用 BALLOON_CONFIG 中的原始宽高比，或类别的固定比例。
    const legacyAspects = {
        'reactduzybalon.webp': 736 / 1447,
        'threejsduzybalon.webp': 1141 / 1964,
        'GSAPduzybalon.webp': 1.0, // GSAP 气球为正方形。
        'default_small_medium': 631 / 1482 // 其他气球的通用比例。
    };
    
    const filename = config.texture.split('/').pop();
    const aspect = legacyAspects[filename] || legacyAspects['default_small_medium'];
    const baseHeight = SIZE_MULTIPLIERS[config.size];

    const outerGroupRef = useRef();
    const innerGroupRef = useRef();
    const targetScale = useRef(1.0);
    const currentScale = useRef(1.0);
    const targetMagnet = useRef({ x: 0, y: 0 });
    const currentMagnet = useRef({ x: 0, y: 0 });

    // 响应式适配。
    // 移动端视口较窄，气球更靠近中心。
    const positionScale = isTouch ? 0.5 : 1; // 移动端位置压缩程度。
    const spreadScale = isTouch ? 0.4 : 1;   // 移动端散开幅度缩减程度。
    const sizeScale = isTouch ? 0.85 : 1;    // 移动端气球略小。

    // 光标处理。
    useEffect(() => {
        if (hovered && !isPopping) {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'auto';
        }
    }, [hovered, isPopping]);

    // 文字淡出计时器。
    useEffect(() => {
        if (isPopping) {
            // 3 秒后开始淡出文字。
            const timer = setTimeout(() => {
                setIsFadingOutText(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isPopping]);

    // 笔刷显现的悬停处理。
    const handlePointerOver = (e) => {
        if (isTouch) return;
        e.stopPropagation();
        if (!isPopping) setHovered(true);

        // 笔刷显现：显示彩色气球。
        if (balloonRevealRef.current) {
            gsap.to(balloonRevealRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (hideDelayRef.current) hideDelayRef.current.kill();
        if (paintedMeshRef.current) paintedMeshRef.current.visible = true;
        if (paintedMatRef.current) paintedMatRef.current.opacity = 1;
    };

    const handlePointerOut = (e) => {
        if (isTouch) return;
        e.stopPropagation();
        setHovered(false);

        // 反向显现。
        if (balloonRevealRef.current) {
            gsap.to(balloonRevealRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }
        hideDelayRef.current = gsap.delayedCall(0.55, () => {
            if (paintedMatRef.current) paintedMatRef.current.opacity = 0;
        });
    };

    // 动画更新循环。
    useFrame((state, delta) => {
        if (hovered && !isPopping) {
            targetScale.current = 1.05; // 轻微放大。
        } else {
            targetScale.current = 1.0;
            targetMagnet.current.x = 0;
            targetMagnet.current.y = 0;
        }

        currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale.current, 8 * delta);
        currentMagnet.current.x = THREE.MathUtils.lerp(currentMagnet.current.x, targetMagnet.current.x, 8 * delta);
        currentMagnet.current.y = THREE.MathUtils.lerp(currentMagnet.current.y, targetMagnet.current.y, 8 * delta);

        if (isPopping) {
            // 平滑、缓慢的弹出动画。
            popRef.current = THREE.MathUtils.lerp(popRef.current, 1, 2.5 * delta);

            // 弹出时也隐藏彩色网格，并取消待执行的显现动画。
            if (hideDelayRef.current) hideDelayRef.current.kill();
            if (balloonRevealRef.current) {
                balloonRevealRef.current.uProgress = 0;
            }
        }

        if (isFadingOutText) {
            // 缓慢淡出文字。
            textFadeRef.current = THREE.MathUtils.lerp(textFadeRef.current, 0, 2 * delta);

            // 完全淡出后，从下方重新生成气球。
            if (textFadeRef.current < 0.05) {
                setIsPopping(false);
                setHovered(false);
                setIsFadingOutText(false);
                popRef.current = 0;
                textFadeRef.current = 1;
                respawnOffsetRef.current = -12; // 移至下方，再向上漂浮。

                // 立即移动网格，避免旧位置继续接收指针事件。
                if (outerGroupRef.current) {
                    outerGroupRef.current.position.y -= 12;
                }

                // 立即重置透明度，防止闪烁。
                if (balloonRevealRef.current) balloonRevealRef.current.opacity = 1;
                if (textRef.current) textRef.current.fillOpacity = 0;
                // 重生时重置显现状态。
                if (balloonRevealRef.current) balloonRevealRef.current.uProgress = 0;
                if (paintedMatRef.current) paintedMatRef.current.opacity = 0;
                if (paintedMeshRef.current) paintedMeshRef.current.visible = false;
            }
        }

        // 重生时向上飘回。
        if (respawnOffsetRef.current < -0.01) {
            respawnOffsetRef.current = THREE.MathUtils.lerp(respawnOffsetRef.current, 0, 1.5 * delta);
        }

        // 尚未完全重生时应用透明度。
        if (balloonRevealRef.current && isPopping) {
            balloonRevealRef.current.opacity = 1 - popRef.current;
        }
        if (paintedMatRef.current && isPopping) {
            paintedMatRef.current.opacity = 1 - popRef.current;
        }
        if (textRef.current && isPopping) {
            // 合并弹入与淡出的透明度。
            textRef.current.fillOpacity = popRef.current * textFadeRef.current;
            textRef.current.outlineOpacity = popRef.current * textFadeRef.current;
        }
    });

    // 带独立相位的漂浮动画，现于 useFrame 内计算。
    // 从渲染函数移出，避免重复渲染。

    // 基础 X 位置，移动端会缩放。
    const baseX = config.x * positionScale;

    // P2：在 useFrame 内直接计算并更新位置、缩放与旋转。
    useFrame(() => {
        if (!outerGroupRef.current) return;

        const time = timeRef.current;
        const revealFactor = revealFactorRef.current;
        const spreadFactor = spreadFactorRef.current;

        // 带独立相位的漂浮动画。
        const floatY = Math.sin(time * 0.6 + config.phase) * 0.3;
        const floatX = Math.sin(time * 0.4 + config.phase * 0.7) * 0.15;
        const rotation = Math.sin(time * 0.3 + config.phase) * 0.08;

        // 显现时气球从下方飘起，包含重生偏移。
        const startY = config.y - 8;
        const endY = config.y;
        const currentY = startY + revealFactor * (endY - startY) + floatY + respawnOffsetRef.current;

        // 显现时逐渐放大。
        let scale = revealFactor * sizeScale;
        const popScaleEffect = currentScale.current + popRef.current * 0.4;
        scale *= popScaleEffect;

        // 散开效果。
        const maxSpread = 15 * spreadScale;
        let spreadX = 0;

        if (config.x < -0.5) {
            spreadX = -spreadFactor * maxSpread * (0.5 + Math.abs(config.x) / 6);
        } else if (config.x > 0.5) {
            spreadX = spreadFactor * maxSpread * (0.5 + Math.abs(config.x) / 6);
        } else {
            spreadX = config.phase > 3.5
                ? spreadFactor * maxSpread * 0.8
                : -spreadFactor * maxSpread * 0.8;
        }

        // 直接更新对象。
        outerGroupRef.current.position.set(baseX + floatX + spreadX, currentY, config.z);
        outerGroupRef.current.rotation.z = rotation;
        const s = Math.max(0.001, scale); // 避免零缩放。
        outerGroupRef.current.scale.set(s, s, s);

        // 直接更新内部组的磁吸位置。
        if (innerGroupRef.current) {
            innerGroupRef.current.position.set(currentMagnet.current.x, currentMagnet.current.y, 0);
        }
    });

    return (
        <group
            ref={outerGroupRef}
            position={[baseX, config.y - 8, config.z]}
        >
            <group ref={innerGroupRef}>
                {/* 后方彩色气球，悬停前隐藏。 */}
                <mesh ref={paintedMeshRef} visible={true}>
                    <planeGeometry args={[baseHeight * aspect, baseHeight]} />
                    <meshBasicMaterial color="#e0e0e0"
                        ref={paintedMatRef}
                        map={paintedTexture}
                        transparent
                        opacity={0}
                        side={THREE.DoubleSide}
                        alphaTest={0.5}
                        depthWrite={false}
                    />
                </mesh>

                {/* 前方速写气球，支持笔刷显现。 */}
                <mesh
                    position={[0, 0, 0.001]}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isPopping) {
                            setIsPopping(true);
                            playBalloonSound();
                        }
                    }}
                    onPointerOver={handlePointerOver}
                    onPointerOut={handlePointerOut}
                    onPointerMove={(e) => {
                        if (hovered && !isPopping && outerGroupRef.current) {
                            outerGroupRef.current.getWorldPosition(_tempVec3);
                            // 磁吸强度从 0.5 降至 0.15，使效果更轻柔。
                            targetMagnet.current.x = (e.point.x - _tempVec3.x) * 0.15;
                            targetMagnet.current.y = (e.point.y - _tempVec3.y) * 0.15;
                        }
                    }}
                    visible={popRef.current < 0.99}
                >
                    <planeGeometry args={[baseHeight * aspect, baseHeight]} />
                    <revealBasicMaterial
                        ref={balloonRevealRef}
                        map={texture}
                        transparent
                        side={THREE.DoubleSide}
                        depthWrite={false}
                        uProgress={0.0}
                    />
                </mesh>

                {/* 技术栈名称文字先淡入再淡出。 */}
                {isPopping && textFadeRef.current > 0.01 && (
                    <Text
                        ref={textRef}
                        position={[0, 0, 0.1]}
                        fontSize={baseHeight * 0.4}
                        color="#1a1a1a"
                        anchorX="center"
                        anchorY="middle"
                        font="/fonts/LXGWWenKaiLite-Regular.ttf"
                        fillOpacity={0}
                        outlineWidth={0.02}
                        outlineColor="#fff"
                        outlineOpacity={0}
                    >
                        {config.label}
                    </Text>
                )}

                <PositionalAudio
                    ref={balloonAudioRef}
                    url="/sounds/baloonpoop.mp3"
                    distanceModel="exponential"
                    rolloffFactor={BALLOON_AUDIO_SETTINGS.rolloff}
                    refDistance={BALLOON_AUDIO_SETTINGS.distance}
                    loop={false}
                />
            </group>
        </group>
    );
};

const SkillsMilestone = ({ z, scrollProgressRef }) => {
    const { camera, viewport } = useThree();
    const isTouch = isTouchDevice();
    const groupRef = useRef();
    // P2：用 ref 替代 state，避免 useFrame 中每秒触发 60 次重渲染。
    const revealFactorRef = useRef(0);
    const spreadFactorRef = useRef(0);
    const timeRef = useRef(0);

    useFrame((state) => {
        if (!groupRef.current) return;

        // 硬裁切线，手动计算世界 Z。
        const scrollProgress = scrollProgressRef?.current || 0;
        const worldZ = ROOM_Z + scrollProgress + z;
        groupRef.current.visible = worldZ < MILESTONE_CORRIDOR_CLIP_Z;
        if (!groupRef.current.visible) return;

        timeRef.current = state.clock.elapsedTime;

        // 使用 scrollProgress 加偏移得到一致距离。
        const distanceZ = z + scrollProgress - 55;

        // 气球上浮显现效果。
        // 在此编辑技能显现效果。
        const revealStart = -100;
        const revealEnd = -25;
        let newRevealFactor = 0;

        if (distanceZ > revealStart && distanceZ < revealEnd) {
            newRevealFactor = (distanceZ - revealStart) / (revealEnd - revealStart);
            newRevealFactor = Math.min(1, Math.max(0, newRevealFactor));
            newRevealFactor = 1 - Math.pow(1 - newRevealFactor, 3); // 三次缓出。
        } else if (distanceZ >= revealEnd) {
            newRevealFactor = 1;
        }

        revealFactorRef.current = newRevealFactor;

        // 在此编辑技能气球散开效果。
        // 越靠近相机，气球越分散。
        // 范围越大，动画越长、越明显。
        const spreadStart = -70; // 动画开始的位置，较早。
        const spreadEnd = -40;    // 动画完全展开的位置，较晚。
        let newSpreadFactor = 0;

        if (distanceZ > spreadStart && distanceZ < spreadEnd) {
            newSpreadFactor = (distanceZ - spreadStart) / (spreadEnd - spreadStart);
            newSpreadFactor = Math.min(1, Math.max(0, newSpreadFactor));
            newSpreadFactor = newSpreadFactor * newSpreadFactor; // 缓入。
        } else if (distanceZ >= spreadEnd) {
            newSpreadFactor = 1;
        }

        spreadFactorRef.current = newSpreadFactor;
    });

    return (
        <group ref={groupRef} position={[0, 0, z]}>
            {/* 标题。 */}
            <Text
                position={[0, 6, 0.5]}
                fontSize={1.2}
                color="#1a1a1a"
                anchorX="center"
                anchorY="middle"
                font="/fonts/LXGWWenKaiLite-Regular.ttf"
            >
                技能
            </Text>

            {/* 副标题。 */}
            <Text
                position={[0, 5.2, 0.5]}
                fontSize={0.35}
                color="#555555"
                anchorX="center"
                anchorY="middle"
                font="/fonts/LXGWWenKaiLite-Regular.ttf"
            >
                我喜欢使用的技术
            </Text>

            {/* 漂浮气球。 */}
            {BALLOON_CONFIG.map((config, index) => (
                <SkillBalloon
                    key={index}
                    config={config}
                    revealFactorRef={revealFactorRef}
                    spreadFactorRef={spreadFactorRef}
                    timeRef={timeRef}
                />
            ))}
        </group>
    );
};

// =========================================
// 注意：在循环内部使用此组件。
// =========================================

export default InfiniteSkyManager;
