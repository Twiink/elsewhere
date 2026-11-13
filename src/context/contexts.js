import { createContext, useContext } from 'react';

export const PerformanceContext = createContext(null);
export const SceneContext = createContext(null);
export const AchievementsContext = createContext();
export const SecretsContext = createContext();
export const AudioContext = createContext({
  isMuted: false,
  toggleMute() {},
  play() {},
  enableAudio() {},
  audioEnabled: false,
  globalVolume: 0.5,
  setGlobalVolume() {},
});

export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (!context) throw new Error('usePerformance 必须在 PerformanceProvider 内使用');
  return context;
}

export function useScene() {
  const context = useContext(SceneContext);
  if (!context) throw new Error('useScene 必须在 SceneProvider 内使用');
  return context;
}

export const useAudio = () => useContext(AudioContext);
export const useAchievements = () => useContext(AchievementsContext);
export const useSecrets = () => useContext(SecretsContext);
