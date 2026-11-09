import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { buildJsonLd, buildLlmsTxt, generateSeoHtml } from '../seo-plugin.js';
import { withProfile } from '../src/data/profile.js';
import { PRELOAD_ALL, PRELOAD_LOADER, filterTexturesByDevice } from '../src/config/texturePreloadList.js';

const content = withProfile(
    JSON.parse(readFileSync(new URL('../src/data/content.json', import.meta.url))),
    JSON.parse(readFileSync(new URL('../src/data/profile.json', import.meta.url))),
);
const original = JSON.parse(readFileSync(new URL('../src/data/content.original.json', import.meta.url)));
const allItems = [...content.projects, ...content.studio, ...content.awards, ...content.faq];

test('原始快照保持完整，尚未替换的示例保留原始归属与外链', () => {
    assert.equal(original.length, 40);
    for (const [key, type] of [['projects', 'galleryProject'], ['studio', 'studioItem'], ['awards', 'awardCertificate']]) {
        const source = original.filter(item => item._type === type);
        if (key === 'projects') {
            assert.ok(content.projects.length >= source.length, key);
        } else if (key === 'awards') {
            assert.equal(content[key].length, source.length, key);
        }
        assert.equal(new Set(content[key].map(item => item.id)).size, content[key].length, key);
        const retained = key === 'projects' ? content[key].filter(item => !item.details) : key === 'studio' ? content[key].filter(item => item.layout !== 'studio') : content[key];
        if (key === 'awards') {
            assert.deepEqual(retained.map(item => item.id).sort(), source.map(item => item._id).sort());
        }
        if (key === 'projects' || key === 'studio') {
            for (const item of retained) {
                const previous = source.find(entry => (key === 'projects' ? entry.slug.current : entry._id) === item.id);
                assert.ok(previous, item.id);
                assert.equal(item.url, previous.url);
                assert.equal(item.authorName, 'Tomasz Szmajda');
            }
        }
    }
    assert.equal(original.filter(item => item._type === 'globalInfo').length, 1);
    assert.equal(new Set(content.faq.map(item => item.id)).size, content.faq.length);
    assert.ok(content.site.siteTitle && content.site.siteDescription && content.site.aboutMe);
    for (const item of allItems) {
        assert.ok((item.title || item.question).length > 0);
        assert.match(item.description || item.answer || item.seoDescription, /\p{Script=Han}/u);
    }
});

test('内容图片、贴图和简历使用对象存储，视频保留有效文件', () => {
    const imageItems = [...allItems, ...content.wishes, content.studioWishCard];
    const paths = new Set(imageItems.flatMap(item => [item.front, item.painted, item.frontTexture, item.paintedFrontTexture, item.image, ...(item.techStack || []), ...(item.photos || []).map(photo => photo.src), ...(item.details?.photos.map(photo => photo.src) || []), ...(item.details?.videos?.flatMap(video => [video.src, video.poster]) || []), item.details?.entry.image]).filter(Boolean));
    paths.add(content.site.shareImage.path);
    for (const path of [...paths, ...PRELOAD_ALL, ...PRELOAD_LOADER]) {
        if (path.endsWith('.mp4')) {
            assert.ok(statSync(new URL(`../public${path}`, import.meta.url)).size > 0, path);
            continue;
        }
        const url = new URL(path);
        assert.equal(url.origin, 'https://media.secknow-ai.com');
        assert.match(url.pathname, /^\/space\/(content|textures|images)\/[\w./-]+\.(png|jpg|svg)$/);
        assert.ok(!url.pathname.endsWith('/hanfu-photo.png'));
    }
    assert.ok(filterTexturesByDevice(PRELOAD_ALL, true).some(path => path.includes('_painted.png')));
    assert.ok(filterTexturesByDevice(PRELOAD_ALL, false).every(path => !path.includes('_painted.png')));
    assert.doesNotMatch(JSON.stringify(content), /api\.sanity\.io|cdn\.sanity\.io|\/sanity-cdn/);
    const resume = new URL(content.site.resume.url);
    assert.equal(resume.origin, 'https://media.secknow-ai.com');
    assert.equal(resume.pathname, '/space/Resume.pdf');
    assert.match(content.site.resume.downloadName, /\.pdf$/);
});

test('泡芙大作战正文结构完整，接入三张现场图和无损小程序码', () => {
    const project = content.projects.find(item => item.id === 'puffwar');
    assert.ok(project);
    assert.equal(project.authorName, 'Twiink');
    assert.equal(project.url, '/gallery');
    assert.ok(!content.projects.some(item => item.id === 'adam-and-ewa'));
    assert.ok(project.details.tagline.length > 0);
    assert.equal(new Set(project.details.sections.map(section => section.id)).size, project.details.sections.length);
    for (const section of project.details.sections) {
        assert.ok(section.title.length > 0);
        for (const text of [...section.paragraphs, ...section.entries.flatMap(entry => [entry.title, entry.description])]) {
            assert.equal(typeof text, 'string');
            assert.ok(text.length > 0);
        }
    }
    assert.equal(project.details.photos.length, 3);
    assert.equal(project.details.sections.find(section => section.id === 'tools').collapsible, true);
    assert.equal(new URL(project.details.entry.image).pathname, '/space/content/projects/puffwar/miniprogram-code.png');
    const publicCode = readFileSync(new URL('../public/content/projects/puffwar/miniprogram-code.png', import.meta.url));
    // 固定已确认小程序码的字节校验和，避免测试依赖本地制作归档。
    assert.equal(createHash('sha256').update(publicCode).digest('hex'), '0d53d2cdee68da4746b6f0c966064be10803a12085718d707bc7a6c095c9729c');
    const ragCenter = content.projects.find(item => item.id === 'rag-center');
    const harnessPrd = content.projects.find(item => item.id === 'harness-prd');
    assert.equal(ragCenter?.details?.entry?.url, 'https://github.com/Twiink/RAG-Center');
    assert.equal(harnessPrd?.details?.entry?.url, 'https://github.com/Twiink/HarnessPRD');
});

test('搜索输出完整来自本地中文内容，结构化数据可解析', () => {
    const graph = buildJsonLd(content)['@graph'];
    const person = graph.find(item => item['@type'] === 'Person');
    assert.equal(person.name, content.site.nickname);
    assert.equal(person.description, content.site.aboutMe);
    assert.deepEqual(person.sameAs, [content.site.githubUrl]);
    assert.equal(person.email, content.site.contact.email);
    const projects = graph.find(item => item['@type'] === 'ItemList' && item.name === '精选项目');
    assert.equal(projects.itemListElement[0].item.creator.name, content.projects[0].authorName);
    const faq = graph.find(item => item['@type'] === 'FAQPage');
    assert.deepEqual(faq.mainEntity, content.faq.map(item => ({
        '@type': 'Question', name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })));
    const llms = buildLlmsTxt(content);
    for (const item of [...content.projects, ...content.studio, ...content.faq]) assert.ok(llms.includes(item.seoTitle || item.title || item.question));
    const plugin = generateSeoHtml();
    const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const html = plugin.transformIndexHtml(source);
    const shareImageUrl = new URL(content.site.shareImage.path, `${content.site.url}/`).href;
    assert.ok(html.includes(`<meta property="og:image" content="${shareImageUrl}">`));
    assert.ok(html.includes(`<meta name="twitter:image" content="${shareImageUrl}">`));
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
    for (const text of [content.site.resume.url, content.site.studioChannels.videoAccount]) {
        assert.ok(html.includes(text));
        assert.ok(llms.includes(text));
    }
    assert.ok(html.includes('https://blog.csdn.net/matrix_studio?type=blog'));
    assert.match(html, /lang="zh-CN"/);
    assert.ok(html.includes(content.faq[0].question));
    for (const item of content.faq) {
        const escapedQuestion = item.question.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
        const escapedAnswer = item.answer.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
        assert.ok(html.includes(escapedQuestion));
        assert.ok(html.includes(escapedAnswer));
        assert.ok(llms.includes(item.question));
        assert.ok(llms.includes(item.answer));
    }
    assert.ok(html.includes(content.projects[0].seoTitle));
    for (const note of content.studio.filter(item => item.layout === 'studio')) {
        const article = graph.find(item => item['@type'] === 'Article' && item.url === note.url);
        assert.equal(article.author.name, 'Twiink');
        assert.equal(article.articleBody, note.paragraphs.join('\n\n'));
        if (!note.date) assert.ok(!('datePublished' in article));
        for (const text of note.paragraphs) {
            assert.ok(html.includes(text), text);
            assert.ok(llms.includes(text), text);
        }
        for (const photo of note.photos) assert.ok(html.includes(photo.src));
    }
    for (const project of content.projects.filter(item => item.details)) {
        for (const section of project.details.sections) {
            for (const text of [...section.paragraphs, ...section.entries.map(entry => entry.description)]) {
                assert.ok(html.includes(text), text);
                assert.ok(llms.includes(text), text);
            }
        }
    }
    const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
    assert.deepEqual(JSON.parse(json), buildJsonLd(content));
    assert.ok(html.includes(`<link rel="canonical" href="${content.site.url}/">`));
    assert.ok(html.includes(`<meta property="og:url" content="${content.site.url}/">`));
    for (const text of [content.site.contact.email, content.site.contact.wechatId, content.site.contact.description]) {
        assert.ok(html.includes(text));
        assert.ok(llms.includes(text));
    }
    assert.match(html, /name="author" content="Twiink"/);
});

test('站点域名配置不改变对象存储图片地址', () => {
    const local = { ...content, site: { ...content.site, url: '' } };
    const localGraph = buildJsonLd(local)['@graph'];
    assert.equal(localGraph.find(item => item['@type'] === 'Person')['@id'], '#person');
    const localProjects = localGraph.find(item => item['@type'] === 'ItemList' && item.name === '精选项目');
    assert.equal(localProjects.itemListElement[0].item.image, content.projects[0].front);
    const hosted = { ...content, site: { ...content.site, url: 'https://example.com' } };
    const hostedGraph = buildJsonLd(hosted)['@graph'];
    assert.equal(hostedGraph.find(item => item['@type'] === 'Person')['@id'], 'https://example.com/#person');
    const hostedProjects = hostedGraph.find(item => item['@type'] === 'ItemList' && item.name === '精选项目');
    assert.equal(hostedProjects.itemListElement[0].item.image, content.projects[0].front);
});
