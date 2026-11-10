import { useScene, useAudio } from '../../../context/contexts';
import { prefetchRoom, ROOM_LABELS } from '../../../config/roomResources';
import { startLoadingTimeout } from '../../../utils/loadingTimeout';
import { useActiveFrame as useFrame } from '../../../hooks/useActiveFrame';
import Text from '../SiteText';
import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { useTexture, PositionalAudio } from '@react-three/drei';

import * as THREE from 'three';
import gsap from 'gsap';
import RoomInterior from './RoomInterior';
import { useTextureCopy } from '../../../hooks/useTextureCopy';
import '../shaders/RevealMaterial'; // 注册使用透明度丢弃的显现着色器。



import { isTouchDevice } from '../../../utils/deviceDetect';

// 来自 CorridorSegment 的常量。
const WALL_X_OUTER = 3.5;
const WALL_X_INNER = 1.7;
const DOOR_Z_SPAN = 4;
const CORRIDOR_HEIGHT = 3.5;

const DOOR_AUDIO_SETTINGS = {
    hoverVolume: 0.8, // 悬停门时播放的 uchyleniedrzwi 音量。
    openVolume: 0.2,  // 完全开门时播放的 otwarciedrzwi 音量。
    closeVolume: 0.2, // 关门音量，使用相同音效反向或再次播放。
    distance: 3,      // 空间音频开始衰减前的参考距离。
    rolloff: 2,       // 声音随距离指数衰减的速度。
    closeDelay: 0.5   // 关门音效播放前的等待秒数。
};

// 计算锯齿形墙面几何。
const WALL_DX = WALL_X_OUTER - WALL_X_INNER; // 1.8
const WALL_DZ = DOOR_Z_SPAN; // 4
const WALL_LENGTH = Math.sqrt(WALL_DX * WALL_DX + WALL_DZ * WALL_DZ);
const BASE_WALL_ANGLE = Math.atan2(WALL_DX, WALL_DZ); // 锯齿角度约 24°。

// 相机对齐门时的注视角度，可调节以修正对齐。
// Math.PI × 0.33 约为 60°。
const DOOR_LOOK_ANGLE = Math.PI * 0.334;

// 对齐门时相机的 X 偏移，可调节相机相对于门的左右位置。
// 数值越大，水平方向离门中心越远。
const DOOR_ALIGN_X = 1.2;

// 门纹理映射：标签对应纹理文件。
const DOOR_TEXTURES = {
    "作品画廊": 'https://media.secknow-ai.com/space/textures/corridor/doors/drzwiprojekty.png?imageMogr2/thumbnail/512x1024',
    "生活手记": 'https://media.secknow-ai.com/space/textures/corridor/doors/life-notes-ink-v1.png',
    "关于我": 'https://media.secknow-ai.com/space/textures/corridor/doors/drzwiabout.png?imageMogr2/thumbnail/512x1024',
    "联系我": 'https://media.secknow-ai.com/space/textures/corridor/doors/drzwikontakt.png?imageMogr2/thumbnail/512x1024',
};

// 悬停时用笔刷显现的彩色版本。
const DOOR_PAINTED_TEXTURES = {
    "作品画廊": 'https://media.secknow-ai.com/space/textures/corridor/doors/drzwiprojekty_painted.png?imageMogr2/thumbnail/880x1761',
    "生活手记": 'https://media.secknow-ai.com/space/textures/corridor/doors/life-notes-color-v1.png',
    "关于我": 'https://media.secknow-ai.com/space/textures/corridor/doors/drzwiabout_painted.png?imageMogr2/thumbnail/1024x2048',
    "联系我": 'https://media.secknow-ai.com/space/textures/corridor/doors/drzwikontakt_painted.png?imageMogr2/thumbnail/880x1761',
};


/**
 * DoorSection 门区域组件。
 * 
 * 倾斜墙面、门及标签组成一个单元。
 * 与入口门一样，门、门框和把手均使用二维纹理。
 * 以墙面接入走廊的外边缘为旋转轴。
 * 动态倾斜：初始接近平直，相机靠近时倾角增大。
 */
const DoorSection = ({
    position, // [x, y, z]：墙段中心。
    side = 'left',
    label,
    roomId, // 用于更新上下文的 ID，如 gallery、studio。
    onEnter,
    enterDistance = 8, // 默认穿行距离。
    setCameraOverride, // 从相机 Hook 接管控制的函数。
    segmentIndex
}) => {
    const groupRef = useRef(); // 执行倾斜的主组。
    const doorRef = useRef();
    const handleRef = useRef();
    const doorMaterialRef = useRef(); // 门速写的 RevealMaterial 引用。
    const handleMaterialRef = useRef(); // 把手速写的 RevealMaterial 引用。
    const handlePaintedRef = useRef(); // 彩色把手网格的可见状态。
    const doorPaintedRef = useRef(); // 彩色门网格的可见状态。
    const handleHideDelayRef = useRef(); // 跟踪控制把手显隐的待执行 gsap.delayedCall。
    const [isHovered, setIsHovered] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const isNearRef = useRef(false);
    const [isInsideRoom, setIsInsideRoom] = useState(false);
    const [isTiltLocked, setIsTiltLocked] = useState(false); // 进入房间时锁定倾斜。
    const [shouldRenderRoom, setShouldRenderRoom] = useState(false); // 延迟加载状态。
    const { camera } = useThree();
    const loadTimeoutRef = useRef(null);
    const roomReadyRef = useRef(false);

    // 从上下文获取退出请求信号。
    const {
        currentRoom, // 检测全局房间是否因传送而改变。
        exitRequested,
        exitRoom: contextExitRoom,
        enterRoom,
        pendingDoorClick,
        isTeleporting,
        isFastTeleport,
        signalRoomReady,
        reportLoadingError,
        teleportPhase // 用于将重置延迟到幕布关闭后。
    } = useScene();

    const { globalVolume, isMuted } = useAudio();

    // 三维位置音频引用。
    const hoverAudioRef = useRef();
    const openAudioRef = useRef();
    const closeAudioRef = useRef();

    // 将标签映射为 ID，以匹配传送目标。
    const doorId = useMemo(() => {
        if (roomId) return roomId;

        // 兼容旧代码的回退。
        if (label === "作品画廊") return 'gallery';
        if (label === "生活手记") return 'studio';
        if (label === "关于我") return 'about';
        if (label === "联系我") return 'contact';
        return null;
    }, [label, roomId]);

    // 纸幕合拢后卸载旧房间，再由传送逻辑移动相机。
    if (isTeleporting && teleportPhase === 'teleporting' && isInsideRoom && currentRoom === doorId) {
        setIsOpen(false);
        setIsInsideRoom(false);
        setIsAnimating(false);
        setShouldRenderRoom(false);
        setIsTiltLocked(false);
    }

    useEffect(() => {
        if (isTeleporting && teleportPhase === 'teleporting' && currentRoom === doorId) {
            roomReadyRef.current = false;
            if (doorRef.current) doorRef.current.rotation.y = 0;
            if (handleRef.current) handleRef.current.rotation.z = 0;
            loadTimeoutRef.current?.();
        }
    }, [isTeleporting, teleportPhase, currentRoom, doorId]);

    // 保存进入前的相机状态，用于按 Esc 退出。
    // 保存完整的 x、y、z 旋转，防止退出时跳变。
    const savedCameraState = useRef({ x: 0, y: 0, z: 0, rotationX: 0, rotationY: 0, rotationZ: 0 });
    // 保存对齐门后的状态，作为退出中间步骤。
    const doorAlignedState = useRef({ x: 0, y: 0, z: 0, rotationY: 0 });
    // 保存穿过走廊后、最终旋转前的位置。
    const roomEntryState = useRef({ x: 0, y: 0, z: 0, rotationY: 0 });

    // 动态倾斜状态。
    const currentTilt = useRef(0);

    // 加载墙面纹理。
    const originalWallTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/wall_texture.png?imageMogr2/thumbnail/1024x512');

    const wallTexture = useTextureCopy(originalWallTexture, {
        wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
        repeatX: 0.5, repeatY: 0.5, offsetX: 0.5, offsetY: 0.5,
    });

    // 按门标签加载对应纹理。
    const doorTexturePath = DOOR_TEXTURES[label] || DOOR_TEXTURES["作品画廊"];
    const doorTexture = useTexture(doorTexturePath);

    const isTouch = isTouchDevice();
    const dummyTex = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    const doorPaintedTexturePath = DOOR_PAINTED_TEXTURES[label] || DOOR_PAINTED_TEXTURES["作品画廊"];
    const doorPaintedTexture = useTexture(isTouch ? dummyTex : doorPaintedTexturePath);
    const frameTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/doors/ramkasingledoors.png?imageMogr2/thumbnail/512x1024');
    const handleTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/doors/klamkadodrzwi.png?imageMogr2/thumbnail/512x1024');
    const handlePaintedTexture = useTexture(isTouch ? dummyTex : 'https://media.secknow-ai.com/space/textures/corridor/doors/klamkadodrzwi_painted.png?imageMogr2/thumbnail/512x1024');
    const doorBackTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/doors/backsingledoors.png?imageMogr2/thumbnail/512x1024');
    const arrowTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/strzalka.png?imageMogr2/thumbnail/128x64');

    // 门区域的踢脚线纹理：1582×94 像素，比例 16.83:1。
    const baseboardTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/texturadoprogow.png');
    const doorBoardWidth = (WALL_LENGTH - 1.1) / 2;
    const naturalTileWidth = (1582 / 94) * 0.15;
    const doorBbTexLeft = useTextureCopy(baseboardTexture, {
        wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
        colorSpace: THREE.SRGBColorSpace, repeatX: doorBoardWidth / naturalTileWidth,
    });
    const doorBbTexRight = doorBbTexLeft;
    const thresholdTexture = useTextureCopy(baseboardTexture, {
        wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
        colorSpace: THREE.SRGBColorSpace, repeatX: 1.1 / naturalTileWidth,
    });

    // 门尺寸按原始纹理宽高比计算，约为 0.376。
    const doorRatio = label === "生活手记" ? 0.388 : 0.376;
    const doorHeight = 2.5;
    const doorWidth = doorHeight * doorRatio * 1.12;

    // 门框按原始比例 762/1759≈0.433 计算。
    const frameHeight = 2.5;
    const frameWidth = frameHeight * 0.5;

    // 门洞尺寸必须位于墙内。
    const holeWidth = doorWidth - 0.03;
    const holeHeight = doorHeight - 0.1;
    const holeOffsetY = -0.55; // 与门组的 Y 偏移一致。

    // 创建带门洞的墙面几何体。
    const wallWithHoleGeometry = useMemo(() => {
        // 创建墙面形状。
        const wallShape = new THREE.Shape();
        const halfW = WALL_LENGTH / 2;
        const halfH = CORRIDOR_HEIGHT / 2;

        wallShape.moveTo(-halfW, -halfH);
        wallShape.lineTo(halfW, -halfH);
        wallShape.lineTo(halfW, halfH);
        wallShape.lineTo(-halfW, halfH);
        wallShape.lineTo(-halfW, -halfH);

        // 创建门洞。
        const holePath = new THREE.Path();
        const holeHalfW = holeWidth / 2;
        const holeHalfH = holeHeight / 2;
        const holeY = holeOffsetY; // 门洞中心。

        holePath.moveTo(-holeHalfW, holeY - holeHalfH);
        holePath.lineTo(holeHalfW, holeY - holeHalfH);
        holePath.lineTo(holeHalfW, holeY + holeHalfH);
        holePath.lineTo(-holeHalfW, holeY + holeHalfH);
        holePath.lineTo(-holeHalfW, holeY + holeHalfH);
        holePath.lineTo(-holeHalfW, holeY - holeHalfH);

        wallShape.holes.push(holePath);

        return new THREE.ShapeGeometry(wallShape);
    }, [holeWidth, holeHeight, holeOffsetY]);

    useEffect(() => () => wallWithHoleGeometry.dispose(), [wallWithHoleGeometry]);
    useEffect(() => () => handleHideDelayRef.current?.kill(), []);

    // 倾斜参数。
    const BASE_ROTATION = Math.PI / 2; // 90°，侧墙朝向。
    const BASE_TILT = 0.02;   // 额外朝相机倾斜约 1°。
    const MAX_TILT = BASE_WALL_ANGLE + 0.1; // 锯齿角加额外角度，总倾角约 27°。
    const TILT_START = 15;    // 相机距离 15 单位时开始倾斜。
    const TILT_PEAK = 3;      // 距离 3 单位时达到最大倾角。

    // 旋转轴偏移，组围绕外边缘旋转。
    const pivotX = side === 'left' ? -WALL_X_OUTER : WALL_X_OUTER;

    // 墙面相对旋转轴的偏移，由轴向内延伸。
    const wallOffsetX = side === 'left'
        ? WALL_LENGTH / 2
        : -WALL_LENGTH / 2;

    // 强制编译着色器：加载阶段让彩色版本渲染两帧，再隐藏。
    const compileFramesRef = useRef(0);
    useFrame(() => {
        // 着色器编译，仅前两帧。
        if (compileFramesRef.current < 2) {
            compileFramesRef.current++;
            if (compileFramesRef.current === 2) {
                if (!isHovered && !isOpen) {
                    if (doorPaintedRef.current) doorPaintedRef.current.visible = false;
                    if (handlePaintedRef.current) handlePaintedRef.current.visible = false;
                }
            }
        }

        // 倾斜动画。
        if (!groupRef.current) return;

        let targetTilt = BASE_TILT;

        // 点击进入后锁定倾角，强制使用 MAX_TILT，完全朝向用户。
        if (isTiltLocked) {
            targetTilt = MAX_TILT;
        } else {
            // 正常状态下按距离倾斜。
            const distance = Math.abs(camera.position.z - position[2]);
            isNearRef.current = distance < 8;

            if (distance < TILT_START && distance > TILT_PEAK) {
                const t = (TILT_START - distance) / (TILT_START - TILT_PEAK);
                const easedT = t * (2 - t); // 二次缓出。
                targetTilt = BASE_TILT + (MAX_TILT - BASE_TILT) * easedT;
            } else if (distance <= TILT_PEAK) {
                targetTilt = MAX_TILT;
            }
        }

        // 平滑插值。
        currentTilt.current = THREE.MathUtils.lerp(currentTilt.current, targetTilt, 0.06);

        // 应用旋转：BASE_ROTATION（90°）加动态倾角。
        const baseDir = side === 'left' ? 1 : -1;
        const tiltDir = side === 'left' ? -1 : 1;

        // 计算实际旋转角。
        const currentRotation = (BASE_ROTATION * baseDir) + (currentTilt.current * tiltDir);
        groupRef.current.rotation.y = currentRotation;

        // 三角函数缩放修正：
        // 墙面沿 Z 轴的投影始终保持 DOOR_Z_SPAN，即 4.0 米。
        // 公式：缩放 = DOOR_Z_SPAN / (WALL_LENGTH × sin(角度))。

        const absSinAngle = Math.abs(Math.sin(currentRotation));

        // 防止除零，角度被限制在约 60° 至 90°。
        let exactScale = 1.0;
        if (absSinAngle > 0.1) {
            // 留出 -0.01 的边距，避免边缘深度冲突。
            exactScale = (DOOR_Z_SPAN - 0.01) / (WALL_LENGTH * absSinAngle);
        }

        // 限制缩放范围，避免计算异常导致尺寸失控，同时允许轻微形变。
        const currentScale = THREE.MathUtils.clamp(exactScale, 0.8, 1.1);

        groupRef.current.scale.set(currentScale, 1, 1);
    });

    useEffect(() => {
        return () => {
            loadTimeoutRef.current?.();
        };
    }, []);

    const closeDoor = useCallback((onDoorClosed) => {
        if (!doorRef.current || !isOpen) return;
        loadTimeoutRef.current?.();

        setIsAnimating(true);

        if (closeAudioRef.current) {
            setTimeout(() => {
                const vol = isMuted ? 0 : DOOR_AUDIO_SETTINGS.closeVolume * globalVolume;
                if (closeAudioRef.current) {
                    closeAudioRef.current.setVolume(vol);
                    if (closeAudioRef.current.isPlaying) closeAudioRef.current.stop();
                    closeAudioRef.current.play();
                }
            }, DOOR_AUDIO_SETTINGS.closeDelay * 1000);
        }

        // 重置把手。
        if (handleRef.current) {
            gsap.to(handleRef.current.rotation, {
                z: 0,
                duration: 0.2,
                ease: 'power2.out'
            });
        }

        // 反向执行笔刷显现，去除门上的彩色层。
        if (doorMaterialRef.current) {
            gsap.to(doorMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.6,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (handleMaterialRef.current) {
            gsap.to(handleMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.6,
                ease: 'power2.out',
                overwrite: true
            });
        }
        // 动画完成后隐藏彩色层。
        if (handleHideDelayRef.current) handleHideDelayRef.current.kill();
        handleHideDelayRef.current = gsap.delayedCall(0.65, () => {
            if (handlePaintedRef.current) handlePaintedRef.current.visible = false;
            if (doorPaintedRef.current) doorPaintedRef.current.visible = false;
        });

        gsap.to(doorRef.current.rotation, {
            y: 0,
            duration: 0.6,
            ease: 'power2.in',
            onComplete: () => {
                setIsOpen(false);
                setIsAnimating(false);
                // 调用可选的完成回调。
                onDoorClosed?.();
            }
        });
    }, [isOpen, isMuted, globalVolume]);

    const handleClick = useCallback((e) => {
        // e 可能为 null，也可能是传送生成的事件。
        e?.stopPropagation?.();
        const isTeleport = e?.isTeleport || false;
        if (isAnimating) return;

        if (isOpen) {
            closeDoor();
            return;
        }

        void prefetchRoom(ROOM_LABELS[label]).catch(() => {});

        // 过渡时重置光标。
        document.body.style.cursor = "auto";

        setIsAnimating(true);

        // 从 Hook 接管相机控制。
        setCameraOverride?.(true);

        // 锁定倾斜，避免穿行时走廊旋转。
        setIsTiltLocked(true);

        // 保存进入前的相机状态，用于按 Esc 退出。
        savedCameraState.current = {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
            rotationX: camera.rotation.x,
            rotationY: camera.rotation.y,
            rotationZ: camera.rotation.z
        };

        // 传送进入时，将保存状态替换为安全的走廊位置。
        // 避免退出时跳回原房间位置。
        if (e && e.isTeleport) {
            // 使用自然的走廊注视角，约 8.5°，而非对齐门时的 60°。
            // 形成可见的转头过程：从看门的 60° 转为轻看走廊的 8.5°。
            // 角度较小，因为终点位于门后方 4 米，而非紧贴门边。
            const corridorGlanceY = side === 'left' ? 0.15 : -0.15;

            savedCameraState.current = {
                x: 0,
                y: 0.2, // 高度与 useInfiniteCamera 一致。
                z: position[2] + 4, // 位于门的 Z 坐标后方 4 米。
                rotationX: 0,
                rotationY: corridorGlanceY, // 自然地看向走廊。
                rotationZ: 0
            };
        }

        // 快速传送使用几乎瞬时的动画时长。
        // 纸幕已关闭，用户看不到快速移动。
        const useFastMode = isTeleport && isFastTeleport;
        const alignDuration = useFastMode ? 0.01 : 1.0;

        // 获取门的世界坐标。
        const doorWorldPos = new THREE.Vector3();
        groupRef.current.getWorldPosition(doorWorldPos);

        // 相机移至与门相同的 Z，使注视时门位于中心，
        // 并略微移向门所在侧。
        const cameraTargetZ = doorWorldPos.z;
        const cameraTargetX = side === 'left' ? DOOR_ALIGN_X : -DOOR_ALIGN_X;

        // 计算看向门的目标旋转。
        // 考虑父级的摇摆旋转，获得一致的世界角度。
        // 当前父级摇摆 + 相机局部旋转 = 世界旋转。
        // 世界旋转目标 = DOOR_LOOK_ANGLE。
        // 相机目标 = 世界目标 - 父级旋转。

        let parentRotationY = 0;
        if (camera.parent) {
            // 获取父级世界 Y 旋转，假定摇摆主要绕 Y 轴。
            const parentWorldQuat = new THREE.Quaternion();
            camera.parent.getWorldQuaternion(parentWorldQuat);
            const parentEuler = new THREE.Euler().setFromQuaternion(parentWorldQuat, 'YXZ');
            parentRotationY = parentEuler.y;
        }

        const worldTargetRotationY = side === 'left'
            ? DOOR_LOOK_ANGLE   // 目标世界角度。
            : -DOOR_LOOK_ANGLE; // 目标世界角度。

        // 补偿父级摇摆，使局部旋转保持一致。
        const targetRotationY = worldTargetRotationY - parentRotationY;

        // 保存初始旋转。
        const startRotationY = camera.rotation.y;

        // 创建旋转动画的代理对象。
        const rotationProxy = { y: startRotationY };

        // 同时动画更新相机位置与旋转。
        gsap.to(camera.position, {
            x: cameraTargetX,
            z: cameraTargetZ,
            duration: alignDuration,
            ease: useFastMode ? 'none' : 'power2.inOut'
        });

        gsap.to(rotationProxy, {
            y: targetRotationY,
            duration: alignDuration,
            ease: useFastMode ? 'none' : 'power2.inOut',
            onUpdate: () => {
                camera.rotation.set(camera.rotation.x, rotationProxy.y, camera.rotation.z);
            },
            onComplete: () => {
                // 保存对齐状态，用于反向动画。
                doorAlignedState.current = {
                    x: camera.position.x,
                    y: camera.position.y,
                    z: camera.position.z,
                    rotationY: camera.rotation.y
                };

                // 延迟加载房间：
                // 1. 相机已对齐。
                // 2. 开始渲染房间。
                // 3. 房间通过 onReady 通知资源与场景就绪后开门。
                setShouldRenderRoom(true);

                // 快速传送时也需要等待房间就绪。
                // 不再立即开门，改由 onReady 回调处理。
                // 仍设置模式标记，让 handleRoomReady 使用快速动画。

                // 网络过慢或资源失败时保留遮挡，提供明确的恢复入口。
                loadTimeoutRef.current?.();
                loadTimeoutRef.current = startLoadingTimeout(() => {
                    if (!roomReadyRef.current) reportLoadingError();
                });
            }
        });
    }, [camera, side, isOpen, isAnimating, setCameraOverride, isFastTeleport, closeDoor, label, position, reportLoadingError]);

    // 监听待处理的门点击，传送后自动点击。
    useEffect(() => {
        // 仅触发最靠近起点的第 0 段中 ID 匹配的门。
        // 假定传送始终前往第 0 段。
        const isSegment0 = segmentIndex === 0;

        if (pendingDoorClick && pendingDoorClick === doorId && isSegment0 && !isOpen && !isAnimating) {
            // 等纸幕与相机位置提交到当前帧后，再启动入门动画。
            const frame = requestAnimationFrame(() => handleClick({ stopPropagation() {}, isTeleport: true }));
            return () => cancelAnimationFrame(frame);
        }
    }, [pendingDoorClick, doorId, segmentIndex, isOpen, isAnimating, handleClick]);

    const openDoor = useCallback((fastMode = false) => {
        if (!doorRef.current) return;

        setIsOpen(true);
        const openAngle = side === 'left' ? Math.PI * 0.6 : -Math.PI * 0.6;

        if (!fastMode && openAudioRef.current) {
            const vol = isMuted ? 0 : DOOR_AUDIO_SETTINGS.openVolume * globalVolume;
            openAudioRef.current.setVolume(vol);
            if (openAudioRef.current.isPlaying) openAudioRef.current.stop();
            openAudioRef.current.play();
        }

        // 快速模式：传送进入采用极短时长。
        const handleDuration = fastMode ? 0.01 : 0.15;
        const doorDuration = fastMode ? 0.01 : 0.7;
        const flyDuration = fastMode ? 0.01 : 1.5;

        // 先向下转动把手。
        if (handleRef.current) {
            gsap.to(handleRef.current.rotation, {
                z: side === 'left' ? 0.4 : -0.4,
                duration: handleDuration,
                ease: fastMode ? 'none' : 'power2.out'
            });
        }

        gsap.to(doorRef.current.rotation, {
            y: openAngle,
            duration: doorDuration,
            ease: fastMode ? 'none' : 'power2.out',
            onComplete: () => {
                // 门已打开，将相机移入房间。
                // 获取动画开始时的相机朝向。
                const direction = new THREE.Vector3();
                camera.getWorldDirection(direction);

                const flyDistance = enterDistance; // 穿过短前厅（3 单位）进入房间。

                // 动画前先计算目标位置，保证飞行路径为直线。
                const targetX = camera.position.x + direction.x * flyDistance;
                const targetZ = camera.position.z + direction.z * flyDistance;

                // 步骤 1：沿直线向前移动相机。
                gsap.to(camera.position, {
                    x: targetX,
                    z: targetZ,
                    duration: flyDuration,
                    ease: fastMode ? 'none' : 'power2.inOut',
                    onComplete: () => {
                        // 保存飞行后的位置。
                        roomEntryState.current = {
                            x: camera.position.x,
                            y: camera.position.y,
                            z: camera.position.z,
                            rotationY: camera.rotation.y
                        };

                        // 无需旋转，此时已垂直看向走廊侧面。
                        // 标记为已进入。
                        setIsAnimating(false);
                        setIsInsideRoom(true);

                        // 将上下文更新延迟 250 毫秒，
                        // 避免 GSAP 动画最后几帧卡顿。
                        setTimeout(() => {
                            enterRoom(doorId); // 使用 ID（gallery），而非标签（作品画廊）。
                            onEnter?.();

                            // 快速传送：发出房间就绪信号，以打开纸幕。
                            if (fastMode) {
                                signalRoomReady();
                            }
                        }, 250);
                    }
                });
            }
        });
    }, [side, onEnter, camera, enterRoom, doorId, signalRoomReady, enterDistance, globalVolume, isMuted]);

    // 处理房间就绪回调，加载完成后开门。
    // 使用 ref 防止重复调用，因为状态更新可能不够及时。

    const handleRoomReady = useCallback(() => {
        // 确保 openDoor 只调用一次。
        if (roomReadyRef.current) return;

        // 就绪后清除回退定时器。
        loadTimeoutRef.current?.();

        roomReadyRef.current = true;
        performance.mark(`app:room-ready:${ROOM_LABELS[label]}`);

        // 按当前上下文状态决定是否快速开门。
        openDoor(isFastTeleport);
    }, [openDoor, isFastTeleport, label]);

    // 退出房间：像倒放视频一样反向执行动画。
    const exitRoom = useCallback(() => {
        if (!isInsideRoom || isAnimating) return;

        setIsAnimating(true);

        const saved = savedCameraState.current;
        const aligned = doorAlignedState.current;

        // 保存当前旋转，作为退出起点。
        // 从关于我飞行场景返回时，也保存倾斜状态。
        const startRotation = {
            x: camera.rotation.x,
            y: camera.rotation.y,
            z: camera.rotation.z
        };

        // 反向步骤 1：沿走廊后退至门前的对齐位置，
        // 同时平滑恢复水平视角。

        // 步骤 1 的旋转代理。
        const step1RotationProxy = { ...startRotation };

        // 步骤 1 的目标位置为门前对齐点。
        // 俯仰和侧倾归零，Y 轴朝向门，约等于 aligned.rotationY。
        // 假定 aligned.rotationY 为正确的门朝向。

        gsap.to(camera.position, {
            x: aligned.x,
            y: aligned.y,
            z: aligned.z,
            duration: 1.5,
            ease: 'power2.inOut'
        });

        // 同步旋转以恢复水平。
        gsap.to(step1RotationProxy, {
            x: 0, // 俯仰归零。
            y: aligned.rotationY, // 朝向门。
            z: 0, // 侧倾归零。
            duration: 1.5,
            ease: 'power2.inOut',
            onUpdate: () => {
                camera.rotation.set(step1RotationProxy.x, step1RotationProxy.y, step1RotationProxy.z);
            },
            onComplete: () => {
                // 反向步骤 2：返回原中心位置，并恢复原视角。
                // 这是对齐门动画的反向过程。

                // 2a. 位置。
                gsap.to(camera.position, {
                    x: saved.x,
                    y: saved.y,
                    z: saved.z,
                    duration: 1.0,
                    ease: 'power2.inOut'
                });

                // 2b. 旋转。
                // 所有轴都动画恢复至保存状态。
                const step2RotationProxy = {
                    x: camera.rotation.x,
                    y: camera.rotation.y,
                    z: camera.rotation.z
                };

                gsap.to(step2RotationProxy, {
                    x: saved.rotationX,
                    y: saved.rotationY,
                    z: saved.rotationZ,
                    duration: 1.0,
                    ease: 'power2.inOut',
                    onUpdate: () => {
                        camera.rotation.set(step2RotationProxy.x, step2RotationProxy.y, step2RotationProxy.z);
                    },
                    onComplete: () => {
                        // 精确恢复完整旋转。
                        camera.rotation.set(saved.rotationX, saved.rotationY, saved.rotationZ);

                        // 跨帧分散状态更新，避免卡顿。
                        // 第 1 帧：动画结束，但仍保持房间内状态，避免重新激活房间。
                        // 保持 isInsideRoom=true 和 isAnimating=true，或等效的退出状态，
                        // 让 AboutRoom 在卸载前始终保持 isExiting=true。

                        requestAnimationFrame(() => {
                            // 第 2 帧：先关门。
                            // 房间逻辑仍保持退出状态。

                            // 关门后再隐藏房间并重置状态。
                            closeDoor(() => {
                                // 门已关闭，此时才正式标记为门外。
                                setIsInsideRoom(false);
                                setIsAnimating(false);
                                setIsTiltLocked(false);

                                roomReadyRef.current = false;

                                setShouldRenderRoom(false);
                                contextExitRoom();
                                setCameraOverride?.(false);
                            });
                        });
                    }
                });
            }
        });
    }, [isInsideRoom, isAnimating, camera, setCameraOverride, contextExitRoom, closeDoor]);

    // 监听 Esc 键退出房间。
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isInsideRoom && !isAnimating) {
                exitRoom();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isInsideRoom, isAnimating, exitRoom]);

    // 监听界面返回按钮发出的退出请求。
    useEffect(() => {
        if (exitRequested && isInsideRoom && !isAnimating) {
            // 此处有意不调用 clearExitRequest()，
            // 因为它会立刻触发全局 React 上下文更新，
            // 干扰即将开始的每秒 60 帧 GSAP 动画。
            // setExitRequested(false) 由 contextExitRoom()
            // 在动画末尾安全处理。
            const frame = requestAnimationFrame(exitRoom);
            return () => cancelAnimationFrame(frame);
        }
    }, [exitRequested, isInsideRoom, isAnimating, exitRoom]);

    // 处理悬停效果。
    const handlePointerEnter = () => {
        void prefetchRoom(ROOM_LABELS[label]).catch(() => {});
        if (isOpen || isAnimating) return;
        setIsHovered(true);
        document.body.style.cursor = "pointer";

        if (hoverAudioRef.current && !isHovered) {
            const vol = isMuted ? 0 : DOOR_AUDIO_SETTINGS.hoverVolume * globalVolume;
            hoverAudioRef.current.setVolume(vol);
            
            // 仅在 AudioContext 已运行时播放，避免控制台警告。
            // 浏览器通常需点击后才允许音频，悬停不一定足够。
            if (hoverAudioRef.current.isPlaying) hoverAudioRef.current.stop();
            if (hoverAudioRef.current.context.state === 'running') {
                hoverAudioRef.current.play();
            }
        }

        // 悬停时稍微开门。
        if (doorRef.current) {
            gsap.to(doorRef.current.rotation, {
                y: side === 'left' ? 0.15 : -0.15,
                duration: 0.3,
                ease: 'power2.out'
            });
        }

        // 悬停时略微转动把手。
        if (handleRef.current) {
            gsap.to(handleRef.current.rotation, {
                z: side === 'left' ? 0.1 : -0.1,
                duration: 0.2,
                ease: 'power2.out'
            });
        }

        // 笔刷显现：丢弃速写像素，露出下方彩色门。
        if (doorMaterialRef.current) {
            gsap.to(doorMaterialRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (handleMaterialRef.current) {
            gsap.to(handleMaterialRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        }
        // 显示彩色层，并取消上次移出事件留下的隐藏任务。
        if (handleHideDelayRef.current) handleHideDelayRef.current.kill();
        if (handlePaintedRef.current) handlePaintedRef.current.visible = true;
        if (doorPaintedRef.current) doorPaintedRef.current.visible = true;
    };

    const handlePointerLeave = () => {
        if (isOpen || isAnimating) return;
        setIsHovered(false);
        document.body.style.cursor = "auto";

        if (hoverAudioRef.current && hoverAudioRef.current.isPlaying) {
            hoverAudioRef.current.stop();
        }

        // 关门。
        if (doorRef.current) {
            gsap.to(doorRef.current.rotation, {
                y: 0,
                duration: 0.3,
                ease: 'power2.out'
            });
        }

        // 重置把手。
        if (handleRef.current) {
            gsap.to(handleRef.current.rotation, {
                z: 0,
                duration: 0.2,
                ease: 'power2.out'
            });
        }

        // 反向执行笔刷显现。
        if (doorMaterialRef.current) {
            gsap.to(doorMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (handleMaterialRef.current) {
            gsap.to(handleMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }

        // 反向动画结束后隐藏彩色层。
        handleHideDelayRef.current = gsap.delayedCall(0.55, () => {
            if (handlePaintedRef.current) handlePaintedRef.current.visible = false;
            if (doorPaintedRef.current) doorPaintedRef.current.visible = false;
        });
    };

    // 门的旋转轴位于侧边铰链处。
    const doorPivotX = side === 'left' ? -doorWidth / 2 : doorWidth / 2;
    const doorMeshX = side === 'left' ? doorWidth / 2 : -doorWidth / 2;

    // 把手位置按纹理确定，左侧门的把手在右边。

    // 标牌纹理映射，现统一使用空白标牌纹理。
    const signTextureUrl = 'https://media.secknow-ai.com/space/textures/corridor/pustatabliczka.png?imageMogr2/thumbnail/2048x1024';
    const signTexture = useTexture(signTextureUrl);

    return (
        // 外组位于墙外边缘的旋转轴处。
        <group position={[pivotX, position[1], position[2]]}>
            {/* 可旋转内组，包含墙面与门。 */}
            <group ref={groupRef}>
                {/* 带门洞的墙段。 */}
                <mesh position={[wallOffsetX, 0, 0]} geometry={wallWithHoleGeometry}>
                    <meshBasicMaterial color="#e0e0e0" map={wallTexture} roughness={1} metalness={0} side={THREE.DoubleSide} />
                </mesh>

                {/* 箭头装饰。 */}
                {/* 指向门的左侧箭头。 */}
                {/* ===================================================
                    左箭头调节：
                    position={[wallOffsetX - 0.9, 0, 0.02]}
                      - wallOffsetX - 0.9：距门中心的距离，增大 0.9 会远离门。
                      - Y=0：高度；0 为墙面中间，正值上移，负值下移。
                    scale={[0.5, 0.5, 1]}：箭头尺寸。
                    =================================================== */}
                <mesh
                    position={[wallOffsetX - 1.1, 0, 0.02]}
                    rotation={[0, 0, 0]}
                    scale={[0.5, 0.5, 1]}
                >
                    <planeGeometry args={[1, 0.5]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={arrowTexture}
                        transparent={true}
                        alphaTest={0.1}
                        side={THREE.DoubleSide}
                        roughness={0.8}
                    />
                </mesh>

                {/* 右侧镜像箭头装饰。 */}
                {/* ===================================================
                    右箭头调节：
                    position={[wallOffsetX + 0.9, -0.3, 0.02]}
                      - wallOffsetX + 0.9：距门中心的距离，位于右侧。
                      - Y=-0.3：略低于左箭头。
                    scale={[-0.5, 0.5, 1]}：X 为负值时镜像。
                    =================================================== */}
                <mesh
                    position={[wallOffsetX + 1.1, -0.3, 0.02]}
                    rotation={[0, 0, 0]}
                    scale={[-0.5, 0.5, 1]}
                >
                    <planeGeometry args={[1, 0.5]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={arrowTexture}
                        transparent={true}
                        alphaTest={0.1}
                        side={THREE.DoubleSide}
                        roughness={0.8}
                    />
                </mesh>

                {/* 门左侧踢脚线。 */}
                <mesh position={[wallOffsetX - 1.4, -CORRIDOR_HEIGHT / 2 + 0.075, 0.02]}>
                    <planeGeometry args={[doorBoardWidth, 0.15]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={doorBbTexLeft}
                        roughness={0.8}
                        side={THREE.DoubleSide}
                    />
                </mesh>

                {/* 门右侧踢脚线。 */}
                <mesh position={[wallOffsetX + 1.4, -CORRIDOR_HEIGHT / 2 + 0.075, 0.02]}>
                    <planeGeometry args={[doorBoardWidth, 0.15]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={doorBbTexRight}
                        roughness={0.8}
                        side={THREE.DoubleSide}
                    />
                </mesh>

                {/* 侧门门槛条。 */}
                {(() => {
                    // 门槛铺在地面上，与侧墙垂直。
                    // 门槛宽度等于门洞宽度，约 1.1。
                    const THRESH_W = 1.1;   // 宽度沿局部 X 轴，即沿墙面方向。
                    const THRESH_D = 0.15;  // 深度沿局部 Z 轴，即伸入走廊方向。
                    return (
                        <mesh
                            position={[wallOffsetX, -CORRIDOR_HEIGHT / 2 + 0.005, 0.02]}
                            rotation={[-Math.PI / 2, 0, 0]}
                        >
                            <planeGeometry args={[THRESH_W, THRESH_D]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={thresholdTexture}
                                roughness={0.9}
                                metalness={0}
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                    );
                })()}

                {/* 门与门框在墙上居中。 */}
                <group position={[wallOffsetX, -0.4, 0]}>
                    {/* 带纹理的标牌。 */}
                    <group position={[0, doorHeight / 2 + 0.45, 0.08]}>
                        {/* 
                            标牌尺寸：
                            修改 args={[宽度, 高度]} 中的数值。
                            当前宽 1.3、高 0.65。
                        */}
                        <mesh>
                            {/* 按矩形宽高比调整标牌尺寸。 */}
                            <planeGeometry args={[1.3, 0.65]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={signTexture}
                                transparent={true}
                                alphaTest={0.1}
                                roughness={0.8}
                            />
                        </mesh>

                        {/* 标牌动态文字。 */}
                        {label === "作品画廊" && (
                            <group position={[0, 0, 0.01]}>
                                <Text
                                    font="/fonts/LXGWWenKaiLite-site.woff"
                                    fontSize={0.25}
                                    color="#111111"
                                    anchorX="center"
                                    anchorY="bottom"
                                    position={[0, -0.02, 0]}
                                >
                                    我的
                                </Text>
                                <Text
                                    font="/fonts/LXGWWenKaiLite-site.woff"
                                    fontSize={0.25}
                                    color="#111111"
                                    anchorX="center"
                                    anchorY="top"
                                    position={[0, +0.02, 0]}
                                >
                                    画廊
                                </Text>
                            </group>
                        )}
                        {label === "生活手记" && (
                            <group position={[0, 0, 0.01]}>
                                <Text
                                    font="/fonts/LXGWWenKaiLite-site.woff"
                                    fontSize={0.25}
                                    color="#111111"
                                    anchorX="center"
                                    anchorY="bottom"
                                    position={[0, -0.02, 0]}
                                >
                                    生活
                                </Text>
                                <Text
                                    font="/fonts/LXGWWenKaiLite-site.woff"
                                    fontSize={0.25}
                                    color="#111111"
                                    anchorX="center"
                                    anchorY="top"
                                    position={[0, +0.03, 0]}
                                >
                                    手记
                                </Text>
                            </group>
                        )}
                        {label === "关于我" && (
                            <Text
                                font="/fonts/LXGWWenKaiLite-site.woff"
                                fontSize={0.30}
                                color="#111111"
                                anchorX="center"
                                anchorY="middle"
                                position={[0, 0, 0.01]}
                            >
                                关于我
                            </Text>
                        )}
                        {label === "联系我" && (
                            <Text
                                font="/fonts/LXGWWenKaiLite-site.woff"
                                fontSize={0.25}
                                color="#111111"
                                anchorX="center"
                                anchorY="middle"
                                position={[0, 0, 0.01]}
                            >
                                联系我
                            </Text>
                        )}
                    </group>

                    {/* 带纹理的门框。 */}
                    {/* 移至 Z=0.04，位于踢脚线 Z=0.02 前方，遮住门洞边缘。 */}
                    <mesh position={[0, -0.1, 0.04]} scale={[side === 'right' ? -1 : 1, 1, 1]}>
                        <planeGeometry args={[frameWidth, frameHeight]} />
                        <meshBasicMaterial color="#e0e0e0"
                            map={frameTexture}
                            transparent={true}
                            alphaTest={0.1}
                            roughness={0.9}
                        />
                    </mesh>

                    {/* 门内走廊与房间。 */}
                    {/* 始终渲染走廊，通过 showRoom 延迟加载大房间。 */}
                    <RoomInterior
                        label={label}
                        showRoom={shouldRenderRoom}
                        onReady={handleRoomReady}
                        isExiting={isInsideRoom && isAnimating}
                    />

                    {/* 可绕轴开合的门板。 */}
                    {/* 旋转轴 Z=0.01，略靠门框后方，可位于墙前或与墙齐平。 */}
                    <group ref={doorRef} position={[doorPivotX, 0, 0.01]}>
                        {/* 不可见的点击区域，用于接收指针事件。 */}
                        <mesh
                            position={[doorMeshX, -0.2, 0.005]}
                            onClick={handleClick}
                            onPointerEnter={handlePointerEnter}
                            onPointerLeave={handlePointerLeave}
                        >
                            <planeGeometry args={[doorWidth, doorHeight]} />
                            <meshBasicMaterial color="#e0e0e0" transparent={true} opacity={0} depthWrite={false} />
                        </mesh>

                        {/* 彩色底层在两帧后隐藏，用于预编译着色器。 */}
                        <mesh
                            ref={doorPaintedRef}
                            position={[doorMeshX, -0.2, -0.001]}
                            scale={[(side === 'right' && label !== "生活手记") ? -1 : 1, 1, 1]}
                        >
                            <planeGeometry args={[doorWidth, doorHeight]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={doorPaintedTexture}
                                transparent={true}
                                alphaTest={0.5}
                                roughness={0.8}
                            />
                        </mesh>

                        {/* 前方速写叠加层通过笔刷丢弃露出底层彩色图。 */}
                        <mesh
                            position={[doorMeshX, -0.2, 0]}
                            scale={[(side === 'right' && label !== "生活手记") ? -1 : 1, 1, 1]}
                        >
                            <planeGeometry args={[doorWidth, doorHeight]} />
                            <revealMaterial color="#e0e0e0"
                                ref={doorMaterialRef}
                                map={doorTexture}
                                transparent={true}
                                alphaTest={0.1}
                                roughness={0.8}
                                uProgress={0.0}
                            />
                        </mesh>

                        {/* 门背面纹理。 */}
                        <mesh
                            position={[doorMeshX, -0.2, -0.01]}
                            rotation={[0, Math.PI, 0]}
                            scale={[side === 'right' ? -1 : 1, 1, 1]}
                        >
                            <planeGeometry args={[doorWidth, doorHeight]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={doorBackTexture}
                                transparent={true}
                                alphaTest={0.1}
                                roughness={0.8}
                                side={THREE.DoubleSide}
                            />
                        </mesh>

                        {/* 把手层以螺丝位置为旋转轴。 */}
                        <group ref={handleRef} position={[doorMeshX + (side === 'left' ? 0.45 : -0.45), -0.29, 0.03]}>
                            {/* 后方彩色把手，两帧后隐藏。 */}
                            <mesh ref={handlePaintedRef} position={[side === 'left' ? -0.50 : 0.50, 0.14, -0.001]} scale={[side === 'right' ? -1 : 1, 1, 1]}>
                                <planeGeometry args={[doorWidth, doorHeight]} />
                                <meshBasicMaterial color="#e0e0e0"
                                    map={handlePaintedTexture}
                                    transparent={true}
                                    alphaTest={0.5}
                                    depthWrite={false}
                                />
                            </mesh>
                            {/* 前方速写把手叠加层。 */}
                            <mesh position={[side === 'left' ? -0.50 : 0.50, 0.14, 0]} scale={[side === 'right' ? -1 : 1, 1, 1]}>
                                <planeGeometry args={[doorWidth, doorHeight]} />
                                <revealMaterial color="#e0e0e0"
                                    ref={handleMaterialRef}
                                    map={handleTexture}
                                    transparent={true}
                                    alphaTest={0.1}
                                    depthWrite={false}
                                    uProgress={0.0}
                                />
                            </mesh>
                        </group>
                    </group>
                </group>

                {/* 空间音频节点，位于门前少许。 */}
                <PositionalAudio
                    ref={hoverAudioRef}
                    url="/sounds/uchyleniedrzwi.mp3"
                    distanceModel="exponential"
                    rolloffFactor={DOOR_AUDIO_SETTINGS.rolloff}
                    refDistance={DOOR_AUDIO_SETTINGS.distance}
                    loop={false}
                />
                <PositionalAudio
                    ref={openAudioRef}
                    url="/sounds/otwarciedrzwi.mp3"
                    distanceModel="exponential"
                    rolloffFactor={DOOR_AUDIO_SETTINGS.rolloff}
                    refDistance={DOOR_AUDIO_SETTINGS.distance}
                    loop={false}
                />
                <PositionalAudio
                    ref={closeAudioRef}
                    url="/sounds/zamknieciedrzwi.mp3"
                    distanceModel="exponential"
                    rolloffFactor={DOOR_AUDIO_SETTINGS.rolloff}
                    refDistance={DOOR_AUDIO_SETTINGS.distance}
                    loop={false}
                />
            </group>
        </group >
    );
};

export default DoorSection;
