import { useAudio } from '../../../context/contexts';
import { useActiveFrame as useFrame } from '../../../hooks/useActiveFrame';
import { useRef, useEffect } from 'react';
import { useTextureCopy } from '../../../hooks/useTextureCopy';
import { useThree } from '@react-three/fiber';
import { useTexture, PositionalAudio } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';


// 分段自动门音频的全局设置。
const SEGMENT_DOOR_AUDIO_SETTINGS = {
    openVolume: 0.15, // otwarciedrzwi 开门音效音量。
    closeVolume: 0.15,// zamknieciedrzwi 关门音效音量。
    distance: 4,      // 空间音频参考距离。
    rolloff: 2,       // 衰减系数。
    closeDelay: 0.5   // 播放关门音效前等待的秒数。
};

/**
 * SegmentDoors 分段门组件。
 * 
 * 位于走廊分段尽头的纹理双开门。
 * 外观与 EntranceDoors 完全一致，但采用自动开门逻辑。
 */
const SegmentDoors = ({
    position = [0, 0, 0],
    corridorHeight = 3.5,
    corridorWidth = 7
}) => {
    const leftDoorRef = useRef();
    const rightDoorRef = useRef();
    const leftHandleRef = useRef();
    const rightHandleRef = useRef();
    const isOpenRef = useRef(false);

    // 三维位置音频引用。
    const openAudioRef = useRef();
    const closeAudioRef = useRef();
    const closeAudioTimeoutRef = useRef(null);

    const { camera } = useThree();
    const { globalVolume, isMuted } = useAudio();

    // 加载纹理。
    // 注意：用户在 corridor/doors/ 中指定了具体文件名。
    const frameTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/doors/frame_sketch.png?imageMogr2/thumbnail/512x512');
    const doorLeftTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/doors/doorrleft.png?imageMogr2/thumbnail/256x512');
    const doorRightTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/doors/dorright.png?imageMogr2/thumbnail/256x512');
    const handleLeftTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/doors/handle_left_sketch.png?imageMogr2/thumbnail/256x512');
    const handleRightTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/doors/handle_right_sketch.png?imageMogr2/thumbnail/256x512');
    const doorBackTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/doors/door_back.png?imageMogr2/thumbnail/256x512');
    const edgeTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/doors/pien.png?imageMogr2/thumbnail/32x256');
    const wallSource = useTexture('https://media.secknow-ai.com/space/textures/corridor/wall_texture.png?imageMogr2/thumbnail/1024x512');
    const wallTexture = useTextureCopy(wallSource, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });

    // 踢脚线纹理，1582×94 像素。
    const baseboardTexSrc = useTexture('https://media.secknow-ai.com/space/textures/corridor/texturadoprogow.png');
    const NATURAL_TILE_W = (1582 / 94) * 0.15; // 每次自然平铺约 2.524 单位。

    // 来自 EntranceDoors 的尺寸。
    // 门尺寸按原始纹理比例计算，332/848≈0.391。
    const doorHeight = 2.4;
    const doorWidth = doorHeight * 0.391;
    const doorOpeningWidth = doorWidth * 2;
    const wallThickness = 0.12;

    // 门框按原始纹理比例计算，718/877≈0.818。
    const frameWidth = doorOpeningWidth + 0.16;
    const frameHeight = frameWidth * (1 / 0.818);

    // 地面 Y=-corridorHeight/2=-1.75。
    const floorY = -corridorHeight / 2;
    const doorBottomY = floorY;
    const doorCenterY = doorBottomY + doorHeight / 2;
    const frameCenterY = doorBottomY + frameHeight / 2;

    const wallCenterY = floorY + corridorHeight / 2;
    const topWallHeight = corridorHeight - doorHeight;
    const topWallCenterY = doorBottomY + doorHeight + topWallHeight / 2;
    const sideWallWidth = (corridorWidth - doorOpeningWidth) / 2;

    const thresholdTexture = useTextureCopy(baseboardTexSrc, {
        wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
        colorSpace: THREE.SRGBColorSpace,
        repeatX: (frameWidth + 0.1) / NATURAL_TILE_W,
    });
    const boardTexture = useTextureCopy(baseboardTexSrc, {
        wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
        colorSpace: THREE.SRGBColorSpace,
        repeatX: sideWallWidth / NATURAL_TILE_W,
    });
    useEffect(() => () => {
        if (closeAudioTimeoutRef.current) clearTimeout(closeAudioTimeoutRef.current);
    }, []);

    // 触发距离。
    const openDistance = 12;
    const closeDistance = 18; // 距离足够远时关门。
    // 逻辑区分：靠近开门，远离关门。
    // 原逻辑为 dist < open 时开门，dist > close 时关门。

    useFrame(() => {
        if (!leftDoorRef.current || !rightDoorRef.current) return;

        // 检查相机与门的 Z 距离，并结合 X 范围。
        // 正常滚动时，相机 X 受视差限制在 [-0.3, 0.3]。
        // 进入联系我等房间时，相机 X 会超过 1.2。
        const distanceZ = Math.abs(camera.position.z - position[2]);
        const distanceX = Math.abs(camera.position.x - position[0]);

        if (distanceZ < openDistance && distanceX < 0.8 && !isOpenRef.current) {
            isOpenRef.current = true;

            // 清除待执行的关门音效定时器。
            if (closeAudioTimeoutRef.current) clearTimeout(closeAudioTimeoutRef.current);

            if (openAudioRef.current) {
                const vol = isMuted ? 0 : SEGMENT_DOOR_AUDIO_SETTINGS.openVolume * globalVolume;
                openAudioRef.current.setVolume(vol);
                if (openAudioRef.current.isPlaying) openAudioRef.current.stop();
                openAudioRef.current.play();
            }

            // 把手动画。
            if (leftHandleRef.current) {
                gsap.to(leftHandleRef.current.rotation, { z: 0.4, duration: 0.15, ease: 'power2.out' });
            }
            if (rightHandleRef.current) {
                gsap.to(rightHandleRef.current.rotation, { z: -0.4, duration: 0.15, ease: 'power2.out' });
            }

            // 开门。
            gsap.to(leftDoorRef.current.rotation, { y: -Math.PI * 0.55, duration: 0.9, ease: 'power2.out', delay: 0.1 });
            gsap.to(rightDoorRef.current.rotation, { y: Math.PI * 0.55, duration: 0.9, ease: 'power2.out', delay: 0.1 });
        }

        // 用户沿 Z 远离，或沿 X 侧向进入房间时关门。
        if ((distanceZ > closeDistance || distanceX > 1.5) && isOpenRef.current) {
            isOpenRef.current = false;

            if (closeAudioRef.current) {
                closeAudioTimeoutRef.current = setTimeout(() => {
                    const vol = isMuted ? 0 : SEGMENT_DOOR_AUDIO_SETTINGS.closeVolume * globalVolume;
                    if (closeAudioRef.current) {
                        closeAudioRef.current.setVolume(vol);
                        if (closeAudioRef.current.isPlaying) closeAudioRef.current.stop();
                        closeAudioRef.current.play();
                    }
                }, SEGMENT_DOOR_AUDIO_SETTINGS.closeDelay * 1000);
            }

            // 关门。
            gsap.to(leftDoorRef.current.rotation, { y: 0, duration: 0.7, ease: 'power2.in' });
            gsap.to(rightDoorRef.current.rotation, { y: 0, duration: 0.7, ease: 'power2.in' });

            // 重置把手。
            if (leftHandleRef.current) {
                gsap.to(leftHandleRef.current.rotation, { z: 0, duration: 0.2, ease: 'power2.out', delay: 0.5 });
            }
            if (rightHandleRef.current) {
                gsap.to(rightHandleRef.current.rotation, { z: 0, duration: 0.2, ease: 'power2.out', delay: 0.5 });
            }
        }
    });

    // 墙面装饰。
    const whileTrueTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/decorations/while_true_loop.png?imageMogr2/thumbnail/1249x624');
    const coffeeTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/decorations/coffee_debug.png?imageMogr2/thumbnail/1761x880');
    const ideaTexture = useTexture('https://media.secknow-ai.com/space/textures/corridor/decorations/idea_process.png?imageMogr2/thumbnail/604x1208');

    return (
        <group position={[position[0], 0, position[2]]}>
            {/* 左墙面板：头脑风暴。 */}
            <mesh position={[-(doorOpeningWidth / 2 + sideWallWidth / 2), wallCenterY, 0]}>
                <boxGeometry args={[sideWallWidth, corridorHeight, wallThickness]} />
                <meshBasicMaterial color="#e0e0e0" map={wallTexture} roughness={0.95} />
            </mesh>
            {/* 左侧装饰：构思过程。 */}
            {/* 
                左侧图像调节：
                - rotation={[x, y, z]}：旋转，例如 z=0.1 表示轻微倾斜。
                - args={[宽度, 高度]}：尺寸。
            */}
            <mesh
                position={[-(doorOpeningWidth / 2 + sideWallWidth / 2), wallCenterY, 0.07]}
                rotation={[0, 0, 0.05]}
            >
                <planeGeometry args={[1.2, 1.2 / 0.402]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={ideaTexture}
                    transparent={true}
                    roughness={0.9}
                    alphaTest={0.1}
                />
            </mesh>

            {/* 右墙面板：咖啡与程序错误。 */}
            <mesh position={[(doorOpeningWidth / 2 + sideWallWidth / 2), wallCenterY, 0]}>
                <boxGeometry args={[sideWallWidth, corridorHeight, wallThickness]} />
                <meshBasicMaterial color="#e0e0e0" map={wallTexture} roughness={0.95} />
            </mesh>
            {/* 右侧装饰：咖啡。 */}
            {/* 
                右侧图像调节：
            */}
            <mesh
                position={[(doorOpeningWidth / 2 + sideWallWidth / 2), wallCenterY, 0.08]}
                rotation={[0, 0, -0.05]}
            >
                <planeGeometry args={[2.2, 2.2 / 1.833]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={coffeeTexture}
                    transparent={true}
                    roughness={0.9}
                    alphaTest={0.1}
                />
            </mesh>

            {/* 顶部墙面板：While True 图案。 */}
            <mesh position={[0, topWallCenterY, 0]}>
                <boxGeometry args={[doorOpeningWidth, topWallHeight, wallThickness]} />
                <meshBasicMaterial color="#e0e0e0" map={wallTexture} roughness={0.95} />
            </mesh>
            {/* 顶部装饰：While True 图案。 */}
            <mesh position={[0, topWallCenterY, 0.07]}>
                <planeGeometry args={[1.4, 1.4 / 1.833]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={whileTrueTexture}
                    transparent={true}
                    roughness={0.9}
                    alphaTest={0.1}
                />
            </mesh>

            {/* 带纹理的门框。 */}
            {/* 移至 Z=0.09，位于踢脚线 Z=0.07 前方，遮住门洞边缘。 */}
            <mesh position={[0, frameCenterY, 0.09]}>
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
                <mesh position={[doorWidth / 2, 0, 0.06]}>
                    <boxGeometry args={[doorWidth, doorHeight, 0.04]} />
                    <meshBasicMaterial color="#e0e0e0" map={edgeTexture} roughness={0.9} />
                </mesh>

                {/* 正面纹理平面。 */}
                <mesh position={[doorWidth / 2, 0, 0.09]}>
                    <planeGeometry args={[doorWidth, doorHeight]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={doorLeftTexture}
                        transparent={true}
                        alphaTest={0.5}
                        roughness={0.8}
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

                {/* 把手层。 */}
                <group ref={leftHandleRef} position={[doorWidth / 2 + 0.357, -0.099, 0.10]}>
                    <mesh position={[-0.357, 0.099, 0]}>
                        <planeGeometry args={[doorWidth, doorHeight]} />
                        <meshBasicMaterial color="#e0e0e0"
                            map={handleLeftTexture}
                            transparent={true}
                            alphaTest={0.5}
                            depthWrite={false}
                        />
                    </mesh>
                </group>
            </group>

            {/* 右门。 */}
            <group ref={rightDoorRef} position={[doorWidth, doorCenterY, 0]}>
                {/* 带边缘纹理的实体三维门体。 */}
                <mesh position={[-doorWidth / 2, 0, 0.06]}>
                    <boxGeometry args={[doorWidth, doorHeight, 0.04]} />
                    <meshBasicMaterial color="#e0e0e0" map={edgeTexture} roughness={0.9} />
                </mesh>

                {/* 正面纹理平面。 */}
                <mesh position={[-doorWidth / 2, 0, 0.09]}>
                    <planeGeometry args={[doorWidth, doorHeight]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={doorRightTexture}
                        transparent={true}
                        alphaTest={0.5}
                        roughness={0.8}
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

                {/* 把手层。 */}
                <group ref={rightHandleRef} position={[-doorWidth / 2 - 0.357, -0.099, 0.10]}>
                    <mesh position={[0.357, 0.099, 0]}>
                        <planeGeometry args={[doorWidth, doorHeight]} />
                        <meshBasicMaterial color="#e0e0e0"
                            map={handleRightTexture}
                            transparent={true}
                            alphaTest={0.5}
                            depthWrite={false}
                        />
                    </mesh>
                </group>
            </group>

            {/* 门区暖色光照，已禁用。 */}
            {/* <pointLight
                position={[0, doorBottomY + doorHeight * 0.5, 1]}
                intensity={0.6}
                color="#fff8e8"
                distance={6}
                decay={2}
            /> */}
            {/* 门槛条。 */}
            {(() => {
                // =============================================
                // 尽头门的门槛调节。
                // =============================================
                // THRESHOLD_DEPTH：门槛沿走廊 Z 轴的深度。
                // THRESHOLD_WIDTH：门槛沿走廊 X 轴的宽度。
                const THRESHOLD_DEPTH = 0.15;
                const THRESHOLD_WIDTH = frameWidth + 0.1;

                return (
                    <mesh
                        position={[0, floorY + 0.005, 0]}
                        rotation={[-Math.PI / 2, 0, 0]}
                    >
                        <planeGeometry args={[THRESHOLD_WIDTH, THRESHOLD_DEPTH]} />
                        <meshBasicMaterial color="#e0e0e0"
                            map={thresholdTexture}
                            roughness={0.9}
                            metalness={0}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                );
            })()}
            {/* 左侧踢脚线。 */}
            {(() => {
                return (
                    <mesh position={[-(doorOpeningWidth / 2 + sideWallWidth / 2), floorY + 0.075, wallThickness / 2 + 0.01]}>
                        <planeGeometry args={[sideWallWidth, 0.15]} />
                        <meshBasicMaterial color="#e0e0e0" map={boardTexture} roughness={0.8} side={THREE.DoubleSide} />
                    </mesh>
                );
            })()}

            {/* 右侧踢脚线。 */}
            {(() => {
                return (
                    <mesh position={[(doorOpeningWidth / 2 + sideWallWidth / 2), floorY + 0.075, wallThickness / 2 + 0.01]}>
                        <planeGeometry args={[sideWallWidth, 0.15]} />
                        <meshBasicMaterial color="#e0e0e0" map={boardTexture} roughness={0.8} side={THREE.DoubleSide} />
                    </mesh>
                );
            })()}

            {/* 空间音频节点。 */}
            <PositionalAudio
                ref={openAudioRef}
                url="/sounds/otwarciedrzwi.mp3"
                distanceModel="exponential"
                rolloffFactor={SEGMENT_DOOR_AUDIO_SETTINGS.rolloff}
                refDistance={SEGMENT_DOOR_AUDIO_SETTINGS.distance}
                loop={false}
            />
            <PositionalAudio
                ref={closeAudioRef}
                url="/sounds/zamknieciedrzwi.mp3"
                distanceModel="exponential"
                rolloffFactor={SEGMENT_DOOR_AUDIO_SETTINGS.rolloff}
                refDistance={SEGMENT_DOOR_AUDIO_SETTINGS.distance}
                loop={false}
            />
        </group>
    );
};

export default SegmentDoors;
