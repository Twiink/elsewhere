import { useEffect } from 'react';
import { usePerformance, useScene } from '../../context/contexts';

export default function PaperPlaneCursor() {
  const { tier } = usePerformance();
  const { overlayContent, isTeleporting } = useScene();
  const paused = Boolean(overlayContent || isTeleporting);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.cursorQuality = tier;
    root.dataset.cursorPaused = String(paused);
    return () => {
      delete root.dataset.cursorQuality;
      delete root.dataset.cursorPaused;
    };
  }, [tier, paused]);

  return null;
}
