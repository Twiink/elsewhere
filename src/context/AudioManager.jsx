import { media } from '../media';
import { AudioContext } from './contexts';
import { useState, useEffect, useRef, useCallback } from 'react';

export const AudioProvider = ({ children }) => {
    // 持久保存静音偏好。
    const [isMuted, setIsMuted] = useState(() => {
        const saved = localStorage.getItem('audio_muted');
        return saved === 'true';
    });

    // 持久保存音量偏好，范围 0.0 至 1.0。
    const [globalVolume, setGlobalVolume] = useState(() => {
        const saved = localStorage.getItem('audio_volume');
        return saved !== null ? parseFloat(saved) : 0.5;
    });

    const [audioEnabled, setAudioEnabled] = useState(false);

    // 跟踪活动声音，便于后续停止。
    const activeSounds = useRef({});

    useEffect(() => {
        localStorage.setItem('audio_muted', isMuted);
        localStorage.setItem('audio_volume', globalVolume);

        // 更新全部活动声音。
        Object.values(activeSounds.current).forEach(audio => {
            if (audio) {
                audio.muted = isMuted;
                // 实际音量按全局音量缩放。
                // 请求的基础音量保存在对象的 _baseVolume 中。
                const base = audio._baseVolume !== undefined ? audio._baseVolume : 1.0;
                let targetVol = base * globalVolume;
                audio.volume = Math.max(0, Math.min(1, targetVol));
            }
        });

    }, [isMuted, globalVolume]);

    const toggleMute = () => setIsMuted(prev => !prev);

    // 增强设置函数：手动将滑块拖至 0 以上时自动取消静音。
    const enhancedSetGlobalVolume = useCallback((vol) => {
        if (typeof vol === 'function') {
            setGlobalVolume(prev => {
                const newVol = vol(prev);
                if (newVol > 0) setIsMuted(false);
                return newVol;
            });
        } else {
            setGlobalVolume(vol);
            if (vol > 0) setIsMuted(false);
        }
    }, []);

    // 首次交互时调用。
    const enableAudio = useCallback(() => {
        if (!audioEnabled) {
            // 可创建占位上下文，或设置已尝试解锁的标记。
            // WebAudio 通常需要恢复上下文，
            // HTML5 Audio 则通常只需一次用户交互，
            // 即可让文档后续播放获得许可。
            setAudioEnabled(true);
        }
    }, [audioEnabled]);

    const play = useCallback((soundName, { loop = false, volume = 1.0 } = {}) => {
        if (!audioEnabled) return { stop() {} };
        // 文件缺失时平稳降级。
        const soundPaths = {
            'tear': media.audio.paper,
            'szumwiatru': media.audio.wind, // 关于我房间的风声。
            'szummiasta': media.audio.city, // 画廊房间的城市声。
            'uchyleniedrzwi': media.audio.doorCreak, // 悬停时的吱呀声。
            'otwarciedrzwi': media.audio.doorOpen,   // 主门和侧门的开门声。
            'zamknieciedrzwi': media.audio.doorClose // 关门声。
        };
        const path = soundPaths[soundName];
        if (!path) return { stop() {} };

        // 模拟模式或文件缺失时可能出错。
        // 让浏览器处理 404，避免 JavaScript 崩溃。
        const audio = new Audio(path);

        // 保存元信息。
        audio.loop = loop;
        audio._baseVolume = volume; // 自定义属性，保存预期相对混音比例。

        // 应用当前全局状态。
        audio.muted = isMuted;
        let targetVol = volume * globalVolume;
        audio.volume = Math.max(0, Math.min(1, targetVol));

        // 保存引用，若有同名旧引用则清除。
        if (activeSounds.current[soundName]) {
            activeSounds.current[soundName].pause();
        }
        activeSounds.current[soundName] = audio;

        // 模拟日志。
        // console.log(`[音频] 正在播放 ${soundName} （循环： ${loop}，音量： ${audio.volume.toFixed(2)})`);

        // 尝试播放。
        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                if (error.name === 'NotAllowedError') {
                    // console.warn('[音频] 自动播放被拦截，等待用户交互。');
                } else if (error.name === 'NotSupportedError' || error.message.includes('404')) {
                    // 文件缺失时静默忽略，保持控制台简洁。
                } else {
                    // console.warn('[音频] 播放错误：', error);
                }
            });
        }

        // 返回可停止声音的句柄。
        return {
            stop: () => {
                audio.pause();
                audio.currentTime = 0;
                delete activeSounds.current[soundName];
            },
            fade: () => {
                // 当前只停止。
                audio.pause();
                delete activeSounds.current[soundName];
            }
        };
    }, [isMuted, globalVolume, audioEnabled]);

    return (
        <AudioContext.Provider value={{
            isMuted,
            toggleMute,
            globalVolume,
            setGlobalVolume: enhancedSetGlobalVolume,
            play,
            enableAudio,
            audioEnabled
        }}>
            {children}
        </AudioContext.Provider>
    );
};
