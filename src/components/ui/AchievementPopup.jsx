import { ACHIEVEMENTS } from '../../data/achievements';
import { useAchievements, useAudio, useScene } from '../../context/contexts';
import React from 'react';


import { toggleMute as toggleBgmMute, getIsMuted as getBgmMuted, setMusicVolume } from '../../utils/audioManager';
import '../../styles/AchievementPopup.scss';

const AchievementPopup = () => {
    const { activePopup } = useAchievements();
    const { isMuted, toggleMute, setGlobalVolume } = useAudio();
    const { loadingRoom, hasEntered } = useScene();

    if (!activePopup) return null;

    const data = ACHIEVEMENTS[activePopup.id];
    if (!data) return null;

    const isCompleted = activePopup.status === 'completed';
    const isHiding = activePopup.status === 'hiding';

    // corridor_enter 的特殊逻辑，用于询问是否开启声音。
    const isSoundPrompt = activePopup.id === 'corridor_enter';
    // 点门后收起入口引导，给门上的加载便签留出视野。
    if (isSoundPrompt && (loadingRoom === 'corridor' || hasEntered || isCompleted || isHiding)) return null;

    return (
        <div
            className={`achievement-popup ${isCompleted ? 'completed' : ''} ${isHiding ? 'hiding' : ''} ${isSoundPrompt ? 'interactive achievement-popup--entry-sound' : ''}`}
            style={isSoundPrompt ? { pointerEvents: 'auto' } : {}}
        >
            {/* SVG 边框叠加层。 */}
            <svg
                className="popup-border"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
            >
                <path
                    d="M 0 0 L 100 0 L 100 0 L 98 10 L 100 20 L 97 35 L 100 50 L 98 65 L 100 80 L 97 90 L 100 100 L 90 97 L 80 100 L 70 96 L 60 100 L 50 97 L 40 100 L 30 96 L 20 100 L 10 97 L 0 100 L 0 100 L 2 90 L 0 80 L 3 65 L 0 50 L 2 35 L 0 20 L 3 10 L 0 0 Z"
                    fill="none"
                    stroke="#1a1a1a"
                    strokeWidth="0.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
            <div className="popup-content">
                {!isSoundPrompt && (
                    <div className={`checkbox ${isCompleted ? 'checked' : ''}`}>
                        {isCompleted && (
                            <svg viewBox="0 0 24 24" className="checkmark">
                                <path d="M5 13l4 4L19 7" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </div>
                )}
                <div className="text-content" style={isSoundPrompt ? { alignItems: 'center', textAlign: 'center' } : {}}>
                    <span className="title">{data.title}</span>

                    {!isSoundPrompt ? (
                        <span className="description">{data.label}</span>
                    ) : (
                        <span className="description">
                            声音
                            <button
                                className={`inline-sound-toggle ${!isMuted ? 'on' : 'off'}`}
                                aria-label={isMuted ? '开启声音' : '关闭声音'}
                                aria-pressed={!isMuted}
                                onClick={(e) => {
                                    e.stopPropagation();

                                    const willMute = !isMuted;

                                    // 1. 同步音频引擎与工具的静音标记。
                                    if (isMuted !== willMute) toggleMute();
                                    if (getBgmMuted() !== willMute) toggleBgmMute();

                                    // 2. 同时将音量条降至零，
                                    // 使菜单与入口处的设置保持同步。
                                    if (willMute) {
                                        setGlobalVolume(0);
                                        setMusicVolume(0);
                                    } else {
                                        setGlobalVolume(1.0); // 音效音量 100%。
                                        setMusicVolume(0.3);  // 背景音乐音量 30%。
                                    }
                                }}
                            >
                                {!isMuted ? " [🔊 已开启]" : " [🔇 已关闭]"}
                            </button>
                        </span>
                    )}
                </div>

            </div>
        </div>
    );
};

export default AchievementPopup;
