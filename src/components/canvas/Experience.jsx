import { useScene } from '../../context/contexts';
import { useCallback } from 'react';
import { useThree } from '@react-three/fiber';

import InfiniteCorridorManager from './corridor/InfiniteCorridorManager';
import EntranceDoors from './entrance/EntranceDoors';
import EmptyCorridor from './entrance/EmptyCorridor';
import TeleportRoom from './corridor/TeleportRoom';
import StartupReady from './StartupReady';
import useInfiniteCamera from '../../hooks/useInfiniteCamera';
import SignSystem from './entrance/SignSystem';


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
const Experience = ({ onSceneReady, onError }) => {
    // 使用 SceneContext 管理房间状态。
    const { hasEntered, markEntered, enterRoom, isTeleporting, isInRoom } = useScene();

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

    // 处理入口动画完成事件。
    const handleEntranceComplete = useCallback(() => {
        markEntered();
    }, [markEntered]);

    // 处理从走廊进入房间的事件。
    const handleDoorEnter = useCallback((doorId) => {
        enterRoom(doorId);
    }, [enterRoom]);

    return (
        <>
            <StartupReady onReady={onSceneReady} onError={onError} />

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

