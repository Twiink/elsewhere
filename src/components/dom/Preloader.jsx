import { useAudio } from '../../context/contexts';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import gsap from 'gsap';


// 可复用 SVG 线条组件，现支持 ref。
const TearLineSVG = ({ svgPathData, pathLength, strokeDashoffset, pathRef }) => (
  <svg
    className="preloader__overlay"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    style={{ pointerEvents: 'none' }}
  >
    <path
      ref={pathRef}
      d={svgPathData}
      fill="none"
      stroke="#1a1a1a"
      strokeWidth="0.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        strokeDasharray: pathLength,
        strokeDashoffset: strokeDashoffset,
      }}
    />
  </svg>
);

// 环形加载器：围绕文字旋转的简洁圆环。
const RingLoader = () => (
  <div className="preloader__ring">
    <svg width="120" height="120" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
      <circle
        cx="50" cy="50" r="45"
        fill="none"
        stroke="#000"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="10 15"
        opacity="0.8"
      />
      <circle
        cx="50" cy="50" r="35"
        fill="none"
        stroke="#000"
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray="5 10"
        opacity="0.5"
        style={{
          animation: 'ring-spin-reverse 4s linear infinite',
          transformOrigin: '50% 50%'
        }}
      />
    </svg>
    <style>{`
      @keyframes ring-spin {
        0% { transform: translate(-50%, -50%) rotate(0deg); }
        100% { transform: translate(-50%, -50%) rotate(360deg); }
      }
      @keyframes ring-spin-reverse {
        0% { transform: rotate(360deg); }
        100% { transform: rotate(0deg); }
      }
      .preloader__ring {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 120px;
        height: 120px;
        pointer-events: none;
        z-index: 5;
        animation: ring-spin 10s linear infinite;
      }
    `}</style>
  </div>
);

const percentageStyle = {
  position: 'absolute',
  top: '50%',
  left: '0',
  width: '100%',
  transform: 'translateY(-50%)',
  textAlign: 'center',
  zIndex: 20,
  fontFamily: "'Inter', sans-serif",
  fontSize: '2rem',
  fontWeight: 'bold',
  mixBlendMode: 'multiply',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'visible'
};

const Preloader = ({ onComplete, ready }) => {
  const [isDone, setIsDone] = useState(false);

  const { play } = useAudio();
  // 跟踪音频句柄，以便停止循环。
  const pencilSoundRef = useRef(null);


  // 动画目标使用 ref。
  const containerRef = useRef(null);
  const leftHalfRef = useRef(null);
  const rightHalfRef = useRef(null);
  const pathLeftRef = useRef(null);
  const pathRightRef = useRef(null);
  const textLeftRef = useRef(null);
  const textRightRef = useRef(null);

  // 视觉进度完全保存在 ref 中，避免每秒 60 次 React 渲染。
  const targetProgress = ready ? 100 : 85;
  const displayProgressRef = useRef(0);
  const trackerRef = useRef({ val: 0 });
  const readyRef = useRef(ready);
  const exitStarted = useRef(false);
  const exitTimelineRef = useRef(null);

  useEffect(() => { readyRef.current = ready; }, [ready]);

  // ----------------------------------------
  // 生成撕裂路径。
  // ----------------------------------------
  const [tearPoints] = useState(() => {
    const points = [];
    const segments = 12; // 减少分段数。

    points.push([50, 0]);

    for (let i = 1; i < segments; i++) {
      const y = (i / segments) * 100;
      const xOffset = (Math.random() - 0.5) * 6;
      const x = 50 + xOffset;
      points.push([x, y]);
    }

    points.push([50, 100]);
    return points;
  });

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


  const startExit = useCallback(() => {
    if (exitStarted.current) return;
    exitStarted.current = true;

    if (pencilSoundRef.current) {
      pencilSoundRef.current.stop();
      pencilSoundRef.current = null;
    }
    play('tear', { volume: 0.8 });

    const tl = gsap.timeline({
      onComplete: () => {
        setIsDone(true);

        onComplete?.();
      }
    });

    exitTimelineRef.current = tl;

    // 1. 撕开前短暂停顿。
    tl.to({}, { duration: 0.1 });

    // 2. 撕开纸张。
    tl.to(leftHalfRef.current, {
      xPercent: -100,
      rotation: -2,
      duration: 1.8,
      ease: "power3.inOut"
    }, 'tear');

    tl.to(rightHalfRef.current, {
      xPercent: 100,
      rotation: 2,
      duration: 1.8,
      ease: "power3.inOut"
    }, 'tear');

    // 3. 淡出容器。
    tl.to(containerRef.current, {
      opacity: 0,
      duration: 0.5
    }, '-=0.5');
  }, [play, onComplete]);

  // ----------------------------------------
  // 平滑加载逻辑。
  // ----------------------------------------
  // 动态处理铅笔音效与退出检查。
  const checkProgressTriggers = useCallback((val) => {
    // 铅笔音效。
    if (val < 99 && !pencilSoundRef.current) {
      pencilSoundRef.current = play('pencil', { loop: true, volume: 0.5 });
    }
    else if (val >= 99 && pencilSoundRef.current) {
      pencilSoundRef.current.stop();
      pencilSoundRef.current = null;
    }

    // 退出阶段。
    if (val >= 99.5 && readyRef.current && !exitStarted.current) {
      startExit();
    }
  }, [play, startExit]);

  useEffect(() => {
    return () => {
      if (pencilSoundRef.current) {
        pencilSoundRef.current.stop();
        pencilSoundRef.current = null;
      }
      exitTimelineRef.current?.kill();
    };
  }, []);

  useEffect(() => {
    const distance = targetProgress - displayProgressRef.current;
    let duration = 0.5;

    if (distance > 60) {
      duration = 1.5;
    } else if (distance > 30) {
      duration = 1.0;
    } else if (distance > 10) {
      duration = 0.6;
    } else if (distance > 0) {
      duration = 0.4;
    }

    const tween = gsap.to(trackerRef.current, {
      val: targetProgress,
      duration: duration,
      ease: "power2.out",
      overwrite: true, // 自动终止 trackerRef 上的旧动画。
      onUpdate: () => {
        const val = trackerRef.current.val;
        displayProgressRef.current = val;

        const safeProgress = Math.min(100, Math.max(0, val));
        const strokeDashoffset = 120 - (120 * safeProgress) / 100;
        const percentageText = `${Math.round(safeProgress)}%`;

        // 直接更新 DOM，绕过 React 渲染。
        if (textLeftRef.current) textLeftRef.current.innerText = percentageText;
        if (textRightRef.current) textRightRef.current.innerText = percentageText;
        if (pathLeftRef.current) pathLeftRef.current.style.strokeDashoffset = strokeDashoffset;
        if (pathRightRef.current) pathRightRef.current.style.strokeDashoffset = strokeDashoffset;

        checkProgressTriggers(val);
      }
    });

    return () => tween.kill();
  }, [targetProgress, checkProgressTriggers]);


  // ----------------------------------------
  // 退出流程。
  // ----------------------------------------
  // 达到 99.5% 后才就绪时，使用回退触发。
  useEffect(() => {
    if (displayProgressRef.current >= 99.5 && ready && !exitStarted.current) {
      startExit();
    }
  }, [ready, startExit]);


  if (isDone) return null;

  const pathLength = 120;
  // 初始化数值。
  const safeProgress = 0;
  const strokeDashoffset = pathLength - (pathLength * safeProgress) / 100;
  const percentageText = `${Math.round(safeProgress)}%`;

  return (
    <div className="preloader" ref={containerRef}>
      {/* 左半部分。 */}
      <div
        className="preloader__half preloader__half--left"
        ref={leftHalfRef}
        style={{ clipPath: leftClipPoly }}
      >
        {/* 内容：百分比与线条。 */}
        <div className="preloader__percentage" style={percentageStyle}>
          <span ref={textLeftRef}>{percentageText}</span>
          <RingLoader />
        </div>

        {/* SVG 现位于裁切后的半张纸内。 */}
        <TearLineSVG pathRef={pathLeftRef} svgPathData={svgPathData} pathLength={pathLength} strokeDashoffset={strokeDashoffset} />
      </div>

      {/* 右半部分。 */}
      <div
        className="preloader__half preloader__half--right"
        ref={rightHalfRef}
        style={{ clipPath: rightClipPoly }}
      >
        {/* 内容：百分比与线条。 */}
        <div className="preloader__percentage" style={percentageStyle}>
          <span ref={textRightRef}>{percentageText}</span>
          <RingLoader />
        </div>

        {/* SVG 现位于裁切后的半张纸内。 */}
        <TearLineSVG pathRef={pathRightRef} svgPathData={svgPathData} pathLength={pathLength} strokeDashoffset={strokeDashoffset} />
      </div>
    </div>
  );
};

export default Preloader;
