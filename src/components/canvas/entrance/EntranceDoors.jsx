import { useTexture } from '../../../hooks/useMediaTexture';
import { useAchievements } from '../../../context/contexts';
import Text from '../SiteText';
import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';


import * as THREE from 'three';
import gsap from 'gsap';
import '../shaders/RevealMaterial'; // 注册使用透明度丢弃的显现着色器。
import { playBackgroundMusic } from '../../../utils/audioManager';

import { isTouchDevice } from '../../../utils/deviceDetect';

// 使用本地中文字体。
const FONT_URL = '/media/fonts/LXGWWenKaiLite-site.woff';



/**
 * EntranceDoors：走廊的三维入口组件。
 * 
 * 门打开后，相机穿过入口。
 * EmptyCorridor 提供周围的走廊环境。
 */
const EntranceDoors = ({
    position = [0, 0, 22],
    onPrepare,
    onComplete,
    corridorHeight = 8, // 较高的墙面。
    corridorWidth = 15 // 较宽的墙面。
}) => {
    const leftDoorRef = useRef();
    const rightDoorRef = useRef();
    const leftHandleRef = useRef();
    const rightHandleRef = useRef();
    const rightDoorMaterialRef = useRef(); // GSAP 着色器控制。
    const leftDoorMaterialRef = useRef(); // 左门显现控制。
    const leftHandleMaterialRef = useRef(); // 左把手显现控制。
    const rightHandleMaterialRef = useRef(); // 右把手显现控制。
    const leftHandlePaintedRef = useRef(); // 彩色把手网格的可见状态。
    const rightHandlePaintedRef = useRef(); // 彩色把手网格的可见状态。
    const groupRef = useRef();
    const [isOpen, setIsOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const windowAvatarRef = useRef();
    const { camera } = useThree();
    const { unlockAchievement } = useAchievements();

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(isTouchDevice() || window.innerWidth < 1000);
    }, []);

    // 纹理 Hook 所需值在初始化时只计算一次。
    const isMobileDevice = typeof window !== 'undefined' && (isTouchDevice() || window.innerWidth < 1000);
    const dummyTex = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    const {
        frameTexture, doorLeftTexture, doorRightTexture, doorRightPaintedTexture, doorLeftPaintedTexture,
        handleLeftTexture, handleLeftPaintedTexture, handleRightTexture, handleRightPaintedTexture,
        doorBackTexture, edgeTexture, bricksTexture, stonePathTexture, catFrontBodyTexture,
        windowSketchTexture, avatarWindowTexture, treeTexture, mouseTexture, potTexture,
        bugTexture, inkSplashTexture, speechBubbleTexture,
    } = useTexture({
        frameTexture: 'https://media.secknow-ai.com/space/textures/doors/frame_sketch.png',
        doorLeftTexture: 'https://media.secknow-ai.com/space/textures/doors/twiink-entry-left-ink-v1.png?imageMogr2/thumbnail/512x1308',
        doorRightTexture: 'https://media.secknow-ai.com/space/textures/doors/twiink-entry-right-ink-v1.png?imageMogr2/thumbnail/512x1308',
        doorRightPaintedTexture: isMobileDevice ? dummyTex : 'https://media.secknow-ai.com/space/textures/doors/twiink-entry-right-color-v1.png?imageMogr2/thumbnail/512x1308',
        doorLeftPaintedTexture: isMobileDevice ? dummyTex : 'https://media.secknow-ai.com/space/textures/doors/twiink-entry-left-color-v1.png?imageMogr2/thumbnail/512x1308',
        handleLeftTexture: 'https://media.secknow-ai.com/space/textures/doors/handle_left_sketch.png',
        handleLeftPaintedTexture: isMobileDevice ? dummyTex : 'https://media.secknow-ai.com/space/textures/doors/handle_left_painted.png',
        handleRightTexture: 'https://media.secknow-ai.com/space/textures/doors/handle_right_sketch.png',
        handleRightPaintedTexture: isMobileDevice ? dummyTex : 'https://media.secknow-ai.com/space/textures/doors/handle_right_painted.png',
        doorBackTexture: isMobileDevice ? 'https://media.secknow-ai.com/space/textures/doors/door_back.png' : 'https://media.secknow-ai.com/space/textures/doors/door_back_left_sketch.png',
        edgeTexture: isMobileDevice ? 'https://media.secknow-ai.com/space/textures/doors/pien_sketch.png' : 'https://media.secknow-ai.com/space/textures/doors/pien.png',
        bricksTexture: 'https://media.secknow-ai.com/space/textures/entrance/wall_bricks_2.png',
        stonePathTexture: 'https://media.secknow-ai.com/space/textures/entrance/stone-path.png?imageMogr2/thumbnail/389x779',
        catFrontBodyTexture: 'https://media.secknow-ai.com/space/textures/entrance/cat_front_body.png',
        windowSketchTexture: 'https://media.secknow-ai.com/space/textures/entrance/window_sketch.png?imageMogr2/thumbnail/1024x1024',
        avatarWindowTexture: 'https://media.secknow-ai.com/space/textures/twiink/window-ink.png',
        treeTexture: 'https://media.secknow-ai.com/space/textures/entrance/tree_sketch.png',
        mouseTexture: 'https://media.secknow-ai.com/space/textures/entrance/mouse_hanging.png',
        potTexture: 'https://media.secknow-ai.com/space/textures/entrance/pot_with_duck.png?imageMogr2/thumbnail/2048x1024',
        bugTexture: 'https://media.secknow-ai.com/space/textures/entrance/bug_sketch.png',
        inkSplashTexture: 'https://media.secknow-ai.com/space/images/ink-splash.png',
        speechBubbleTexture: 'https://media.secknow-ai.com/space/textures/entrance/speech_bubble.png',
    });

    // 猫的引用。
    const leftPupilRef = useRef();
    const rightPupilRef = useRef();
    const catGroupRef = useRef(); // 获取世界位置以便跟踪。
    const bugRef = useRef();

    // 程序错误点击动画状态。
    const [isBugClicked, setIsBugClicked] = useState(false);
    const [clipProgress, setClipProgress] = useState(0); // 铅笔绘制显现进度，范围 0..1。
    const inkSplashRef = useRef();
    const handleHideDelayRef = useRef(); // 跟踪控制把手显隐的待执行 gsap.delayedCall。
    const bugFixedTextRef = useRef();
    const bugClickPos = useRef({ x: 0, y: 0 }); // 保存点击位置。

    // 橡皮鸭调试法的对话气泡状态。
    const [isDuckSpeaking, setIsDuckSpeaking] = useState(false);
    const [duckQuote, setDuckQuote] = useState('');
    const speechBubbleRef = useRef();

    // 橡皮鸭调试语录。
    const duckQuotes = [
        "试试 console.log() 吧？",
        "清理过缓存了吗？",
        "在我电脑上明明能运行！🤷",
        "试过关闭后重新启动吗？",
        "会不会是 CSS 的问题？",
        "看看是不是少了分号！",
        "仔细看过报错信息了吗？",
        "试试去 Stack Overflow 找找？",
        "电源插好了吗？",
        "生产环境运行正常！🚀",
    ];

    // 处理程序错误图案点击。
    const handleBugClick = (e) => {
        e.stopPropagation();
        if (isBugClicked) return; // 已经点击过。

        // 点击时保存程序错误图案的位置。
        if (bugRef.current) {
            bugClickPos.current = {
                x: bugRef.current.position.x,
                y: bugRef.current.position.y
            };
        }

        setIsBugClicked(true);
        document.body.style.cursor = "auto";

        // 墨水飞溅放大动画。
        if (inkSplashRef.current) {
            // 墨水飞溅置于程序错误图案的最后位置。
            inkSplashRef.current.position.x = bugClickPos.current.x;
            inkSplashRef.current.position.y = bugClickPos.current.y;
            inkSplashRef.current.scale.set(0, 0, 0);
            inkSplashRef.current.material.opacity = 1;

            gsap.to(inkSplashRef.current.scale, {
                x: 0.8,
                y: 0.8,
                z: 1,
                duration: 0.4,
                ease: 'back.out(1.7)'
            });
        }

        // 铅笔绘制效果，从左至右平滑显现。
        setClipProgress(0);

        if (bugFixedTextRef.current) {
            bugFixedTextRef.current.position.x = bugClickPos.current.x;
            bugFixedTextRef.current.position.y = bugClickPos.current.y;
        }

        // 裁切进度从 0 到 1，像铅笔绘制一样显现文字。
        gsap.to({ progress: 0 }, {
            progress: 1,
            duration: 0.8,
            ease: 'power1.inOut',
            onUpdate: function () {
                setClipProgress(this.targets()[0].progress);
            },
            onComplete: () => {
                // 延迟后淡出。
                setTimeout(() => {
                    if (inkSplashRef.current) {
                        gsap.to(inkSplashRef.current.material, {
                            opacity: 0,
                            duration: 1,
                            ease: 'power2.out'
                        });
                    }
                }, 1500);
            }
        });
    };

    // 橡皮鸭点击处理，用于橡皮鸭调试。
    const handleDuckClick = (e) => {
        e.stopPropagation();
        if (isDuckSpeaking) return; // 已经在说话。

        // 随机选择语录。
        const randomQuote = duckQuotes[Math.floor(Math.random() * duckQuotes.length)];
        setDuckQuote(randomQuote);
        setIsDuckSpeaking(true);

        // 对话气泡缩放进入动画。
        if (speechBubbleRef.current) {
            speechBubbleRef.current.scale.set(0, 0, 0);
            gsap.to(speechBubbleRef.current.scale, {
                x: 1,
                y: 1,
                z: 1,
                duration: 0.3,
                ease: 'back.out(1.7)'
            });
        }

        // 3 秒后隐藏。
        setTimeout(() => {
            if (speechBubbleRef.current) {
                gsap.to(speechBubbleRef.current.scale, {
                    x: 0,
                    y: 0,
                    z: 0,
                    duration: 0.2,
                    ease: 'power2.in',
                    onComplete: () => setIsDuckSpeaking(false)
                });
            } else {
                setIsDuckSpeaking(false);
            }
        }, 3000);
    };

    // ……省略部分行。



    // 门尺寸按纹理比例 332×848 计算，约为 1:2.55。
    // 门尺寸按纹理比例 332×848 计算，约为 1:2.55。
    const doorWidth = 0.94;
    const doorHeight = 2.4;
    const doorOpeningWidth = doorWidth * 2; // 两扇门合计。
    const wallThickness = 0.07;

    // 门框尺寸按纹理 718×877 计算，约为 1:1.22。
    const frameWidth = doorOpeningWidth + 0.16; // 额外预留门框边缘。
    const frameHeight = frameWidth * (877 / 718); // 保持纹理宽高比。

    // 无论墙高如何，地面 Y 始终保持标准值 -1.75。
    const floorY = -1.75;
    const doorBottomY = floorY;
    const doorCenterY = doorBottomY + doorHeight / 2;
    const wallCenterY = floorY + corridorHeight / 2;
    const topWallHeight = corridorHeight - doorHeight;
    const topWallCenterY = doorBottomY + doorHeight + topWallHeight / 2;
    const sideWallWidth = (corridorWidth - doorOpeningWidth) / 2;



    // 猫的交互状态。


    // 处理点击。
    const handleClick = async (e) => {
        e.stopPropagation();
        if (isOpen || isAnimating) return;

        setIsAnimating(true);
        playBackgroundMusic();
        document.body.style.cursor = 'progress';
        await onPrepare?.();
        if (!groupRef.current) return;

        // 过渡开始时立即重置光标。
        document.body.style.cursor = "auto";

        setIsOpen(true);
        unlockAchievement('corridor_enter');

        const tl = gsap.timeline({
            onComplete: () => {
                onComplete?.();
            }
        });

        // 完全压下把手，模拟真实开门。
        if (leftHandleRef.current) {
            tl.to(leftHandleRef.current.rotation, {
                z: 0.4,
                duration: 0.15,
                ease: 'power2.out'
            }, 0);
        }
        if (rightHandleRef.current) {
            tl.to(rightHandleRef.current.rotation, {
                z: -0.4,
                duration: 0.15,
                ease: 'power2.out'
            }, 0);
        }

        // 开门角度更平滑，与 SegmentDoors 一致。
        tl.to(leftDoorRef.current.rotation, {
            y: -Math.PI * 0.55,
            duration: 0.9,
            ease: 'power2.out'
        }, 0.1);

        tl.to(rightDoorRef.current.rotation, {
            y: Math.PI * 0.55,
            duration: 0.9,
            ease: 'power2.out'
        }, 0.1);

        // 相机穿过门，停在更靠近人物与网站标题的位置。
        tl.to(camera.position, {
            z: 11,  // 终点更靠近人物，原值为 11。
            y: 0.2, // 与 Hook 的基础 Y 位置一致。
            duration: 1.8,
            ease: 'power2.inOut'
        }, 0.3);
    };

    // 悬停时微开门，提示可交互。
    const handlePointerEnter = () => {
        if (isOpen || isAnimating || isMobile) return;
        document.body.style.cursor = "pointer";

        // 悬停时稍微开门。
        gsap.to(leftDoorRef.current.rotation, {
            y: -0.08,
            duration: 0.3,
            ease: 'power2.out',
            overwrite: true
        });
        gsap.to(rightDoorRef.current.rotation, {
            y: 0.08,
            duration: 0.3,
            ease: 'power2.out',
            overwrite: true
        });

        // 略微压下把手，作为提示。
        if (leftHandleRef.current) {
            gsap.to(leftHandleRef.current.rotation, {
                z: 0.1,
                duration: 0.2,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (rightHandleRef.current) {
            gsap.to(rightHandleRef.current.rotation, {
                z: -0.1,
                duration: 0.2,
                ease: 'power2.out',
                overwrite: true
            });
        }

        // 笔刷显现：丢弃速写像素，露出下方彩色门。
        if (rightDoorMaterialRef.current) {
            gsap.to(rightDoorMaterialRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (leftDoorMaterialRef.current) {
            gsap.to(leftDoorMaterialRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (leftHandleMaterialRef.current) {
            gsap.to(leftHandleMaterialRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (rightHandleMaterialRef.current) {
            gsap.to(rightHandleMaterialRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        }
        // 显示彩色把手，并取消之前移出事件留下的隐藏任务。
        if (handleHideDelayRef.current) handleHideDelayRef.current.kill();
        if (leftHandlePaintedRef.current) leftHandlePaintedRef.current.visible = true;
        if (rightHandlePaintedRef.current) rightHandlePaintedRef.current.visible = true;
    };

    const handlePointerLeave = () => {
        if (isOpen || isAnimating || isMobile) return;
        document.body.style.cursor = "auto";

        // 重新关门。
        gsap.to(leftDoorRef.current.rotation, {
            y: 0,
            duration: 0.3,
            ease: 'power2.out',
            overwrite: true
        });
        gsap.to(rightDoorRef.current.rotation, {
            y: 0,
            duration: 0.3,
            ease: 'power2.out',
            overwrite: true
        });

        // 重置把手。
        if (leftHandleRef.current) {
            gsap.to(leftHandleRef.current.rotation, {
                z: 0,
                duration: 0.2,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (rightHandleRef.current) {
            gsap.to(rightHandleRef.current.rotation, {
                z: 0,
                duration: 0.2,
                ease: 'power2.out',
                overwrite: true
            });
        }

        // 反向执行笔刷显现。
        if (rightDoorMaterialRef.current) {
            gsap.to(rightDoorMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (leftDoorMaterialRef.current) {
            gsap.to(leftDoorMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (leftHandleMaterialRef.current) {
            gsap.to(leftHandleMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (rightHandleMaterialRef.current) {
            gsap.to(rightHandleMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }

        // 反向动画完成后隐藏彩色把手。
        handleHideDelayRef.current = gsap.delayedCall(0.55, () => {
            if (leftHandlePaintedRef.current) leftHandlePaintedRef.current.visible = false;
            if (rightHandlePaintedRef.current) rightHandlePaintedRef.current.visible = false;
        });
    };



    // 猫眼跟踪逻辑。
    useFrame((state) => {
        if (!leftPupilRef.current || !rightPupilRef.current) return;

        // 鼠标标准设备坐标，范围 -1 至 +1。
        const { x, y } = state.pointer;

        // 配置。
        const MAX_EYE_MOVEMENT = 0.015; // 瞳孔离中心的最大移动距离。

        // 简单映射。
        const targetX = x * MAX_EYE_MOVEMENT * 2;
        const targetY = y * MAX_EYE_MOVEMENT * 2;

        // 将当前瞳孔位置平滑插值至目标。
        // 左眼原位置：[-0.063, 0.27]。
        leftPupilRef.current.position.x = THREE.MathUtils.lerp(leftPupilRef.current.position.x, -0.075 + targetX, 0.1);
        leftPupilRef.current.position.y = THREE.MathUtils.lerp(leftPupilRef.current.position.y, 0.28 + targetY, 0.1);

        // 右眼原位置：[0.0615, 0.27]。
        rightPupilRef.current.position.x = THREE.MathUtils.lerp(rightPupilRef.current.position.x, 0.043 + targetX, 0.1);
        rightPupilRef.current.position.y = THREE.MathUtils.lerp(rightPupilRef.current.position.y, 0.28 + targetY, 0.1);
    });

    // 悬挂鼠标摆动动画。
    const mousePivotRef = useRef();
    useFrame(({ clock }) => {
        if (mousePivotRef.current) {
            // 用正弦波产生轻柔摆动。
            // 振幅 0.05 弧度，约 3°。
            // 速度：1.5。
            mousePivotRef.current.rotation.x = Math.sin(clock.elapsedTime * 1.5) * 0.05;
        }

        // 程序错误图案动画。
        if (bugRef.current) {
            const time = clock.elapsedTime;
            // 用多重正弦波模拟随机漫步。
            // 初始位置：[2.5, floorY + 3.0, 0.16]，位于窗上方。
            // 移动范围：X、Y 均为 ±0.3。

            const xOffset = Math.sin(time * 0.8) * 0.3 + Math.sin(time * 1.5) * 0.1;
            const yOffset = Math.cos(time * 0.6) * 0.2 + Math.cos(time * 1.1) * 0.1;

            bugRef.current.position.x = 3 + xOffset;
            bugRef.current.position.y = (floorY + 3.8) + yOffset;

            // 随机旋转抖动。
            bugRef.current.rotation.z = Math.sin(time * 5) * 0.1 + Math.atan2(yOffset, xOffset) * 0.2;
        }
    });



    // 窗户悬停辅助函数。
    const handleWindowEnter = (e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";

        if (windowAvatarRef.current) {
            gsap.to(windowAvatarRef.current.position, {
                x: 2.5,
                duration: 0.5,
                ease: 'back.out(1.7)',
                overwrite: true
            });
            gsap.to(windowAvatarRef.current.rotation, {
                z: 0.1,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }
    };

    const handleWindowLeave = (e) => {
        e.stopPropagation();
        document.body.style.cursor = "auto";

        if (windowAvatarRef.current) {
            gsap.to(windowAvatarRef.current.position, {
                x: 3.5,
                duration: 0.4,
                ease: 'power2.in',
                overwrite: true
            });
            gsap.to(windowAvatarRef.current.rotation, {
                z: 0,
                duration: 0.4,
                ease: 'power2.in',
                overwrite: true
            });
        }
    };

    // 门框中心 Y，与门对齐。
    const frameCenterY = doorBottomY + frameHeight / 2;

    const facadeYOffset = -1.65;


    const pathWidth = frameWidth + 0.4;
    // 新纹理为 1005×2317，比例约 1:2.3。
    // 宽 2.44，乘以 2.3 后高约 5.6。
    const pathLength = 5.62;

    return (
        <group ref={groupRef} position={[position[0], 0, position[2]]}>

            {/* 入口前方上层的石板路地面。 */}
            {/* 石板路高度：调整 floorY + 0.02，数值越大越高。 */}
            <mesh
                position={[0, floorY + 0.02, pathLength / 2]}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <planeGeometry args={[pathWidth, pathLength]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={stonePathTexture}
                    transparent={true}
                />
            </mesh>


            {/* 左侧墙面板。 */}
            <mesh position={[-(doorOpeningWidth / 2 + sideWallWidth / 2), wallCenterY, 0]}>
                <boxGeometry args={[sideWallWidth, corridorHeight, wallThickness]} />
                <meshBasicMaterial color="#e0e0e0" roughness={0.95} />
            </mesh>

            {/* 右侧墙面板。 */}
            <mesh position={[(doorOpeningWidth / 2 + sideWallWidth / 2), wallCenterY, 0]}>
                <boxGeometry args={[sideWallWidth, corridorHeight, wallThickness]} />
                <meshBasicMaterial color="#e0e0e0" roughness={0.95} />
            </mesh>

            {/* 顶部墙面板。 */}
            <mesh position={[0, topWallCenterY, 0]}>
                <boxGeometry args={[doorOpeningWidth, topWallHeight, wallThickness]} />
                <meshBasicMaterial color="#e0e0e0" roughness={0.95} />
            </mesh>

            {/* 砖墙立面。 */}
            {/* 
                图片纹理调节：
                1. args={[宽度, 高度]}：图片尺寸。
                2. facadeYOffset：上下偏移，如 -1 下移、1 上移。
            */}
            <mesh position={[0, wallCenterY + facadeYOffset + 1.65, 0.15]}>
                {/* 修改 args={[宽度, 高度]} 中的数值，例如 7、8。 */}
                <planeGeometry args={[16., 8]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={bricksTexture}
                    transparent={true}
                    alphaTest={0.01}
                    roughness={0.9}
                />
            </mesh>

            {/* 带纹理的门框。 */}
            <mesh position={[0, frameCenterY, 0.12]}>
                <planeGeometry args={[frameWidth, frameHeight]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={frameTexture}
                    transparent={true}
                    alphaTest={0.1}
                    roughness={0.9}
                    depthWrite={false}
                />
            </mesh>

            {/* 左门。 */}
            <group ref={leftDoorRef} position={[-doorWidth, doorCenterY, 0]}>
                {/* 带边缘纹理的实体三维门体。 */}
                <mesh
                    position={[doorWidth / 2, 0, 0.06]}
                    onClick={handleClick}
                    onPointerEnter={handlePointerEnter}
                    onPointerLeave={handlePointerLeave}
                >
                    <boxGeometry args={[doorWidth, doorHeight, 0.04]} />
                    <meshBasicMaterial color="#e0e0e0" map={edgeTexture} roughness={0.9} />
                </mesh>

                {/* 左门的后方彩色层。 */}
                {!isMobile && (
                    <mesh position={[doorWidth / 2, 0, 0.088]}>
                        <planeGeometry args={[doorWidth, doorHeight]} />
                        <meshBasicMaterial color="#e0e0e0"
                            map={doorLeftPaintedTexture}
                            transparent={true}
                            alphaTest={0.5}
                            roughness={0.8}
                        />
                    </mesh>
                )}

                {/* 左门的前方速写叠加层，使用笔刷显现。 */}
                <mesh position={[doorWidth / 2, 0, 0.09]}>
                    <planeGeometry args={[doorWidth, doorHeight]} />
                    <revealMaterial color="#e0e0e0"
                        ref={leftDoorMaterialRef}
                        map={doorLeftTexture}
                        transparent={true}
                        alphaTest={0.5}
                        roughness={0.8}
                        depthWrite={false}
                        uProgress={0.0}
                    />
                </mesh>

                {/* 镜像背面纹理平面。 */}
                <mesh position={[doorWidth / 2, 0, 0.03]} rotation={[0, Math.PI, 0]} scale={[-1, 1, 1]}>
                    <planeGeometry args={[doorWidth, doorHeight]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={doorBackTexture}
                        transparent={true}
                        alphaTest={0.5}
                        roughness={0.8}
                        side={2}
                    />
                </mesh>

                {/* 把手动画层，以螺丝中心为轴；332×848 纹理中的 (292,459)。 */}
                <group ref={leftHandleRef} position={[doorWidth / 2 + 0.357, -0.099, 0.10]}>
                    {/* 彩色把手位于后方，悬停前隐藏。 */}
                    {!isMobile && (
                        <mesh ref={leftHandlePaintedRef} position={[-0.357, 0.09, -0.001]} visible={false}>
                            <planeGeometry args={[doorWidth, doorHeight]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={handleLeftPaintedTexture}
                                transparent={true}
                                alphaTest={0.5}
                                depthWrite={false}
                            />
                        </mesh>
                    )}
                    {/* 前方速写把手叠加层。 */}
                    <mesh position={[-0.357, 0.099, 0]}>
                        <planeGeometry args={[doorWidth, doorHeight]} />
                        <revealMaterial color="#e0e0e0"
                            ref={leftHandleMaterialRef}
                            map={handleLeftTexture}
                            transparent={true}
                            alphaTest={0.5}
                            depthWrite={false}
                            uProgress={0.0}
                        />
                    </mesh>
                </group>
            </group>

            {/* 右门。 */}
            <group ref={rightDoorRef} position={[doorWidth, doorCenterY, 0]}>
                {/* 带边缘纹理的实体三维门体。 */}
                <mesh
                    position={[-doorWidth / 2, 0, 0.06]}
                    onClick={handleClick}
                    onPointerEnter={handlePointerEnter}
                    onPointerLeave={handlePointerLeave}
                >
                    <boxGeometry args={[doorWidth, doorHeight, 0.04]} />
                    <meshBasicMaterial color="#e0e0e0" map={edgeTexture} roughness={0.9} />
                </mesh>

                {/* 后方彩色层，悬停时通过速写层淡出而显现。 */}
                {!isMobile && (
                    <mesh position={[-doorWidth / 2, 0, 0.088]}>
                        <planeGeometry args={[doorWidth, doorHeight]} />
                        <meshBasicMaterial color="#e0e0e0"
                            map={doorRightPaintedTexture}
                            transparent={true}
                            alphaTest={0.5}
                            roughness={0.8}
                        />
                    </mesh>
                )}

                {/* 前方速写叠加层通过笔刷丢弃露出底层彩色图。 */}
                <mesh position={[-doorWidth / 2, 0, 0.09]}>
                    <planeGeometry args={[doorWidth, doorHeight]} />
                    <revealMaterial color="#e0e0e0"
                        ref={rightDoorMaterialRef}
                        map={doorRightTexture}
                        transparent={true}
                        alphaTest={0.5}
                        roughness={0.8}
                        depthWrite={false}
                        uProgress={0.0}
                    />
                </mesh>

                {/* 背面纹理平面。 */}
                <mesh position={[-doorWidth / 2, 0, 0.03]} rotation={[0, Math.PI, 0]}>
                    <planeGeometry args={[doorWidth, doorHeight]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={doorBackTexture}
                        transparent={true}
                        alphaTest={0.5}
                        roughness={0.8}
                    />
                </mesh>

                {/* 把手动画层，以螺丝中心为轴；332×848 纹理中的 (40,459)。 */}
                <group ref={rightHandleRef} position={[-doorWidth / 2 - 0.357, -0.099, 0.10]}>
                    {/* 彩色把手位于后方，悬停前隐藏。 */}
                    {!isMobile && (
                        <mesh ref={rightHandlePaintedRef} position={[0.357, 0.09, -0.001]} visible={false}>
                            <planeGeometry args={[doorWidth, doorHeight]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={handleRightPaintedTexture}
                                transparent={true}
                                alphaTest={0.5}
                                depthWrite={false}
                            />
                        </mesh>
                    )}
                    {/* 前方速写把手叠加层。 */}
                    <mesh position={[0.357, 0.099, 0]}>
                        <planeGeometry args={[doorWidth, doorHeight]} />
                        <revealMaterial color="#e0e0e0"
                            ref={rightHandleMaterialRef}
                            map={handleRightTexture}
                            transparent={true}
                            alphaTest={0.5}
                            depthWrite={false}
                            uProgress={0.0}
                        />
                    </mesh>
                </group>
            </group>

            {/* 暖色光照，已禁用。 */}
            {/* <pointLight
                position={[0, doorBottomY + doorHeight + 1, 1]}
                intensity={0.8}
                color="#fff8e8"
                distance={10}
            /> */}
            {/* 人物独立于窗户组，位于砖墙后。 */}
            <mesh
                ref={windowAvatarRef}
                position={[3.5, 0, 0.04]}
                rotation={[0, 0, 0]}
            >
                <planeGeometry args={[1.5 * avatarWindowTexture.image.width / avatarWindowTexture.image.height, 1.5]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={avatarWindowTexture}
                    transparent={true}
                    alphaTest={0.1}
                />
            </mesh>

            {/* 窗户位于门右侧。 */}
            <group
                position={[2.5, 0, 0.1]}
                onPointerEnter={handleWindowEnter}
                onPointerLeave={handleWindowLeave}
            >
                {/* 窗框速写，位于砖墙前。 */}
                <mesh position={[0, 0, 0.2]}>
                    <planeGeometry args={[1.5, 1.5]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={windowSketchTexture}
                        transparent={true}
                    />
                </mesh>
            </group>

            {/* 鸭子花盆，右侧窗下。 */}
            <group position={[2.5, floorY + 0.45, 0.4]}>
                {/* 花盆纹理。 */}
                <mesh>
                    <planeGeometry args={[3, 1.8]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={potTexture}
                        transparent={true}
                        alphaTest={0.01}
                        depthWrite={false}
                    />
                </mesh>

                {/* 仅覆盖花盆右侧鸭子的不可见交互区域。 */}
                <mesh
                    position={[0.38, 0.1, 0.01]}
                    onClick={handleDuckClick}
                    onPointerEnter={() => { document.body.style.cursor = "pointer"; }}
                    onPointerLeave={() => { document.body.style.cursor = "auto"; }}
                >
                    <planeGeometry args={[0.6, 0.6]} />
                    <meshBasicMaterial color="#e0e0e0" transparent opacity={0} />
                </mesh>

                {/* 对话气泡。 */}
                <group
                    ref={speechBubbleRef}
                    position={[0.9, 0.8, 0.1]}
                    scale={[0, 0, 0]}
                >
                    <mesh>
                        <planeGeometry args={[1.8, 1.2]} />
                        <meshBasicMaterial color="#e0e0e0"
                            map={speechBubbleTexture}
                            transparent={true}
                            alphaTest={0.01}
                            depthWrite={false}
                        />
                    </mesh>

                    {/* 语录文字。 */}
                    {/* 文字尺寸：fontSize 越小，文字越小。 */}
                    {/* 换行宽度：maxWidth 越小，越早换行。 */}
                    <Text
                        position={[0, 0.1, 0.01]}
                        fontSize={0.07}
                        color="#1a1a1a"
                        anchorX="center"
                        anchorY="middle"
                        font={FONT_URL}
                        overflowWrap="break-word"
                        maxWidth={1.4}
                        textAlign="center"
                        visible={isDuckSpeaking} // 切换可见性，避免反复挂载与卸载。
                    >
                        {duckQuote || " "}
                    </Text>
                </group>
            </group>

            {/* 窗上方右侧的程序错误图案动画。 */}
            {!isBugClicked && (
                <mesh
                    ref={bugRef}
                    position={[2.5, floorY + 2.8, 0.16]}
                    onClick={handleBugClick}
                    onPointerEnter={() => { document.body.style.cursor = "pointer"; }}
                    onPointerLeave={() => { document.body.style.cursor = "auto"; }}
                >
                    <planeGeometry args={[0.4, 0.4]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={bugTexture}
                        transparent={true}
                        alphaTest={0.01}
                        depthWrite={false}
                    />
                </mesh>
            )}

            {/* 墨水飞溅始终挂载，以预加载纹理与着色器。 */}
            <mesh
                ref={inkSplashRef}
                position={[2.5, floorY + 2.8, 0.17]}
                scale={[0, 0, 0]}
            // 移除条件 visible，确保上传 GPU。
            >
                <planeGeometry args={[2, 2]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={inkSplashTexture}
                    transparent={true}
                    alphaTest={0.01}
                    depthWrite={false}
                />
            </mesh>

            {/* “错误已修复”文字始终挂载，以预加载字体。 */}
            <Text
                ref={bugFixedTextRef}
                position={[2.5, floorY + 2.8, 0.35]} // 默认位置，点击时更新。
                fontSize={0.25} // 略微增大字号。
                color="#1a1a1a"
                anchorX="center"
                anchorY="middle"
                font="/media/fonts/LXGWWenKaiLite-site.woff"
                outlineWidth={0.015}
                outlineColor="#ffffff"
                clipRect={[-1, -0.5, -1 + (clipProgress * 2.5), 0.5]}
            >
                问题已修复！
            </Text>





            {/* 左侧树与悬挂鼠标。 */}
            <group position={[-2.9, floorY + 2.7, 1]}>
                {/* 树。 */}
                <mesh position={[0, 0, 0]}>
                    <planeGeometry args={[6, 8]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={treeTexture}
                        transparent={true}
                        alphaTest={0.01}
                        depthWrite={false}
                    />
                </mesh>
                {/* 悬挂鼠标：用于摆动的旋转轴组。 */}
                {/* 旋转轴上移约 2.0，靠近悬线或树枝顶部。 */}
                {/* 网格原 Y=0.02，新旋转轴 Y=0.02+2.0=2.02。 */}
                {/* 悬挂鼠标：用于摆动的旋转轴组。 */}
                {/* 旋转轴像素为 (421,597)，相对中心偏移 X=0.351、Y=-0.456。 */}
                {/* 组位置偏移：(-0.01, 0.02)+(0.351, -0.456)=(0.341, -0.436)。 */}
                <group ref={mousePivotRef} position={[0.341, 0.02 - 0.456, 0]}>
                    {/* 网格沿旋转轴偏移的反方向移动，保持视觉位置。 */}
                    <mesh position={[-0.351, 0.456, 0]}>
                        <planeGeometry args={[6, 8]} />
                        <meshBasicMaterial color="#e0e0e0"
                            map={mouseTexture}
                            transparent={true}
                            alphaTest={0.01}
                            depthWrite={false}
                        />
                    </mesh>
                </group>
            </group>

            {/* 正面猫速写。 */}
            <group position={[-1.5, floorY + 0.6, 0.8]} ref={catGroupRef}>
                {/* 身体。 */}
                <mesh>
                    <planeGeometry args={[1.5, 1.5]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={catFrontBodyTexture}
                        transparent={true}
                        alphaTest={0.01}
                        depthWrite={false}
                    />
                </mesh>

                {/* 左瞳孔。 */}
                <mesh
                    ref={leftPupilRef}
                    position={[-0.063, 0.27, -0.02]} // 位于猫后方。
                >
                    <circleGeometry args={[0.020, 32]} />
                    <meshBasicMaterial color="black" />
                    {/* 椭圆缩放。 */}
                    <group scale={[0.8, 1.2, 1]} />
                </mesh>

                {/* 右瞳孔。 */}
                <mesh
                    ref={rightPupilRef}
                    position={[0.0615, 0.27, -0.02]} // 位于猫后方。
                >
                    <circleGeometry args={[0.020, 32]} />
                    <meshBasicMaterial color="black" />
                </mesh>
            </group>

        </group>
    );
};

export default EntranceDoors;
