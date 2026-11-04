import { useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { useScene } from '../../context/SceneContext';
import { useAudio } from '../../context/AudioManager';
import '../../styles/Preloader.scss'; // 复用加载界面样式。

/**
 * PaperTransition：用于传送的可复用撕纸过渡。
 * 
 * 监听 SceneContext 的 teleportPhase：
 * - closing：两半纸张合拢，与撕开过程相反。
 * - teleporting：纸张已闭合，等待目标加载。
 * - opening：纸张撕开，露出新房间。
 */

// 可复用 SVG 线条组件，来自 Preloader。
const TearLineSVG = ({ svgPathData }) => (
    <svg
        className="preloader__overlay"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ pointerEvents: 'none' }}
    >
        <path
            d={svgPathData}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="0.1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const PaperTransition = () => {
    const {
        teleportPhase,
        startTeleportTransition,
        finishPaperOpen,
        teleportTarget
    } = useScene();
    const { play } = useAudio();

    const containerRef = useRef(null);
    const leftHalfRef = useRef(null);
    const rightHalfRef = useRef(null);
    const timelineRef = useRef(null);

    // 生成撕裂路径，与 Preloader 逻辑相同。
    const tearPoints = useMemo(() => {
        const points = [];
        const segments = 12;

        points.push([50, 0]);

        for (let i = 1; i < segments; i++) {
            const y = (i / segments) * 100;
            const xOffset = (Math.random() - 0.5) * 6;
            const x = 50 + xOffset;
            points.push([x, y]);
        }

        points.push([50, 100]);
        return points;
    }, []);

    const svgPathData = useMemo(() => {
        return tearPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]} `).join(' ');
    }, [tearPoints]);

    const leftClipPoly = useMemo(() => {
        let poly = '0% 0%, ';
        tearPoints.forEach(p => { poly += `${p[0]}% ${p[1]}%, `; });
        poly += '0% 100%';
        return `polygon(${poly})`;
    }, [tearPoints]);

    const rightClipPoly = useMemo(() => {
        let poly = '100% 0%, ';
        poly += '100% 100%, ';
        [...tearPoints].reverse().forEach(p => { poly += `${p[0]}% ${p[1]}%, `; });
        return `polygon(${poly.slice(0, -2)})`;
    }, [tearPoints]);

    // 处理传送阶段。
    useEffect(() => {
        if (!leftHalfRef.current || !rightHalfRef.current || !containerRef.current) return;

        // 终止已有时间线。
        if (timelineRef.current) {
            timelineRef.current.kill();
        }

        if (teleportPhase === 'closing') {
            // 显示容器。
            gsap.set(containerRef.current, { opacity: 1, display: 'block' });

            // 初始两半分开，与加载动画末尾一致。
            gsap.set(leftHalfRef.current, { xPercent: -100, rotation: -2 });
            gsap.set(rightHalfRef.current, { xPercent: 100, rotation: 2 });

            // 动画合拢两半纸张。
            timelineRef.current = gsap.timeline({
                onComplete: () => {
                    startTeleportTransition(); // 进入 teleporting 阶段。
                }
            });

            // 播放纸张音效。
            play('tear', { volume: 0.6 });

            timelineRef.current.to(leftHalfRef.current, {
                xPercent: 0,
                rotation: 0,
                duration: 0.8,
                ease: "power2.inOut"
            }, 'close');

            timelineRef.current.to(rightHalfRef.current, {
                xPercent: 0,
                rotation: 0,
                duration: 0.8,
                ease: "power2.inOut"
            }, 'close');
        }

        if (teleportPhase === 'teleporting') {
            // 纸张闭合，TeleportRoom 正在加载目标。
            // 房间就绪后，TeleportRoom 调用 openTeleportTransition()。
            // 此处只需等待。
        }

        if (teleportPhase === 'opening') {
            // 撕开纸张。
            timelineRef.current = gsap.timeline({
                onComplete: () => {
                    finishPaperOpen(); // 传送逻辑已完成，只清除阶段。
                }
            });

            play('tear', { volume: 0.8 });

            timelineRef.current.to(leftHalfRef.current, {
                xPercent: -100,
                rotation: -2,
                duration: 1.2,
                ease: "power3.inOut"
            }, 'tear');

            timelineRef.current.to(rightHalfRef.current, {
                xPercent: 100,
                rotation: 2,
                duration: 1.2,
                ease: "power3.inOut"
            }, 'tear');

            // 末尾淡出容器。
            timelineRef.current.to(containerRef.current, {
                opacity: 0,
                duration: 0.3,
                onComplete: () => {
                    gsap.set(containerRef.current, { display: 'none' });
                }
            }, '-=0.3');
        }

        return () => {
            if (timelineRef.current) {
                timelineRef.current.kill();
            }
        };
    }, [teleportPhase, startTeleportTransition, finishPaperOpen, play]);

    // 始终保留组件于 DOM 中，不 return null，
    // 避免首次加载复杂 SVG 路径时卡顿。
    // if (!teleportPhase) return null;

    return (
        <div
            className="preloader"
            ref={containerRef}
            style={{ pointerEvents: 'none', display: 'none' }} // DOM 初始隐藏。
        >
            {/* 左半部分。 */}
            <div
                className="preloader__half preloader__half--left"
                ref={leftHalfRef}
                style={{ clipPath: leftClipPoly }}
            >
                <TearLineSVG svgPathData={svgPathData} />
            </div>

            {/* 右半部分。 */}
            <div
                className="preloader__half preloader__half--right"
                ref={rightHalfRef}
                style={{ clipPath: rightClipPoly }}
            >
                <TearLineSVG svgPathData={svgPathData} />
            </div>
        </div>
    );
};

export default PaperTransition;
