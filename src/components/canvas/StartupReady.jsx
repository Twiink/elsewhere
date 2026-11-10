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
    const compile = gl.compileAsync ? gl.compileAsync(scene, camera) : Promise.resolve().then(() => gl.compile(scene, camera));
    Promise.all([compile, document.fonts.load('16px "霞鹜文楷"', '创意工坊')])
      .then(() => { if (active.current) onReady(); })
      .catch(() => { if (active.current) onError(); });
  });
  return null;
}
