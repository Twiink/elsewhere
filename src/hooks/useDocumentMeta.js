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
        title: `关于我 | ${siteInfo.siteTitle}`,
        description: siteInfo.aboutMe,
    },
    gallery: {
        path: '/gallery',
        title: `画廊与项目 | ${siteInfo.siteTitle}`,
        description: "翻转手绘卡片，逛逛项目画廊，看看有趣的想法。",
    },
    studio: {
        path: '/studio',
        title: `生活手记 | ${siteInfo.siteTitle}`,
        description: "爬过的山、一起通关的游戏，还有随手画下的小片段，都记在这里。",
    },
    contact: {
        path: '/contact',
        title: `联系我 | ${siteInfo.siteTitle}`,
        description: siteInfo.contact.description,
    },
};

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
