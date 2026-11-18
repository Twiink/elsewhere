// 浏览器限制站点存储时，偏好与探索仍在本次访问中生效。
export function readStorage(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}

export function writeStorage(key, value) {
    try { localStorage.setItem(key, value); } catch { /* 保留内存中的当前状态。 */ }
}
