import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useScene } from '../../context/SceneContext';
import gsap from 'gsap';
import { TextPlugin } from 'gsap/TextPlugin';
import '../../styles/GlobalOverlay.scss';

gsap.registerPlugin(TextPlugin);

const GlobalOverlay = () => {
    const { overlayContent, closeOverlay } = useScene();
    const [isVisible, setIsVisible] = useState(false);
    const [animateOpen, setAnimateOpen] = useState(false);

    // 按窗口宽度判断是否为移动端。
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (overlayContent) {
            setIsVisible(true);
            // 延迟动画，让 DOM 挂载并先绘制关闭状态。
            const delayAnim = setTimeout(() => {
                setAnimateOpen(true);
            }, 50); // 50 毫秒可留出 React 渲染与浏览器绘制时间。
            return () => clearTimeout(delayAnim);
        } else {
            setAnimateOpen(false);
            // 等待退出动画，时长需匹配约 0.6 至 1 秒的过渡。
            const timer = setTimeout(() => setIsVisible(false), 800);
            return () => clearTimeout(timer);
        }
    }, [overlayContent]);

    // 使用独立缓存，在退出动画期间保留内容。
    const [cachedContent, setCachedContent] = useState(null);
    useEffect(() => {
        if (overlayContent) {
            setCachedContent(overlayContent);
        }
    }, [overlayContent]);

    // 取消 return null，让开销较大的模糊滤镜和 SVG 始终留在 DOM 中，
    // 避免首次调用时卡顿。
    // if (!isVisible && !overlayContent && !cachedContent) return null;

    // 不可见地预渲染最复杂的证书网格布局，
    // 在页面加载时完成 CSS 布局计算，避免首次点击才计算。
    const dummyGridContent = {
        title: "加载中……",
        layout: 'certificate_grid',
        items: [
            { label: '', date: '', image: '' },
            { label: '', date: '', image: '' },
            { label: '', date: '', image: '' },
            { label: '', date: '', image: '' }
        ],
        platformConfig: { label: '...' }
    };

    const content = overlayContent || cachedContent || dummyGridContent;

    // 传递 animateOpen 状态，控制 CSS 过渡。
    if (content.layout === 'profile' || content.layout === 'project' || content.layout === 'contact' || content.layout === 'studio') return null;
    return <ContentCard content={content} isOpen={animateOpen} onClose={closeOverlay} isMobile={isMobile} />;
};

const ContentCard = ({ content, isOpen, onClose, isMobile }) => {
    if (!content) return null;

    const label = content.platformConfig?.label || '内容';

    // 使用 GSAP TextPlugin 实现说明文字打字效果。
    const descriptionRef = useRef(null);
    useEffect(() => {
        if (isOpen && content.description && descriptionRef.current && content.layout !== 'certificate_grid') {
            gsap.killTweensOf(descriptionRef.current);
            gsap.fromTo(descriptionRef.current,
                { text: "" },
                { 
                    text: content.description, 
                    duration: Math.min(2.5, content.description.length * 0.015), 
                    ease: "none", 
                    delay: 0.3 
                }
            );
        }
    }, [isOpen, content]);

    // 自定义滚动条状态。
    const scrollContainerRef = useRef(null);
    const trackRef = useRef(null);
    const thumbRef = useRef(null);
    const isDragging = useRef(false);
    const dragStartY = useRef(0);
    const dragStartScroll = useRef(0);
    const [scrollThumbTop, setScrollThumbTop] = useState(0);
    const [showScrollbar, setShowScrollbar] = useState(false);

    // 根据滚动位置更新滑块。
    const updateThumbPosition = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        const maxScroll = scrollHeight - clientHeight;
        setShowScrollbar(maxScroll > 10);
        if (maxScroll <= 0) return;
        const scrollRatio = scrollTop / maxScroll;
        // 轨道区域为高度的 5% 至 90%，与 CSS 一致。
        const trackEl = trackRef.current;
        if (!trackEl) return;
        const trackHeight = trackEl.clientHeight;
        const thumbHeight = 32; // 与 CSS 一致。
        const usableHeight = trackHeight * 0.9 - thumbHeight;
        const topOffset = trackHeight * 0.05;
        setScrollThumbTop(topOffset + scrollRatio * usableHeight);
    }, []);

    // 滚动监听。
    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const onScroll = () => updateThumbPosition();
        el.addEventListener('scroll', onScroll, { passive: true });
        // 初始检查。
        const raf = requestAnimationFrame(updateThumbPosition);
        return () => {
            el.removeEventListener('scroll', onScroll);
            cancelAnimationFrame(raf);
        };
    }, [updateThumbPosition, content]);

    // 内容或打开状态变化时重新计算。
    useEffect(() => {
        const timer = setTimeout(updateThumbPosition, 200);
        return () => clearTimeout(timer);
    }, [isOpen, content, updateThumbPosition]);

    // 拖动处理。
    const handleThumbMouseDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging.current = true;
        dragStartY.current = e.clientY;
        dragStartScroll.current = scrollContainerRef.current?.scrollTop || 0;
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    }, []);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging.current) return;
            const el = scrollContainerRef.current;
            const trackEl = trackRef.current;
            if (!el || !trackEl) return;
            const deltaY = e.clientY - dragStartY.current;
            const trackHeight = trackEl.clientHeight;
            const thumbHeight = 32;
            const usableHeight = trackHeight * 0.9 - thumbHeight;
            const { scrollHeight, clientHeight } = el;
            const maxScroll = scrollHeight - clientHeight;
            const scrollDelta = (deltaY / usableHeight) * maxScroll;
            el.scrollTop = dragStartScroll.current + scrollDelta;
        };
        const handleMouseUp = () => {
            if (isDragging.current) {
                isDragging.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    // 点击轨道可跳转。
    const handleTrackClick = useCallback((e) => {
        const el = scrollContainerRef.current;
        const trackEl = trackRef.current;
        if (!el || !trackEl) return;
        const rect = trackEl.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const trackHeight = trackEl.clientHeight;
        const ratio = Math.max(0, Math.min(1, (clickY - trackHeight * 0.05) / (trackHeight * 0.9)));
        const { scrollHeight, clientHeight } = el;
        el.scrollTop = ratio * (scrollHeight - clientHeight);
    }, []);

    const handleBackdropClick = (e) => {
        // 仅点击充当背景的包装层自身时关闭，
        // 或点击背景层；当前包装层覆盖全部区域。
        // 当前包装层覆盖所有内容。
        if (e.target.classList.contains('global-overlay-wrapper') || e.target.classList.contains('global-overlay-backdrop-layer')) {
            onClose();
        }
    };

    // 样式与动画配置。
    // 弹簧缓动，产生弹出效果。
    const transitionSpring = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s ease';
    const transitionContent = 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)';

    // 纸张位置样式配置。
    // 使用百分比或 vw/vh 实现连续响应式布局。
    const cardStyle = isMobile ? {
        // 移动端：卡片位于底部。
        width: '90%',
        maxHeight: '60vh',
        bottom: '10rem', // 用户指定的连续响应式参数。
        left: '50%',
        transform: isOpen ? 'translate(-50%, 0) rotate(-1deg)' : 'translate(-50%, 120%) rotate(10deg)',
        opacity: isOpen ? 1 : 0,
        color: '#1a1a1a',
    } : {
        // 桌面端：卡片位于右侧。
        width: 'clamp(280px, 30vw, 450px)', // 连续响应式参数。
        right: 'clamp(2rem, 12vw, 20rem)', // 随视口缩放。
        top: '50%',
        transform: isOpen ? 'translateY(-50%) rotate(1deg)' : 'translate(150%, -50%) rotate(15deg)',
        opacity: isOpen ? 1 : 0,
        color: '#1a1a1a',
    };

    // 按索引设置延迟的错开动画辅助函数。
    const getStaggerStyle = (delay) => ({
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'translateY(0)' : 'translateY(20px)',
        transition: transitionContent,
        transitionDelay: isOpen ? `${delay}ms` : '0ms',
    });

    // 聚光灯孔洞遮罩配置。
    const maskStyle = (content.layout === 'certificate_grid') ? {
        maskImage: 'none',
        WebkitMaskImage: 'none'
    } : isMobile ? {
        // 移动端显示器在上方：宽度 50%、距顶部 25%。
        maskImage: 'radial-gradient(circle at 50% 25%, transparent 0%, transparent 15%, black 40%)',
        WebkitMaskImage: 'radial-gradient(circle at 50% 25%, transparent 0%, transparent 15%, black 40%)'
    } : {
        // 桌面端显示器在左侧：距左侧 31%、高度 50%。
        // 用户指定的 31%。
        maskImage: 'radial-gradient(circle at 31% 50%, transparent 0%, transparent 12%, black 35%)',
        WebkitMaskImage: 'radial-gradient(circle at 31% 50%, transparent 0%, transparent 12%, black 35%)'
    };

    return (
        <div
            className="global-overlay-wrapper"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 2000,
                pointerEvents: isOpen ? 'auto' : 'none',
                // 包装层自身没有背景和遮罩，
                // 只用于承载各图层。
            }}
            onClick={handleBackdropClick}
        >
            {/* 第 1 层：带孔洞的深色模糊背景。 */}
            <div
                className="global-overlay-backdrop-layer"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    // WebGL 优化：动画中的滤镜开销很大，
                    // 所以保持滤镜固定，只动画更新透明度。
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    opacity: isOpen ? 1 : 0,
                    transition: 'opacity 0.8s ease',
                    // 遮罩仅应用于此层。
                    ...maskStyle
                }}
            />

            {/* 第 2 层：卡片内容，位于背景上方，不受遮罩影响。 */}
            <div
                style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none', // 空白区域的点击穿透到背景包装层。
                    display: 'flex', // 可辅助定位绝对子元素，当前卡片使用绝对定位。
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        padding: isMobile ? '1.5rem' : '2.5rem',
                        transition: transitionSpring, // 弹跳入场。
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.2rem',
                        fontFamily: "'霞鹜文楷', cursive", // 手绘风格。
                        pointerEvents: 'auto', // 重新启用卡片点击。
                        ...cardStyle,
                        // 覆盖网格布局样式，使其居中并加宽。
                        ...(content.layout === 'certificate_grid' ? {
                            // 桌面端居中并加宽。
                            width: isMobile ? '95vw' : 'clamp(300px, 90vw, 1200px)',
                            height: 'clamp(500px, 85vh, 900px)',
                            maxHeight: '85vh',
                            left: '50%',
                            top: '50%',
                            right: 'auto',
                            bottom: 'auto',
                            transform: isOpen ? 'translate(-50%, -50%)' : 'translate(-50%, 100%)',
                        } : {})
                    }}
                    className="studio-paper-card"
                    onClick={(e) => e.stopPropagation()} // 点击卡片时阻止关闭。
                >
                    {/* 撕纸 SVG 边框叠加层。 */}
                    <svg
                        className="studio-border-overlay"
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
                            d="M 0 0 L 4 1 L 8 0 L 12 1 L 16 0 L 20 1 L 24 0 L 28 1 L 32 0 L 36 1 L 40 0 L 44 1 L 48 0 L 52 1 L 56 0 L 60 1 L 64 0 L 68 1 L 72 0 L 76 1 L 80 0 L 84 1 L 88 0 L 92 1 L 96 0 L 100 0 L 99 3 L 100 6 L 98 10 L 100 14 L 99 18 L 100 22 L 98 26 L 100 30 L 99 35 L 100 40 L 98 45 L 100 50 L 99 55 L 100 60 L 98 65 L 100 70 L 99 75 L 100 80 L 98 85 L 100 90 L 99 95 L 100 100 L 96 99 L 92 100 L 88 98 L 84 100 L 80 99 L 76 100 L 72 98 L 68 100 L 64 99 L 60 100 L 56 98 L 52 100 L 48 99 L 44 100 L 40 98 L 36 100 L 32 99 L 28 100 L 24 98 L 20 100 L 16 99 L 12 100 L 8 98 L 4 100 L 0 99 L 0.5 99.5 L 1 95 L 0 90 L 2 85 L 0 80 L 1 75 L 0 70 L 2 65 L 0 60 L 1 55 L 0 50 L 2 45 L 0 40 L 1 35 L 0 30 L 2 26 L 0 22 L 1 18 L 0 14 L 2 10 L 0 6 L 1 3 L 0 0 Z"
                            fill="none"
                            stroke="#1a1a1a"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>

                    {/* 纸胶带装饰，兼作移动端把手。 */}
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '40px',
                        height: '4px',
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        borderRadius: '2px',
                        display: isMobile ? 'block' : 'none'
                    }} />

                    {/* 标题区域。 */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '1rem',
                        ...getStaggerStyle(100)
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <span style={{
                                textTransform: 'uppercase',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                letterSpacing: '1px',
                                color: '#666'
                            }}>
                                {label}
                            </span>
                            <h2 style={{
                                fontSize: '1.8rem',
                                margin: 0,
                                lineHeight: 1.1,
                                fontWeight: 800,
                                fontFamily: "'霞鹜文楷', cursive", // 简洁、粗体。
                            }}>
                                {content.title}
                            </h2>
                        </div>

                        <button
                            onClick={onClose}
                            className="studio-close-btn"
                            aria-label="关闭"
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* 证书网格布局。 */}
                    {content.layout === 'certificate_grid' ? (
                        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                            <div
                                ref={scrollContainerRef}
                                className="awards-scroll-container"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
                                    alignContent: 'start',
                                    height: '100%',
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    gap: isMobile ? '1rem' : '2rem',
                                    padding: isMobile ? '1rem 0.5rem 2rem 0.5rem' : '1rem 2rem 2rem 1rem',
                                    ...getStaggerStyle(200)
                                }}>
                                {content.items?.map((item, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.8rem',
                                        backgroundColor: '#f9f9f9',
                                        padding: '1rem',
                                        border: '2px solid #1a1a1a',
                                        boxShadow: '4px 4px 0px rgba(0,0,0,0.1)',
                                        transition: 'transform 0.2s',
                                        cursor: 'pointer',
                                        borderRadius: '2px 255px 3px 255px / 255px 5px 225px 3px'
                                    }}
                                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                        onClick={() => window.open(item.url || content.url || '#', '_blank')}
                                    >
                                        <div style={{
                                            position: 'relative',
                                            width: '100%',
                                            paddingBottom: '141%', // A4 竖向比例。
                                            backgroundColor: '#eee',
                                            border: '2px solid #1a1a1a',
                                            overflow: 'hidden',
                                            borderRadius: '2px 255px 3px 255px / 255px 5px 225px 3px'
                                        }}>
                                            <img
                                                src={item.image || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}
                                                alt={item.label}
                                                loading="lazy"
                                                decoding="async"
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'fill'
                                                }}
                                            />
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.2rem', fontWeight: 700, fontFamily: "'霞鹜文楷', cursive" }}>
                                                {item.label}
                                            </h4>
                                            <span style={{ fontSize: '1.1rem', color: '#4a4a4a', fontFamily: "'霞鹜文楷', cursive", fontWeight: 700 }}>
                                                {item.date}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 自定义撕纸滚动条。 */}
                            {showScrollbar && (
                                <div
                                    ref={trackRef}
                                    className="torn-scroll-track"
                                    onClick={handleTrackClick}
                                    style={{ pointerEvents: 'auto' }}
                                >
                                    <div className="torn-scroll-line" />
                                    <div
                                        ref={thumbRef}
                                        className="torn-scroll-thumb"
                                        style={{ top: `${scrollThumbTop}px` }}
                                        onMouseDown={handleThumbMouseDown}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        /* 默认布局，采用工作室风格。 */
                        <>
                            {/* 元信息。 */}
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '1rem',
                                fontSize: '0.8rem',
                                color: '#666',
                                borderBottom: '1px dashed #ccc',
                                paddingBottom: '1rem',
                                ...getStaggerStyle(200)
                            }}>
                                <strong>{content.date}</strong>
                                {content.views && <span>{content.views} 次浏览</span>}
                            </div>

                            {/* 说明。 */}
                            <p 
                                ref={descriptionRef}
                                style={{
                                lineHeight: 1.6,
                                color: '#333',
                                fontSize: '0.95rem',
                                margin: 0,
                                minHeight: '80px', // 打字时避免布局跳动。
                                ...getStaggerStyle(300)
                            }}>
                                {content.description}
                            </p>

                            {/* 操作按钮。 */}
                            <div style={{
                                marginTop: 'auto',
                                paddingTop: '1rem',
                                ...getStaggerStyle(400)
                            }}>
                                <a
                                    href={content.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="studio-action-button"
                                >
                                    查看内容 ↗
                                </a>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalOverlay;
