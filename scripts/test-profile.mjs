import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { withProfile, getSkillLabels } from '../src/data/profile.js';
import { buildJsonLd, buildLlmsTxt, buildProfileHtml, generateSeoHtml } from '../seo-plugin.js';
import { getInitialRoomFromUrl } from '../src/utils/roomRoutes.js';

const profile = JSON.parse(readFileSync(new URL('../src/data/profile.json', import.meta.url)));
const content = JSON.parse(readFileSync(new URL('../src/data/content.json', import.meta.url)));

test('独立路由映射保持房间直达、末尾斜杠与未知路径行为', () => {
    for (const room of ['about', 'gallery', 'studio', 'contact']) {
        assert.equal(getInitialRoomFromUrl(`/${room}`), room);
        assert.equal(getInitialRoomFromUrl(`/${room}/`), room);
    }
    assert.equal(getInitialRoomFromUrl('/'), null);
    assert.equal(getInitialRoomFromUrl('/unknown'), null);
});

test('可编辑资料保留必要字段、稳定标识与有效月份', () => {
    for (const key of ['role', 'currentFocus', 'sitePurpose', 'greeting', 'strengths', 'closing']) {
        assert.equal(typeof profile[key], 'string', key);
    }
    for (const key of ['introduction', 'keywords', 'tools']) {
        assert.ok(Array.isArray(profile[key]), key);
        assert.ok(profile[key].every(item => typeof item === 'string'), key);
    }
    for (const key of ['profile', 'current', 'purpose', 'skills', 'timeline', 'interests', 'highlights', 'honors']) {
        assert.equal(typeof profile.titles[key], 'string', `titles.${key}`);
    }
    for (const key of ['skills', 'timeline', 'interests', 'highlights', 'honors']) {
        assert.ok(Array.isArray(profile[key]), key);
        assert.equal(new Set(profile[key].map(item => item.id)).size, profile[key].length, `${key}: id 不能重复`);
        for (const item of profile[key]) {
            assert.ok(typeof item.id === 'string' && item.id.length > 0, `${key}: 缺少 id`);
            assert.ok(typeof item.title === 'string' && item.title.length > 0, `${key}.${item.id}: 缺少 title`);
            assert.equal(typeof item.description, 'string', `${key}.${item.id}: description`);
            if (key === 'timeline' || item.date) assert.match(item.date, /^\d{4}-(0[1-9]|1[0-2])$/, item.id);
            if (key === 'skills') assert.ok(Array.isArray(item.technologies) && item.technologies.every(tech => typeof tech === 'string'));
        }
    }
});

test('新增技能、经历、兴趣、成果和证书会进入正文，搜索信息与页面共享个人介绍', () => {
    const edited = structuredClone(profile);
    edited.greeting = '你好，我是新的介绍。';
    edited.introduction = ['这是一段修改后的个人介绍。'];
    edited.skills.push({ id: 'new-skill', title: '新增方向', technologies: ['新的技术', 'React'], description: '新技能说明' });
    edited.timeline.push({ id: 'new-event', date: '2026-11', title: '新的经历', description: '新的经历说明' });
    edited.interests.push({ id: 'new-interest', title: '新的爱好', description: '新的爱好说明' });
    edited.highlights.push({ id: 'new-highlight', title: '新的成果', description: '新的成果说明' });
    edited.honors.push({ id: 'new-certificate', title: '新的证书', description: '新的证书说明' });
    const combined = withProfile(content, edited);
    assert.equal(combined.site.aboutMe, `${edited.greeting}\n\n${edited.introduction[0]}`);
    assert.equal(combined.site.siteTitle, content.site.siteTitle);
    const person = buildJsonLd(combined)['@graph'].find(item => item['@type'] === 'Person');
    assert.equal(person.description, combined.site.aboutMe);
    assert.ok(person.knowsAbout.includes('新的技术'));
    assert.equal(getSkillLabels(edited).filter(item => item === 'React').length, 1);
    for (const output of [buildLlmsTxt(combined), buildProfileHtml(edited)]) {
        for (const text of ['新的技术', '新的经历说明', '新的爱好说明', '新的成果说明', '新的证书说明']) assert.ok(output.includes(text), text);
    }
    const highlights = buildJsonLd(combined)['@graph'].find(item => item.name === edited.titles.highlights);
    assert.equal(highlights.numberOfItems, edited.highlights.length);
});

test('删除可选列表后仍能渲染，正文中的标记按文字转义', () => {
    const edited = { ...profile, skills: [], timeline: [], interests: [], highlights: [], honors: [], keywords: [], tools: [] };
    edited.introduction = ['<script>alert("文字")</script> & 继续记录'];
    const html = buildProfileHtml(edited);
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('&amp;'));
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('常用工具：。'));
    assert.ok(!html.includes('seo-profile-honors'));
    assert.deepEqual(getSkillLabels(edited), []);
    assert.doesNotThrow(() => buildLlmsTxt(withProfile(content, edited)));
    assert.doesNotThrow(() => JSON.stringify(buildJsonLd(withProfile(content, edited))));
});

test('实际页面的静态正文读取 profile.json，不再展示示例奖项', () => {
    const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const html = generateSeoHtml().transformIndexHtml(source);
    assert.ok(html.includes(profile.timeline[0].description));
    assert.ok(html.includes(profile.skills[0].technologies[0]));
    assert.ok(html.includes('seo-profile-highlights'));
    assert.ok(html.includes('seo-profile-honors'));
    for (const item of profile.honors) assert.ok(html.includes(item.title));
    assert.ok(!html.includes('id="awards"'));
    assert.ok(!html.includes('"name":"奖项与荣誉"'));
});
