/**
 * 简单的全局背景音乐管理器。
 */

let bgMusicAudio = null;
let isMuted = false;
let bgMusicStarted = false;

// 初始化背景音乐。
export const initAudio = () => {
    if (typeof window === 'undefined') return;

    // 从 localStorage 同步静音状态，与 AudioManager 上下文使用同一键。
    const savedMuted = localStorage.getItem('audio_muted');
    isMuted = savedMuted === 'true';

    if (!bgMusicAudio) {
        // 使用 public/sounds/ 中提供的音频文件。
        bgMusicAudio = new Audio('/sounds/cfl_turningpages-belem-breeze-487596.ogg');
        bgMusicAudio.preload = 'auto'; // 立即让浏览器获取数据。
        bgMusicAudio.loop = true;
        bgMusicAudio.volume = 0.3; // 舒缓背景音乐的默认音量。
        bgMusicAudio.muted = isMuted; // 应用同步后的静音状态。

        // 触发后台加载。
        bgMusicAudio.load();
    }
};

export const playBackgroundMusic = () => {
    initAudio();
    bgMusicStarted = true;
    if (bgMusicAudio && bgMusicAudio.paused) {
        // 仅在未静音且当前暂停时播放。
        bgMusicAudio.play().catch((err) => {
            console.warn('音频播放失败或被浏览器拦截：', err);
        });
    }
};

export const pauseBackgroundMusic = () => {
    if (bgMusicAudio && !bgMusicAudio.paused) {
        bgMusicAudio.pause();
    }
};

export const toggleMute = () => {
    isMuted = !isMuted;
    if (bgMusicAudio) {
        bgMusicAudio.muted = isMuted;
    }
    return isMuted;
};

export const getIsMuted = () => isMuted;

export const setMusicVolume = (vol) => {
    if (bgMusicAudio) {
        bgMusicAudio.volume = Math.max(0, Math.min(1, vol));
        // 用户上调滑块时自动取消静音。
        if (vol > 0 && isMuted) {
            isMuted = false;
            bgMusicAudio.muted = false;
        }

        // 取消静音后，仅在此前已请求开始播放时继续播放。
        if (vol > 0 && bgMusicAudio.paused && bgMusicStarted) {
            bgMusicAudio.play().catch(e => console.warn(e));
        }
    }
    // 发出事件，让程序调整音量时界面滑块保持同步。
    window.dispatchEvent(new CustomEvent('musicVolumeChanged', { detail: vol }));
};

export const getMusicVolume = () => {
    return bgMusicAudio ? bgMusicAudio.volume : 0.3;
};
