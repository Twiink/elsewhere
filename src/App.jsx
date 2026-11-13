import { useAudio, usePerformance, useScene } from './context/contexts';
import { useState, Suspense, useEffect, useCallback, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor, useProgress } from '@react-three/drei';
import Preloader from './components/dom/Preloader';
import SceneErrorBoundary from './components/dom/SceneErrorBoundary';
import LoadingFailure from './components/dom/LoadingFailure';
import PaperTransition from './components/dom/PaperTransition';
import { usePageVisibility } from './hooks/usePageVisibility';
import { AudioProvider } from './context/AudioManager';
import { initAudio } from './utils/audioManager';
import { PerformanceProvider } from './context/PerformanceContext';
import { canPrefetchRooms } from './utils/performance';
import { SceneProvider } from './context/SceneContext';
import { AchievementsProvider } from './context/AchievementsContext';
import { SecretsProvider } from './context/SecretsContext';
import NavigationUI from './components/ui/NavigationUI';
import ScreenReaderOverlay from './components/ui/ScreenReaderOverlay';
import { useDocumentMeta } from './hooks/useDocumentMeta';
import { scheduleRoomPrefetch } from './config/roomResources';
import { initAnalytics } from './utils/analytics';
import { startLoadingTimeout } from './utils/loadingTimeout';
import { galleryProjects, studioContent } from './data/content';
import './styles/main.scss';
import './styles/ReadingTrigger.scss';
import { WebGLRenderer } from 'three';
import RoomLoadingNotice from './components/dom/RoomLoadingNotice';
import PaperPlaneCursor from './components/dom/PaperPlaneCursor';

// WebGL 上下文的创建选项保持稳定；可切换的抗锯齿由 AdaptiveQuality 处理。
const createSceneRenderer = options => {
  const renderer = new WebGLRenderer({ ...options, antialias: false, alpha: false, powerPreference: 'default', failIfMajorPerformanceCaveat: true });
  renderer.localClippingEnabled = true;
  return renderer;
};

const Experience = lazy(() => import('./components/canvas/Experience'));
const AdaptiveQuality = lazy(() => import('./components/canvas/AdaptiveQuality'));
const GlobalOverlay = lazy(() => import('./components/ui/GlobalOverlay'));
const AboutProfile = lazy(() => import('./components/ui/AboutProfile'));
const ProjectDetails = lazy(() => import('./components/ui/ProjectDetails'));
const StudioNotes = lazy(() => import('./components/ui/StudioNotes'));
const ContactDetails = lazy(() => import('./components/ui/ContactDetails'));
const PANELS = { about: AboutProfile, gallery: ProjectDetails, studio: StudioNotes, contact: ContactDetails };
const PANEL_ROOMS = { profile: 'about', project: 'gallery', studio: 'studio', contact: 'contact' };

function GlobalAudioEnabler() {
  const { enableAudio } = useAudio();
  useEffect(() => {
    const handleInteraction = () => { enableAudio(); initAudio(); };
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(name => window.addEventListener(name, handleInteraction, { once: true }));
    return () => events.forEach(name => window.removeEventListener(name, handleInteraction));
  }, [enableAudio]);
  return null;
}

function DocumentMetaBridge() {
  useDocumentMeta();
  const { initialRoom, deeplinkHandled, hasEntered, teleportTo } = useScene();
  useEffect(() => {
    if (!initialRoom || !hasEntered || deeplinkHandled.current) return;
    const timer = setTimeout(() => {
      deeplinkHandled.current = true;
      teleportTo(initialRoom);
    }, 300);
    return () => clearTimeout(timer);
  }, [initialRoom, hasEntered, teleportTo, deeplinkHandled]);
  return null;
}

function RoomPanels() {
  const { currentRoom, overlayContent, hasEntered, isInRoom, isTeleporting, openOverlay, closeOverlay, initialStudioLink, consumeStudioLink } = useScene();
  const Panel = PANELS[PANEL_ROOMS[overlayContent?.layout]];
  useEffect(() => {
    if (currentRoom !== 'studio' || isTeleporting || !consumeStudioLink()) return;
    if (initialStudioLink.wishes) openOverlay({ layout: 'studio', view: 'wishes' });
    else if (studioContent.some(note => note.id === initialStudioLink.noteId)) openOverlay({ layout: 'studio', noteId: initialStudioLink.noteId });
  }, [currentRoom, isTeleporting, consumeStudioLink, initialStudioLink, openOverlay]);
  const readers = {
    about: { title: '阅读关于我', dialog: 'about-profile-dialog', target: { layout: 'profile' } },
    gallery: { title: '阅读项目介绍', className: 'project-details-trigger', dialog: 'project-details-dialog', target: { layout: 'project', projectId: galleryProjects[0]?.id } },
    studio: { title: '翻翻生活手记', dialog: 'studio-notes-dialog', target: { layout: 'studio', noteId: studioContent[0]?.id } },
    contact: { title: '联系方式', className: 'contact-details-trigger', dialog: 'contact-details-dialog', target: { layout: 'contact' } },
  };
  const reader = readers[currentRoom];
  return <>
    {hasEntered && isInRoom && !isTeleporting && reader && (currentRoom === 'studio'
      ? <nav className="studio-notes-triggers" aria-label="打开生活手记"><button type="button" className="studio-notes-trigger" aria-haspopup="dialog" aria-controls={reader.dialog} aria-expanded={overlayContent?.layout === 'studio'} onClick={() => openOverlay(reader.target)}>{reader.title}</button></nav>
      : <button type="button" className={`about-profile-trigger ${reader.className ?? ''}`} aria-haspopup="dialog" aria-controls={reader.dialog} onClick={() => openOverlay(reader.target)}>{reader.title}</button>
    )}
    <Suspense fallback={null}>{hasEntered && <GlobalOverlay />}</Suspense>
    <Suspense fallback={<div className="reader-loading" role="status">正在翻开纸页…… <button type="button" onClick={closeOverlay}>取消</button></div>}>
      {Panel && <Panel />}
    </Suspense>
  </>;
}

function AppContent() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [entranceRevealing, setEntranceRevealing] = useState(false);
  const [startupAssets, setStartupAssets] = useState(null);
  const pageVisible = usePageVisibility();
  const { settings, downgradeTier, tier } = usePerformance();
  const { initialRoom, isTeleporting, isInRoom, loadingError, reportLoadingError } = useScene();

  useEffect(() => {
    if (sceneReady) return;
    return startLoadingTimeout(reportLoadingError);
  }, [sceneReady, reportLoadingError]);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => { void initAnalytics(); }, 2500);
    if (!pageVisible || !canPrefetchRooms(navigator, tier) || isTeleporting || isInRoom) return () => clearTimeout(timer);
    const stop = scheduleRoomPrefetch({
      initialRoom,
      canRun: () => !document.hidden && canPrefetchRooms(navigator, tier),
      schedule(callback) {
        const pending = { timer: setTimeout(() => {
          if (window.requestIdleCallback) pending.idle = window.requestIdleCallback(callback, { timeout: 3000 });
          else void callback();
        }, 2000) };
        return pending;
      },
      cancel(pending) {
        clearTimeout(pending.timer);
        if (pending.idle !== undefined) window.cancelIdleCallback(pending.idle);
      },
    });
    return () => { clearTimeout(timer); stop(); };
  }, [isLoaded, tier, initialRoom, isTeleporting, isInRoom, pageVisible]);

  const handleSceneReady = useCallback(() => {
    const { loaded, total } = useProgress.getState();
    setStartupAssets({ loaded, total });
    performance.mark('app:scene-ready');
    setSceneReady(true);
  }, []);
  const handleLoaded = useCallback(() => {
    performance.mark('app:entrance-ready');
    setIsLoaded(true);
  }, []);
  const handleEntranceReveal = useCallback(() => setEntranceRevealing(true), []);

  if (loadingError) return <LoadingFailure />;

  return <>
    <PaperPlaneCursor />
    <DocumentMetaBridge />
    <GlobalAudioEnabler />
    <div className="app">
      <div className="canvas-wrapper">
        <Canvas
          frameloop={pageVisible ? 'always' : 'never'}
          camera={{ position: [0, 0.2, 28], fov: 60, near: 0.1, far: 150 }}
          gl={createSceneRenderer}
          dpr={settings.dpr}
          shadows={settings.shadows}
        >
          <color attach="background" args={['#fafafa']} />
          <fog attach="fog" args={['#fafafa', 15, 50]} />
          <PerformanceMonitor onDecline={downgradeTier} flipflops={3} onFallback={downgradeTier} />
          <Suspense fallback={null}><AdaptiveQuality /></Suspense>
          <Suspense fallback={null}>
            <Experience onSceneReady={handleSceneReady} onError={reportLoadingError} invitationVisible={entranceRevealing || isLoaded} />
          </Suspense>
        </Canvas>
      </div>
      {isLoaded && <>
        <NavigationUI />
        <RoomPanels />
        <PaperTransition />
        <RoomLoadingNotice />
        <ScreenReaderOverlay />
      </>}
      <Preloader ready={sceneReady} assets={startupAssets} onReveal={handleEntranceReveal} onComplete={handleLoaded} />
    </div>
  </>;
}

export default function App() {
  return <SceneErrorBoundary>
    <PerformanceProvider>
      <AudioProvider>
        <AchievementsProvider>
          <SecretsProvider>
            <SceneProvider><AppContent /></SceneProvider>
          </SecretsProvider>
        </AchievementsProvider>
      </AudioProvider>
    </PerformanceProvider>
  </SceneErrorBoundary>;
}
