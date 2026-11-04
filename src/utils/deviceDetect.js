/**
 * 设备检测工具函数。
 */

// 仅计算一次的全局常量。
export const isTouchDevice = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
};
