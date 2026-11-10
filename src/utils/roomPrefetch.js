export function scheduleRoomPrefetch({ initialRoom, canRun, schedule, cancel, load }) {
  const rooms = [...new Set([initialRoom, 'gallery', 'studio', 'about', 'contact'].filter(Boolean))];
  let stopped = false;
  let handle;
  const next = () => {
    if (stopped || !canRun() || !rooms.length) return;
    handle = schedule(async () => {
      if (stopped || !canRun()) return;
      const id = rooms.shift();
      try { await load(id); } catch { /* 前台进入时显示错误与恢复入口。 */ }
      next();
    });
  };
  next();
  return () => { stopped = true; if (handle !== undefined) cancel(handle); };
}
