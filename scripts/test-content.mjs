import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { buildJsonLd, buildLlmsTxt, generateSeoHtml } from '../seo-plugin.js';

const content = JSON.parse(readFileSync(new URL('../src/data/content.json', import.meta.url)));
const original = JSON.parse(readFileSync(new URL('../src/data/content.original.json', import.meta.url)));
const allItems = [...content.projects, ...content.studio, ...content.awards, ...content.faq];

test('本地快照保留全部已发布记录与外链', () => {
    assert.equal(original.length, 40);
    for (const [key, type] of [['projects', 'galleryProject'], ['studio', 'studioItem'], ['awards', 'awardCertificate'], ['faq', 'faq']]) {
        const source = original.filter(item => item._type === type);
        assert.equal(content[key].length, source.length, key);
        assert.equal(new Set(content[key].map(item => item.id)).size, source.length, key);
        assert.deepEqual(content[key].map(item => item.id).sort(), source.map(item => key === 'projects' ? item.slug.current : item._id).sort());
        if (key === 'projects' || key === 'studio') {
            assert.deepEqual(content[key].map(item => item.url).sort(), source.map(item => item.url).sort());
        }
    }
    assert.equal(original.filter(item => item._type === 'globalInfo').length, 1);
    assert.ok(content.site.siteTitle && content.site.siteDescription && content.site.aboutMe);
    for (const item of allItems) {
        assert.ok((item.title || item.question).length > 0);
        assert.match(item.description || item.answer || item.seoDescription, /\p{Script=Han}/u);
    }
});

test('全部内容图片与技术图标均指向存在的本地文件', () => {
    const paths = new Set(allItems.flatMap(item => [item.front, item.painted, item.frontTexture, item.paintedFrontTexture, item.image, ...(item.techStack || [])]).filter(Boolean));
    assert.equal([...paths].filter(path => path.startsWith('/content/')).length, 30);
    for (const path of paths) {
        assert.match(path, /^\/(content|textures)\/[\w./-]+$/);
        assert.ok(statSync(new URL(`../public${path}`, import.meta.url)).size > 0, path);
    }
    assert.doesNotMatch(JSON.stringify(content), /api\.sanity\.io|cdn\.sanity\.io|\/sanity-cdn/);
});

test('搜索输出完整来自本地中文内容，结构化数据可解析', () => {
    const graph = buildJsonLd(content)['@graph'];
    const faq = graph.find(item => item['@type'] === 'FAQPage');
    assert.equal(faq.mainEntity.length, content.faq.length);
    const llms = buildLlmsTxt(content);
    for (const item of allItems) assert.ok(llms.includes(item.seoTitle || item.title || item.question));
    const plugin = generateSeoHtml();
    const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const html = plugin.transformIndexHtml(source);
    assert.match(html, /lang="zh-CN"/);
    assert.ok(html.includes(content.faq[0].question));
    assert.ok(html.includes(content.projects[0].seoTitle));
    const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
    assert.deepEqual(JSON.parse(json), buildJsonLd(content));
});
