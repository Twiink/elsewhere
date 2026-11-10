import { useScene, useAudio, useAchievements } from '../../context/contexts';
import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';


import { setMusicVolume, getMusicVolume } from '../../utils/audioManager';

import AchievementPopup from './AchievementPopup';
import AchievementsPanel from './AchievementsPanel';
import '../../styles/NavigationUI.scss';

// 地图房间数据，位置以地图图片的百分比表示。
// 这些坐标对应地图上的视觉元素。
const ROOMS = [
    { id: 'about', label: "关于我", x: 43, y: 38 },      // 左侧纸飞机。
    { id: 'gallery', label: "画廊", x: 43, y: 72 },  // 左下城市建筑。
    { id: 'contact', label: "联系我", x: 57, y: 25 },  // 右上码头。
    { id: 'studio', label: "生活手记", x: 57, y: 55 },    // 右侧照片屏幕。
];

// 图钉起始位置，位于塔底部的虚线圆。
const PIN_START_POSITION = { x: 50.5, y: 97 };

const NavigationUI = () => {
    const { currentRoom, isInRoom, requestExit, hasEntered, teleportTo, isTeleporting } = useScene();
    const { isMuted, globalVolume, setGlobalVolume } = useAudio();
    const { showTutorial } = useAchievements();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [hoveredRoom, setHoveredRoom] = useState(null);
    const [isExiting, setIsExiting] = useState(false); // 跟踪返回按钮点击状态。

    // 音频控制状态。
    const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
    const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
    const [bgmVol, setBgmVol] = useState(getMusicVolume);
    const [isUIHidden, setIsUIHidden] = useState(false);

    // 焦点管理引用。
    const mapPanelRef = useRef();
    const mapCloseRef = useRef();

    useEffect(() => {
        const handleInspectChange = (e) => {
            setIsUIHidden(e.detail);
            if (e.detail) {
                setIsMenuOpen(false);
                setIsAudioMenuOpen(false);
                setIsAchievementsOpen(false);
            }
        };
        window.addEventListener('inspectChange', handleInspectChange);
        return () => window.removeEventListener('inspectChange', handleInspectChange);
    }, []);

    const aboutMapRef = useRef();
    const galleryMapRef = useRef();
    const contactMapRef = useRef();
    const studioMapRef = useRef();

    useEffect(() => {
        // 关于我区域：左 10%、上 20%、宽 30%、高 35%。
        // X 范围 10% 至 40%，Y 范围 20% 至 55%。
        if (aboutMapRef.current) {
            gsap.to(aboutMapRef.current, {
                clipPath: (hoveredRoom === 'about' || currentRoom === 'about')
                    ? 'polygon(10% 20%, 40% 20%, 40% 55%, 10% 55%)'
                    : 'polygon(10% 20%, 10% 20%, 10% 55%, 10% 55%)',
                duration: 0.5,
                ease: "power2.out"
            });
        }

        // 画廊区域：左 10%、下 8%、宽 30%、高 35%。
        // X 为 10% 至 40%，Y 为 57% 至 92%；顶部为 100-8-35=57%。
        if (galleryMapRef.current) {
            gsap.to(galleryMapRef.current, {
                clipPath: (hoveredRoom === 'gallery' || currentRoom === 'gallery')
                    ? 'polygon(10% 57%, 40% 57%, 40% 92%, 10% 92%)'
                    : 'polygon(10% 57%, 10% 57%, 10% 92%, 10% 92%)',
                duration: 0.5,
                ease: "power2.out"
            });
        }

        // 联系我区域：右 5%、上 10%、宽 35%、高 25%。
        // X 为 60% 至 95%，Y 为 10% 至 35%；左侧为 100-5-35=60%。
        if (contactMapRef.current) {
            gsap.to(contactMapRef.current, {
                clipPath: (hoveredRoom === 'contact' || currentRoom === 'contact')
                    ? 'polygon(60% 10%, 95% 10%, 95% 35%, 60% 35%)'
                    : 'polygon(95% 10%, 95% 10%, 95% 35%, 95% 35%)',
                duration: 0.5,
                ease: "power2.out"
            });
        }

        // 工作室区域：右 15%、下 19%、宽 25%、高 40%。
        // X 为 60% 至 85%，Y 为 41% 至 81%；左侧为 100-15-25=60%，顶部为 100-19-40=41%。
        if (studioMapRef.current) {
            gsap.to(studioMapRef.current, {
                clipPath: (hoveredRoom === 'studio' || currentRoom === 'studio')
                    ? 'polygon(60% 41%, 85% 41%, 85% 81%, 60% 81%)'
                    : 'polygon(85% 41%, 85% 41%, 85% 81%, 85% 81%)',
                duration: 0.5,
                ease: "power2.out"
            });
        }
    }, [hoveredRoom, currentRoom]);

    useEffect(() => {

        const handleMusicVolumeChange = (e) => {
            setBgmVol(e.detail);
        };
        window.addEventListener('musicVolumeChanged', handleMusicVolumeChange);

        return () => window.removeEventListener('musicVolumeChanged', handleMusicVolumeChange);
    }, []);

    const handleBgmChange = (val) => {
        setBgmVol(val);
        setMusicVolume(val);
    };

    // 进入前显示入口提示，进入后显示探索提示。
    useEffect(() => {
        if (!hasEntered && !isTeleporting) {
            showTutorial('corridor_enter');
        } else if (hasEntered && !isTeleporting && !isInRoom) {
            showTutorial('corridor_explore');
        }
    }, [hasEntered, isTeleporting, isInRoom, showTutorial]);

    // 房间与传送状态变化时同步调整菜单，避免先渲染过期菜单。
    const [previousNavigation, setPreviousNavigation] = useState({ isInRoom, isTeleporting });
    if (previousNavigation.isInRoom !== isInRoom || previousNavigation.isTeleporting !== isTeleporting) {
        setPreviousNavigation({ isInRoom, isTeleporting });
        if (isInRoom || isTeleporting) {
            setIsMenuOpen(false);
            setIsAudioMenuOpen(false);
            setIsAchievementsOpen(false);
        }
        setIsExiting(false);
    }

    // 地图焦点管理：自动聚焦、Esc 关闭与焦点限制。
    useEffect(() => {
        if (isMenuOpen) {
            // 地图打开时自动聚焦关闭按钮。
            setTimeout(() => mapCloseRef.current?.focus(), 100);
        }
    }, [isMenuOpen]);

    // 全局 Esc 处理，关闭已打开的面板。
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                if (isMenuOpen) setIsMenuOpen(false);
                if (isAudioMenuOpen) setIsAudioMenuOpen(false);
                if (isAchievementsOpen) setIsAchievementsOpen(false);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isMenuOpen, isAudioMenuOpen, isAchievementsOpen]);

    // 地图面板焦点循环处理。
    const handleMapKeyDown = (e) => {
        if (e.key !== 'Tab' || !mapPanelRef.current) return;

        const focusable = mapPanelRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
            // 首项按 Shift+Tab 时跳至末项。
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            // 末项按 Tab 时跳至首项。
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    };

    const handleRoomClick = (roomId) => {
        // 不传送到当前房间，正在传送时也不重复触发。
        if (roomId === currentRoom || isTeleporting) return;

        // 先关闭地图，再开始传送。
        setIsMenuOpen(false);
        setIsAudioMenuOpen(false);
        setIsAchievementsOpen(false);
        teleportTo(roomId);
    };

    const handleBackClick = () => {
        setIsExiting(true); // 立即开始退出动画。
        // 发出退出请求，由 DoorSection 执行动画。
        requestExit();
    };

    return (
        <div className="navigation-ui">
            {/* 全局成就弹窗。 */}
            <AchievementPopup />

            {/* 返回按钮仅在房间内显示，点击后向上隐藏。 */}
            {hasEntered && isInRoom && (
                <button
                    className={`nav-btn back-btn ${isExiting ? 'exiting' : ''}`}
                    onClick={handleBackClick}
                    aria-label="返回走廊"
                >
                    <svg viewBox="0 0 24 24" className="icon-back">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
            )}

            {/* 右侧控制按钮，进入后才显示。 */}
            {hasEntered && (
                <div className={`nav-controls ${isMenuOpen || isAudioMenuOpen ? 'menu-open' : ''} ${isUIHidden ? 'ui-hidden' : ''}`}>
                    {/* 菜单按钮。 */}
                    <button
                        className={`nav-btn hamburger-btn ${isMenuOpen ? 'open' : ''}`}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="展开或收起菜单"
                        aria-expanded={isMenuOpen}
                    >
                        <div className="hamburger-icon">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </button>
                    {/* 音频切换按钮。 */}
                    <button
                        className={`nav-btn audio-btn ${isAudioMenuOpen ? 'open' : ''}`}
                        onClick={() => setIsAudioMenuOpen(!isAudioMenuOpen)}
                        aria-label="声音设置"
                        aria-expanded={isAudioMenuOpen}
                    >
                        {isMuted ? (
                            <svg viewBox="0 0 24 24" className="icon-audio">
                                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                <line x1="23" y1="9" x2="17" y2="15" />
                                <line x1="17" y1="9" x2="23" y2="15" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" className="icon-audio">
                                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                <path d="M15 9a5 5 0 0 1 0 6" />
                                <path d="M18 5a9 9 0 0 1 0 14" />
                            </svg>
                        )}
                    </button>
                    {/* 成就切换按钮。 */}
                    <button
                        className={`nav-btn achievements-btn ${isAchievementsOpen ? 'open' : ''}`}
                        onClick={() => setIsAchievementsOpen(!isAchievementsOpen)}
                        aria-label="探索成就"
                        aria-expanded={isAchievementsOpen}
                    >
                        <svg viewBox="0 0 24 24" className="icon-trophy">
                            <path d="M8 21h8M12 17v4M7 4h10M5 4h14v5a7 7 0 0 1-7 7 7 7 0 0 1-7-7z" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M5 9H3V6h2" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M19 9h2V6h-2" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            )}

            {/* 地图面板，打开时从上方落下。 */}
            {hasEntered && (
                <div className={`map-panel ${isMenuOpen ? 'open' : ''}`} inert={!isMenuOpen ? true : undefined} ref={mapPanelRef} onKeyDown={handleMapKeyDown} role="dialog" aria-label="地图">
                    {/* SVG 边框叠加层。 */}
                    <svg
                        className="map-border-overlay"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            zIndex: 10
                        }}
                    >
                        <path
                            d="M 0 0 L 100 0 L 100 0 L 99 3 L 100 6 L 98 10 L 100 14 L 99 18 L 100 22 L 98 26 L 100 30 L 99 35 L 100 40 L 98 45 L 100 50 L 99 55 L 100 60 L 98 65 L 100 70 L 99 75 L 100 80 L 98 85 L 100 90 L 99 95 L 100 100 L 96 99 L 92 100 L 88 98 L 84 100 L 80 99 L 76 100 L 72 98 L 68 100 L 64 99 L 60 100 L 56 98 L 52 100 L 48 99 L 44 100 L 40 98 L 36 100 L 32 99 L 28 100 L 24 98 L 20 100 L 16 99 L 12 100 L 8 98 L 4 100 L 0 99 L 0.5 99.5 L 1 95 L 0 90 L 2 85 L 0 80 L 1 75 L 0 70 L 2 65 L 0 60 L 1 55 L 0 50 L 2 45 L 0 40 L 1 35 L 0 30 L 2 26 L 0 22 L 1 18 L 0 14 L 2 10 L 0 6 L 1 3 L 0 0 Z"
                            fill="none"
                            stroke="#1a1a1a"
                            strokeWidth="0.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>

                    <div className="map-content-clipped">
                        <div className="map-header">
                            <h3>地图</h3>
                            <button
                                ref={mapCloseRef}
                                className="close-btn"
                                onClick={() => setIsMenuOpen(false)}
                                aria-label="关闭地图"
                            >
                                <svg viewBox="0 0 24 24">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="map-container">
                            {/* 地图背景图片。 */}
                            <img src="https://media.secknow-ai.com/space/images/map.png" alt="作品集地图" className="map-image" />

                            {/* 地图彩色叠加层。 */}
                            <img ref={aboutMapRef} src="https://media.secknow-ai.com/space/images/map_about_painted.png" alt="" className="painted-map-layer" style={{ clipPath: 'polygon(10% 20%, 10% 20%, 10% 55%, 10% 55%)' }} />
                            <img ref={galleryMapRef} src="https://media.secknow-ai.com/space/images/map_gallery_painted.png" alt="" className="painted-map-layer" style={{ clipPath: 'polygon(10% 57%, 10% 57%, 10% 92%, 10% 92%)' }} />
                            <img ref={contactMapRef} src="https://media.secknow-ai.com/space/images/map_contact_painted.png" alt="" className="painted-map-layer" style={{ clipPath: 'polygon(95% 10%, 95% 10%, 95% 35%, 95% 35%)' }} />
                            <img ref={studioMapRef} src="https://media.secknow-ai.com/space/images/map_studio_painted.png" alt="" className="painted-map-layer" style={{ clipPath: 'polygon(85% 41%, 85% 41%, 85% 81%, 85% 81%)' }} />

                            {/* 四个悬停区域覆盖地图。 */}
                            <button
                                type="button"
                                className="map-hover-zone zone-about"
                                onMouseEnter={() => setHoveredRoom('about')}
                                onMouseLeave={() => setHoveredRoom(null)}
                                onFocus={() => setHoveredRoom('about')}
                                onBlur={() => setHoveredRoom(null)}
                                onClick={() => handleRoomClick('about')}
                                aria-label="前往关于我房间"
                            />
                            <button
                                type="button"
                                className="map-hover-zone zone-gallery"
                                onMouseEnter={() => setHoveredRoom('gallery')}
                                onMouseLeave={() => setHoveredRoom(null)}
                                onFocus={() => setHoveredRoom('gallery')}
                                onBlur={() => setHoveredRoom(null)}
                                onClick={() => handleRoomClick('gallery')}
                                aria-label="前往画廊房间"
                            />
                            <button
                                type="button"
                                className="map-hover-zone zone-contact"
                                onMouseEnter={() => setHoveredRoom('contact')}
                                onMouseLeave={() => setHoveredRoom(null)}
                                onFocus={() => setHoveredRoom('contact')}
                                onBlur={() => setHoveredRoom(null)}
                                onClick={() => handleRoomClick('contact')}
                                aria-label="前往联系我房间"
                            />
                            <button
                                type="button"
                                className="map-hover-zone zone-studio"
                                onMouseEnter={() => setHoveredRoom('studio')}
                                onMouseLeave={() => setHoveredRoom(null)}
                                onFocus={() => setHoveredRoom('studio')}
                                onBlur={() => setHoveredRoom(null)}
                                onClick={() => handleRoomClick('studio')}
                                aria-label="前往生活手记房间"
                            />

                            {/* 常驻地图文字标签。 */}
                            <div className="map-room-label about">关于我</div>
                            <div className="map-room-label gallery">我的<br />画廊</div>
                            <div className="map-room-label contact">联系我</div>
                            <div className="map-room-label studio">生活<br />手记</div>

                            {/* 四个图钉槽位。 */}
                            {ROOMS.map((room) => (
                                <button
                                    key={room.id}
                                    className={`pin-slot ${currentRoom === room.id ? 'active' : ''} ${hoveredRoom === room.id ? 'hovered' : ''}`}
                                    style={{ left: `${room.x}%`, top: `${room.y}%` }}
                                    onClick={() => handleRoomClick(room.id)}
                                    onMouseEnter={() => setHoveredRoom(room.id)}
                                    onMouseLeave={() => setHoveredRoom(null)}
                                    title={room.label}
                                >
                                    <img src="https://media.secknow-ai.com/space/images/pin-slot.png" alt="" className="slot-image" />
                                </button>
                            ))}

                            {/* 图钉移至悬停槽位、当前房间或起始位置。 */}
                            <div
                                className="pin-marker"
                                style={{
                                    left: `${hoveredRoom
                                        ? ROOMS.find(r => r.id === hoveredRoom)?.x || PIN_START_POSITION.x
                                        : currentRoom && isInRoom
                                            ? ROOMS.find(r => r.id === currentRoom)?.x || PIN_START_POSITION.x
                                            : PIN_START_POSITION.x
                                        }%`,
                                    top: `${hoveredRoom
                                        ? ROOMS.find(r => r.id === hoveredRoom)?.y || PIN_START_POSITION.y
                                        : currentRoom && isInRoom
                                            ? ROOMS.find(r => r.id === currentRoom)?.y || PIN_START_POSITION.y
                                            : PIN_START_POSITION.y
                                        }%`
                                }}
                            >
                                <img src="https://media.secknow-ai.com/space/images/pin.png" alt="你在这里" className="pin-image" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 音频面板从按钮下方展开。 */}
            {hasEntered && (
                <div className={`audio-panel ${isAudioMenuOpen ? 'open' : ''}`} inert={!isAudioMenuOpen ? true : undefined}>
                    <div className="audio-card">
                        <div className="audio-header">
                            <h3>声音设置</h3>
                            <button
                                className="close-btn"
                                onClick={() => setIsAudioMenuOpen(false)}
                                aria-label="关闭声音设置"
                            >
                                <svg viewBox="0 0 24 24">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="audio-sliders-container">
                            <div className="slider-group">
                                <div className="slider-label">
                                    <span>音乐</span>
                                    <span>{Math.round(bgmVol * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.01"
                                    value={bgmVol}
                                    onChange={(e) => handleBgmChange(parseFloat(e.target.value))}
                                    className="paper-slider"
                                    aria-label="音乐音量"
                                    aria-valuetext={`${Math.round(bgmVol * 100)}%`}
                                />
                            </div>
                            <div className="slider-group">
                                <div className="slider-label">
                                    <span>音效</span>
                                    <span>{Math.round(globalVolume * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.01"
                                    value={globalVolume}
                                    onChange={(e) => setGlobalVolume(parseFloat(e.target.value))}
                                    className="paper-slider"
                                    aria-label="音效音量"
                                    aria-valuetext={`${Math.round(globalVolume * 100)}%`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 成就面板。 */}
            <AchievementsPanel
                isOpen={isAchievementsOpen}
                onClose={() => setIsAchievementsOpen(false)}
            />

            {/* 点击遮罩关闭菜单。 */}
            {(isMenuOpen || isAudioMenuOpen || isAchievementsOpen) && (
                <div
                    className="menu-overlay"
                    onClick={() => {
                        setIsMenuOpen(false);
                        setIsAudioMenuOpen(false);
                        setIsAchievementsOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default NavigationUI;
