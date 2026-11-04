import { useRef, useState, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// 直接导入全部房间组件。
import GalleryRoom from '../rooms/Gallery/GalleryRoom';
import StudioRoom from '../rooms/Studio/StudioRoom';
import AboutRoom from '../rooms/About/AboutRoom';
import ContactRoom from '../rooms/Contact/ContactRoom';

/**
 * RoomWarmup 房间预热组件。
 * 
 * 加载阶段在屏幕外挂载全部四个房间，
 * 强制编译着色器并将纹理上传至 GPU；几帧后
 * 卸载房间以释放内存，确保首次进入时
 * 不会因着色器编译卡顿。
 * 
 * 位于场景下方 500 单位处，因此不可见。
 * 音频在此距离也无法听见。
 */
const RoomWarmup = ({ onWarmupComplete, isLowTier }) => {
    const [isDone, setIsDone] = useState(false);
    const frameCount = useRef(0);
    const completeFired = useRef(false);
    const { gl, scene, camera } = useThree();

    // 等待房间渲染几帧，再编译并卸载。
    const warmupStart = useRef(performance.now());

    useFrame(() => {
        if (isDone || completeFired.current) return;

        frameCount.current++;

        // 低性能档跳过预热，但仍等待一帧，让入口挂载。
        const targetFrames = isLowTier ? 1 : 3;

        if (frameCount.current >= targetFrames) {
            completeFired.current = true;

            const finishWarmup = () => {
                const warmupDuration = ((performance.now() - warmupStart.current) / 1000).toFixed(2);
                // console.info(`🔥 GPU 与着色器预热完成： ${warmupDuration}s ${isLowTier ? '（低性能档跳过）' : ''}`);
                
                requestAnimationFrame(() => {
                    setIsDone(true);
                    onWarmupComplete?.();
                });
            };

            // 低性能档跳过开销较大的 gl.compileAsync，避免内存不足和上下文丢失。
            if (isLowTier) {
                finishWarmup();
                return;
            }

            // 强制编译场景内全部着色器，包括预热房间。
            // 使用 compileAsync，避免阻塞主线程。
            if (gl.compileAsync) {
                gl.compileAsync(scene, camera, scene)
                    .then(finishWarmup)
                    .catch((err) => {
                        console.error("异步编译失败，改用同步编译", err);
                        gl.compile(scene, camera);
                        finishWarmup();
                    });
            } else {
                gl.compile(scene, camera);
                finishWarmup();
            }
        }
    });

    if (isDone) return null;

    // 低性能设备完全不挂载预热房间，防止 WebGL 上下文丢失。
    if (isLowTier) return null;

    // 空处理函数，满足房间所需属性，避免报错。
    const noop = () => {};

    return (
        <group position={[0, -500, 0]}>
            {/* 在 Suspense 内挂载全部房间，放置于相机下方远处。 */}
            <Suspense fallback={null}>
                <group position={[-20, 0, 0]}>
                    <GalleryRoom showRoom={true} onReady={noop} isExiting={false} isWarmup={true} />
                </group>
            </Suspense>
            <Suspense fallback={null}>
                <group position={[20, 0, 0]}>
                    <StudioRoom showRoom={true} onReady={noop} isExiting={false} isWarmup={true} />
                </group>
            </Suspense>
            <Suspense fallback={null}>
                <group position={[-20, 0, -50]}>
                    <AboutRoom showRoom={true} onReady={noop} isExiting={false} isWarmup={true} />
                </group>
            </Suspense>
            <Suspense fallback={null}>
                <group position={[20, 0, -50]}>
                    <ContactRoom showRoom={true} onReady={noop} isExiting={false} isWarmup={true} />
                </group>
            </Suspense>
        </group>
    );
};

export default RoomWarmup;
