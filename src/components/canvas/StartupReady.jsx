import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// 位于入口的 Suspense 内，只有核心场景和字体就绪后才会挂载。
export default function StartupReady({ onReady, onError }) {
  const { gl, scene, camera } = useThree();
  const frames = useRef(0);
  const started = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useFrame(() => {
    if (started.current || ++frames.current < 3) return;
    started.current = true;
    // 字体布局可能替换材质，在同一任务内预编译，避免跨帧访问失效的材质。
    const compile = Promise.resolve().then(() => gl.compile(scene, camera));
    Promise.all([compile, document.fonts.load('16px "霞鹜文楷"', '创意工坊')])
      .then(() => { if (active.current) onReady(); })
      .catch(() => { if (active.current) onError(); });
  });
  return null;
}
