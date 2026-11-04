import { memo, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useScene } from '../../../context/SceneContext';

// 门位置：第 0 段的全局 Z。
// 计算：10（起点 Z）+ 相对 Z + 2（门偏移）。
const DOOR_POSITIONS_Z = {
    'gallery': -6,   // 10 - 18 + 2
    'studio': -20,   // 10 - 32 + 2
    'about': -36,    // 10 - 48 + 2
    'contact': -50   // 10 - 62 + 2
};

/**
 * TeleportRoom 传送房间组件。
 * 
 * 传送时将相机移到正确的走廊位置。
 * 此组件不渲染房间，而是：
 * 1. 将相机移到门前约 8 单位处。
 * 2. 快速传送时立即触发 completeTeleport，纸幕保持关闭。
 * 3. 正常传送时通知 PaperTransition 打开。
 * 4. SceneContext 触发 pendingDoorClick，由 DoorSection 接收。
 */
const TeleportRoom = memo(() => {
    const {
        teleportTarget,
        teleportPhase,
        openTeleportTransition,
        completeTeleport,
        isFastTeleport,
        isTeleporting
    } = useScene();
    const { camera } = useThree();
    const hasPositioned = useRef(false);

    // 进入 teleporting 阶段时定位相机。
    useEffect(() => {
        if (teleportPhase === 'teleporting' && teleportTarget && !hasPositioned.current) {
            const doorZ = DOOR_POSITIONS_Z[teleportTarget];

            if (doorZ !== undefined) {
                // 相机位于门前 8 单位，即 +Z 方向。
                // 走廊中心 X=0。
                // 标准高度 Y=0.2。
                const targetZ = doorZ + 8;

                // 立即传送相机。
                camera.position.set(0, 0.2, targetZ);

                // 重置旋转，沿走廊正向看向 -Z。
                // 确保门点击动画接管前，相机处于中立状态。
                camera.rotation.set(0, 0, 0);

                hasPositioned.current = true;

                // 短暂延迟，确保帧更新。
                setTimeout(() => {
                    if (isFastTeleport) {
                        // 快速传送：跳过打开纸幕，直接触发门点击。
                        // 纸幕保持关闭，DoorSection 完成后调用 signalRoomReady。
                        completeTeleport();
                    } else {
                        // 正常传送：先打开纸幕，当前未使用，保留以便扩展。
                        openTeleportTransition();
                    }
                }, 50);
            }
        }

        // 传送结束时重置标记。
        if (!isTeleporting) {
            hasPositioned.current = false;
        }
    }, [teleportPhase, teleportTarget, isTeleporting, isFastTeleport, camera, openTeleportTransition, completeTeleport]);

    // 不渲染内容，仅操作相机。
    return null;
});

TeleportRoom.displayName = 'TeleportRoom';

export default TeleportRoom;
