import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeContentAI } from '../src/utils/contactValidation.js';

test('中文主题与无空格中文留言可通过内容校验', () => {
    for (const subject of ['合作咨询', '项目', 'React 网站开发']) {
        assert.equal(analyzeContentAI(subject, true).isSpam, false, subject);
    }
    for (const message of [
        '你好',
        '你好，我想咨询网站开发合作。',
        '我想了解一下项目的制作周期和报价，方便时请回复。',
        '希望使用 React 和 GSAP 制作一个中文网站。',
        '请查看我的需求。\n希望下周安排沟通。',
    ]) {
        assert.equal(analyzeContentAI(message).isSpam, false, message);
    }
});

test('保留空内容、纯符号与拉丁乱码拦截', () => {
    for (const message of ['', '  ', '你', '!!! ???', '123456', 'dwgfn ndwajdnw', '中文 dwgfn ndwajdnw']) {
        assert.equal(analyzeContentAI(message).isSpam, true, message);
    }
    assert.equal(analyzeContentAI('询', true).isSpam, true);
});

test('正常英语和波兰语留言仍可通过', () => {
    for (const message of ['hello', 'Thank you for your time', 'Hello, I would like to discuss a website project.', 'Cześć, interesuje mnie projekt strony internetowej.']) {
        assert.equal(analyzeContentAI(message).isSpam, false, message);
    }
});
