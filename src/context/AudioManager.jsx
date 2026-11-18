import { media } from '../media';
import { AudioContext } from './contexts';
import { useState, useEffect, useRef, useCallback } from 'react';
import { applyBackgroundMusicSettings, initAudio, playBackgroundMusic } from '../utils/audioManager';
import { readStorage, writeStorage } from '../utils/storage';

function parseVolume(saved, fallback) {
    const volume = parseFloat(saved);
    return Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : fallback;
}

export const AudioProvider = ({ children }) => {
    const [isMuted, setIsMuted] = useState(() => readStorage('audio_muted') === 'true');
    const [musicVolume, setMusicVolume] = useState(() => parseVolume(readStorage('audio_music_volume'), 0.3));
    const [globalVolume, setGlobalVolume] = useState(() => {
        const saved = readStorage('audio_volume');
        // 旧版静音时会把音效音量写成 0，此时恢复默认滑块值，保留静音状态。
        if (isMuted && saved === '0' && readStorage('audio_music_volume') === null) return 0.5;
        return parseVolume(saved, 0.5);
    });

    const [audioEnabled, setAudioEnabled] = useState(false);

    // 跟踪活动声音，便于后续停止。
    const activeSounds = useRef({});

    useEffect(() => {
        writeStorage('audio_muted', isMuted);
        writeStorage('audio_volume', globalVolume);

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

    useEffect(() => {
        writeStorage('audio_music_volume', musicVolume);
        if (audioEnabled) initAudio();
        applyBackgroundMusicSettings(musicVolume, isMuted);
    }, [audioEnabled, isMuted, musicVolume]);

    const toggleMute = () => {
        const muted = !isMuted;
        applyBackgroundMusicSettings(musicVolume, muted);
        setIsMuted(muted);
        if (!muted && musicVolume > 0) playBackgroundMusic();
    };

    const changeMusicVolume = (volume) => {
        setMusicVolume(volume);
        if (volume > 0) {
            applyBackgroundMusicSettings(volume, false);
            setIsMuted(false);
            playBackgroundMusic();
        }
    };

    const changeEffectsVolume = useCallback((volume) => {
        setGlobalVolume(volume);
        if (volume > 0) setIsMuted(false);
    }, []);

    const enableAudio = useCallback(() => {
        setAudioEnabled(true);
    }, []);

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
            musicVolume,
            setMusicVolume: changeMusicVolume,
            globalVolume,
            setGlobalVolume: changeEffectsVolume,
            play,
            enableAudio,
            audioEnabled
        }}>
            {children}
        </AudioContext.Provider>
    );
};
