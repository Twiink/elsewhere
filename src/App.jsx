import { useState, Suspense, useEffect, useCallback, useLayoutEffect, lazy } from 'react';
import { Canvas, useThree, useFrame, useLoader } from '@react-three/fiber';
import { Preload, useTexture, Text, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';

import Preloader from './components/dom/Preloader';
import PaperTransition from './components/dom/PaperTransition';
import { AudioProvider, useAudio } from './context/AudioManager';
import { initAudio } from './utils/audioManager';
import { PerformanceProvider, usePerformance } from './context/PerformanceContext';
import { SceneProvider, useScene } from './context/SceneContext';
import NavigationUI from './components/ui/NavigationUI';
import GlobalOverlay from './components/ui/GlobalOverlay';
import AboutProfile from './components/ui/AboutProfile';
import ProjectDetails from './components/ui/ProjectDetails';
import StudioNotes from './components/ui/StudioNotes';
import ContactDetails from './components/ui/ContactDetails';
import ScreenReaderOverlay from './components/ui/ScreenReaderOverlay';
import { useDocumentMeta } from './hooks/useDocumentMeta';
import posthog from 'posthog-js';
import { getContentTextures } from './data/content';

// 初始化 PostHog。
if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST,
    person_profiles: 'identified_only', // 设为 'always' 时也为匿名用户创建画像。
  });
}

// 延迟加载体积较大的 3D 场景。
const Experience = lazy(() => import('./components/canvas/Experience'));

import './styles/main.scss';

// 按设备条件预加载资源
// 高性能设备预加载全部资源，避免卡顿。
// 移动端和低性能设备只预加载核心纹理，防止内存耗尽。
import { 
  ENTRANCE_TEXTURES, 
  CORRIDOR_TEXTURES, 
  UI_TEXTURES,
  PRELOAD_ALL, 
  PRELOAD_LOADER,
  ABOUT_TEXTURES,
  IMAGE_ASSETS,
  filterTexturesByDevice
} from './config/texturePreloadList';
import { TextureLoader } from 'three';

// 标准浏览器图片预加载（用于 <img> 标签）。
const preloadBrowserImage = (path) => {
  if (typeof window === 'undefined') return;
  const img = new Image();
  img.src = path;
};

const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
const isWeakCPU = typeof navigator.hardwareConcurrency !== 'undefined' && navigator.hardwareConcurrency <= 4;
const isLowRAM = typeof navigator.deviceMemory !== 'undefined' && navigator.deviceMemory <= 4;
const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 450;
const isLowEnd = isMobileDevice || isWeakCPU || isLowRAM || isSmallScreen;

// 精确检测悬停能力；非触摸设备应支持 hover: hover。
// 带鼠标或触控板的触屏笔记本在此也会返回 true。
const supportsHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

// 按 Drei 惯例在模块级触发 Three.js 预加载。
if (isLowEnd) {
  const CORE_TEXTURES = [...ENTRANCE_TEXTURES, ...CORRIDOR_TEXTURES, ...UI_TEXTURES, ...IMAGE_ASSETS, ...getContentTextures(supportsHover)];
  const filteredCore = filterTexturesByDevice(CORE_TEXTURES, supportsHover);
  const filteredAbout = filterTexturesByDevice(ABOUT_TEXTURES, supportsHover);

  filteredCore.forEach(path => useTexture.preload(path));
  filteredAbout.forEach(path => useLoader.preload(TextureLoader, path));
} else {
  const filteredAll = filterTexturesByDevice([...PRELOAD_ALL, ...getContentTextures(supportsHover)], supportsHover);
  const filteredLoader = filterTexturesByDevice(PRELOAD_LOADER, supportsHover);
  
  filteredAll.forEach(path => useTexture.preload(path));
  filteredLoader.forEach(path => useLoader.preload(TextureLoader, path));
}


// 在用户交互时启用全局音频的辅助组件。
const GlobalAudioEnabler = () => {
  const { enableAudio } = useAudio();
  useEffect(() => {
    const handleInteraction = () => enableAudio();
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [enableAudio]);
  return null;
};

// 使用走廊墙面纹理的静态场景背景。
const PaperSceneBackground = () => {
  const { scene } = useThree();
  const texture = useTexture('https://media.secknow-ai.com/space/textures/paper-texture.png');

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;

    return () => {
      scene.background = null;
    };
  }, [scene, texture]);

  return null;
};

// 桥接组件，用于在 SceneProvider 内调用 Hook。
// 处理动态元标签和深层链接自动传送。
function DocumentMetaBridge() {
  useDocumentMeta();

  const { initialRoom, deeplinkHandled, hasEntered, teleportTo, markEntered } = useScene();

  // 深层链接：直接访问 /gallery 等路径时，场景加载后自动传送。
  useEffect(() => {
    if (initialRoom && hasEntered && !deeplinkHandled.current) {
      deeplinkHandled.current = true;
      // 稍作延迟，让走廊先完成渲染。
      setTimeout(() => teleportTo(initialRoom), 300);
    }
  }, [initialRoom, hasEntered, teleportTo, deeplinkHandled]);

  return null;
}

function AppContent() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  // 使用性能上下文。
  const { settings, downgradeTier, tier } = usePerformance();

  // 挂载时在后台初始化音频。
  useEffect(() => {
    initAudio();
  }, []);

  const handleSceneReady = useCallback(() => {
    requestAnimationFrame(() => {
      setSceneReady(true);
    });
  }, []);

  return (
    <AudioProvider>
      <SceneProvider>
        <DocumentMetaBridge />
        <GlobalAudioEnabler />
        <div className="app">
          {/* 全屏 3D 画布。 */}
          <div className="canvas-wrapper">
            <Canvas
              camera={{
                position: [0, 0.2, 28],
                fov: 60,
                near: 0.1,
                far: 150
              }}
              gl={{
                antialias: settings.antialias,
                alpha: false,
                powerPreference: settings.powerPreference,
                localClippingEnabled: true,
                failIfMajorPerformanceCaveat: true
              }}
              dpr={settings.dpr}
              shadows={settings.shadows}
            >
              <color attach="background" args={['#fafafa']} />
              <fog attach="fog" args={['#fafafa', 15, 50]} />

              {/* 帧率下降时降低渲染开销。 */}
              <PerformanceMonitor
                onDecline={() => downgradeTier()}
                flipflops={3}
                onFallback={() => downgradeTier()}
              />

              {/* 帧率与性能监视器。 */}
              {/* <Perf position="top-left" minimal={false} /> */}

              <Suspense fallback={null}>
                <Experience
                  isLoaded={isLoaded}
                  onSceneReady={handleSceneReady}
                  performanceTier={tier}
                />
                <Preload all />
              </Suspense>
            </Canvas>
          </div>

          {/* 导航界面：菜单、地图、返回和音频。 */}
          {isLoaded && (
            <>
              <NavigationUI />
              <GlobalOverlay />
              <AboutProfile />
              <ProjectDetails />
              <StudioNotes />
              <ContactDetails />
              <PaperTransition />
              <ScreenReaderOverlay />
            </>
          )}

          {/* 二维加载界面。 */}
          <Preloader
            ready={sceneReady}
            onComplete={() => setIsLoaded(true)}
          />
        </div>
      </SceneProvider>
    </AudioProvider>
  );
}

import { AchievementsProvider } from './context/AchievementsContext';

export default function App() {
  // App 挂载后立即预加载浏览器图片（用于标准 <img> 标签）。
  // 让这些资源在初始加载阶段便进入网络请求队列。
  useEffect(() => {
    const filteredImages = filterTexturesByDevice(IMAGE_ASSETS, supportsHover);
    // console.log(`[Preload] 开始在浏览器预加载图片，数量： ${filteredImages.length} 个。`);
    filteredImages.forEach(path => preloadBrowserImage(path));
  }, []);

  return (
    <PerformanceProvider>
      <AchievementsProvider>
        <AppContent />
      </AchievementsProvider>
    </PerformanceProvider>
  );
}
