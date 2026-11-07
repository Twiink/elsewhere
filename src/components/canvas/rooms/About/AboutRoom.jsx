import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, PositionalAudio } from '@react-three/drei';
import * as THREE from 'three';
import PaperAirplane from './PaperAirplane';
import InfiniteSkyManager from './InfiniteSkyManager';
import { useScene } from '../../../../context/SceneContext';
import { useAchievements } from '../../../../context/AchievementsContext';
import { useAudio } from '../../../../context/AudioManager';

// 循环飞行分块长度，与 SkyChunk 一致。
const CHUNK_LENGTH = 40;

// ============================================
// ⚙️ 音频设置：在此调整。
// 修改这些数值可调整风声的音量和可听范围。
// ============================================
export const AUDIO_SETTINGS = {
    volume: 2.5,
    distance: 2,
    rolloff: 0.8
};

const AboutRoom = ({ showRoom, onReady, isExiting, isWarmup }) => {
    const { camera } = useThree();
    const { isTeleporting, overlayContent } = useScene();
    const { showTutorial, unlockAchievement, hidePopup } = useAchievements();
    const { globalVolume, isMuted } = useAudio();
    const effectiveVolume = isMuted ? 0 : AUDIO_SETTINGS.volume * globalVolume;

    const audioRef = useRef();
    useEffect(() => {
        if (audioRef.current && audioRef.current.setVolume) {
            audioRef.current.setVolume(effectiveVolume);
        }
    }, [effectiveVolume]);

    // 用 ref 保存遮罩状态，供事件监听读取，避免闭包过期。
    const overlayRef = useRef(overlayContent);
    useEffect(() => {
        overlayRef.current = overlayContent;
    }, [overlayContent]);

    useEffect(() => {
        if (isExiting || isTeleporting) {
            hidePopup();
        }
    }, [isExiting, isTeleporting, hidePopup]);

    // 跟踪是否已发出就绪信号。
    const hasSignaledReady = useRef(false);
    const frameCount = useRef(0);
    const FRAMES_TO_WAIT = 25;

    // 带惯性的滚动状态。
    const scrollPosition = useRef(0);
    const scrollVelocity = useRef(0);

    // 首次渲染时保存相机基础旋转。
    const baseCameraRotation = useRef({ x: 0, y: 0, z: 0 });
    const isFlightActive = useRef(false);

    // 平滑后的飞行效果值。
    const currentBank = useRef(0);
    const currentPitch = useRef(0);

    // 整个房间的引用，用于管理视锥裁剪。
    const roomRef = useRef();
    const airplaneGroupRef = useRef();

    // 传送开始时重置相机旋转。
    useEffect(() => {
        if (isTeleporting) {
            // 重置飞行效果，防止传送后相机倾斜。
            currentBank.current = 0;
            currentPitch.current = 0;
            isFlightActive.current = false;
            baseCameraRotation.current = { x: 0, y: 0, z: 0 };
            scrollPosition.current = 0;
            scrollVelocity.current = 0;
        }
    }, [isTeleporting]);

    // 就绪检测与飞行动画。
    useFrame((state, delta) => {
        if (!hasSignaledReady.current) {
            // 强制渲染全部对象，包括视锥外对象，以编译着色器。
            if (roomRef.current) {
                roomRef.current.traverse((child) => {
                    if (child.isMesh) child.frustumCulled = false;
                });
            }

            frameCount.current++;
            if (frameCount.current >= FRAMES_TO_WAIT) {
                // 恢复视锥裁剪，提升性能。
                if (roomRef.current) {
                    roomRef.current.traverse((child) => {
                        if (child.isMesh) child.frustumCulled = true;
                    });
                }

                hasSignaledReady.current = true;
                onReady?.();
                // 展示房间时触发成就提示。
                if (!isTeleporting && !isExiting) {
                    if (!isWarmup) setTimeout(() => showTutorial('about_fly'), 2000);
                }
            }
        }

        // 传送期间停止全部相机控制。
        // 传送期间由 TeleportRoom 管理相机位置与旋转。
        if (isTeleporting) {
            return;
        }

        // 将速度累加至位置，产生惯性。
        scrollPosition.current += scrollVelocity.current * delta * 60;
        // 不限制范围，也允许向后飞行。

        // 摩擦力。
        scrollVelocity.current *= 0.95;
        if (Math.abs(scrollVelocity.current) < 0.001) {
            scrollVelocity.current = 0;
        }

        // 用户滚动足够距离时解锁成就。
        if (scrollPosition.current > 15) {
            unlockAchievement('about_fly');
        }

        // 退出时完全禁用控制。
        // DoorSection 负责退出动画的位置与旋转。
        // 停止修改相机，避免冲突和跳变。
        if (isExiting) {
            return;
        }

        // 飞行效果，仅修改相机旋转。
        // 首次滚动后才启用飞行。
        if (!isFlightActive.current && scrollPosition.current > 0.5) {
            isFlightActive.current = true;
            baseCameraRotation.current = {
                x: camera.rotation.x,
                y: camera.rotation.y,
                z: camera.rotation.z
            };
        }

        if (isFlightActive.current) {
            // 获取当前分块内的进度，范围 0..1。
            const chunkProgress = (scrollPosition.current % CHUNK_LENGTH) / CHUNK_LENGTH;

            // 飞行动作模式，每个分块从头循环。
            // 分块进度较小时乘以曲线，放缓起步。
            let bankAngle = Math.sin(chunkProgress * Math.PI * 2) * 0.12;
            let pitchAngle = Math.sin(chunkProgress * Math.PI * 4) * 0.05;

            // 在最初几个单位内逐渐引入飞行效果。
            const flightProgress = Math.min(1, (scrollPosition.current - 0.5) / 5.0);
            bankAngle *= flightProgress;
            pitchAngle *= flightProgress;

            // 平滑插值。
            const lerpSpeed = 1 - Math.pow(0.02, delta);
            currentBank.current = THREE.MathUtils.lerp(currentBank.current, bankAngle, lerpSpeed);
            currentPitch.current = THREE.MathUtils.lerp(currentPitch.current, pitchAngle, lerpSpeed);

            // 相机值为基础值加效果偏移。
            camera.rotation.x = baseCameraRotation.current.x + currentPitch.current;
            camera.rotation.z = baseCameraRotation.current.z + currentBank.current;
        } else {
            // 飞行未启用时始终归零。
            currentBank.current = 0;
            currentPitch.current = 0;
        }

        // 始终同步应用于纸飞机，保持正确对齐。
        // pitch 为 0 时，rotation.x 为 0.1。
        // bank 为 0 时，rotation.z 为 0。
        if (airplaneGroupRef.current) {
            airplaneGroupRef.current.rotation.x = currentPitch.current * 3 + 0.1;
            airplaneGroupRef.current.rotation.z = -currentBank.current * 2;
        }
    });

    // 处理桌面端滚轮。
    useEffect(() => {
        const handleWheel = (e) => {
            if (overlayRef.current) return; // 遮罩打开时禁止滚动。
            scrollVelocity.current += e.deltaY * 0.002;
        };

        window.addEventListener('wheel', handleWheel, { passive: true });
        return () => window.removeEventListener('wheel', handleWheel);
    }, []);

    // 移动端触摸：纵向滑动转换为滚动。
    const lastTouchY = useRef(0);
    useEffect(() => {
        const handleTouchStart = (e) => {
            if (e.touches.length === 1) {
                lastTouchY.current = e.touches[0].clientY;
            }
        };

        const handleTouchMove = (e) => {
            if (overlayRef.current) return; // 遮罩打开时禁止滚动。
            if (e.touches.length === 1) {
                const deltaY = lastTouchY.current - e.touches[0].clientY;
                lastTouchY.current = e.touches[0].clientY;
                // 将触摸位移转换为滚动速度。
                scrollVelocity.current += deltaY * 0.005;
            }
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
        };
    }, []);

    return (
        <group ref={roomRef} position={[0, 0, -25]}>
            {!isWarmup && (
                <PositionalAudio
                    ref={audioRef}
                    url="/sounds/szumwiatru.mp3"
                    distanceModel="exponential"
                    refDistance={AUDIO_SETTINGS.distance}
                    rolloffFactor={AUDIO_SETTINGS.rolloff}
                    loop
                    autoplay
                    volume={effectiveVolume}
                />
            )}

            {/* 跟随相机动作的纸飞机。 */}
            <group ref={airplaneGroupRef} position={[0, -0.3, 1]}>
                <PaperAirplane
                    scale={0.8}
                    color="#faf8f5"
                />
            </group>

            {/* 无限天空、云层与故事里程碑。 */}
            <InfiniteSkyManager scrollProgressRef={scrollPosition} />

            {/* 天空背景。 */}
            <mesh position={[0, 0, -200]}>
                <planeGeometry args={[300, 150]} />
                <meshBasicMaterial color="#87CEEB" side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
};

export default AboutRoom;
