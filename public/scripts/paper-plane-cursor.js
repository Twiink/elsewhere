// 主站与独立链接页共享原生光标；只有航迹与星屑进入动画帧。
(() => {
  const root = document.documentElement;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = window.matchMedia('(forced-colors: active)');
  const blockedTargets = 'dialog[open], textarea, input, [contenteditable="true"], video, audio, iframe, [data-cursor-trail="off"]';
  const blockedCursors = new Set(['text', 'vertical-text', 'grab', 'grabbing', 'wait', 'progress', 'not-allowed', 'none']);
  const lifetime = 620;
  const maxLength = 210;
  let canvas = null;
  let context = null;
  let frame = 0;
  let points = [];
  let stars = [];
  let previous = null;
  let target = null;
  let blocked = false;
  let interactive = false;
  let starDistance = 0;
  let lastStar = 0;
  let medium = false;

  const clear = () => {
    window.cancelAnimationFrame(frame);
    frame = 0;
    points = [];
    stars = [];
    previous = null;
    starDistance = 0;
    context?.clearRect(0, 0, window.innerWidth, window.innerHeight);
  };

  const resize = () => {
    if (!canvas) return;
    const scale = Math.min(window.devicePixelRatio || 1, medium ? 1 : 1.5);
    canvas.width = Math.round(window.innerWidth * scale);
    canvas.height = Math.round(window.innerHeight * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    clear();
  };

  const syncAvailability = () => {
    medium = root.dataset.cursorQuality === 'MEDIUM';
    const enabled = finePointer.matches && !reducedMotion.matches && !forcedColors.matches
      && root.dataset.cursorQuality !== 'LOW' && root.dataset.cursorPaused !== 'true' && !document.hidden;
    if (!enabled) {
      clear();
      canvas?.remove();
      canvas = null;
      context = null;
    } else if (!canvas) {
      canvas = document.createElement('canvas');
      context = canvas.getContext('2d');
      if (!context) { canvas = null; return; }
      canvas.className = 'paper-plane-trail';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.append(canvas);
      resize();
    } else {
      resize();
    }
  };

  const readTarget = element => {
    target = element instanceof Element ? element : document.body;
    const cursor = window.getComputedStyle(target).cursor;
    blocked = Boolean(target.closest(blockedTargets)) || blockedCursors.has(cursor) || cursor.endsWith('-resize');
    interactive = cursor.includes('paper-plane-pointer.png') || cursor === 'pointer';
    if (blocked) clear();
  };

  const addStar = (x, y, time, burst = false, angle = 0) => {
    stars.push({
      x, y, time,
      size: burst ? 2.7 : 2.2 + Math.random() * 1.1,
      life: burst ? 320 : 680,
      vx: burst ? Math.cos(angle) * 0.025 : (Math.random() - 0.5) * 0.008,
      vy: burst ? Math.sin(angle) * 0.025 : -0.009,
      rotation: Math.random() * 0.6 - 0.3,
    });
    stars = stars.slice(-(medium ? 4 : 8));
  };

  const drawStar = (star, time) => {
    const age = time - star.time;
    const remaining = 1 - age / star.life;
    const size = star.size * (0.6 + remaining * 0.4);
    context.save();
    context.translate(star.x + star.vx * age, star.y + star.vy * age);
    context.rotate(star.rotation);
    context.globalAlpha = Math.min(1, remaining * 2) * 0.85;
    context.beginPath();
    context.moveTo(0, -size);
    context.lineTo(size * 0.28, -size * 0.28);
    context.lineTo(size, 0);
    context.lineTo(size * 0.28, size * 0.28);
    context.lineTo(0, size);
    context.lineTo(-size * 0.28, size * 0.28);
    context.lineTo(-size, 0);
    context.lineTo(-size * 0.28, -size * 0.28);
    context.closePath();
    context.fillStyle = '#edcb7d';
    context.strokeStyle = '#a17c43';
    context.lineWidth = 0.65;
    context.fill();
    context.stroke();
    context.restore();
  };

  const draw = time => {
    frame = 0;
    if (!context) return;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    points = points.filter(point => time - point.time < lifetime);
    stars = stars.filter(star => time - star.time < star.life);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (let index = 1; index < points.length; index += 1) {
      const before = points[index - 1];
      const point = points[index];
      const after = points[index + 1] || point;
      const strength = Math.pow(1 - (time - point.time) / lifetime, 1.15);
      context.beginPath();
      context.moveTo((before.x + point.x) / 2, (before.y + point.y) / 2);
      context.quadraticCurveTo(point.x, point.y, (point.x + after.x) / 2, (point.y + after.y) / 2);
      context.strokeStyle = `rgba(111, 112, 82, ${strength * 0.58})`;
      context.lineWidth = 0.35 + strength * 0.95;
      context.stroke();
    }
    stars.forEach(star => drawStar(star, time));
    if (points.length || stars.length) frame = window.requestAnimationFrame(draw);
    else previous = null;
  };

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(draw);
  };

  const onMove = event => {
    if (event.pointerType !== 'mouse' || !context) return;
    if (event.target !== target) readTarget(event.target);
    if (blocked || event.buttons) { clear(); return; }
    const time = performance.now();
    const point = { x: event.clientX + 13, y: event.clientY + 17, time };
    const distance = previous ? Math.hypot(point.x - previous.x, point.y - previous.y) : 0;
    const elapsed = previous ? time - previous.time : 0;
    if (distance < 2 && previous) return;
    if (elapsed > 250 || distance > 300) clear();
    points.push(point);
    points = points.slice(-(medium ? 40 : 64));
    let length = 0;
    for (let index = points.length - 1; index > 0; index -= 1) {
      length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
      if (length > maxLength) { points = points.slice(index); break; }
    }
    if (previous && elapsed > 0 && distance / elapsed > 0.18) {
      starDistance += distance;
      if (starDistance > (medium ? 95 : 52) && time - lastStar > 110) {
        addStar(point.x + (Math.random() - 0.5) * 8, point.y + (Math.random() - 0.5) * 10, time);
        starDistance = 0;
        lastStar = time;
      }
    }
    previous = point;
    schedule();
  };

  document.addEventListener('pointermove', onMove, { passive: true, capture: true });
  document.addEventListener('click', event => {
    if (!context || event.detail === 0 || event.button !== 0) return;
    readTarget(event.target);
    if (blocked || !interactive) return;
    const time = performance.now();
    const count = medium ? 3 : 5;
    for (let index = 0; index < count; index += 1) {
      addStar(event.clientX + 8, event.clientY + 10, time, true, index * Math.PI * 2 / count - 0.8);
    }
    schedule();
  }, { capture: true });
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) clear(); });
  document.addEventListener('visibilitychange', syncAvailability);
  window.addEventListener('blur', clear);
  window.addEventListener('resize', resize, { passive: true });
  [finePointer, reducedMotion, forcedColors].forEach(media => media.addEventListener('change', syncAvailability));
  new MutationObserver(syncAvailability).observe(root, { attributes: true, attributeFilter: ['data-cursor-quality', 'data-cursor-paused'] });
  // 三维物体通过 body 的 cursor 表达悬停、等待和抓取，无需逐帧查询样式。
  new MutationObserver(() => { if (target) readTarget(target); }).observe(document.body, { attributes: true, attributeFilter: ['style'] });
  syncAvailability();
})();
