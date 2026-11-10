import { SceneContext } from './contexts';
import { useState, useCallback, useMemo, useRef } from 'react';
import { getInitialRoomFromUrl } from '../utils/roomRoutes';
import { initialStudioLink } from '../utils/initialLocation';
import { prefetchRoom } from '../config/roomResources';

export const SceneProvider = ({ children }) => {
    // 深层链接：首次加载时检查 URL 是否指向指定房间。
    const [initialRoom] = useState(getInitialRoomFromUrl);
    const deeplinkHandled = useRef(false);
    const studioLinkHandled = useRef(false);
    const consumeStudioLink = useCallback(() => {
        if (studioLinkHandled.current) return false;
        studioLinkHandled.current = true;
        return true;
    }, []);
    const [loadingError, setLoadingError] = useState(false);
    const reportLoadingError = useCallback(() => setLoadingError(true), []);

    const [currentRoom, setCurrentRoom] = useState(null); // null 表示走廊，其他值为 about、portfolio 等房间 ID。
    const [hasEntered, setHasEntered] = useState(false);  // 用户是否点击过入口门。
    const [exitRequested, setExitRequested] = useState(false); // 请求退出房间的信号。
    const [overlayContent, setOverlayContent] = useState(null); // 遮罩内容，例如工作室显示器内容。

    // 传送状态。
    const [teleportTarget, setTeleportTarget] = useState(null); // 目标房间 ID。
    const [isTeleporting, setIsTeleporting] = useState(false);  // 当前处于传送过渡中。
    const [teleportPhase, setTeleportPhase] = useState(null);   // 阶段：closing、teleporting、opening 或 null。
    const [pendingDoorClick, setPendingDoorClick] = useState(null); // 传送后待点击的门标签。
    const [isFastTeleport, setIsFastTeleport] = useState(false); // 快速传送进行中，跳过动画。

    // 移除查看状态，避免全局重渲染。

    const enterRoom = useCallback((roomId) => {
        setCurrentRoom(roomId);
        setExitRequested(false); // 清除待处理退出请求。
        setOverlayContent(null); // 房间变化时清除遮罩。

        // 刚传送进入时的清理。
        // isFastTeleport 由 signalRoomReady 清除，不在此处处理。
        // opening 阶段不清除 teleportPhase，让纸张动画完成。
        setIsTeleporting(false);
        setPendingDoorClick(null);
        // 动画结束后由 finishPaperOpen 清除 teleportPhase。
    }, []);

    const exitRoom = useCallback(() => {
        setCurrentRoom(null);
        setExitRequested(false);
        setOverlayContent(null);
    }, []);

    // 发出退出请求，通知 DoorSection 执行退出动画。
    const requestExit = useCallback(() => {
        setExitRequested(true);
        setOverlayContent(null);
    }, []);

    // DoorSection 处理完后清除退出请求。
    const clearExitRequest = useCallback(() => {
        setExitRequested(false);
    }, []);

    const markEntered = useCallback(() => {
        setHasEntered(true);
    }, []);

    const openOverlay = useCallback((content) => {
        setOverlayContent(content);
    }, []);

    const closeOverlay = useCallback(() => {
        setOverlayContent(null);
    }, []);

    // 传送函数。

    // 用户点击地图房间时开始传送。
    const teleportTo = useCallback((roomId) => {
        if (isTeleporting || roomId === currentRoom) return; // 防止重复传送或传往当前房间。

        void prefetchRoom(roomId).catch(() => {});

        setTeleportTarget(roomId);
        setIsTeleporting(true);
        setIsFastTeleport(true); // 启用快速传送模式。
        setTeleportPhase('closing'); // 纸张开始合拢。
        setOverlayContent(null);
    }, [isTeleporting, currentRoom]);

    // 纸张闭合动画结束后调用，开始实际移动相机。
    const startTeleportTransition = useCallback(() => {
        setTeleportPhase('teleporting');
        // 监听组件在此移动相机。
    }, []);

    // 目标房间加载就绪后调用，开始纸张展开动画。
    // 快速传送时在相机已进入房间后调用。
    const openTeleportTransition = useCallback(() => {
        setTeleportPhase('opening');
    }, []);

    // 纸张展开动画完成后清理。
    const completeTeleport = useCallback(() => {
        // 快速传送时纸张保持闭合，立即触发门点击。
        // DoorSection 调用 signalRoomReady() 后才展开纸张。
        setPendingDoorClick(teleportTarget);

        // 此时不要清除 isTeleporting，需等待 enterRoom() 完成。
        // 这里只清除 target，phase 稍后处理。
        setTeleportTarget(null);
        // 快速传送时 teleportPhase 保持 teleporting，让纸张保持闭合。
    }, [teleportTarget]);

    // 快速传送中，相机进入房间完成后由 DoorSection 调用。
    // 此操作展开纸张并完成传送流程。
    const signalRoomReady = useCallback(() => {
        if (isFastTeleport) {
            // 现在展开纸张。
            setTeleportPhase('opening');
            setIsFastTeleport(false);
        }
    }, [isFastTeleport]);

    // PaperTransition 在纸张展开动画完成时调用。
    // 传送逻辑已完成，只需清除阶段。
    const finishPaperOpen = useCallback(() => {
        setTeleportPhase(null);
    }, []);

    // clearPendingDoorClick 已移除，现由 enterRoom 处理。

    // 发生错误时取消传送。
    const cancelTeleport = useCallback(() => {
        setTeleportTarget(null);
        setIsTeleporting(false);
        setTeleportPhase(null);
        setPendingDoorClick(null);
        setIsFastTeleport(false);
    }, []);

    const value = useMemo(() => ({
        initialStudioLink,
        consumeStudioLink,
        loadingError,
        reportLoadingError,
        currentRoom,
        hasEntered,
        exitRequested,
        overlayContent, // 对外暴露。
        enterRoom,
        exitRoom,
        requestExit,
        clearExitRequest,
        markEntered,
        openOverlay,    // 对外暴露。
        closeOverlay,   // 对外暴露。
        isInRoom: currentRoom !== null,
        // 深层链接。
        initialRoom,
        deeplinkHandled,
        // 传送。
        teleportTarget,
        isTeleporting,
        teleportPhase,
        pendingDoorClick,
        isFastTeleport,
        teleportTo,
        startTeleportTransition,
        openTeleportTransition,
        completeTeleport,
        signalRoomReady,
        finishPaperOpen,
        cancelTeleport,
    }), [
        initialRoom,
        consumeStudioLink,
        loadingError,
        reportLoadingError,
        currentRoom,
        hasEntered,
        exitRequested,
        overlayContent,
        enterRoom,
        exitRoom,
        requestExit,
        clearExitRequest,
        markEntered,
        openOverlay,
        closeOverlay,
        // 传送依赖。
        teleportTarget,
        isTeleporting,
        teleportPhase,
        pendingDoorClick,
        isFastTeleport,
        teleportTo,
        startTeleportTransition,
        openTeleportTransition,
        completeTeleport,
        signalRoomReady,
        finishPaperOpen,
        cancelTeleport
    ]);

    return (
        <SceneContext.Provider value={value}>
            {children}
        </SceneContext.Provider>
    );
};
