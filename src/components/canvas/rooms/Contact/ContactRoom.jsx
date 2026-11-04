import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, PositionalAudio } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import MessagePaper from './MessagePaper';
import SocialBarrel from './SocialBarrel';
import { useScene } from '../../../../context/SceneContext';
import GalleryClouds from '../Gallery/GalleryClouds';
import { useAchievements } from '../../../../context/AchievementsContext';
import { useAudio } from '../../../../context/AudioManager';

// ============================================
// ============================================
// 🌊 联系我房间第二版：漂流瓶留言。
// 沉浸体验：写信、卷入瓶中、投出漂流瓶。
// ============================================
import { useTexture } from '@react-three/drei';
import { usePaintMaterial } from '../Gallery/usePaintMaterial';

const WAVE_LAYERS = 4;

// ============================================
// ⚙️ 音频设置：在此调整。
// 修改这些值可调整海浪声的音量和可听范围。
// ============================================
export const AUDIO_SETTINGS = {
    volume: 2,
    distance: 2,           // 声音开始衰减的距离 refDistance。
    rolloff: 1.2           // 声音衰减速度 rolloffFactor。
};

// ============================================
// ⚙️ 灯塔设置：在此调整。
// 修改灯塔的位置、旋转和尺寸。
// ============================================
export const LATARNIA_SETTINGS = {
    // 位置：[左右 X、上下 Y、前后 Z]。
    position: [-10, 5, -20],

    // 旋转：[前后倾斜 X、左右转向 Y、侧倾 Z]。
    rotation: [0, 0.1, 0],

    // 尺寸：[宽度、高度]。
    scale: [4.49, 5] // 原始比例 1102/1225。
};

// ============================================
// ⚙️ 船设置：在此调整。
// 修改船的位置、旋转和尺寸。
// ============================================
export const STATEK_SETTINGS = {
    // 位置：[左右 X、上下 Y、前后 Z]。
    position: [0, 1.6, -15],

    // 旋转：[前后倾斜 X、左右转向 Y、侧倾 Z]。
    rotation: [0, -0.2, 0],

    // 尺寸：[宽度、高度]。
    scale: [3.35, 1.3] // 原始比例 2525/978。
};

// ============================================
// ⚙️ 相机设置：在此调整。
// ============================================
const CAMERA_SETTINGS = {
    // X 旋转：低头角度，单位为弧度。
    // -1.5 为接近垂直向下的 -90°，-1.2 约为 70°。
    lookDownAngle: -1.2,

    // Y 旋转：左右转向。
    // 设为 0 强制居中，设为 null 保留当前方向。
    forceCenterY: -1.05, // 强制居中，让纸张保持正对。

    // Z 旋转：侧倾。
    // 设为 0 使相机摆正。
    forceStraightZ: 0,

    // 动画速度。
    lerpSpeed: 2.5
};

// 体验阶段。
const PHASE = {
    ENTERING: 'entering',      // 相机进入房间，面向菜单。
    LOOKING_DOWN: 'looking_down', // 相机转向码头的动画。
    WRITING: 'writing',        // 用户在纸上写信。
    ROLLING: 'rolling',        // 信纸卷入瓶中。
    HOLDING: 'holding',        // 相机持瓶面向海面。
    THROWING: 'throwing',      // 投出瓶子。
    DONE: 'done'               // 瓶子漂远。
};

const ContactRoom = ({ showRoom, onReady, isExiting, isWarmup }) => {
    const { camera } = useThree();
    const { isTeleporting } = useScene();
    const { showTutorial, unlockAchievement, hidePopup } = useAchievements();
    const { globalVolume, isMuted } = useAudio();
    const effectiveVolume = isMuted ? 0 : AUDIO_SETTINGS.volume * globalVolume;

    const audioRef = useRef();
    useEffect(() => {
        if (audioRef.current && audioRef.current.setVolume) {
            audioRef.current.setVolume(effectiveVolume);
        }
    }, [effectiveVolume]);

    useEffect(() => {
        if (isExiting || isTeleporting) {
            hidePopup();
        }
    }, [isExiting, isTeleporting, hidePopup]);

    // 加载海面纹理。
    const seaTexture = useTexture("/textures/contact/faletopdown.webp");
    // 加载码头纹理。
    const moloTexture = useTexture("/textures/contact/molo.webp");
    // 加载灯塔纹理。
    const latarniaTexture = useTexture("/textures/contact/latarnia.webp");
    // 加载船纹理。
    const statekTexture = useTexture("/textures/contact/statek.webp");


    // 配置纹理按 1:1 比例重复。
    useEffect(() => {
        if (seaTexture) {
            seaTexture.wrapS = seaTexture.wrapT = THREE.MirroredRepeatWrapping;
            seaTexture.repeat.set(6, 4);
            seaTexture.needsUpdate = true;
        }

        if (moloTexture) {
            moloTexture.wrapS = moloTexture.wrapT = THREE.RepeatWrapping;
            moloTexture.center.set(0.5, 0.5);
            moloTexture.rotation = Math.PI / 2;
            moloTexture.repeat.set(1, 1);
            moloTexture.needsUpdate = true;
        }
    }, [seaTexture, moloTexture]);

    useEffect(() => {
        // 挂载时平滑切换为 YXZ 顺序，使点头动作正确，
        // 避免欧拉角计算造成跳变。
        camera.rotation.reorder('YXZ');

        return () => {
            // 卸载时恢复默认 XYZ，避免影响其他房间或走廊。
            camera.rotation.reorder('XYZ');
        };
    }, [camera]);

    // 上色过渡。
    // 联系我房间位于走廊右侧，显现从右侧 +X 向房间内部推进。
    const groupRef = useRef();
    const { onBeforeCompile, animatePaint, resetPaint, uniformsData, updateRoomOrigin } = usePaintMaterial({
        dirX: 1.0,    // 与画廊方向相反，对应右侧门。
        dirY: 0.0,
        dirZ: -0.1,   // 略微倾斜以匹配镜像方向。
        startDist: -5.0,
        endDist: 55.0,
        noiseAxes: 'yz'
    });

    const [isTransitioning, setIsTransitioning] = useState(false);

    const wasTeleportedRef = useRef(false);
    useEffect(() => {
        if (isTeleporting) wasTeleportedRef.current = true;
    }, [isTeleporting]);

    useEffect(() => {
        if (showRoom && !isWarmup) {
            if (wasTeleportedRef.current || isTeleporting) {
                uniformsData.uPaintProgress.value = 1.0;
                setIsTransitioning(false);
            } else {
                setIsTransitioning(true);
                resetPaint();
                animatePaint(0.2, 2.5);
                setTimeout(() => {
                    setIsTransitioning(false);
                }, 2700);
            }
        } else {
            uniformsData.uPaintProgress.value = 1.0;
        }
    }, [showRoom, isWarmup, isTeleporting]);

    // 跟踪是否已发出就绪信号。
    const hasSignaledReady = useRef(false);
    const frameCount = useRef(0);
    const FRAMES_TO_WAIT = 5;

    // 阶段状态。
    const [currentPhase, setCurrentPhase] = useState(PHASE.ENTERING);
    const [showSelection, setShowSelection] = useState(true);

    const hasAnimatedDown = useRef(false);
    // 锁定退出状态，防止闪变。
    const hasExitTriggered = useRef(false);
    if (isExiting && !hasExitTriggered.current) {
        hasExitTriggered.current = true;
        // 此处不切回 XYZ，让 DoorSection 的 GSAP 在 YXZ 下将相机移回门边。
        // 这样可防止视角突然扭转，因为在 YXZ 下
        // 将 X 插值到 0 会自然抬头，而不会扭曲转向。
    }

    // 动画引用。
    const waveRefs = useRef([]);
    const statekRef = useRef(); // 船动画引用。

    // 目标旋转值。
    const targetRotX = useRef(0);
    const targetRotY = useRef(0);
    const targetRotZ = useRef(0);

    // 传送开始时重置相机旋转。
    useEffect(() => {
        if (isTeleporting) {
            hasAnimatedDown.current = false;
            hasExitTriggered.current = false;
            targetRotX.current = 0;
            targetRotY.current = 0;
            targetRotZ.current = 0;
            setCurrentPhase(PHASE.ENTERING);
            setShowSelection(true); // 重置选择菜单。
        }
    }, [isTeleporting]);

    // 此效果只初始化房间，不再触发低头。
    useEffect(() => {
        if (hasSignaledReady.current && !hasAnimatedDown.current && showRoom) {
            // 只确保处于 entering 阶段。
            // 等待用户选择后触发后续过程。
        }

        // 退出动画清理。
        if (!showRoom) {
            hasExitTriggered.current = false;
            if (hasAnimatedDown.current) {
                hasAnimatedDown.current = false;
                setCurrentPhase(PHASE.ENTERING);
                targetRotX.current = 0;
                targetRotZ.current = 0;
                setShowSelection(true);
            }
        }
    }, [hasSignaledReady.current, showRoom, camera]);

    const handleMailSelect = () => {
        // 备用 mailto 跳转。
        window.location.href = 'mailto:tomszma12@gmail.com';

        /* 
        setShowSelection(false);

        // 触发低头过程。
        hasAnimatedDown.current = true;
        hasExitTriggered.current = false;

        // 保存落点旋转，通常为 0,0,0。
        targetRotX.current = camera.rotation.x;
        targetRotY.current = camera.rotation.y;
        targetRotZ.current = camera.rotation.z;

        // 直接开始流程。
        setCurrentPhase(PHASE.LOOKING_DOWN);

        // 1. 设置 X：低头。
        targetRotX.current = CAMERA_SETTINGS.lookDownAngle;

        // 2. 设置 Y：转向。
        if (CAMERA_SETTINGS.forceCenterY !== null) {
            targetRotY.current = CAMERA_SETTINGS.forceCenterY;
        }

        // 3. 设置 Z：侧倾。
        if (CAMERA_SETTINGS.forceStraightZ !== null) {
            targetRotZ.current = CAMERA_SETTINGS.forceStraightZ;
        }

        // 阶段过渡。
        setTimeout(() => {
            setCurrentPhase(PHASE.WRITING);
        }, 1500);
        */
    };

    // 逐帧循环。
    useFrame((state, delta) => {
        // 为上色着色器更新房间原点。
        updateRoomOrigin(groupRef);

        if (!hasSignaledReady.current) {
            frameCount.current++;
            if (frameCount.current >= FRAMES_TO_WAIT) {
                hasSignaledReady.current = true;
                onReady?.();
                if (!isWarmup) setTimeout(() => showTutorial('contact_submit'), 2000);
            }
        }

        // 1. 相机动画，使用简单线性插值。
        if (hasAnimatedDown.current && !isExiting && !hasExitTriggered.current) {
            // 仅在低头过程已开始且未退出时执行动画。
            // 退出时由 DoorSection.jsx 通过 GSAP 完全接管相机。

            // 限制 delta，避免 React 重渲染导致低帧率时大幅跳动。
            const safeDelta = Math.min(delta, 0.033);
            const lerpSpeed = safeDelta * CAMERA_SETTINGS.lerpSpeed;

            // 正常模式：低头。
            camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetRotX.current, lerpSpeed);
            camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetRotY.current, lerpSpeed);
            camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, targetRotZ.current, lerpSpeed);
        }

        // 2. 波浪动画。
        const time = state.clock.getElapsedTime();
        waveRefs.current.forEach((ref, i) => {
            if (ref) {
                const speed = 0.8 + i * 0.15;
                const amplitude = 0.15 - i * 0.02;
                const offset = i * 0.5;
                ref.position.y = Math.sin(time * speed + offset) * amplitude;
            }
        });

        // 2.5 船随波浮动并航行。
        if (statekRef.current) {
            // 🌊 沿 Y 轴上下浮动。
            const bobSpeed = 0.8;
            const bobAmplitude = 0.3;
            statekRef.current.position.y = STATEK_SETTINGS.position[1] + Math.sin(time * bobSpeed) * bobAmplitude;

            // ⛵ 沿 X 轴左右航行。
            const sailSpeed = 0.04; // 显著减慢航行速度，原值为 0.15。
            const sailAmplitude = 12; // 缩小航行区域，防止驶出屏幕，原值为 25。
            statekRef.current.position.x = STATEK_SETTINGS.position[0] + Math.sin(time * sailSpeed) * sailAmplitude;

            // 🔄 添加轻微 Z 轴侧倾。
            const rollAmplitude = 0.05;
            statekRef.current.rotation.z = Math.sin(time * bobSpeed * 1.2) * rollAmplitude;
        }

    });

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1000); // 1000 像素断点，覆盖平板和手机。
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <group ref={groupRef} position={[0, -0.7, -5]}>
            {!isWarmup && (
                <PositionalAudio
                    ref={audioRef}
                    url="/sounds/szummorza.mp3"
                    distanceModel="exponential"
                    refDistance={AUDIO_SETTINGS.distance}
                    rolloffFactor={AUDIO_SETTINGS.rolloff}
                    loop
                    autoplay
                    volume={effectiveVolume}
                />
            )}

            {/* ☁️ 云层。 */}
            <GalleryClouds count={45} seed={88} rotationOffset={[0, 1, 0]} />

            {/* 🌊 海浪图层。 */}
            <group position={[0, -1, -8]}>
                {Array.from({ length: WAVE_LAYERS }).map((_, i) => (
                    <mesh
                        key={i}
                        ref={el => waveRefs.current[i] = el}
                        position={[0, -i * 0.1, -i * 8]}
                        rotation={[-Math.PI / 2.5, 0, 0]}
                    >
                        <planeGeometry args={[80, 30]} />
                        <meshBasicMaterial
                            map={seaTexture}
                            color="#ffffff"
                            transparent={true}
                            opacity={1 - i * 0.1}
                            side={THREE.DoubleSide}
                            toneMapped={false}
                            onBeforeCompile={onBeforeCompile}
                        />
                    </mesh>
                ))}
            </group>

            {/* 🛢️ 漂浮在水中的社交木桶。 */}
            {/* LinkedIn 社交木桶。 */}
            <SocialBarrel
                position={isMobile ? [-1.2, 0.5, -10] : [-3, 0.5, -10]}
                rotation={[0, 0.2, 0]}
                texturePath="/textures/contact/beczka.webp"
                label="LINKEDIN"
                onClick={() => window.open('https://www.linkedin.com/in/tomasz-szmajda-259337305/', '_blank')}
                paintOnBeforeCompile={onBeforeCompile}
                paintUniforms={uniformsData}
            />
            {/* GitHub 社交木桶。 */}
            <SocialBarrel
                position={isMobile ? [-1.5, -0.3, -7] : [-5, -0.3, -8]}
                rotation={[0, 0.3, 0]}
                texturePath="/textures/contact/beczka.webp"
                label="GITHUB"
                onClick={() => window.open('https://github.com/ITomPoland', '_blank')}
                paintOnBeforeCompile={onBeforeCompile}
                paintUniforms={uniformsData}
            />
            {/* Facebook 社交木桶。 */}
            <SocialBarrel
                position={isMobile ? [1.2, 0.5, -10] : [3, 0.5, -10]}
                rotation={[0, -0.2, 0]}
                texturePath="/textures/contact/beczka.webp"
                label="FACEBOOK"
                onClick={() => window.open('https://www.facebook.com/people/ITom/61586563487664/', '_blank')}
                paintOnBeforeCompile={onBeforeCompile}
                paintUniforms={uniformsData}
            />
            {/* Instagram 社交木桶。 */}
            <SocialBarrel
                position={isMobile ? [1.5, -0.3, -7] : [5, -0.3, -8]}
                rotation={[0, -0.3, 0]}
                texturePath="/textures/contact/beczka.webp"
                label="INSTAGRAM"
                onClick={() => window.open('https://www.instagram.com/itom.dev/', '_blank')}
                paintOnBeforeCompile={onBeforeCompile}
                paintUniforms={uniformsData}
            />
            {/* 邮件，触发动画。 */}
            <SocialBarrel
                position={isMobile ? [0, -0.7, -6] : [0, -0.7, -7]}
                rotation={[0, 0, 0]}
                texturePath="/textures/contact/beczka.webp"
                label="写留言"
                onClick={handleMailSelect}
                paintOnBeforeCompile={onBeforeCompile}
                paintUniforms={uniformsData}
            />


            {/* 🏖️ 码头。 */}
            <mesh
                position={[0, 0.05, 1.8]}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <planeGeometry args={[2.5, 7]} />
                <meshBasicMaterial
                    map={moloTexture}
                    color="#e0e0e0"
                    roughness={0.8}
                    side={THREE.DoubleSide}
                    transparent
                    onBeforeCompile={onBeforeCompile}
                />
            </mesh>

            {/* 🗼 灯塔。 */}
            <mesh
                position={LATARNIA_SETTINGS.position}
                rotation={LATARNIA_SETTINGS.rotation}
            >
                <planeGeometry args={LATARNIA_SETTINGS.scale} />
                <meshBasicMaterial color="#e0e0e0"
                    map={latarniaTexture}
                    transparent
                    alphaTest={0.5}
                    side={THREE.DoubleSide}
                    onBeforeCompile={onBeforeCompile}
                />
            </mesh>

            {/* 🚢 船。 */}
            <mesh
                ref={statekRef}
                position={STATEK_SETTINGS.position}
                rotation={STATEK_SETTINGS.rotation}
            >
                <planeGeometry args={STATEK_SETTINGS.scale} />
                <meshBasicMaterial color="#e0e0e0"
                    map={statekTexture}
                    transparent
                    alphaTest={0.5}
                    side={THREE.DoubleSide}
                    onBeforeCompile={onBeforeCompile}
                />
            </mesh>

            {/* 📜 交互信纸。 */}
            {/* 选择前是否显示信纸。
                保留信纸，但仅在完成选择后启用。
            */}
            <group visible={!showSelection}>
                <MessagePaper
                    position={[0, 0.07, 2]}
                    onSend={(data) => {
                        // console.log('📬 联系表单已提交：', data);
                        unlockAchievement('contact_submit');
                    }}
                />
            </group>


        </group>
    );
};

export default ContactRoom;
