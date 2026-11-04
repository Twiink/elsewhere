import { useState, useCallback, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

import InfiniteCorridorManager from './corridor/InfiniteCorridorManager';
import EntranceDoors from './entrance/EntranceDoors';
import EmptyCorridor from './entrance/EmptyCorridor';
import TeleportRoom from './corridor/TeleportRoom';
import RoomWarmup from './corridor/RoomWarmup';
import useInfiniteCamera from '../../hooks/useInfiniteCamera';
import SignSystem from './entrance/SignSystem';
import { useScene } from '../../context/SceneContext';

// 位置关系：
// - 第 -1 段的 SegmentDoors 位于 Z=15。
// - 入口门位于 Z=22，在分段门前方。
// - ITOM 和人物位于 Z≈5.5。
// - 相机从 Z=28 移至 Z=8，停在人物前方。
const ENTRANCE_DOORS_Z = 22;

/**
 * Experience 场景组件。
 * 
 * 流程：
 * 1. 加载界面淡出，显示 3D 入口门。
 * 2. 点击门后开门，相机穿过入口。
 * 3. 门后是带有 ITOM 标识的无限走廊。
 */
const Experience = ({ isLoaded, onSceneReady, performanceTier }) => {
    // 使用 SceneContext 管理房间状态。
    const { hasEntered, markEntered, enterRoom, isTeleporting, isInRoom, pendingDoorClick } = useScene();

    const { camera } = useThree();

    // 相机控制：进入后才启用滚动与视差。
    // 传送期间禁用，避免滚动干扰。
    const { setCameraOverride } = useInfiniteCamera({
        segmentLength: 80,
        scrollSpeed: 0.025,
        parallaxIntensity: 0.4,
        smoothing: 0.06,
        scrollEnabled: hasEntered && !isTeleporting && !isInRoom,
        parallaxEnabled: hasEntered && !isTeleporting && !isInRoom
    });

    // 注意：相机接管现由 DoorSection.jsx 直接管理。
    // 此处原先调用 setCameraOverride 的 useEffect 已移除，
    // 它会与 DoorSection 的直接控制冲突，导致相机跳动。
    // scrollEnabled 和 parallaxEnabled 已负责在房间内禁用滚动。


    // 处理入口动画完成事件。
    const handleEntranceComplete = useCallback(() => {
        markEntered();
    }, [markEntered]);

    // 处理从走廊进入房间的事件。
    const handleDoorEnter = useCallback((doorId) => {
        enterRoom(doorId);
        // console.log('正在进入：', doorId);
    }, [enterRoom]);

    // 优化：低性能档采用更简单的光照。
    const isLowTier = performanceTier === 'LOW';

    return (
        <>
            {/* 房间预热：加载界面期间在屏幕外预渲染全部房间。 */}
            {/* RoomWarmup 在下方 500 单位处挂载四个房间，并通过 gl.compile() 编译着色器，
                随后卸载自身并触发 onSceneReady，确保走廊分段
                与房间着色器都在用户开始交互前完成预编译。 */}
            <RoomWarmup onWarmupComplete={onSceneReady} isLowTier={isLowTier} />

            {/* 全局光照 */}
            {/* <ambientLight intensity={isLowTier ? 2.5 : 2.2} /> */}
            {/* <directionalLight
                position={[5, 10, 5]}
                intensity={0.8}
                color="#acacac"
                castShadow={!isLowTier}
                shadow-mapSize={[1024, 1024]}
            /> */}
            {/* <directionalLight position={[-5, 8, -10]} intensity={0.4} color="#ffffff" /> */}

            {/* 空走廊：为入口阶段提供环境。 */}
            {!hasEntered && (
                <EmptyCorridor camera={camera} />
            )}

            {/* 入口门：进入前可见。 */}
            {!hasEntered && (
                <EntranceDoors
                    position={[0, 0, ENTRANCE_DOORS_Z]}
                    onComplete={handleEntranceComplete}
                />
            )}

            {/* 单独使用 SignSystem，避免片段嵌套问题。 */}
            {!hasEntered && (
                <SignSystem position={[0, 0, ENTRANCE_DOORS_Z]} />
            )}

            {/* 无限走廊：入口阶段隐藏第 -1 段的 SegmentDoors。 */}
            <InfiniteCorridorManager
                onDoorEnter={handleDoorEnter}
                hideDoorsForSegments={hasEntered ? [] : [-1]} // 进入前隐藏第 -1 段的门。
                clipSegmentNeg1={!hasEntered} // 进入前裁切第 -1 段的画面。
                setCameraOverride={setCameraOverride}
            />

            {/* 传送房间：传送时直接渲染目标房间。 */}
            <TeleportRoom />
        </>
    );
};

export default Experience;

