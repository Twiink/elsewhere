import { useMemo, useState, useRef, useEffect } from 'react';
import { useTexture, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import '../shaders/RevealMaterial';
import { isTouchDevice } from '../../../utils/deviceDetect';
/**
 * CorridorDecorations：走廊装饰。
 * 
 * 在 3D 空间中使用带纹理的平面，呈现二维手绘风格。
 * 
 * 每段走廊长 80 单位：
 *   门的相对 Z：-18（左）、-32（右）、-48（左）、-62（右）。
 *   corridorWidth：每侧约 3.5。
 *   corridorHeight：3.5。
 *   装饰安全区域：-5 至 -15、-20 至 -30、-34 至 -46、-50 至 -60、-64 至 -75。
 */

// 复用 useFrame 的全局变量，避免逐帧分配内存引发垃圾回收卡顿。
const tempPos = new THREE.Vector3();
const tempRot = new THREE.Quaternion();
const tempScale = new THREE.Vector3();
const tempCamDir = new THREE.Vector3();
const tempEuler = new THREE.Euler();
const tempQuat = new THREE.Quaternion();


const CABIN_SKETCH_URL = '/fonts/LXGWWenKaiLite-Regular.ttf';

const PictureContent = ({ imagePath, imagePaintedPath, width, height, isPainted }) => {
    const texture = useTexture(imagePath);
    // 没有彩色路径时不渲染，但仍无条件调用 Hook，以遵守 Hook 规则。
    const paintedTexture = useTexture(imagePaintedPath || imagePath);

    const materialRef = useRef();

    useEffect(() => {
        if (!materialRef.current || !imagePaintedPath) return;

        if (isPainted) {
            gsap.to(materialRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        } else {
            gsap.to(materialRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }
    }, [isPainted, imagePaintedPath]);

    return (
        <group position={[0, 0, 0.01]}> {/* 略微位于画框前方。 */}
            {imagePaintedPath && (
                <mesh position={[0, 0, -0.001]}>
                    <planeGeometry args={[width, height]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={paintedTexture}
                        transparent={true}
                        alphaTest={0.5}
                        side={THREE.DoubleSide}
                        roughness={0.9}
                    />
                </mesh>
            )}
            <mesh position={[0, 0, 0]}>
                <planeGeometry args={[width, height]} />
                {imagePaintedPath ? (
                    <revealMaterial color="#e0e0e0"
                        ref={materialRef}
                        map={texture}
                        transparent={true}
                        alphaTest={0.1}
                        side={THREE.DoubleSide}
                        roughness={0.9}
                        uProgress={0.0}
                    />
                ) : (
                    <meshBasicMaterial color="#e0e0e0"
                        map={texture}
                        transparent={true}
                        alphaTest={0.1} // 关键：修复透明效果，去除背景。
                        side={THREE.DoubleSide}
                        roughness={0.5}
                    />
                )}
            </mesh>
        </group>
    );
};

const InspectableFrame = ({ frame, wallX, frameTexture, framePaintedTexture, CABIN_SKETCH_URL, setCameraOverride }) => {
    const { camera, viewport } = useThree();
    const groupRef = useRef();
    const frameMaterialRef = useRef();
    const framePaintedRef = useRef();
    const compileFramesRef = useRef(0);
    const hideDelayRef = useRef();

    // 保存墙面上的原始位置与旋转。
    const originalPos = useMemo(() => new THREE.Vector3(
        frame.side === 'left' ? -wallX + (frame.offsetFromWall || 0) : wallX - (frame.offsetFromWall || 0),
        frame.y,
        frame.z
    ), [frame, wallX]);

    const originalRot = useMemo(() => new THREE.Euler(
        0, frame.side === 'left' ? Math.PI / 2 : -Math.PI / 2, 0
    ), [frame.side]);

    const [isHovered, setIsHovered] = useState(false);
    const [isInspected, setIsInspected] = useState(false);

    // 触摸设备（手机或平板）完全关闭悬停效果，以提升性能。
    const isTouch = useMemo(() => isTouchDevice(), []);
    // 保留旧机制，在极窄屏幕上完全禁用 inspected 状态。
    const isMobile = viewport.width < 5 || viewport.aspect < 0.8 || isTouch;

    // 组件卸载时清除相机接管状态。
    useEffect(() => {
        return () => {
            if (isInspected) {
                if (setCameraOverride) setCameraOverride(false);
                window.dispatchEvent(new CustomEvent('inspectChange', { detail: false }));
            }
        };
    }, [isInspected, setCameraOverride]);

    useEffect(() => {
        if (isHovered && !isMobile) document.body.style.cursor = 'pointer';
        else document.body.style.cursor = 'auto';
    }, [isHovered, isMobile]);

    useEffect(() => {
        if (!frameMaterialRef.current) return;

        const shouldBePainted = isHovered || isInspected;

        if (shouldBePainted) {
            if (hideDelayRef.current) hideDelayRef.current.kill();
            if (framePaintedRef.current) framePaintedRef.current.visible = true;

            gsap.to(frameMaterialRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        } else {
            gsap.to(frameMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });

            hideDelayRef.current = gsap.delayedCall(0.55, () => {
                if (framePaintedRef.current) framePaintedRef.current.visible = false;
            });
        }

        return () => {
            if (hideDelayRef.current) hideDelayRef.current.kill();
        };
    }, [isHovered, isInspected]);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        if (compileFramesRef.current < 2) {
            compileFramesRef.current++;
            if (compileFramesRef.current === 2) {
                if (!isHovered && !isInspected && framePaintedRef.current) {
                    framePaintedRef.current.visible = false;
                }
            }
        }

        if (isInspected) {
            // 相机前方较近的位置。
            camera.getWorldDirection(tempCamDir);

            // 计算随屏幕变化的距离。
            // 宽高比较小时（如宽高比不超过 1.3 的笔记本），将图片推远至约 2.2。
            // 宽高比较大时（如超宽屏或 16:9≈1.77），将图片拉近至约 1.5。
            // clamp(1.5, 2.8)
            const baseDistance = 1.3;
            // 屏幕越窄，距离越远。
            const aspectOffset = Math.max(0, 1.8 - viewport.aspect) * 1.5;
            const distance = Math.min(2.8, Math.max(1.5, baseDistance + aspectOffset));

            // 相机前的目标点，距离随屏幕动态增加。
            tempPos.copy(camera.position).add(tempCamDir.multiplyScalar(distance));

            // 将图片直接朝向相机的旋转。
            tempRot.copy(camera.quaternion);

            // 根据鼠标位置产生立体卡片效果。
            const tiltX = -state.pointer.y * 0.3;
            const tiltY = state.pointer.x * 0.3;
            tempEuler.set(tiltX, tiltY, 0);
            tempQuat.setFromEuler(tempEuler);

            tempRot.multiply(tempQuat);

            // 竖版照片按可见范围缩放，完整保留画面。
            const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
            const scale = frame.fitToView
                ? Math.min(1.2, visibleHeight * 0.86 / frame.height, visibleHeight * viewport.aspect * 0.86 / frame.width)
                : 1.2;
            tempScale.setScalar(scale);
        } else {
            // 返回墙面位置。
            tempPos.copy(originalPos);
            tempRot.setFromEuler(originalRot);
            tempScale.set(1, 1, 1);
        }

        // 每帧执行平滑位置与旋转插值（lerp/slerp）。
        const factor = delta * 6;
        groupRef.current.position.lerp(tempPos, factor);
        groupRef.current.quaternion.slerp(tempRot, factor);
        groupRef.current.scale.lerp(tempScale, factor);
    });

    return (
        <group
            ref={groupRef}
            position={originalPos}
            rotation={originalRot}
        >
            {/* 不可见交互区域，稳定捕获指针事件，防止射线检测在网格间跳变。 */}
            <mesh
                position={[0, 0, 0.05]}
                onClick={(e) => {
                    e.stopPropagation();
                    if (isMobile) return; // 移动端完全禁用。
                    setIsInspected((prev) => {
                        const next = !prev;
                        if (setCameraOverride) setCameraOverride(next); // 锁定或解锁相机移动。
                        window.dispatchEvent(new CustomEvent('inspectChange', { detail: next }));
                        return next;
                    });
                    setIsHovered(false);
                }}
                onPointerEnter={(e) => {
                    e.stopPropagation();
                    if (!isInspected && !isMobile) setIsHovered(true);
                }}
                onPointerLeave={(e) => {
                    e.stopPropagation();
                    setIsHovered(false);
                }}
            >
                <planeGeometry args={[frame.width, frame.height]} />
                <meshBasicMaterial color="#e0e0e0" transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* 彩色画框，位于速写层后方。 */}
            {!isTouch && (
                <mesh ref={framePaintedRef} position={[0, 0, -0.001]} scale={[0.98, 0.98, 1]}>
                    <planeGeometry args={[frame.width, frame.height]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={framePaintedTexture}
                        transparent={true}
                        alphaTest={0.5}
                        side={THREE.DoubleSide}
                        roughness={0.9}
                    />
                </mesh>
            )}

            {/* 速写画框叠加层，位于前方。 */}
            <mesh position={[0, 0, 0]}>
                <planeGeometry args={[frame.width, frame.height]} />
                <revealMaterial color="#e0e0e0"
                    ref={frameMaterialRef}
                    map={frameTexture}
                    transparent={true}
                    alphaTest={0.1}
                    side={THREE.DoubleSide}
                    roughness={0.9}
                    uProgress={0.0}
                />
            </mesh>

            {/* 内部图片。 */}
            {frame.image && (
                <PictureContent
                    imagePath={frame.image}
                    imagePaintedPath={!isTouch ? frame.imagePainted : null}
                    width={frame.imageWidth || frame.width * 0.7}
                    height={frame.imageHeight || frame.height * 0.7}
                    isPainted={isHovered || isInspected}
                />
            )}

            {/* 图片说明。 */}
            {frame.signature && (
                <Text
                    position={[
                        frame.signatureX !== undefined ? frame.signatureX : (frame.width / 2 - 0.1),
                        frame.signatureY !== undefined ? frame.signatureY : (-frame.height / 2 + 0.15),
                        0.02
                    ]}
                    fontSize={frame.signatureSize || 0.12}
                    font={CABIN_SKETCH_URL}
                    color={frame.signatureColor || "#333333"}
                    anchorX="center"
                    anchorY="middle"
                >
                    {frame.signature}
                </Text>
            )}
        </group>
    );
};

const CorridorDecorations = ({ segmentLength, zOffset, corridorWidth = 4, corridorHeight = 3.5, zClip = 100000, setCameraOverride }) => {

    const wallX = corridorWidth / 2 - 0.01;
    const floorY = -corridorHeight / 2;
    const ceilingY = corridorHeight / 2;

    // =============================================
    // 装饰纹理。
    // =============================================
    const frameTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/ramkanazdjecieduza.png?imageMogr2/thumbnail/2048x1024');
    const framePaintedTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/ramkanazdjecieduza_painted.png?imageMogr2/thumbnail/2048x1024');
    const standingFrameTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/ramkanazdjeciemala.png?imageMogr2/thumbnail/512x1024');
    const treeTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/drzewkowdoniczce.png?imageMogr2/thumbnail/1024x2048');
    const grateTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/kratkawentylacyjna.png?imageMogr2/thumbnail/2048x1024');
    const flowerTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/kwiatekwdoniczce.png?imageMogr2/thumbnail/128x256');

    // 顶灯：光源点。
    // 灯具纹理。
    const lampGrilleTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/kratanalampy.png?imageMogr2/thumbnail/1515x757');
    // lampGrilleTexture.wrapS = lampGrilleTexture.wrapT = THREE.RepeatWrapping; 
    // lampGrilleTexture.repeat.set(1, 1);

    const lampSideTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/bokilampy.png?imageMogr2/thumbnail/1024x64');
    lampSideTexture.wrapS = lampSideTexture.wrapT = THREE.RepeatWrapping;
    // 调整长边 UV。
    lampSideTexture.repeat.set(1, 1);

    const lights = useMemo(() => {
        const items = [];
        // 灯光调节。
        const LIGHT_SPACING = 15;      // 灯具间距。
        const LIGHT_START_OFFSET = -5;  // 起点留出空间，避开上一段走廊的门。

        const startZ = zOffset + LIGHT_START_OFFSET;
        const endZ = zOffset - segmentLength + 10; // 末端留出空间，SegmentDoors 位于 -75。

        for (let z = startZ; z > endZ; z -= LIGHT_SPACING) {
            items.push({ z });
        }
        return items;
    }, [segmentLength, zOffset]);

    // =============================================
    // 相框。
    // =============================================
    // 墙面上带画框纹理的平面。
    // 后续可在画框内添加海报或照片。
    //
    // 可手动调整的设置：
    // - z：走廊轴上的 Z 位置，按 zOffset 减去该值计算。
    // - side：'left' 或 'right'。
    // - width/height：画框尺寸。
    // - y：墙面高度，0 表示中间。
    const frames = useMemo(() => [
        {
            z: zOffset - 10,         // 起点与画廊之间，相对 Z 为 -5 至 -15。
            side: 'right',
            width: 2.5,              // 画框宽度。
            height: 2.5 / 1.785,     // 原始比例 3200×1792。
            y: 0.3,                  // 墙面高度。
            id: 'frame-1',
            // 纸飞机与星星，沿用网站图标。
            image: 'https://media.secknow-ai.com/space/textures/twiink/site-icon-airplane-v1-512.png?imageMogr2/thumbnail/512x512',
            imageWidth: 0.95,
            imageHeight: 0.95,
            offsetFromWall: 0.1, // 向走廊中心移动 0.1 单位。
        },
        {
            z: zOffset - 25,         // 画廊与工作室之间，相对 Z 为 -20 至 -30。
            side: 'left',
            width: 2.5,
            height: 2.5 / 1.785,
            y: 0.2,
            id: 'frame-2',
            image: 'https://media.secknow-ai.com/space/textures/corridor/rysuneknaobrazek3.png?imageMogr2/thumbnail/716x358',
            imageWidth: 1.7,
            imageHeight: 1,
            offsetFromWall: 0.1
        },
        {
            z: zOffset - 40,         // 工作室与关于我之间，相对 Z 为 -34 至 -46。
            side: 'right',
            width: 1.95,
            height: 2.6,
            y: 0.25,
            id: 'frame-3',
            image: 'https://media.secknow-ai.com/space/content/corridor/bouquet-hands.png?imageMogr2/thumbnail/1536x2048',
            imageWidth: 1.65,
            imageHeight: 2.2,
            offsetFromWall: 0.1,
            fitToView: true,
        },
        {
            z: zOffset - 55,         // 关于我与联系我之间，相对 Z 为 -50 至 -60。
            side: 'left',
            width: 1.85,
            height: 2.6,
            y: 0.35,
            id: 'frame-4',
            image: 'https://media.secknow-ai.com/space/content/corridor/hanfu-photo.jpg?imageMogr2/thumbnail/1365x2048',
            imageWidth: 2.2 * 2 / 3,
            imageHeight: 2.2,
            offsetFromWall: 0.1,
            fitToView: true,
        },
    ], [zOffset]);

    // =============================================
    // 桌子。
    // =============================================
    const woodTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/texturadrewnadonozekbiurka.png?imageMogr2/thumbnail/2048x128');
    const tableTopTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/gorastolika.png?imageMogr2/thumbnail/2048x512');

    // 柜子纹理。
    const cabinetFrontTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/szafkaprzod.png?imageMogr2/thumbnail/1024x1024');
    const cabinetRestTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/szafkaprzodgora.png?imageMogr2/thumbnail/512x1024');

    // 克隆桌腿纹理后旋转，使横向纹理变为竖向。
    const legTexture = useMemo(() => {
        const tex = woodTexture.clone();
        tex.rotation = Math.PI / 2;
        tex.center.set(0.5, 0.5);
        return tex;
    }, [woodTexture]);

    // 桌子配置。
    // 旋转 90°，靠向左墙。
    const tableConfig = useMemo(() => ({
        z: zOffset - 35,          // Z 位置，位于工作室与关于我之间。
        width: 2.0,               // 桌面宽度，旋转后沿墙延伸。
        depth: 0.8,               // 桌面深度，旋转后从墙面伸向走廊。
        height: 1.0,              // 总高度。
        legRadius: 0.08,          // 桌腿厚度。
        topThickness: 0.08,       // 桌面厚度。
        x: -wallX + 0.42,         // 靠近左墙，距离为 depth/2 加少量间隙。
    }), [zOffset, wallX]);

    return (
        <group>
            {/* 顶灯。 */}
            {lights.filter(light => light.z <= zClip).map((light, i) => {
                // 在循环内配置纹理，确保平铺模式正确。
                lampGrilleTexture.wrapS = lampGrilleTexture.wrapT = THREE.ClampToEdgeWrapping;
                lampSideTexture.wrapS = lampSideTexture.wrapT = THREE.ClampToEdgeWrapping; // 侧面也使用边缘钳制，避免条纹。

                return (
                    <group key={`light-${i}`} position={[0, ceilingY, light.z]}>
                        {/* 灯壳：细长的三维长方体。 */}
                        {/* 主体。 */}
                        <mesh position={[0, -0.03, 0]}>
                            <boxGeometry args={[2.0, 0.06, 0.5]} />

                            {/* 短边：左、右。 */}
                            <meshBasicMaterial attach="material-0" color="#e8e8e8" roughness={0.6} />
                            <meshBasicMaterial attach="material-1" color="#e8e8e8" roughness={0.6} />

                            {/* 顶部，隐藏。 */}
                            <meshBasicMaterial attach="material-2" color="#d0d0d0" roughness={0.8} />

                            {/* 底部：格栅纹理。
                                使用透明效果露出内部光源。
                                格栅本身为深色金属。
                            */}
                            <meshBasicMaterial
                                attach="material-3"
                                map={lampGrilleTexture}
                                transparent={true}
                                alphaTest={0.1}
                                side={THREE.DoubleSide}
                                color="#e0e0e0"
                                roughness={0.5}
                            />

                            {/* 长边：前后侧面纹理。 */}
                            <meshBasicMaterial color="#e0e0e0" attach="material-4" map={lampSideTexture} roughness={0.6} />
                            <meshBasicMaterial color="#e0e0e0" attach="material-5" map={lampSideTexture} roughness={0.6} />
                        </mesh>

                        {/* 内部灯板。
                            灯板置于外壳较高处，让下方格栅保持可见。
                        */}
                        <mesh
                            position={[0, -0.059, 0]}
                            rotation={[-Math.PI / 2, 0, 0]}
                        >
                            <planeGeometry args={[1.9, 0.4]} />
                            <meshBasicMaterial
                                color="#ffffff"
                                toneMapped={false}
                                side={THREE.DoubleSide}
                            />
                        </mesh>

                        {/* 实际点光源（PointLight），已禁用。 */}
                        {/* <pointLight
                            position={[0, -1.5, 0]}
                            distance={6}
                            intensity={0.8}
                            color="#ffffff"
                            decay={2}
                        /> */}
                    </group>
                );
            })}

            {/* 桌子：旋转 90° 并靠左墙。 */}
            <group position={[tableConfig.x, floorY, tableConfig.z]} rotation={[0, Math.PI / 2, 0]}>
                {/* 桌腿。 */}
                {[
                    [-tableConfig.width / 2 + 0.1, -tableConfig.depth / 2 + 0.1],
                    [tableConfig.width / 2 - 0.1, -tableConfig.depth / 2 + 0.1],
                    [-tableConfig.width / 2 + 0.1, tableConfig.depth / 2 - 0.1],
                    [tableConfig.width / 2 - 0.1, tableConfig.depth / 2 - 0.1],
                ].map((pos, i) => (
                    <mesh key={`leg-${i}`} position={[pos[0], tableConfig.height / 2, pos[1]]}>
                        <boxGeometry args={[tableConfig.legRadius * 2, tableConfig.height, tableConfig.legRadius * 2]} />
                        <meshBasicMaterial color="#e0e0e0" map={legTexture} roughness={0.8} />
                    </mesh>
                ))}

                {/* 桌面。 */}
                <mesh position={[0, tableConfig.height + tableConfig.topThickness / 2, 0]}>
                    <boxGeometry args={[tableConfig.width, tableConfig.topThickness, tableConfig.depth]} />
                    <meshBasicMaterial color="#e0e0e0" attach="material-0" map={woodTexture} /> {/* 右侧。 */}
                    <meshBasicMaterial color="#e0e0e0" attach="material-1" map={woodTexture} /> {/* 左侧。 */}
                    <meshBasicMaterial color="#e0e0e0" attach="material-2" map={tableTopTexture} roughness={0.5} /> {/* 顶部。 */}
                    <meshBasicMaterial attach="material-3" color="#e0e0e0" />   {/* 底部。 */}
                    <meshBasicMaterial color="#e0e0e0" attach="material-4" map={woodTexture} /> {/* 正面。 */}
                    <meshBasicMaterial color="#e0e0e0" attach="material-5" map={woodTexture} /> {/* 背面。 */}
                </mesh>

                {/* 桌上花盆。 */}
                <mesh
                    position={[0, tableConfig.height + tableConfig.topThickness + 0.2, 0]} // 位于桌面上。
                    rotation={[0, -Math.PI / 4, 0]} // 轻微旋转。
                >
                    <planeGeometry args={[0.3, 0.3 / 0.758]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={flowerTexture}
                        transparent={true}
                        alphaTest={0.1}
                        side={THREE.DoubleSide}
                        roughness={0.8}
                    />
                </mesh>
            </group>

            {/* =============================================
                墙面相框。
                =============================================
                每个相框是带“ramka na zdjecie.png”纹理的平面。
                交替挂在左右墙面。
                
                要调整某个相框的位置或尺寸，
                请编辑上方 frames 数组中的对应对象。
            */}
            {frames.map((frame) => (
                <InspectableFrame
                    key={frame.id}
                    frame={frame}
                    wallX={wallX}
                    frameTexture={frameTexture}
                    framePaintedTexture={framePaintedTexture}
                    CABIN_SKETCH_URL={CABIN_SKETCH_URL}
                    setCameraOverride={setCameraOverride}
                />
            ))}

            {/* 柜子。 */}
            {/* 用简单长方体占位，位于关于我门（左侧 -48）的对面，即右侧 -51。 */}
            <mesh
                position={[wallX - 0.26, floorY + 0.5, zOffset - 51]}
            // X：wallX - depth/2，再减少量边距。
            // Y：floorY + height/2。
            // Z：zOffset - 51，靠近关于我房间的门。
            >
                {/* 尺寸：X=0.5（离墙深度）、Y=1.0（高度）、Z=0.8（沿墙宽度）。 */}
                <boxGeometry args={[0.5, 1.0, 1.0 * 0.8]} />
                {/* 
                    BoxGeometry 各面材质：
                    0：右面（+x），靠墙侧。
                    1：左面（-x），朝走廊的柜子正面，使用 szafkaprzod.png。
                    2：顶面（+y），使用 szafkaprzodgora.png。
                    3：底面（-y），按要求使用 szafkaprzodgora.png。
                    4：正面（+z），使用 szafkaprzodgora.png 作为侧面。
                    5：背面（-z），使用 szafkaprzodgora.png 作为侧面。
                */}
                <meshBasicMaterial color="#e0e0e0" attach="material-0" map={cabinetRestTexture} />
                <meshBasicMaterial color="#e0e0e0" attach="material-1" map={cabinetFrontTexture} />
                <meshBasicMaterial color="#e0e0e0" attach="material-2" map={cabinetRestTexture} />
                <meshBasicMaterial color="#e0e0e0" attach="material-3" map={cabinetRestTexture} />
                <meshBasicMaterial color="#e0e0e0" attach="material-4" map={cabinetRestTexture} />
                <meshBasicMaterial color="#e0e0e0" attach="material-5" map={cabinetRestTexture} />
            </mesh>

            {/* 柜上立式相框。 */}
            {/* 放在柜顶：Y = floorY + 1.0（柜高）+ 相框高度的一半。 */}
            <mesh
                position={[wallX - 0.26, floorY + 1.0 + 0.2, zOffset - 51]}
                rotation={[0, -Math.PI / 2 + 0.2, 0]} // 略微旋转，避免过于笔直。
            >
                <planeGeometry args={[0.3, 0.3 / 0.777]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={standingFrameTexture}
                    transparent={true}
                    alphaTest={0.1}
                    side={THREE.DoubleSide}
                    roughness={0.8}
                />
            </mesh>


            {/* 盆栽树。 */}
            {/* 靠近联系我门（右侧 -62），放在相反的左侧 -58。 */}
            <mesh
                position={[-wallX + 0.8, floorY + 1.5, zOffset - 58]} // 左侧。
                rotation={[0, Math.PI / 4, 0]} // 从左侧朝向走廊。
            >
                <planeGeometry args={[1.8, 1.8 / 0.602]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={treeTexture}
                    transparent={true}
                    alphaTest={0.1}
                    side={THREE.DoubleSide}
                    roughness={0.8}
                />
            </mesh>

            {/* 通风格栅。 */}
            {/* 在每幅画对面的墙上生成格栅。 */}
            {frames.map((frame, i) => {
                const isFrameLeft = frame.side === 'left';
                const grateSide = isFrameLeft ? 'right' : 'left';

                return (
                    <mesh
                        key={`grate-${i}`}
                        position={[
                            grateSide === 'left' ? -wallX + 0.01 : wallX - 0.01,
                            ceilingY - 0.6, // 保持与第一个格栅相同的较高位置。
                            frame.z // Z 位置与画作一致。
                        ]}
                        rotation={[0, grateSide === 'left' ? Math.PI / 2 : -Math.PI / 2, 0]}
                    >
                        <planeGeometry args={[0.8, 0.8 / 1.968]} />
                        <meshBasicMaterial color="#e0e0e0"
                            map={grateTexture}
                            transparent={true}
                            alphaTest={0.1}
                            side={THREE.DoubleSide}
                            roughness={0.8}
                        />
                    </mesh>
                );
            })}

        </group >
    );
};

export default CorridorDecorations;
