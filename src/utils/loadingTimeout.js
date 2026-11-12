export const LOADING_TIMEOUT_MS = 45000;

// 后台页面暂停渲染时也暂停加载判断；回到前台后重新留出加载时间。
export function startLoadingTimeout(onTimeout, delay = LOADING_TIMEOUT_MS) {
    let timer;
    const cancel = () => {
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', schedule);
    };
    const schedule = () => {
        clearTimeout(timer);
        if (document.hidden) return;
        timer = setTimeout(() => { cancel(); onTimeout(); }, delay);
    };
    document.addEventListener('visibilitychange', schedule);
    schedule();
    return cancel;
}
