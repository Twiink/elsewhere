import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../public/scripts/resume-download.js', import.meta.url), 'utf8');
const { resume } = JSON.parse(readFileSync(new URL('../src/data/content.json', import.meta.url))).site;

function setup(fetchImpl) {
  const attributes = new Map();
  const link = {
    href: resume.url, download: resume.downloadName, textContent: '下载简历 PDF',
    closest: () => link,
    getAttribute: key => attributes.get(key),
    setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: key => attributes.delete(key),
  };
  const pdf = new Blob(['%PDF-1.7\nresume'], { type: 'application/pdf' });
  const response = { ok: true, blob: async () => pdf };
  const requests = [], downloads = [], objects = [], revoked = [], timers = [];
  let listener;
  runInNewContext(script, {
    document: {
      addEventListener: (name, callback) => { assert.equal(name, 'click'); listener = callback; },
      body: { append: () => {} },
      createElement: () => {
        const anchor = {
          click: () => downloads.push({ url: anchor.href, filename: anchor.download }),
          remove: () => { anchor.removed = true; },
        };
        objects.push(anchor);
        return anchor;
      },
    },
    fetch: async (url, options) => { requests.push({ url, options }); return fetchImpl ? fetchImpl(response) : response; },
    URL: {
      createObjectURL: blob => { assert.equal(blob, pdf); return 'blob:resume-download'; },
      revokeObjectURL: url => revoked.push(url),
    },
    setTimeout: (callback, delay) => { timers.push({ callback, delay }); },
  });
  return {
    link, requests, downloads, objects, revoked, timers,
    click(overrides = {}) {
      const event = { target: link, button: 0, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...overrides };
      return { event, done: listener(event) };
    },
  };
}

test('对象存储 PDF 通过 Blob 按指定中文文件名下载，结束后释放资源', async () => {
  const app = setup();
  assert.equal(app.requests.length, 0);
  const { event, done } = app.click();
  await done;
  assert.equal(event.defaultPrevented, true);
  assert.equal(app.requests[0].url, 'https://media.secknow-ai.com/space/Resume.pdf');
  assert.equal(app.requests[0].options.mode, 'cors');
  assert.equal(app.requests[0].options.credentials, 'omit');
  assert.deepEqual(app.downloads, [{ url: 'blob:resume-download', filename: '郑越-13990529155-Agent全栈开发.pdf' }]);
  assert.equal(app.link.textContent, '下载简历 PDF');
  assert.equal(app.objects[0].removed, true);
  assert.equal(app.link.getAttribute('aria-busy'), undefined);
  app.timers[0].callback();
  assert.deepEqual(app.revoked, ['blob:resume-download']);
});

test('准备下载期间重复点击只请求一次 PDF', async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  let response;
  const app = setup(value => { response = value; return pending; });
  const first = app.click(), second = app.click();
  assert.equal(app.requests.length, 1);
  assert.equal(app.link.getAttribute('aria-busy'), 'true');
  finish(response);
  await Promise.all([first.done, second.done]);
  assert.equal(app.downloads.length, 1);
});

test('下载失败时不生成文件，并允许再次点击重试', async () => {
  let attempt = 0;
  const app = setup(response => ++attempt === 1 ? { ok: false } : response);
  await app.click().done;
  assert.equal(app.downloads.length, 0);
  assert.equal(app.link.textContent, '下载失败，点击重试');
  assert.equal(app.link.getAttribute('aria-busy'), undefined);
  await app.click().done;
  assert.equal(app.downloads.length, 1);
  assert.equal(app.link.textContent, '下载简历 PDF');
});

test('普通查看链接、修饰键和中键点击保留浏览器原有行为', async () => {
  const app = setup();
  for (const overrides of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { target: { closest: () => null } }]) {
    const { event, done } = app.click(overrides);
    await done;
    assert.equal(event.defaultPrevented, false);
  }
  assert.equal(app.requests.length, 0);
});
