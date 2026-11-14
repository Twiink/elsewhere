import { useScene, useSecrets } from '../../context/contexts';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';

import EntranceDoors from './entrance/EntranceDoors';
import EmptyCorridor from './entrance/EmptyCorridor';
import StartupReady from './StartupReady';
import useInfiniteCamera from '../../hooks/useInfiniteCamera';
import SignSystem from './entrance/SignSystem';
import { startLoadingTimeout } from '../../utils/loadingTimeout';
import { registerPreparationRenderer } from '../../utils/renderPreparation';

const CorridorScene = lazy(() => import('./corridor/CorridorScene'));
const DraftPortal = lazy(() => import('./corridor/DraftPortal'));


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
const Experience = ({ onSceneReady, onError, invitationVisible = false }) => {
    // 使用 SceneContext 管理房间状态。
    const { hasEntered, markEntered, enterRoom, isTeleporting, isInRoom } = useScene();
    const { draftPhase, codeControllerOpen } = useSecrets();

    const { camera, gl } = useThree();
    useEffect(() => registerPreparationRenderer(gl), [gl]);
    const [entranceReady, setEntranceReady] = useState(false);
    const [corridorReady, setCorridorReady] = useState(false);
    const [corridorReadiness] = useState(() => {
        let resolve;
        const promise = new Promise(complete => { resolve = complete; });
        return { promise, resolve };
    });

    const handleSceneReady = useCallback(() => {
        setEntranceReady(true);
        onSceneReady();
    }, [onSceneReady]);

    const handleCorridorReady = useCallback(() => {
        performance.mark('app:corridor-ready');
        setCorridorReady(true);
        corridorReadiness.resolve();
    }, [corridorReadiness]);

    const prepareCorridor = useCallback(() => corridorReadiness.promise, [corridorReadiness]);

    useEffect(() => {
        if (!entranceReady || corridorReady) return;
        return startLoadingTimeout(onError);
    }, [entranceReady, corridorReady, onError]);

    // 相机控制：进入后才启用滚动与视差。
    // 传送期间禁用，避免滚动干扰。
    const { setCameraOverride } = useInfiniteCamera({
        segmentLength: 80,
        scrollSpeed: 0.025,
        parallaxIntensity: 0.4,
        smoothing: 0.06,
        scrollEnabled: hasEntered && !isTeleporting && !isInRoom && !draftPhase && !codeControllerOpen,
        parallaxEnabled: hasEntered && !isTeleporting && !isInRoom && !draftPhase && !codeControllerOpen
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
            {draftPhase && draftPhase !== 'loading' && <Suspense fallback={null}><DraftPortal setCameraOverride={setCameraOverride} /></Suspense>}
            <StartupReady onReady={handleSceneReady} onError={onError} />

            {/* 空走廊：为入口阶段提供环境。 */}
            {!hasEntered && (
                <EmptyCorridor camera={camera} />
            )}

            {/* 入口门：进入前可见。 */}
            {!hasEntered && (
                <EntranceDoors
                    position={[0, 0, ENTRANCE_DOORS_Z]}
                    onPrepare={prepareCorridor}
                    onComplete={handleEntranceComplete}
                    invitationVisible={invitationVisible}
                />
            )}

            {/* 单独使用 SignSystem，避免片段嵌套问题。 */}
            {!hasEntered && (
                <SignSystem position={[0, 0, ENTRANCE_DOORS_Z]} />
            )}

            {entranceReady && (
                <Suspense fallback={null}>
                    <CorridorScene
                        onDoorEnter={handleDoorEnter}
                        hasEntered={hasEntered}
                        setCameraOverride={setCameraOverride}
                        onReady={handleCorridorReady}
                        onError={onError}
                    />
                </Suspense>
            )}
        </>
    );
};

export default Experience;

