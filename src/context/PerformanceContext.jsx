import { PerformanceContext } from './contexts';
import { useState, useMemo, useCallback } from "react";
import { TIERS, detectPerformanceTier } from '../utils/performance';

// 性能档位。

// 各档位设置。
const SETTINGS = {
  [TIERS.HIGH]: {
    dpr: [1, 2], // 最高允许两倍像素密度。
    shadows: true, // 启用阴影。
    antialias: true,
    cloudDensity: 1,
    detailDistance: 80,
    animationFps: 60,
    textureAnisotropy: 4,
    particleCount: 1.0, // 粒子数量 100%。
  },
  [TIERS.MEDIUM]: {
    dpr: [1, 1.5], // 移动端最高 1.5 倍，平衡画质与 GPU 填充率。
    shadows: false, // 禁用阴影，提高移动端性能。
    antialias: true,
    cloudDensity: 0.7,
    detailDistance: 60,
    animationFps: 40,
    textureAnisotropy: 2,
    particleCount: 0.6, // 粒子数量 60%。
  },
  [TIERS.LOW]: {
    dpr: [0.8, 1], // 最低 0.8 倍像素密度，避免过度像素化。
    shadows: false, // 完全禁用阴影。
    antialias: false, // 禁用抗锯齿以提高帧率。
    cloudDensity: 0.4,
    detailDistance: 42,
    animationFps: 24,
    textureAnisotropy: 1,
    particleCount: 0.3, // 粒子数量 30%。
  },
};

export const PerformanceProvider = ({ children }) => {
  const [tier, setTier] = useState(detectPerformanceTier);

  // 手动降低档位的函数，由 PerformanceMonitor 调用。
  const downgradeTier = useCallback(() => {
    setTier((current) => {
      if (current === TIERS.HIGH) return TIERS.MEDIUM;
      if (current === TIERS.MEDIUM) return TIERS.LOW;
      return TIERS.LOW;
    });
  }, []);

  const value = useMemo(() => ({
    tier,
    settings: SETTINGS[tier],
    isDetecting: false,
    downgradeTier,
  }), [tier, downgradeTier]);

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};
