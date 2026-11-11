import { MediaTextureLoader } from '../../../../media/MediaTextureLoader';
import { media } from '../../../../media';
import { useScene, useAudio } from '../../../../context/contexts';
import Text from '../../SiteText';
import { useTextureCopy } from '../../../../hooks/useTextureCopy';
import { useState, useRef, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { PositionalAudio } from '@react-three/drei';

import * as THREE from 'three';
import gsap from 'gsap';
import SkyChunk, { CHUNK_LENGTH, ROOM_Z } from './SkyChunk';

import '../../shaders/RevealBasicMaterial'; // 注册 BasicMaterial 的笔刷显现效果。
import { isTouchDevice } from '../../../../utils/deviceDetect';
import { siteInfo, personalProfile } from '../../../../data/content';
import { getSkillLabels, formatProfileDate } from '../../../../data/profile.js';

// 复用 Vector3，避免事件处理时分配对象。
const _tempVec3 = new THREE.Vector3();

/**
 * InfiniteSkyManager 无限天空管理组件。
 * 
 * 动态生成和移除天空分块，实现无限滚动。
 * 世界组随滚动移动，分块相对于该组保持固定位置。
 * 故事里程碑也随内容循环。
 */



const BALLOON_AUDIO_SETTINGS = {
    volume: 1.0,
    distance: 2,
    rolloff: 2
};

/**
 * 可复用按钮，支持悬停与笔刷显现效果。
 */
const AwardButton = ({ onClick, texture, paintedTexture, width, height, position, onHoverChange, label = '查看' }) => {
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
                font="/media/fonts/LXGWWenKaiLite-site.woff"
            >
                {label}
            </Text>
        </group>
    );
};

// 所有详情按钮打开同一份个人资料，并定位到对应段落。
const ProfileButton = ({ section, position, label = '查看', width = 2.2 }) => {
    const { openOverlay } = useScene();
    const isTouch = isTouchDevice();
    const texture = useTextureCopy(useLoader(MediaTextureLoader, 'https://media.secknow-ai.com/space/textures/about/button.png?imageMogr2/thumbnail/512x128'), { colorSpace: THREE.SRGBColorSpace });
    const paintedTexture = useTextureCopy(useLoader(MediaTextureLoader, isTouch ? 'https://media.secknow-ai.com/space/textures/about/button.png?imageMogr2/thumbnail/512x128' : 'https://media.secknow-ai.com/space/textures/about/button_painted.png?imageMogr2/thumbnail/512x128'), { colorSpace: THREE.SRGBColorSpace });

    return <AwardButton
        texture={texture}
        paintedTexture={paintedTexture}
        width={width}
        height={0.5}
        position={position}
        label={label}
        onClick={event => {
            event.stopPropagation();
            openOverlay({ layout: 'profile', section });
        }}
    />;
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

                    {/* 个人成果里程碑。 */}
                    <HighlightsMilestone
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
    const avatarTexture = useLoader(MediaTextureLoader, 'https://media.secknow-ai.com/space/textures/twiink/cloud-ink.png');

    // 全部动画元素的引用。
    const groupRef = useRef();
    const titleRef = useRef();
    const brandRef = useRef();
    const avatarRef = useRef();
    const motto1Ref = useRef();
    const motto2Ref = useRef();

    // 基础位置。
    const baseY = 2;

    // 按新素材的实际宽高比显示，保留发饰与云朵轮廓。
    const avatarWidth = 6;
    const avatarHeight = avatarWidth * avatarTexture.image.height / avatarTexture.image.width;

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
                font="/media/fonts/LXGWWenKaiLite-site.woff"
            >
                {siteInfo.nickname}
            </Text>

            {/* 品牌副标题，向右散开。 */}
            <Text
                ref={brandRef}
                position={[0, 4.3, 0.1]}
                fontSize={0.45}
                color="#4a4a4a"
                anchorX="center"
                anchorY="middle"
                font="/media/fonts/LXGWWenKaiLite-site.woff"
            >
                {siteInfo.siteTitle}
            </Text>

            {/* 云上人物漂浮并向左上散开。 */}
            <mesh ref={avatarRef} position={[0, baseY, 0]}>
                <planeGeometry args={[avatarWidth, avatarHeight]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={avatarTexture}
                    transparent
                    alphaTest={0.1}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>

            {/* 座右铭第一行，向右散开。 */}
            <Text
                ref={motto1Ref}
                maxWidth={7}
                textAlign="center"
                position={[0, 0, 0.1]}
                fontSize={0.32}
                color="#555555"
                anchorX="center"
                anchorY="middle"
                font="/media/fonts/LXGWWenKaiLite-site.woff"
                fontStyle="italic"
            >
                {personalProfile.role}
            </Text>

            {/* 座右铭第二行，向左散开。 */}
            <Text
                ref={motto2Ref}
                maxWidth={7}
                textAlign="center"
                position={[0, -0.8, 0]}
                fontSize={0.26}
                color="#555555"
                anchorX="center"
                anchorY="middle"
                font="/media/fonts/LXGWWenKaiLite-site.woff"
                fontStyle="italic"
            >
                {personalProfile.keywords.join(' · ')}
            </Text>
        </group>
    );
};




/**
 * 个人成果继续以漂浮纸片呈现，文字来自可编辑资料。
 */
const HighlightsMilestone = ({ z, scrollProgressRef }) => {
    const groupRef = useRef();
    const noteRefs = useRef([]);
    const noteTexture = useLoader(MediaTextureLoader, 'https://media.secknow-ai.com/space/textures/twiink/profile-note.png?imageMogr2/thumbnail/800x560');

    useFrame(state => {
        if (!groupRef.current) return;
        const scrollProgress = scrollProgressRef?.current || 0;
        groupRef.current.visible = ROOM_Z + scrollProgress + z < MILESTONE_CORRIDOR_CLIP_Z;
        if (!groupRef.current.visible) return;
        const reveal = THREE.MathUtils.clamp((z + scrollProgress + 65) / 70, 0, 1);
        noteRefs.current.forEach((note, index) => {
            if (!note) return;
            note.position.x = ((index % 3) - 1) * 4.4 * (0.85 + reveal * 0.15);
            note.position.y = 1.5 - Math.floor(index / 3) * 3 + Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.15;
            note.rotation.z = Math.sin(state.clock.elapsedTime * 0.3 + index) * 0.025;
        });
    });

    return (
        <group ref={groupRef} position={[0, 2, z]}>
            <Text position={[0, 4, 0]} fontSize={1} color="#1a1a1a" anchorX="center" anchorY="middle" font="/media/fonts/LXGWWenKaiLite-site.woff">
                {personalProfile.titles.highlights}
            </Text>
            {personalProfile.honors?.length > 0 && (
                <ProfileButton section="honors" position={[0, 3.1, 0.05]} label={personalProfile.titles.honors} />
            )}
            {personalProfile.highlights.map((item, index) => (
                <group key={item.id} ref={node => { noteRefs.current[index] = node; }} position={[((index % 3) - 1) * 4.4, 1.5, 0]}>
                    <mesh>
                        <planeGeometry args={[3.6, 2.52]} />
                        <meshBasicMaterial map={noteTexture} transparent side={THREE.DoubleSide} />
                    </mesh>
                    <Text position={[0, 0.5, 0.03]} fontSize={0.32} maxWidth={2.8} textAlign="center" color="#1a1a1a" anchorX="center" anchorY="middle" font="/media/fonts/LXGWWenKaiLite-site.woff">
                        {item.sceneTitle || item.title}
                    </Text>
                    <Text position={[0, 0, 0.03]} fontSize={0.24} color="#555555" anchorX="center" anchorY="middle" font="/media/fonts/LXGWWenKaiLite-site.woff">
                        {formatProfileDate(item.date)}
                    </Text>
                    <ProfileButton section="highlights" position={[0, -0.65, 0.05]} />
                </group>
            ))}
        </group>
    );
};

/**
 * 经历里程碑：漂浮岛屿。
 * 左侧大学岛与右侧自由职业岛漂浮在云中。
 */
const JourneyMilestone = ({ z, scrollProgressRef }) => {
    const groupRef = useRef();
    const uoRef = useRef();
    const freelanceRef = useRef();

    const education = personalProfile.timeline.find(item => item.kind === 'education');
    const firstProject = personalProfile.timeline.find(item => item.kind === 'project');

    // 加载纹理。
    const uoTexture = useTextureCopy(useLoader(MediaTextureLoader, 'https://media.secknow-ai.com/space/textures/twiink/profile-island.png?imageMogr2/thumbnail/800x500'), { colorSpace: THREE.SRGBColorSpace });
    const freelanceTexture = useTextureCopy(useLoader(MediaTextureLoader, 'https://media.secknow-ai.com/space/textures/about/island-free-creation.png'), { colorSpace: THREE.SRGBColorSpace });

    // 纹理设置。

    // 计算宽高比，保持图片原比例，避免拉伸。
    // 使用原始尺寸 2816×1536。
    const islandLegacyAspect = 2816 / 1536;
    const uoAspect = 800 / 500;
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
                font="/media/fonts/LXGWWenKaiLite-site.woff"
            >
                {personalProfile.titles.timeline}
            </Text>

            {/* 副标题。 */}
            <Text
                position={[0, 4.2, 0.3]}
                fontSize={0.35}
                color="#555555"
                anchorX="center"
                anchorY="middle"
                font="/media/fonts/LXGWWenKaiLite-site.woff"
            >
                {personalProfile.timeline.map(item => item.date.slice(0, 4)).filter((year, index, years) => years.indexOf(year) === index).join(' · ')}
            </Text>

            <ProfileButton section="timeline" position={[0, 3.4, 0.3]} label="完整经历" />

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
                <Text position={[0, 0.95, 0.1]} fontSize={0.42} maxWidth={3.6} textAlign="center" color="#1a1a1a" anchorX="center" anchorY="middle" font="/media/fonts/LXGWWenKaiLite-site.woff">
                    {education?.organization || education?.title || personalProfile.titles.timeline}
                </Text>
                {/* 日期与完整经历使用同一条数据。 */}
                <Text
                    position={[0.1, -0.85, 0.1]} // 位置（X、Y、Z）。
                    fontSize={0.4}           // 尺寸。
                    color="#1a1a1a"
                    anchorX="center"
                    anchorY="middle"
                    font="/media/fonts/LXGWWenKaiLite-site.woff"
                >
                    {formatProfileDate(education?.date)}
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
                    font="/media/fonts/LXGWWenKaiLite-site.woff"
                >
                    {formatProfileDate(firstProject?.date)}
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
const BALLOON_POSITIONS = [
    [-2.5, 2, 0.3], [2.5, 2.5, 0.2], [0, 3, 0.5],
    [-4, 1, -0.3], [4, 1.5, -0.2], [0, 0.5, -0.4],
    [-5.5, 2.5, -0.8], [5.5, 3, -0.7], [-3, 4.5, -0.5],
    [3.5, 4, -0.6], [-1.3, 4.5, -1], [1.5, 4.8, -1.2],
];
const BALLOON_CONFIG = getSkillLabels(personalProfile).map((label, index) => {
    const [x, y, z] = BALLOON_POSITIONS[index % BALLOON_POSITIONS.length];
    return {
        label,
        texture: 'https://media.secknow-ai.com/space/textures/twiink/profile-balloon.png?imageMogr2/thumbnail/520x980',
        paintedTexture: 'https://media.secknow-ai.com/space/textures/twiink/profile-balloon.png?imageMogr2/thumbnail/520x980',
        size: index < 3 ? 'large' : index < 6 ? 'medium' : 'small',
        x, y, z: z - Math.floor(index / BALLOON_POSITIONS.length) * 2,
        phase: index * 0.8,
    };
});

// 各气球类别的尺寸倍率。
const SIZE_MULTIPLIERS = {
    large: 3.0,
    medium: 2.2,
    small: 1.6,
};

// 单个气球组件。
const SkillBalloon = ({ config, revealFactorRef, spreadFactorRef, timeRef }) => {
    const isTouch = isTouchDevice();
    const texture = useTextureCopy(useLoader(MediaTextureLoader, config.texture), { colorSpace: THREE.SRGBColorSpace });
    const paintedTextureUrl = isTouch ? config.texture : config.paintedTexture;
    const paintedTexture = useTextureCopy(useLoader(MediaTextureLoader, paintedTextureUrl), { colorSpace: THREE.SRGBColorSpace });

    const [isPopping, setIsPopping] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [isFadingOutText, setIsFadingOutText] = useState(false);
    const popRef = useRef(0);
    const textFadeRef = useRef(1); // 1 为完全可见，0 为隐藏。
    const respawnOffsetRef = useRef(0); // 用于重生后向上漂浮。
    const sketchMeshRef = useRef();
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
    const aspect = texture.image.width / texture.image.height;
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
        if (sketchMeshRef.current) sketchMeshRef.current.visible = popRef.current < 0.99;
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
                    ref={sketchMeshRef}
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

                {!isPopping && (
                    <Text position={[0, baseHeight * 0.2, 0.02]} fontSize={baseHeight * 0.08} maxWidth={baseHeight * 0.42} textAlign="center" color="#1a1a1a" anchorX="center" anchorY="middle" font="/media/fonts/LXGWWenKaiLite-site.woff">
                        {config.label}
                    </Text>
                )}

                {/* 技术栈名称文字先淡入再淡出。 */}
                {isPopping && (
                    <Text
                        ref={textRef}
                        position={[0, 0, 0.1]}
                        fontSize={baseHeight * 0.4}
                        color="#1a1a1a"
                        anchorX="center"
                        anchorY="middle"
                        font="/media/fonts/LXGWWenKaiLite-site.woff"
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
                    url={media.audio.balloonPop}
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
                font="/media/fonts/LXGWWenKaiLite-site.woff"
            >
                {personalProfile.titles.skills}
            </Text>

            {/* 副标题。 */}
            <Text
                position={[0, 5.2, 0.5]}
                fontSize={0.35}
                color="#555555"
                anchorX="center"
                anchorY="middle"
                font="/media/fonts/LXGWWenKaiLite-site.woff"
            >
                {personalProfile.skills.map(group => group.title).join(' · ')}
            </Text>

            <ProfileButton section="skills" position={[0, -1.4, 0.5]} label={personalProfile.titles.skills} />

            {/* 漂浮气球。 */}
            {BALLOON_CONFIG.map(config => (
                <SkillBalloon
                    key={config.label}
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
