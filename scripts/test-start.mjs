// 运行方式：node --test scripts/test-start.mjs
// 验证独立且无依赖的 /start 渐进增强行为。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../public/start/index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../public/start/script.js', import.meta.url), 'utf8');

function setup({ reduced = false } = {}) {
  class Element {
    children = [];
    dataset = {};
    classes = new Set();
    listeners = new Map();
    properties = new Map();
    _text = '';
    classList = {
      add: name => this.classes.add(name),
      remove: name => this.classes.delete(name),
      contains: name => this.classes.has(name),
    };
    style = {
      setProperty: (name, value) => this.properties.set(name, value),
      removeProperty: name => this.properties.delete(name),
    };
    set className(value) { this.classes = new Set(value.split(' ')); }
    get textContent() { return this.children.length ? this.children.map(el => el.textContent).join('') : this._text; }
    set textContent(value) { this._text = value; this.children = []; }
    append(element) { this.children.push(element); }
    replaceChildren(fragment) { this.children = fragment.children; this._text = ''; }
    querySelectorAll(selector) {
      const names = selector.split(',').map(name => name.trim().slice(1));
      return this.children.flatMap(child => [...(names.some(name => child.classes.has(name)) ? [child] : []), ...child.querySelectorAll(selector)]);
    }
    addEventListener(name, listener) {
      const listeners = this.listeners.get(name) || [];
      listeners.push(listener);
      this.listeners.set(name, listeners);
    }
    fire(name, event = {}) { for (const fn of this.listeners.get(name) || []) fn(event); }
    getBoundingClientRect() { return this.rect || { left: 0, top: 0, width: 30, height: 100 }; }
  }
  function work(words) {
    const link = new Element();
    words.forEach(text => { const word = new Element(); word.className = 'word'; word.textContent = text; link.append(word); });
    const arrow = new Element(); arrow.className = 'press-arrow'; link.append(arrow);
    return link;
  }
  const links = [work(['交互', '作品集']), work(['界面', '手账'])];
  links[1].dataset.pending = '界面手账';
  const notice = new Element();
  const document = Object.assign(new Element(), {
    hidden: false,
    querySelector: () => notice,
    getElementById: () => null,
    querySelectorAll: selector => selector === '.work-link' ? links : [links[1]],
    createElement: () => new Element(),
    createDocumentFragment: () => new Element(),
  });
  const media = Object.assign(new Element(), { matches: reduced });
  const window = Object.assign(new Element(), { matchMedia: () => media });
  const frames = new Map();
  const timers = new Map();
  let id = 0;
  runInNewContext(script, {
    document, window,
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: key => frames.delete(key),
    setTimeout: fn => { timers.set(++id, fn); return id; },
    clearTimeout: key => timers.delete(key),
  });
  const units = links[0].querySelectorAll('.glyph, .press-arrow');
  units.forEach((unit, index) => { unit.rect = { left: index * 100, top: 100, width: 30, height: 100 }; });
  const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); };
  return { links, units, document, window, media, frames, timers, notice, flush };
}

test('静态 HTML 包含全部目标，作品集入口仅出现一次', () => {
  const anchors = [...html.matchAll(/<a\b([^>]+)>([\s\S]*?)<\/a>/g)];
  assert.equal(anchors.length, 14); // 十三个目标链接及一个跳转链接。
  assert.equal(anchors.filter(match => /href="\/"/.test(match[1])).length, 1);
  assert.equal(anchors.filter(match => /data-pending/.test(match[1])).length, 0);
  const urls = anchors.map(match => match[1].match(/href="(https:[^"]+)"/)?.[1]).filter(Boolean);
  assert.deepEqual(urls, [
    'https://itom-ui-components.vercel.app',
    'https://www.awwwards.com/ITom/',
    'https://www.behance.net/itompoland',
    'https://codepen.io/ITomDev',
    'https://dribbble.com/itomdev',
    'https://www.facebook.com/people/ITom/61586563487664/',
    'https://github.com/ITomPoland',
    'https://www.instagram.com/itom.dev/',
    'https://www.linkedin.com/in/itomdev/',
    'https://me.muz.li/itom',
    'https://x.com/ITom_Dev',
    'https://www.youtube.com/@itomdev',
  ]);
  assert.match(html, /aria-label="交互作品集"/);
  assert.match(html, /aria-label="界面手账"/);
});

test('静态入口保持独立，使用本地中英文字体', () => {
  assert.equal((html.match(/<script\b/g) || []).length, 1);
  assert.match(html, /src="\/start\/script.js" defer/);
  assert.doesNotMatch(html, /\/assets\/|\/textures\/|modulepreload/);
  assert.doesNotMatch(script, /\bimport\s|\bfetch\s*\(|XMLHttpRequest|WebSocket/);
  assert.equal((html.match(/as="font"/g) || []).length, 2);
  assert.ok(statSync(new URL('../public/start/fonts/barlow-condensed-700-latin.woff2', import.meta.url)).size < 25000);
});

test('逐字排版保留中文文字，闲置时没有动画循环', () => {
  const app = setup();
  assert.equal(app.links[0].querySelectorAll('.word').map(word => word.textContent).join(' '), '交互 作品集');
  assert.equal(app.links[1].querySelectorAll('.word').map(word => word.textContent).join(' '), '界面 手账');
  assert.equal(app.frames.size, 0);
  assert.equal(app.links[0].listeners.has('click'), false);
});

test('指针更新合并为单帧，按压效果局部生效且范围受限', () => {
  const app = setup();
  app.links[0].fire('pointerenter', { pointerType: 'mouse', clientX: 100, clientY: 150 });
  app.links[0].fire('pointermove', { pointerType: 'mouse', clientX: 120, clientY: 150 });
  assert.equal(app.frames.size, 1);
  app.flush();
  assert.equal(app.frames.size, 0);
  const values = app.units.map(unit => Number(unit.properties.get('--press')));
  assert.ok(values.every(value => value >= 0 && value <= 1));
  assert.ok(values[1] > .9);
  assert.equal(values.at(-1), 0);
  app.links[0].fire('pointerleave');
  assert.ok(app.units.every(unit => !unit.properties.has('--press')));
});

test('触摸具有按压反馈，并保留即时导航', () => {
  const app = setup();
  app.links[0].fire('pointerenter', { pointerType: 'touch', clientX: 100, clientY: 150 });
  assert.equal(app.frames.size, 0);
  app.links[0].fire('pointerdown', { button: 0 });
  assert.equal(app.links[0].classList.contains('is-pressed'), true);
  assert.equal(app.links[0].listeners.has('click'), false);
  app.links[0].fire('pointercancel');
  assert.equal(app.links[0].classList.contains('is-pressed'), false);
});

test('减少动态效果时停止指针动画，并响应偏好变化', () => {
  const app = setup({ reduced: true });
  app.links[0].fire('pointerenter', { pointerType: 'mouse', clientX: 120, clientY: 150 });
  assert.equal(app.frames.size, 0);
  app.media.matches = false;
  app.media.fire('change');
  app.links[0].fire('pointermove', { pointerType: 'mouse', clientX: 120, clientY: 150 });
  assert.equal(app.frames.size, 1);
  app.media.matches = true;
  app.media.fire('change');
  assert.equal(app.frames.size, 0);
  assert.ok(app.units.every(unit => !unit.properties.has('--press')));
});

test('缩放、滚动和切入后台时清除待处理动画', () => {
  const app = setup();
  for (const event of ['resize', 'scroll']) {
    app.links[0].fire('pointerenter', { pointerType: 'mouse', clientX: 100, clientY: 150 });
    app.window.fire(event);
    assert.equal(app.frames.size, 0);
  }
  app.links[0].fire('pointerenter', { pointerType: 'mouse', clientX: 100, clientY: 150 });
  app.document.hidden = true;
  app.document.fire('visibilitychange');
  assert.equal(app.frames.size, 0);
});

test('待补充链接显示中文提示，Esc 清除提示', () => {
  const app = setup();
  let prevented = false;
  app.links[1].fire('click', { preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(app.notice.textContent, '界面手账：链接即将上线。');
  app.document.fire('keydown', { key: 'Escape' });
  assert.equal(app.notice.textContent, '');
  assert.equal(app.timers.size, 0);
});
