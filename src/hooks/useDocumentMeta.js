import { useEffect, useRef } from 'react';
import { useScene } from '../context/SceneContext';
import { siteInfo } from '../data/content';

/**
 * useDocumentMeta：动态元标签与基于 History API 的虚拟路由。
 * 
 * 进入或退出三维房间时，更新浏览器 URL、页面标题和说明，
 * 并处理浏览器前进、后退，
 * 实现连续导航。
 */

const ROOM_META = {
    null: {
        path: '/',
        title: siteInfo.siteTitle,
        description: siteInfo.siteDescription,
    },
    about: {
        path: '/about',
        title: "关于我：ITom 作品集",
        description: "了解 Tomasz Szmajda（ITom）的创意前端开发经历，以及 React、Three.js 和 GSAP 交互作品。",
    },
    gallery: {
        path: '/gallery',
        title: "画廊与项目：ITom 作品集",
        description: "浏览 ITom 的 3D 网页项目画廊，翻转手绘卡片，探索项目介绍与技术细节。",
    },
    studio: {
        path: '/studio',
        title: "工作室：ITom 作品集",
        description: "走进 ITom 的内容工作室，在漂浮的显示器上浏览视频、文章与创作分享。",
    },
    contact: {
        path: '/contact',
        title: "联系我：ITom 作品集",
        description: "与 Tomasz Szmajda（ITom）取得联系，在 3D 联系房间中找到社交平台入口并留下消息。",
    },
};

// 将 URL 路径映射回房间 ID，用于深层链接。
const PATH_TO_ROOM = {
    '/': null,
    '/about': 'about',
    '/gallery': 'gallery',
    '/studio': 'studio',
    '/contact': 'contact',
};

/**
 * 返回初始 URL 对应的房间 ID。
 * 应用启动时调用一次，以决定是否自动传送。
 */
export function getInitialRoomFromUrl() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    return PATH_TO_ROOM[path] !== undefined ? PATH_TO_ROOM[path] : null;
}

export function useDocumentMeta() {
    const { currentRoom, teleportTo, hasEntered } = useScene();
    const isHandlingPopState = useRef(false);
    const lastPushedRoom = useRef(undefined); // 跟踪上次写入的历史，避免重复。

    // 房间变化时更新页面元信息与 URL。
    useEffect(() => {
        const roomKey = currentRoom === null ? 'null' : currentRoom;
        const meta = ROOM_META[roomKey] || ROOM_META['null'];

        // 更新页面标题。
        document.title = meta.title;

        // 更新元说明。
        const descTag = document.querySelector('meta[name="description"]');
        if (descTag) {
            descTag.setAttribute('content', meta.description);
        }

        // 更新 Open Graph 元标签。
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', meta.title);

        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', meta.description);

        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) ogUrl.setAttribute('content', `${siteInfo.url.replace(/\/$/, '')}${meta.path}`);

        // 更新规范链接，让虚拟路由可作为独立页面索引。
        const canonicalTag = document.querySelector('link[rel="canonical"]');
        if (canonicalTag) {
            canonicalTag.setAttribute('href', `${siteInfo.url.replace(/\/$/, '')}${meta.path}`);
        }

        // 非 popstate 事件且房间确实变化时，写入浏览器历史。
        if (!isHandlingPopState.current && lastPushedRoom.current !== currentRoom) {
            // 首次加载用 replaceState，后续导航用 pushState。
            if (lastPushedRoom.current === undefined) {
                window.history.replaceState({ room: currentRoom }, '', meta.path);
            } else {
                window.history.pushState({ room: currentRoom }, '', meta.path);
            }
            lastPushedRoom.current = currentRoom;
        }

        isHandlingPopState.current = false;
    }, [currentRoom]);

    // 处理浏览器前进与后退。
    useEffect(() => {
        const handlePopState = (event) => {
            isHandlingPopState.current = true;
            const targetRoom = event.state?.room ?? null;
            lastPushedRoom.current = targetRoom;

            if (targetRoom === null) {
                // 返回走廊时只触发退出，不进行传送。
                // SceneContext 的 requestExit 负责动画。
                // 当前立即更新元信息。
                const meta = ROOM_META['null'];
                document.title = meta.title;
            } else if (hasEntered) {
                // 传送到目标房间。
                teleportTo(targetRoom);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [teleportTo, hasEntered]);
}
