import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAudio } from './AudioManager';
import posthog from 'posthog-js';

const AchievementsContext = createContext();

export const ACHIEVEMENTS = {
    corridor_enter: { id: 'corridor_enter', label: "点击门即可进入", title: "探索者" },
    corridor_explore: { id: 'corridor_explore', label: "滚动以探索走廊", title: "漫游者" },
    about_fly: { id: 'about_fly', label: "滚动以飞越我的故事", title: "天空旅人" },
    studio_interact: { id: 'studio_interact', label: "拖动以旋转浏览", title: "导演" },
    gallery_inspect: { id: 'gallery_inspect', label: "点击项目查看详情", title: "艺术鉴赏家" },
    contact_choose: { id: 'contact_choose', label: "寻找一种联系方式", title: "社交达人" }
};

export const AchievementsProvider = ({ children }) => {
    const { playSound } = useAudio();

    // 同步 ref，防止滚轮等高频事件重复触发。
    const completedRef = useRef([]);

    // 从本地存储读取已完成成就。
    const [completed, setCompleted] = useState(() => {
        try {
            const saved = localStorage.getItem('itom_achievements');
            if (saved) {
                const parsed = JSON.parse(saved);
                // 加入集合，但忽略 corridor_enter，让入口提示始终出现。
                const filtered = parsed.filter(id => id !== 'corridor_enter');
                completedRef.current = [...filtered];
                return filtered;
            }
            return [];
        } catch (e) {
            return [];
        }
    });

    // 延迟创建并共享 AudioContext，避免每次解锁都创建。
    const audioCtxRef = useRef(null);

    // 用简单 WebAudio 提示音表示成就解锁。
    const playUnlockChime = useCallback(() => {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;

            // 只初始化一次并复用。
            if (!audioCtxRef.current) {
                audioCtxRef.current = new AudioCtx();
            }

            const ctx = audioCtxRef.current;

            // 若上下文因浏览器自动播放策略挂起，则恢复。
            // 非直接点击触发时仍可能失败，
            // 因此用 try/catch 静默处理。
            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {
                    // 仍被策略拦截时静默忽略。
                });
            }

            if (ctx.state !== 'running') return;

            const gain = ctx.createGain();
            const osc = ctx.createOscillator();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';

            // 悦耳的双音提示，A4 到 E5。
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);

            // 音量包络。
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

            // start/stop 已注释，音效静音，但仍保持上下文逻辑完整。
            // osc.start(ctx.currentTime);
            // osc.stop(ctx.currentTime + 0.5);
        } catch (err) {
            // console.warn('解锁提示音播放失败', err);
        }
    }, []);

    // 当前展示的弹窗。
    // 结构：{ id: 'corridor_enter', status: 'pending' | 'completed' | 'hiding' }。
    const [activePopup, setActivePopup] = useState(null);

    // 已完成成就变化时保存至 localStorage。
    useEffect(() => {
        const toSave = completed.filter(id => id !== 'corridor_enter');
        localStorage.setItem('itom_achievements', JSON.stringify(toSave));
    }, [completed]);

    const showTutorial = useCallback((id) => {
        // 仅在成就有效、尚未完成且没有活动弹窗时显示。
        // 同时确认当前没有其他弹窗正在隐藏。
        if (ACHIEVEMENTS[id] && !completed.includes(id) && (!activePopup || activePopup.status === 'hiding')) {
            // 稍作延迟，确保上一个隐藏过程结束。
            setTimeout(() => {
                setActivePopup({ id, status: 'pending' });
            }, 50);
        }
    }, [completed, activePopup]);

    const unlockAchievement = useCallback((id) => {
        // 同步检查 ref，避免连续滚动事件触发上百次。
        if (!completedRef.current.includes(id)) {
            completedRef.current.push(id);

            setCompleted(prev => {
                const updated = [...prev, id];
                // 保存到本地时排除 corridor_enter。
                const toSave = updated.filter(item => item !== 'corridor_enter');
                localStorage.setItem('itom_achievements', JSON.stringify(toSave));
                return updated;
            });

            // 向 PostHog 发送事件。
            const achievementData = ACHIEVEMENTS[id];
            if (achievementData) {
                posthog.capture('achievement_unlocked', {
                    achievement_id: id,
                    achievement_title: achievementData.title,
                });
            }

            // 触发音效。
            playUnlockChime();

            setActivePopup(prev => {
                // 若是当前活动弹窗，先切换为 completed 再隐藏。
                if (prev && prev.id === id) {
                    // 启动隐藏动画计时器。
                    setTimeout(() => {
                        setActivePopup(p => p && p.id === id ? { ...p, status: 'hiding' } : p);
                        setTimeout(() => {
                            setActivePopup(p => p && p.id === id ? null : p);
                        }, 500);
                    }, 2000);
                    return { ...prev, status: 'completed' };
                } else {
                    // 立即标为完成，展示意外解锁。
                    setTimeout(() => {
                        setActivePopup(p => p && p.id === id ? { ...p, status: 'hiding' } : p);
                        setTimeout(() => {
                            setActivePopup(p => p && p.id === id ? null : p);
                        }, 500);
                    }, 3000);
                    return { id, status: 'completed' };
                }
            });
        }
    }, [playUnlockChime]);

    const hidePopup = useCallback(() => {
        if (activePopup && activePopup.status !== 'hiding') {
            setActivePopup(prev => prev ? { ...prev, status: 'hiding' } : null);
            setTimeout(() => {
                setActivePopup(null);
            }, 500);
        }
    }, [activePopup]);

    return (
        <AchievementsContext.Provider value={{
            completed,
            activePopup,
            showTutorial,
            unlockAchievement,
            hidePopup
        }}>
            {children}
        </AchievementsContext.Provider>
    );
};

export const useAchievements = () => useContext(AchievementsContext);
