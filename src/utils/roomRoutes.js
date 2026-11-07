// 场景状态只依赖纯路由映射，避免个人资料热更新时重新创建 Context。
const PATH_TO_ROOM = {
    '/': null,
    '/about': 'about',
    '/gallery': 'gallery',
    '/studio': 'studio',
    '/contact': 'contact',
};

export function getInitialRoomFromUrl(pathname = window.location.pathname) {
    const path = pathname.replace(/\/+$/, '') || '/';
    return PATH_TO_ROOM[path] ?? null;
}
