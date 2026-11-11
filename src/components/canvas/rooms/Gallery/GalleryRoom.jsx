import { useTexture } from '../../../../hooks/useMediaTexture';
import { media } from '../../../../media';
import { useScene, useAchievements, useAudio } from '../../../../context/contexts';
import Text from '../../SiteText';
import { useRef, useState, useMemo, useEffect, forwardRef, useImperativeHandle, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, PositionalAudio } from '@react-three/drei';

import * as THREE from 'three';
import gsap from 'gsap';
import { Observer } from 'gsap/all';


gsap.registerPlugin(Observer);

import PaperMaterial from './PaperMaterial';
import GalleryClouds from './GalleryClouds';
import { useTextureCopy } from '../../../../hooks/useTextureCopy';

import { usePaintMaterial } from './usePaintMaterial';
import { useGalleryProjects } from '../../../../hooks/useContentData';
import { NOTEBOOK_ASSETS, NOTEBOOK_FEATURE_ICONS, NOTEBOOK_FEATURE_SPRITES } from '../../../../config/projectNotebook';

// 复用 Vector3，避免 useFrame 中分配对象。
const _tempScale = new THREE.Vector3();

// ============================================
// ⚙️ 音频设置：在此调整。
// 修改这些值可调整城市环境声的音量与可听范围。
// ============================================
const AUDIO_SETTINGS = {
    volume: 0.6,
    distance: 2,
    rolloff: 1.5
};

const GALLERY_INTERACTION_AUDIO_SETTINGS = {
    volume: 0.6,      // 纸张点击音效音量。
    distance: 2,      // 空间音频开始衰减前的参考距离。
    rolloff: 2        // 声音随距离指数衰减的速度。
};

// 画廊内容来自统一的本地数据文件。


const GAP = 2.5;

// 调整这些数值以匹配鸟的比例，原始比例 1.41。
const BIRD_WIDTH = 0.49;
const BIRD_HEIGHT = 0.35;

// 调整 0..1 之间的数值，裁切房屋图像右侧。
// 0.0 表示不裁切。
// 0.2 表示从走廊侧，即右侧，裁掉 20%。
const RIGHT_CROP_AMOUNT = 0.2;

const GalleryRoom = ({ showRoom, onReady, isExiting, isWarmup }) => {
    const { overlayContent, isTeleporting } = useScene();
    const { showTutorial, unlockAchievement, hidePopup } = useAchievements();
    const { globalVolume, isMuted } = useAudio();
    const effectiveVolume = isMuted ? 0 : AUDIO_SETTINGS.volume * globalVolume;

    const audioRef = useRef();
    useEffect(() => {
        if (audioRef.current && audioRef.current.setVolume) {
            audioRef.current.setVolume(effectiveVolume);
        }
    }, [effectiveVolume]);

    const groupRef = useRef();
    const targetScroll = useRef(0);
    const currentScroll = useRef(0);
    const [selectedCard, setSelectedCard] = useState(null);
    const [globalIsAnimating, setGlobalIsAnimating] = useState(false);
    const cardRefs = useRef([]);

    useEffect(() => {
        if (isExiting || isTeleporting || selectedCard !== null || overlayContent) {
            hidePopup();
        }
    }, [isExiting, isTeleporting, selectedCard, overlayContent, hidePopup]);

    // 配置上色过渡。
    const { onBeforeCompile, animatePaint, resetPaint, setPaintProgress, uniformsData, updateRoomOrigin } = usePaintMaterial();
    
    // 跟踪过渡状态以禁用交互。
    const [isTransitioning, setIsTransitioning] = useState(false);
    
    // 跟踪用户是否通过传送进入此房间。
    const wasTeleportedRef = useRef(false);
    useEffect(() => {
        if (isTeleporting) wasTeleportedRef.current = true;
    }, [isTeleporting]);

    useEffect(() => {
        // 房间正式显示，即门打开且用户进入时。
        if (showRoom && !isWarmup) {
            if (wasTeleportedRef.current || isTeleporting) {
                // 通过地图传送时跳过上色过渡。
                setPaintProgress(1);
            } else {
                // 重新进入时调用 resetPaint()。
                resetPaint();
                // 稍作延迟后开始上色，使动画与飞入过程重叠。
                const animation = animatePaint(0.2, 2.5,
                    () => setIsTransitioning(false), () => setIsTransitioning(true));
                return () => animation.kill();
            }
        } else {
            // 预热时立即显现；不展示时隐藏。
            setPaintProgress(1);
        }
    }, [showRoom, isWarmup, isTeleporting, animatePaint, resetPaint, setPaintProgress]);

    const handleCardClick = async (clickedIndex) => {
        if (globalIsAnimating || isTransitioning) return;

        // 解锁查看成就。
        unlockAchievement('gallery_inspect');

        if (selectedCard === clickedIndex) {
            setGlobalIsAnimating(true);
            await cardRefs.current[clickedIndex].closeCard();
            setSelectedCard(null);
            setGlobalIsAnimating(false);
        } else if (selectedCard !== null) {
            setGlobalIsAnimating(true);
            await cardRefs.current[selectedCard].closeCard();
            setSelectedCard(null);
            await cardRefs.current[clickedIndex].openCard();
            setSelectedCard(clickedIndex);
            setGlobalIsAnimating(false);
        } else {
            setGlobalIsAnimating(true);
            await cardRefs.current[clickedIndex].openCard();
            setSelectedCard(clickedIndex);
            setGlobalIsAnimating(false);
        }
    };

    // 跟踪是否已发出就绪信号。
    const hasSignaledReady = useRef(false);
    const frameCount = useRef(0);
    const FRAMES_TO_WAIT = 5;

    useFrame(() => {
        // 每帧更新房间原点，让上色着色器获得正确位置。
        // 只需一次 getWorldPosition，开销小，但对远处分块很关键。
        updateRoomOrigin(groupRef);

        if (hasSignaledReady.current) return;
        frameCount.current++;
        if (frameCount.current >= FRAMES_TO_WAIT) {
            hasSignaledReady.current = true;
            onReady?.();

            // 等待 DoorSection 的 1.5 秒飞入动画结束后再显示教程。
            setTimeout(() => {
                if (!isWarmup) showTutorial('gallery_inspect');
            }, 2000);
        }
    });

    // 配置。
    const BALCONY_WIDTH = 5;
    const BALCONY_DEPTH = 3;
    const RAILING_HEIGHT = 1.25; // 原始比例 20/(7 段 × 2.287)。

    // 纹理与响应式适配。
    // 桌面端使用彩色图，触摸设备或手机使用普通图，包括触屏笔记本。
    // 用 matchMedia('(hover: hover)') 检测鼠标与悬停能力。
    const [canHover, setCanHover] = useState(() => typeof window !== 'undefined' ? window.matchMedia('(hover: hover)').matches : true);

    const allProjects = useGalleryProjects();
    // 正文可以先发布，封面上传后再将对应项目加入三维纸卡。
    const activeProjects = useMemo(() => allProjects.filter(project => project.front), [allProjects]);

    useEffect(() => {
        const mq = window.matchMedia('(hover: hover)');
        const handleHoverChange = (e) => setCanHover(e.matches);
        mq.addEventListener('change', handleHoverChange);
        return () => mq.removeEventListener('change', handleHoverChange);
    }, []);

    // 将全部项目正面纹理加载为扁平数组。
    const textureUrls = activeProjects.map(p => p.front);
    const projectTextures = useTexture(textureUrls);

    // 仅桌面端加载彩色纹理，移动端或触摸设备回退至正面图。
    const paintedUrls = activeProjects.map(p => (canHover && p.painted) ? p.painted : p.front);
    const paintedTextures = useTexture(paintedUrls);

    const [backTextureRaw, illustrationRaw, iconsRaw, buttonRaw] = useTexture(Object.values(NOTEBOOK_ASSETS));
    const featureSpriteRaws = useTexture(NOTEBOOK_FEATURE_SPRITES);

    // 预加载技术栈标志，避免首次翻面卡顿。
    // 采用相同条件：桌面端彩色，触摸设备普通图。
    const allLogos = useMemo(() => {
        const names = [
            'csslogo', 'elementorlogo', 'firebaselogo', 'htmllogo',
            'jslogo', 'netlifylogo', 'phplogo', 'reactlogo',
            'tailwindlogo', 'wordpresslogo'
        ];
        return names.map(name => {
            if (!canHover) return `https://media.secknow-ai.com/space/textures/gallery/${name}.png`;
            if (name === 'csslogo') return `https://media.secknow-ai.com/space/textures/gallery/css3logo_painted.png`;
            return `https://media.secknow-ai.com/space/textures/gallery/${name}_painted.png`;
        });
    }, [canHover]);
    
    useTexture(allLogos);

    const colorTextures = useMemo(() => new Map(
        [...new Set([...projectTextures, ...paintedTextures, backTextureRaw, illustrationRaw, iconsRaw, buttonRaw, ...featureSpriteRaws])].map(source => {
            const texture = source.clone();
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.needsUpdate = true;
            return [source, texture];
        })
    ), [projectTextures, paintedTextures, backTextureRaw, illustrationRaw, iconsRaw, buttonRaw, featureSpriteRaws]);
    useEffect(() => () => colorTextures.forEach(texture => texture.dispose()), [colorTextures]);

    const notebookIcons = useMemo(() => Array.from({ length: 12 }, (_, index) => {
        const texture = colorTextures.get(index < 4 ? featureSpriteRaws[index] : iconsRaw).clone();
        if (index >= 4) {
            texture.repeat.set(0.25, 1 / 3);
            texture.offset.set((index % 4) / 4, 1 - (Math.floor(index / 4) + 1) / 3);
        }
        texture.needsUpdate = true;
        return texture;
    }), [colorTextures, iconsRaw, featureSpriteRaws]);
    useEffect(() => () => notebookIcons.forEach(texture => texture.dispose()), [notebookIcons]);

    const cardIllustrations = useMemo(() => activeProjects.map((project, index) => {
        const source = project.id === 'puffwar' ? illustrationRaw : paintedTextures[index];
        const texture = colorTextures.get(source).clone();
        if (project.id !== 'puffwar') {
            texture.repeat.set(1, 0.35);
            texture.offset.set(0, 0.22);
        }
        texture.needsUpdate = true;
        return texture;
    }), [activeProjects, colorTextures, illustrationRaw, paintedTextures]);
    useEffect(() => () => cardIllustrations.forEach(texture => texture.dispose()), [cardIllustrations]);

    // 每个项目只挂一张纸卡，循环滚动由位置取模完成。
    const projects = useMemo(() => {
        return activeProjects.map((projectData, projectIndex) => {

            // 提取正面纹理。
            const frontTex = colorTextures.get(projectTextures[projectIndex]);
            const paintedTex = colorTextures.get(paintedTextures[projectIndex]);

            // 将技术栈标志映射至对应的彩色或普通版本。
            const techStack = projectData.techStack.map(path => {
                if (!canHover) return path; // 保留普通版本。
                const name = new URL(path).pathname.split('/').pop().replace('.png', '');
                if (name === 'csslogo') return 'https://media.secknow-ai.com/space/textures/gallery/css3logo_painted.png';
                return `https://media.secknow-ai.com/space/textures/gallery/${name}_painted.png`;
            });

            return {
                ...projectData,
                index: projectIndex,
                frontTexture: frontTex,
                paintedTexture: (paintedTex !== frontTex && canHover) ? paintedTex : null,
                backTexture: colorTextures.get(backTextureRaw),
                buttonTexture: colorTextures.get(buttonRaw),
                cardIllustrationTexture: cardIllustrations[projectIndex],
                noteIconTextures: (NOTEBOOK_FEATURE_ICONS[projectData.id] || [4, 5, 6, 7]).map(icon => notebookIcons[icon]),
                techStack: techStack
            };
        });
    }, [activeProjects, projectTextures, paintedTextures, canHover, backTextureRaw, colorTextures, buttonRaw, cardIllustrations, notebookIcons]);

    // 滚动到指定项目索引的函数。
    const scrollToIndex = (index, onComplete) => {
        const totalWidth = projects.length * GAP;
        const targetScrollValue = index * GAP;
        const currentScrollValue = currentScroll.current;

        let diff = targetScrollValue - currentScrollValue;
        const halfWidth = totalWidth / 2;
        while (diff > halfWidth) diff -= totalWidth;
        while (diff < -halfWidth) diff += totalWidth;

        const finalTarget = currentScrollValue + diff;

        gsap.to(targetScroll, {
            current: finalTarget,
            duration: 0.5,
            ease: 'power2.inOut'
        });

        gsap.to(currentScroll, {
            current: finalTarget,
            duration: 0.5,
            ease: 'power2.inOut',
            onComplete: onComplete
        });
    };

    // 交互。
    const lastTouchX = useRef(0);
    useEffect(() => {
        if (overlayContent) return;
        // 使用 Observer 统一滚轮、触摸与指针事件。
        const scrollObserver = Observer.create({
            target: window,
            type: "wheel,touch,pointer",
            wheelSpeed: -1,
            onWheel: (e) => {
                if (!showRoom || selectedCard !== null || globalIsAnimating || isTransitioning) return;
                const orig = e.event;
                orig.preventDefault();
                targetScroll.current += orig.deltaY * 0.005;
            },
            onPress: (e) => {
                if (!showRoom || selectedCard !== null || globalIsAnimating || isTransitioning) return;
                const orig = e.event;
                if (orig.touches && orig.touches.length === 1) {
                    lastTouchX.current = orig.touches[0].clientX;
                }
            },
            onDrag: (e) => {
                if (!showRoom || selectedCard !== null || globalIsAnimating || isTransitioning) return;
                const orig = e.event;
                if (orig.touches && orig.touches.length === 1) {
                    const deltaX = lastTouchX.current - orig.touches[0].clientX;
                    lastTouchX.current = orig.touches[0].clientX;
                    targetScroll.current += deltaX * 0.008;
                }
            }
        });

        return () => scrollObserver.kill();
    }, [showRoom, selectedCard, globalIsAnimating, isTransitioning, overlayContent]);

    useFrame((state, delta) => {
        currentScroll.current = THREE.MathUtils.lerp(currentScroll.current, targetScroll.current, delta * 5);
    });

    // 几何体与材质。
    const floorSource = useTexture('https://media.secknow-ai.com/space/textures/gallery/floor.png');
    const floorTexture = useTextureCopy(floorSource, { wrapS: THREE.MirroredRepeatWrapping, wrapT: THREE.MirroredRepeatWrapping, repeatX: 0.5, repeatY: 0.5 * 1.835 });
    const railingSource = useTexture('https://media.secknow-ai.com/space/textures/gallery/railing.png');
    const railingTexture = useTextureCopy(railingSource, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, repeatX: 7 });
    const housesTexture = useTexture('https://media.secknow-ai.com/space/textures/gallery/domki.png');
    const cityTexture = useTexture('https://media.secknow-ai.com/space/textures/gallery/miastotlo.png');
    const birdTexture = useTexture('https://media.secknow-ai.com/space/textures/gallery/bird_gray.png');
    const clothespinTexture = useTexture('https://media.secknow-ai.com/space/textures/gallery/klamerka.png');
    const thresholdTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/texturadoprogow.png');

    const materials = useMemo(() => {
        const floorMat = new THREE.MeshBasicMaterial({
            map: floorTexture,
            color: '#e0e0e0',
            side: THREE.DoubleSide
        });
        floorMat.onBeforeCompile = onBeforeCompile;
        floorMat.transparent = true;
        floorMat.needsUpdate = true;
        
        const ropeMat = new THREE.MeshBasicMaterial({ color: '#666666' });
        ropeMat.onBeforeCompile = onBeforeCompile;
        ropeMat.transparent = true;
        ropeMat.needsUpdate = true;

        const thresholdMat = new THREE.MeshBasicMaterial({
            color: '#e0e0e0',
            map: (() => {
                const t = thresholdTexture.clone();
                t.colorSpace = THREE.SRGBColorSpace;
                t.wrapS = t.wrapT = THREE.RepeatWrapping;
                t.repeat.set(15 / 2.524, 1);
                t.needsUpdate = true;
                return t;
            })(),
            side: THREE.DoubleSide
        });
        thresholdMat.onBeforeCompile = onBeforeCompile;
        thresholdMat.transparent = true;
        thresholdMat.needsUpdate = true;

        return {
            floor: floorMat,
            rope: ropeMat,
            threshold: thresholdMat
        };
    }, [floorTexture, thresholdTexture, onBeforeCompile]);

    useEffect(() => () => {
        materials.threshold.map.dispose();
        Object.values(materials).forEach(material => material.dispose());
    }, [materials]);

    const curve = useMemo(() => {
        return new THREE.CatmullRomCurve3([
            new THREE.Vector3(-16, 3.5, -6),
            new THREE.Vector3(-8, 2.5, -4.5),
            new THREE.Vector3(0, 1.8, -3),
            new THREE.Vector3(8, 2.5, -4.5),
            new THREE.Vector3(16, 3.5, -6),
        ]);
    }, []);

    const ropeGeometry = useMemo(() => {
        return new THREE.TubeGeometry(curve, 64, 0.015, 8, false);
    }, [curve]);

    const floorShape = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(-1.1, -2.0);
        shape.lineTo(1.1, -2.0);
        shape.lineTo(7.5, 4);
        shape.lineTo(-7.5, 4);
        shape.lineTo(-1.1, -2.0);
        return shape;
    }, []);

    return (
        <group ref={groupRef}>
            {!isWarmup && (
                <PositionalAudio
                    ref={audioRef}
                    url={media.audio.city}
                    distanceModel="exponential"
                    refDistance={AUDIO_SETTINGS.distance}
                    rolloffFactor={AUDIO_SETTINGS.rolloff}
                    loop
                    autoplay
                    volume={effectiveVolume}
                />
            )}
            <group position={[0, -0.7, -2]}>
                {/* 地面。 */}
                <mesh
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, 0, 0]}
                >
                    <shapeGeometry args={[floorShape]} />
                    <primitive object={materials.floor} />
                </mesh>

                {/* 地面轮廓。 */}
                <line rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                    <bufferGeometry>
                        <float32BufferAttribute
                            attach="attributes-position"
                            count={2}
                            array={new Float32Array([7.5, 4, 0, -7.5, 4, 0])}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial color="#999999" onBeforeCompile={onBeforeCompile} transparent={true} needsUpdate={true} />
                </line>

                {/* 栏杆。 */}
                <mesh position={[0, RAILING_HEIGHT / 2, -3.9]}>
                    <planeGeometry args={[20, RAILING_HEIGHT]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={railingTexture}
                        transparent={true}
                        side={THREE.DoubleSide}
                        alphaTest={0.1}
                        onBeforeCompile={onBeforeCompile}
                        customProgramCacheKey={() => 'railing-paint'}
                    />
                </mesh>

                {/* 地面末端的门槛。 */}
                <mesh
                    position={[0, 0.01, -3.9]}
                    rotation={[-Math.PI / 2, 0, 0]}
                >
                    <planeGeometry args={[15, 0.15]} />
                    <primitive object={materials.threshold} />
                </mesh>

                {/* 晾衣绳系统。 */}
                <group position={[0, 1.6, -4]}>
                    <mesh geometry={ropeGeometry} material={materials.rope} />

                    {/* 项目卡片。 */}
                    {projects.map((project, i) => (
                        <ProjectCard
                            key={project.id}
                            index={i}
                            ref={el => cardRefs.current[i] = el}
                            project={project}
                            clothespinTexture={clothespinTexture}
                            total={projects.length}
                            currentScroll={currentScroll}
                            materials={materials}
                            curve={curve}
                            isSelected={selectedCard === i}
                            scrollToIndex={scrollToIndex}
                            onClick={handleCardClick}
                            isMobile={!canHover} // 按悬停能力决定移动端行为。
                            isTransitioning={isTransitioning} // 向下传递，以禁用各元素的指针事件。
                            paintProgress={uniformsData.uPaintProgress}
                            roomOrigin={uniformsData.uRoomOrigin}
                        />
                    ))}
                </group>

                {/* 背景景物图层。 */}
                {/* 中央房屋。 */}
                <mesh position={[0, -1, -9]} scale={[1, 1, 1]}>
                    <planeGeometry args={[15, 15 / 2.357]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={housesTexture}
                        transparent={true}
                        alphaTest={0.1}
                        side={THREE.DoubleSide}
                        onBeforeCompile={onBeforeCompile}
                    />
                </mesh>
                {/* 左侧镜像房屋。 */}
                <mesh position={[-15, -1, -9]} scale={[-1, 1, 1]}>
                    <planeGeometry args={[15, 15 / 2.357]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={housesTexture}
                        transparent={true}
                        alphaTest={0.1}
                        side={THREE.DoubleSide}
                        onBeforeCompile={onBeforeCompile}
                    />
                </mesh>
                {/* 右侧镜像房屋，已裁切。 */}
                <RightSideHouses
                    texture={housesTexture}
                    baseWidth={15}
                    baseHeight={15 / 2.357}
                    cropAmount={RIGHT_CROP_AMOUNT}
                />

                {/* 中央城市天际线。 */}
                <mesh position={[0, 3.4, -17]} scale={[1, 1, 1]}>
                    <planeGeometry args={[30, 30 / 2.357]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={cityTexture}
                        transparent={true}
                        alphaTest={0.1}
                        side={THREE.DoubleSide}
                        onBeforeCompile={onBeforeCompile}
                    />
                </mesh>
                {/* 左侧镜像城市天际线。 */}
                <mesh position={[-30, 3.4, -17]} scale={[-1, 1, 1]}>
                    <planeGeometry args={[30, 30 / 2.357]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={cityTexture}
                        transparent={true}
                        alphaTest={0.1}
                        side={THREE.DoubleSide}
                        onBeforeCompile={onBeforeCompile}
                    />
                </mesh>
                {/* 右侧镜像城市天际线。 */}
                <mesh position={[30, 3.4, -17]} scale={[-1, 1, 1]}>
                    <planeGeometry args={[30, 30 / 2.357]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={cityTexture}
                        transparent={true}
                        alphaTest={0.1}
                        side={THREE.DoubleSide}
                        onBeforeCompile={onBeforeCompile}
                    />
                </mesh>

                {/* 飞鸟。 */}
                <FlyingBird texture={birdTexture} />

                {/* 上方散布的云层。 */}
                <GalleryClouds count={65} seed={123} />

                {/* 天空盒与环境。 */}
                <mesh position={[0, 5, -20]}>
                    <sphereGeometry args={[40, 32, 32]} />
                    <meshBasicMaterial color="#f0f0f0" side={THREE.BackSide} transparent opacity={0.5} onBeforeCompile={onBeforeCompile} />
                </mesh>
            </group>
        </group>
    );
};

// 飞鸟动画组件。
const FlyingBird = ({ texture }) => {
    const birdRef = useRef();
    const startX = -25;
    const endX = 25;
    const speed = 2.5; // 降低飞行速度。

    // 跳跃物理参数。
    const velocityY = useRef(0);
    const gravity = -12.0; // 减小重力，使动作更平滑。
    const jumpStrength = 5.5; // 轻柔跳跃。
    const jumpInterval = useRef(0);

    useFrame((state, delta) => {
        if (!birdRef.current) return;

        // 限制卡顿时过大的 delta。
        const safeDelta = Math.min(delta, 0.05);

        // 水平移动。
        birdRef.current.position.x += speed * safeDelta;

        if (birdRef.current.position.x > endX) {
            birdRef.current.position.x = startX;
            birdRef.current.position.y = 4.5;
            velocityY.current = 0;
            jumpInterval.current = 0;
            birdRef.current.rotation.z = 0;
        }

        // 下落物理。
        velocityY.current += gravity * safeDelta;
        birdRef.current.position.y += velocityY.current * safeDelta;

        // 更平滑、可预测的跳跃。
        jumpInterval.current -= safeDelta;

        // 到达下一次点击间隔时触发跳跃。
        if (jumpInterval.current <= 0 || birdRef.current.position.y < 3.2) {
            velocityY.current = jumpStrength;
            // 降低跳跃频率并保持节奏，例如每整秒一次。
            jumpInterval.current = 0.9 + Math.random() * 0.3;
        }

        // 地面下边界。
        if (birdRef.current.position.y < 3.0) {
            birdRef.current.position.y = 3.0;
            velocityY.current = jumpStrength;
        }

        // 天花板上边界。
        if (birdRef.current.position.y > 6.5) {
            birdRef.current.position.y = 6.5;
            velocityY.current = 0;
        }

        // 鸟的旋转。
        // 模拟 Flappy Bird：下落时鸟喙微向下，跳跃时向上看。
        const targetRotationZ = THREE.MathUtils.clamp(velocityY.current * 0.05, -Math.PI / 6, Math.PI / 8);

        // 使用 lerp 平滑旋转。
        birdRef.current.rotation.z = THREE.MathUtils.lerp(birdRef.current.rotation.z, targetRotationZ, safeDelta * 8);
    });

    return (
        <mesh ref={birdRef} position={[startX, 4.5, -10]} scale={[BIRD_WIDTH, BIRD_HEIGHT, 1]}>
            <planeGeometry args={[1.5, 1.5]} />
            <meshBasicMaterial color="#e0e0e0"
                map={texture}
                transparent={true}
                alphaTest={0.1}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};

// 单张项目卡片子组件。
const ProjectCard = memo(forwardRef(({ index, total, project, clothespinTexture, currentScroll, curve, isSelected, scrollToIndex, onClick, isMobile, isTransitioning, paintProgress, roomOrigin }, ref) => {
    const { openOverlay } = useScene();
    const cardRef = useRef();
    const paperRef = useRef(); // 可移动纸张部分的引用。
    const materialRef = useRef();
    const textRef = useRef(); // 贴在纸张上的文字引用。
    const buttonGroupRef = useRef(); // 背面交互按钮引用。
    const detailsGroupRef = useRef(); // 背面项目详情引用。
    const techStackGroupRef = useRef(); // 背面技术栈区域引用。
    const artworkGroupRef = useRef();
    const detailsTextRef1 = useRef();
    const detailsTextRef2 = useRef();
    const openTextRef = useRef();
    const [hovered, setHovered] = useState(false);
    const [btnHovered, setBtnHovered] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);  // 仅在翻转动画期间为 true。

    // 随机摆动属性。
    const [swaySpeed] = useState(() => Math.random() * 0.2 + 0.3); // 较慢的摆动速度。
    const [swayOffset] = useState(() => Math.random() * 100);

    // 音频引用。
    const paperAudioRef = useRef();
    const { globalVolume, isMuted } = useAudio();

    const playPaperSound = () => {
        if (paperAudioRef.current) {
            const vol = isMuted ? 0 : GALLERY_INTERACTION_AUDIO_SETTINGS.volume * globalVolume;
            paperAudioRef.current.setVolume(vol);
            if (paperAudioRef.current.isPlaying) paperAudioRef.current.stop();
            paperAudioRef.current.play();
        }
    };

    useImperativeHandle(ref, () => ({
        closeCard: () => {
            return new Promise((resolve) => {
                setIsAnimating(true);
                playPaperSound();

                const timeline = gsap.timeline({
                    onComplete: () => {
                        setIsAnimating(false);
                        resolve();

                        // 卡片返回衣夹后移除彩色效果。
                        if (project.paintedTexture && materialRef.current) {
                            gsap.to(materialRef.current, {
                                uProgress: 0.0,
                                duration: 0.5,
                                ease: 'power2.out',
                                overwrite: 'auto'
                            });
                        }
                    }
                });

                const localBaseY = -1.1;

                timeline.to(paperRef.current.position, {
                    y: localBaseY + 0.6,
                    x: 0,
                    z: 1,
                    duration: 0.35,
                    ease: 'power2.in'
                });

                timeline.to(paperRef.current.rotation, {
                    x: 0.5,
                    z: -0.05,
                    y: 0,
                    duration: 0.35,
                    ease: 'power2.in'
                }, '<');

                if (materialRef.current) {
                    timeline.to(materialRef.current, {
                        bend: 0.6,
                        duration: 0.3,
                        ease: 'power2.in'
                    }, '<');
                }

                timeline.to(paperRef.current.scale, {
                    x: 1, y: 1, z: 1,
                    duration: 0.3, ease: 'sine.inOut'
                }, '<');

                timeline.to(paperRef.current.position, {
                    y: localBaseY,
                    x: 0,
                    z: 0,
                    duration: 0.25,
                    ease: 'power3.out'
                });

                timeline.to(paperRef.current.rotation, {
                    x: 0, y: 0, z: 0,
                    duration: 0.25,
                    ease: 'power3.out'
                }, '<');

                if (materialRef.current) {
                    timeline.to(materialRef.current, {
                        bend: 0,
                        duration: 0.3,
                        ease: 'power2.out'
                    }, '<');
                }
            });
        },
        openCard: () => {
            return new Promise((resolve) => {
                scrollToIndex(index, () => {
                    setIsAnimating(true);
                    playPaperSound();

                    const isMobile = window.innerWidth < 768;
                    const targetX_World = 0;
                    const targetY_World = isMobile ? -0.2 : 0.1;
                    const targetZ_World = isMobile ? 0.5 : 1.5;

                    const parentPos = cardRef.current.position;
                    const targetX = targetX_World - parentPos.x;
                    const targetY = targetY_World - parentPos.y;
                    const targetZ = targetZ_World - parentPos.z;

                    const timeline = gsap.timeline({
                        onComplete: () => {
                            setIsAnimating(false);
                            resolve();
                        }
                    });

                    timeline.to(cardRef.current.rotation, {
                        x: 0, y: 0, z: 0,
                        duration: 0.3,
                        ease: 'power2.out'
                    }, 0);

                    if (materialRef.current) materialRef.current.bend = 0;

                    const localBaseY = -1.1;

                    timeline.to(paperRef.current.position, {
                        y: localBaseY - 0.5,
                        duration: 0.15,
                        ease: 'power2.out'
                    });

                    timeline.to(paperRef.current.rotation, {
                        x: 0.5,
                        z: -0.05,
                        duration: 0.15,
                        ease: 'power2.out'
                    }, '<');

                    if (materialRef.current) {
                        timeline.to(materialRef.current, {
                            bend: 0.8,
                            duration: 0.15,
                            ease: 'power2.out'
                        }, '<');

                        // 展开时保持彩色，或将上色进度补至 1.0。
                        // 独立运行 gsap.to，避免延长时间线。
                        if (project.paintedTexture) {
                            gsap.to(materialRef.current, {
                                uProgress: 1.0,
                                duration: 0.3,
                                ease: 'power2.out',
                                overwrite: 'auto'
                            });
                        }
                    }

                    timeline.to(paperRef.current.position, {
                        y: localBaseY + 1.5,
                        x: targetX * 0.2,
                        z: targetZ * 0.2,
                        duration: 0.4,
                        ease: 'power1.out'
                    });

                    timeline.to(paperRef.current.rotation, {
                        x: Math.PI * 0.8,
                        z: 0.05,
                        y: -0.02,
                        duration: 0.4,
                        ease: 'power1.inOut'
                    }, '<');

                    if (materialRef.current) {
                        timeline.to(materialRef.current, {
                            bend: -0.3,
                            duration: 0.4,
                            ease: 'power1.inOut'
                        }, '<');
                    }

                    timeline.to(paperRef.current.position, {
                        y: targetY,
                        x: targetX,
                        z: targetZ,
                        duration: 0.4,
                        ease: 'power3.out'
                    });

                    timeline.to(paperRef.current.rotation, {
                        x: Math.PI,
                        y: 0,
                        z: 0,
                        duration: 0.4,
                        ease: 'power3.out'
                    }, '<');

                    if (materialRef.current) {
                        timeline.to(materialRef.current, {
                            bend: 0,
                            duration: 0.5,
                            ease: 'power2.out'
                        }, '<');
                    }

                    timeline.to(paperRef.current.scale, {
                        x: 1.1,
                        y: 1.1,
                        z: 1.1,
                        duration: 0.3,
                        ease: 'sine.out'
                    }, '-=0.4');
                });
            });
        }
    }));

    const handleClick = (e) => {
        e.stopPropagation();
        if (onClick) onClick(index);
    };

    // 悬停时改变光标。
    useEffect(() => {
        if (btnHovered && isSelected) {
            document.body.style.cursor = 'pointer';
        } else if (hovered && !isSelected) {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'auto';
        }
        return () => { document.body.style.cursor = 'auto'; };
    }, [hovered, isSelected, btnHovered]);

    useFrame((state) => {
        if (!cardRef.current) return;

        // 文字的自定义 GSAP 上色逻辑。
        // 略微延迟文字显现，让卡片先上色至 p > 0.4。
        if (textRef.current && paintProgress) {
            const p = paintProgress.value;
            // 传送进入时立即显现。
            const expectedOpacity = p >= 1.0 ? 1.0 : THREE.MathUtils.clamp((p - 0.3) * 2.0, 0.0, 1.0);
            
            if (textRef.current.fillOpacity !== expectedOpacity) {
                const applyOpacity = (ref) => {
                    if (ref.current) {
                        ref.current.fillOpacity = expectedOpacity;
                        if (ref.current.material) {
                            ref.current.material.opacity = expectedOpacity;
                            ref.current.material.transparent = true;
                        }
                    }
                };
                applyOpacity(textRef);
                applyOpacity(detailsTextRef1);
                applyOpacity(detailsTextRef2);
                applyOpacity(openTextRef);
            }
        }

        // 让正面文字 Z 与纸张弯曲、起伏动画一致。
        if (textRef.current && materialRef.current) {
            const y = textRef.current.position.y;
            const uBend = materialRef.current.bend;
            const uWindStrength = materialRef.current.windStrength || 0;
            const uTime = state.clock.getElapsedTime();

            const bendAmount = Math.pow(y, 2.0) * uBend;
            const totalWind = 0.02 + uWindStrength;
            const flutter = Math.sin(uTime * 2.0 + y * 2.0) * totalWind * (1.0 + Math.abs(uBend * 3.0));

            textRef.current.position.z = bendAmount + flutter + 0.02;

            // 按曲率导数 dz/dy 旋转文字，使其贴合纸面。
            const dz_dy = 2.0 * y * uBend + 2.0 * Math.cos(uTime * 2.0 + y * 2.0) * totalWind * (1.0 + Math.abs(uBend * 3.0));
            textRef.current.rotation.x = Math.atan(dz_dy);
        }

        // 纸背的文字、插画、功能提示和入口共享同一张弯曲纸面。
        const uTime = state.clock.getElapsedTime();
        const bend = materialRef.current?.bend || 0;
        const paperWind = 0.02 + (materialRef.current?.windStrength || 0);
        for (const groupRef of [buttonGroupRef, detailsGroupRef, techStackGroupRef, artworkGroupRef]) {
            const group = groupRef.current;
            if (!group) continue;
            const y = group.position.y;
            const flutter = Math.sin(uTime * 2 + y * 2) * paperWind * (1 + Math.abs(bend * 3));
            group.position.z = y * y * bend + flutter - 0.03;
            const slope = 2 * y * bend + 2 * Math.cos(uTime * 2 + y * 2) * paperWind * (1 + Math.abs(bend * 3));
            group.rotation.x = Math.PI + Math.atan(slope);
        }
        if (buttonGroupRef.current) {
            const targetScale = btnHovered ? 1.025 : 1;
            buttonGroupRef.current.scale.lerp(_tempScale.set(targetScale, targetScale, 1), 0.15);
        }

        // 仅在翻转动画期间跳过位置更新，滚动时仍更新。
        if (isAnimating || isSelected) return;

        const totalWidth = total * GAP;
        let rawX = (index * GAP) - currentScroll.current;
        const halfWidth = totalWidth / 2;
        let displayX = ((rawX + halfWidth) % totalWidth + totalWidth) % totalWidth - halfWidth;

        const u = (displayX + 16) / 32;
        const safeU = THREE.MathUtils.clamp(u, 0, 1);
        const pointOnCurve = curve.getPointAt(safeU);

        cardRef.current.position.set(pointOnCurve.x, pointOnCurve.y, pointOnCurve.z);

        // 风与摆动动画。
        const time = state.clock.getElapsedTime();
        const wind = Math.sin(time * swaySpeed + swayOffset) * 0.05;

        cardRef.current.rotation.z = wind;
        cardRef.current.rotation.x = 0;

        // 可见性检查，过远时淡出。
        const dist = Math.abs(displayX);
        const scale = THREE.MathUtils.clamp(1 - (dist / 50), 0.7, 1);
        cardRef.current.scale.setScalar(scale);
    });

    return (
        <group
            ref={cardRef}
            name={`project-card-${project.id}`}
            onClick={handleClick}
            onPointerEnter={(e) => {
                if (isMobile || isTransitioning) return;
                e.stopPropagation();
                setHovered(true);

                // 笔刷显现动画。
                if (materialRef.current && project.paintedTexture && !isSelected) {
                    gsap.to(materialRef.current, {
                        uProgress: 1.0,
                        duration: 0.8,
                        ease: 'power2.out',
                        overwrite: 'auto'
                    });
                }
            }}
            onPointerLeave={(e) => {
                if (isMobile || isTransitioning) return;
                e.stopPropagation();
                setHovered(false);

                // 仅在未选中时反向执行笔刷显现。
                if (materialRef.current && project.paintedTexture && !isSelected) {
                    gsap.to(materialRef.current, {
                        uProgress: 0.0,
                        duration: 0.5,
                        ease: 'power2.out',
                        overwrite: 'auto'
                    });
                }
            }}
        >
            {/* 顶部中央衣夹，不随 paperRef 移动。 */}
            <mesh position={[0, -0.08, 0.15]} rotation={[0, 0, Math.PI]}>
                <planeGeometry args={[0.3, 0.2]} />
                <meshBasicMaterial color="#ffffff"
                    map={clothespinTexture}
                    transparent={true}
                    alphaTest={0.1}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* 下垂的纸张卡片，独立移动。 */}
            <group
                ref={paperRef}
                position={[0, -1.1, 0]}
            >
                <mesh>
                    <planeGeometry args={[1.5, 2, 16, 16]} />
                    <PaperMaterial
                        ref={materialRef}
                        color="#ffffff"
                        map={project.frontTexture}
                        mapBack={project.backTexture}
                        mapPainted={project.paintedTexture}
                        side={THREE.DoubleSide}
                        alphaTest={0.1}
                        roughness={0.6}
                        paintProgress={paintProgress}
                        roomOrigin={roomOrigin}
                    />
                </mesh>

                {/* 卡片背面的打开按钮。 */}
                <group
                    ref={buttonGroupRef}
                    position={[0, 0.75, 0]}
                    rotation={[Math.PI, 0, 0]}
                >
                    <mesh>
                        <planeGeometry args={[1.1, 0.25]} />
                        <meshBasicMaterial toneMapped={false} fog={false} map={project.buttonTexture} color={btnHovered ? '#fff4d5' : '#ffffff'} transparent alphaTest={0.03} />
                    </mesh>

                    {/* 第 2 层：“打开项目”文字，不接收事件。 */}
                    <Text
                        ref={openTextRef}
                        position={[-0.035, 0, 0.01]}
                        fontSize={0.073}
                        color="#433b2e"
                        font="/media/fonts/LXGWWenKaiLite-site.woff"
                        anchorX="center"
                        anchorY="middle"
                        fillOpacity={0} // 初始隐藏。
                    >
                        查看项目
                    </Text>
                    <group position={[0.44, 0, 0.01]}>
                        <mesh><planeGeometry args={[0.09, 0.006]} /><meshBasicMaterial toneMapped={false} fog={false} color="#433b2e" /></mesh>
                        <mesh position={[0.029, 0.014, 0]} rotation={[0, 0, -Math.PI / 4]}><planeGeometry args={[0.04, 0.006]} /><meshBasicMaterial toneMapped={false} fog={false} color="#433b2e" /></mesh>
                        <mesh position={[0.029, -0.014, 0]} rotation={[0, 0, Math.PI / 4]}><planeGeometry args={[0.04, 0.006]} /><meshBasicMaterial toneMapped={false} fog={false} color="#433b2e" /></mesh>
                    </group>

                    {/* 第 3 层：覆盖整个按钮的不可见区域，接收全部事件。 */}
                    <mesh
                        position={[0, 0, 0.02]}
                        onClick={(e) => {
                            if (isSelected && !isTransitioning) {
                                e.stopPropagation();
                                if (project.details) openOverlay({ layout: 'project', projectId: project.id });
                                else window.open(project.url, '_blank', 'noopener,noreferrer');
                            }
                        }}
                        onPointerEnter={(e) => {
                            if (isSelected && !isTransitioning) {
                                e.stopPropagation();
                                setBtnHovered(true);
                            }
                        }}
                        onPointerLeave={(e) => {
                            if (isSelected && !isTransitioning) {
                                e.stopPropagation();
                            }
                            setBtnHovered(false);
                        }}
                    >
                        <planeGeometry args={[1.14, 0.25]} />
                        <meshBasicMaterial toneMapped={false} fog={false} color="#e0e0e0" transparent={true} opacity={0} />
                    </mesh>
                </group>

                {/* 纸背面的项目详情文字。 */}
                <group
                    ref={detailsGroupRef}
                    position={[0, -0.5, 0]} // 位于顶部；此坐标系 Y=0.75 为底部，Y=-0.4 为顶部。
                    rotation={[Math.PI, 0, 0]}
                >
                    <Text
                        ref={detailsTextRef1}
                        position={[-0.57, 0.36, 0.01]}
                        fontSize={0.15}
                        maxWidth={1.14}
                        lineHeight={1.2}
                        color="#30362f"
                        font="/media/fonts/LXGWWenKaiLite-site.woff"
                        anchorX="left"
                        anchorY="top"
                        fillOpacity={0} // 初始隐藏。
                    >
                        {project.shortTitle || project.cardTitle || project.title}
                    </Text>

                    <mesh position={[-0.25, 0.225, 0.005]} rotation={[0, 0, -0.012]}>
                        <planeGeometry args={[0.65, 0.014]} />
                        <meshBasicMaterial toneMapped={false} fog={false} color="#edcc85" />
                    </mesh>

                    <Text
                        ref={detailsTextRef2}
                        position={[-0.57, 0.16, 0.01]}
                        fontSize={0.057}
                        color="#4a4d43"
                        font="/media/fonts/LXGWWenKaiLite-site.woff"
                        anchorX="left"
                        anchorY="top"
                        maxWidth={1.14}
                        overflowWrap="break-word"
                        lineHeight={1.55}
                        textAlign="left"
                        fillOpacity={0} // 初始隐藏。
                    >
                        {project.description || "项目介绍将在这里显示。"}
                    </Text>
                </group>

                <group ref={artworkGroupRef} position={[0, -0.065, 0]} rotation={[Math.PI, 0, 0]}>
                    <mesh>
                        <planeGeometry args={[1.14, 0.5]} />
                        <meshBasicMaterial toneMapped={false} fog={false} map={project.cardIllustrationTexture} transparent alphaTest={0.03} />
                    </mesh>
                </group>

                <group ref={techStackGroupRef} position={[0, 0.395, 0]} rotation={[Math.PI, 0, 0]}>
                    {[-0.185, -0.005, 0.175].map(y => <mesh key={y} position={[0, y, 0.005]}>
                        <planeGeometry args={[1.14, 0.0015]} />
                        <meshBasicMaterial toneMapped={false} fog={false} color="#cdbfa4" />
                    </mesh>)}
                    <mesh position={[0, -0.005, 0.005]}>
                        <planeGeometry args={[0.0015, 0.36]} />
                        <meshBasicMaterial toneMapped={false} fog={false} color="#cdbfa4" />
                    </mesh>
                    {project.cardNotes?.map((note, noteIndex) => {
                        const x = -0.49 + (noteIndex % 2) * 0.59;
                        const y = 0.075 - Math.floor(noteIndex / 2) * 0.17;
                        return <group key={note} position={[x, y, 0.01]}>
                            <mesh>
                                <planeGeometry args={[0.17, 0.17]} />
                                <meshBasicMaterial toneMapped={false} fog={false} map={project.noteIconTextures[noteIndex]} transparent alphaTest={0.03} />
                            </mesh>
                            <Text position={[0.115, 0, 0.005]} font="/media/fonts/LXGWWenKaiLite-site.woff" fontSize={note.replace(/[A-Za-z]/g, "").length > 5 ? 0.055 : 0.066} color="#433c31" maxWidth={0.36} anchorX="left" anchorY="middle" lineHeight={1.4}>
                                {note}
                            </Text>
                        </group>;
                    })}
                    {project.techStack?.map((logoPath, idx) => <TechStackLogo key={logoPath} path={logoPath} position={[(idx - (project.techStack.length - 1) / 2) * 0.3, 0, 0]} />)}
                </group>

                {/* 
                  项目文字与标题。
                  在此调整各段文字的外观。
                  
                  position：[X, Y, Z] 位置。
                  > X 为左右方向，0 为中央。
                  > Y 为上下方向，例如 0.75 为纸张顶部，-0.75 为底部。
                  > 不要调整 Z，上方脚本会自动计算，让文字贴合纸张波动。
                  
                  fontSize：字号，默认 0.15。
                  color：文字颜色。
                  font：可选，可使用 /public/media/fonts/ 中的其他字体。
                */}
                <Text
                    ref={textRef}
                    visible={!project.titleInCover}
                    position={[0, 0.7, 0]} // 这里只有前两个参数 X、Y 生效。
                    fontSize={project.cardTitle ? 0.15 : 0.20}
                    maxWidth={project.cardTitle ? 1.3 : undefined}
                    textAlign="center"
                    lineHeight={1.25}
                    color="#1c1c1c"
                    font="/media/fonts/LXGWWenKaiLite-site.woff"
                    anchorX="center"
                    anchorY="middle"
                    fillOpacity={0} // 初始隐藏。
                >
                    {project.cardTitle || project.title}
                </Text>

                <PositionalAudio
                    ref={paperAudioRef}
                    url={media.audio.paper}
                    distanceModel="exponential"
                    rolloffFactor={GALLERY_INTERACTION_AUDIO_SETTINGS.rolloff}
                    refDistance={GALLERY_INTERACTION_AUDIO_SETTINGS.distance}
                    loop={false}
                />
            </group>
        </group>
    );
}));


// 处理右侧房屋裁切的组件。
const RightSideHouses = ({ texture, baseWidth, baseHeight, cropAmount }) => {
    // 克隆纹理，独立调整 UV。
    const croppedTexture = useMemo(() => {
        const t = texture.clone();
        // scale.x=-1 表示镜像，因此世界空间的右侧
        // 对应纹理左侧，即 U=0。
        // 裁切世界右侧时，需要裁切纹理左侧。
        // 因此增大 offset.x。
        t.offset.x = cropAmount;
        t.repeat.x = 1 - cropAmount;
        t.needsUpdate = true;
        return t;
    }, [texture, cropAmount]);

    useEffect(() => () => croppedTexture.dispose(), [croppedTexture]);

    // 计算新宽度与位置。
    const newWidth = baseWidth * (1 - cropAmount);

    // 该网格原先的世界左侧内边缘为 CenterX - Width/2。
    // 对于右侧网格：
    // 原位置为 15，宽度为 15。
    // 内边缘为 15-7.5=7.5。
    // 需要将内边缘保持在 7.5。
    // 新中心 = 内边缘 + 新宽度/2。
    const newX = 7.5 + (newWidth / 2);

    return (
        <mesh position={[newX, -1, -9]} scale={[-1, 1, 1]}>
            <planeGeometry args={[newWidth, baseHeight]} />
            <meshBasicMaterial color="#e0e0e0"
                map={croppedTexture}
                transparent={true}
                alphaTest={0.1}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};

// 单个技术栈标志子组件。
const TechStackLogo = ({ path, position }) => {
    const texture = useTexture(path);

    return (
        <mesh position={position}>
            <planeGeometry args={[0.17, 0.17]} />
            <meshBasicMaterial color="#ffffff"
                map={texture}
                transparent={true}
            />
        </mesh>
    );
};

export default GalleryRoom;
