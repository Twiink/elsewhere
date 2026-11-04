import { createContext, useContext, useState, useEffect } from "react";
import { useThree } from "@react-three/fiber";

// 性能档位。
export const TIERS = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
};

// 各档位设置。
const SETTINGS = {
  [TIERS.HIGH]: {
    dpr: [1, 2], // 最高允许两倍像素密度。
    shadows: true, // 启用阴影。
    antialias: true,
    powerPreference: "high-performance",
    physicsStep: 1 / 60,
    textureQuality: "high",
    particleCount: 1.0, // 粒子数量 100%。
  },
  [TIERS.MEDIUM]: {
    dpr: [1, 1.5], // 移动端最高 1.5 倍，平衡画质与 GPU 填充率。
    shadows: false, // 禁用阴影，提高移动端性能。
    antialias: true,
    powerPreference: "default",
    physicsStep: 1 / 60,
    textureQuality: "medium",
    particleCount: 0.6, // 粒子数量 60%。
  },
  [TIERS.LOW]: {
    dpr: [0.8, 1], // 最低 0.8 倍像素密度，避免过度像素化。
    shadows: false, // 完全禁用阴影。
    antialias: false, // 禁用抗锯齿以提高帧率。
    powerPreference: "low-power",
    physicsStep: 1 / 45, // 必要时降低物理更新频率。
    textureQuality: "low",
    particleCount: 0.3, // 粒子数量 30%。
  },
};

const PerformanceContext = createContext(null);

export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error("usePerformance 必须在 PerformanceProvider 内使用");
  }
  return context;
};

export const PerformanceProvider = ({ children }) => {
  const [tier, setTier] = useState(TIERS.HIGH); // 默认高档，按需降级。
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    const detectTier = () => {
      let detectedTier = TIERS.HIGH;

      // 1. 移动端检测。
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        detectedTier = TIERS.MEDIUM;
      }

      // 2. 硬件并发数，即 CPU 核心数。
      // 低性能设备通常只有四核或更少。
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
        detectedTier = isMobile ? TIERS.LOW : TIERS.MEDIUM;
      }

      // 3. 简单估算 GPU 与帧率。
      // 极弱硬件或内存不超过 4GB 时覆盖档位。
      if (navigator.deviceMemory && navigator.deviceMemory <= 4) {
        detectedTier = TIERS.LOW;
      }
      
      // 移除窄屏启发式判断，因为现代手机 CSS 宽度也可能低于 430 像素。

      // console.log(
      //   `[性能] 检测档位： ${detectedTier} | 核心数： ${navigator.hardwareConcurrency} | 移动端： ${isMobile}`
      // );
      setTier(detectedTier);
      setIsDetecting(false);
    };

    detectTier();
  }, []);

  // 手动降低档位的函数，由 PerformanceMonitor 调用。
  const downgradeTier = () => {
    setTier((current) => {
      if (current === TIERS.HIGH) return TIERS.MEDIUM;
      if (current === TIERS.MEDIUM) return TIERS.LOW;
      return TIERS.LOW;
    });
  };

  const value = {
    tier,
    settings: SETTINGS[tier],
    isDetecting,
    downgradeTier,
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};
