import { readFileSync } from 'node:fs';

const contentPath = new URL('./src/data/content.json', import.meta.url);

// 开发与构建均读取本地内容，编辑后无需同步远程服务。
function readContent() {
    return JSON.parse(readFileSync(contentPath, 'utf8'));
}

function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
}

function absoluteUrl(path, siteUrl) {
    return new URL(path, `${siteUrl}/`).href;
}

export function buildJsonLd({ site, projects, studio, awards, faq }) {
    const personId = `${site.url}/#person`;
    const graph = [
        {
            '@type': 'Person', '@id': personId,
            name: 'Tomasz Szmajda', alternateName: ['ITom', 'ITom Dev'],
            url: site.url, jobTitle: '创意前端开发者', description: site.aboutMe,
            knowsAbout: ['React', 'Three.js', 'JavaScript', 'GSAP', 'Next.js', 'WebGL'],
            sameAs: Object.entries(site).filter(([key, value]) => key.endsWith('Url') && value).map(([, value]) => value),
        },
        {
            '@type': 'WebSite', '@id': `${site.url}/#website`, url: site.url,
            name: site.siteTitle, description: site.siteDescription,
            inLanguage: 'zh-CN', publisher: { '@id': personId },
        },
        { '@type': 'ProfilePage', '@id': `${site.url}/#profilepage`, mainEntity: { '@id': personId } },
        {
            '@type': 'FAQPage', '@id': `${site.url}/#faq`,
            mainEntity: faq.map(item => ({
                '@type': 'Question', name: item.question,
                acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
        },
        {
            '@type': 'ItemList', name: '精选项目', numberOfItems: projects.length,
            itemListElement: projects.map((item, index) => ({
                '@type': 'ListItem', position: index + 1,
                item: {
                    '@type': 'CreativeWork', name: item.seoTitle || item.title,
                    description: item.seoDescription || item.description,
                    url: item.url, image: absoluteUrl(item.front, site.url),
                    creator: { '@id': personId }, inLanguage: 'zh-CN',
                },
            })),
        },
        ...studio.map(item => ({
            '@type': item.platform === 'youtube' ? 'VideoObject' : 'Article',
            name: item.seoTitle || item.title, headline: item.seoTitle || item.title,
            description: item.seoDescription || item.description, url: item.url,
            datePublished: `${item.date}T12:00:00Z`,
            thumbnailUrl: absoluteUrl(item.frontTexture, site.url),
            author: { '@id': personId }, inLanguage: 'zh-CN',
        })),
        {
            '@type': 'ItemList', name: '奖项与荣誉', numberOfItems: awards.length,
            itemListElement: awards.map((item, index) => ({
                '@type': 'ListItem', position: index + 1,
                item: {
                    '@type': 'CreativeWork', name: item.seoTitle || item.title,
                    description: item.seoDescription, url: item.url,
                    image: absoluteUrl(item.image, site.url),
                    dateCreated: item.date, creator: { '@id': personId },
                },
            })),
        },
    ];
    return { '@context': 'https://schema.org', '@graph': graph };
}

export function buildLlmsTxt({ site, projects, studio, awards, faq }) {
    const lines = [`# ${site.siteTitle}`, `> ${site.siteDescription}`, '', '## 个人介绍', site.aboutMe, ''];
    for (const [title, items] of [['精选项目', projects], ['工作室内容', studio], ['奖项与荣誉', awards]]) {
        lines.push(`## ${title}`);
        for (const item of items) lines.push(`- [${item.seoTitle || item.title}](${item.url}): ${item.seoDescription || item.description || ''}`);
        lines.push('');
    }
    lines.push('## 常见问题');
    for (const item of faq) lines.push(`- **${item.question}**`, `  ${item.answer}`);
    return `${lines.join('\n')}\n`;
}

// 将同一份内容输出为可访问的静态正文与搜索结构化数据。
export function generateSeoHtml() {
    return {
        name: 'local-content-seo',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url?.split('?')[0] !== '/llms.txt') return next();
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.end(buildLlmsTxt(readContent()));
            });
        },
        transformIndexHtml(html) {
            const content = readContent();
            const { site, projects, studio, awards, faq } = content;
            const sections = [
                `<header><h1>${escapeHtml(site.siteTitle)}</h1><p>${escapeHtml(site.siteDescription)}</p></header>`,
                `<section id="about"><h2>关于我</h2><p>${escapeHtml(site.aboutMe)}</p></section>`,
            ];
            for (const [id, title, items] of [['projects', '精选项目', projects], ['studio', '工作室', studio], ['awards', '奖项与证书', awards]]) {
                const entries = items.map(item => `<li><h3>${escapeHtml(item.seoTitle || item.title)}</h3><p>${escapeHtml(item.seoDescription || item.description || '')}</p><a href="${escapeHtml(item.url)}">查看详情</a></li>`).join('');
                sections.push(`<section id="${id}"><h2>${title}</h2><ul>${entries}</ul></section>`);
            }
            sections.push(`<section id="faq"><h2>常见问题</h2>${faq.map(item => `<article><h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p></article>`).join('')}</section>`);
            const seoHtml = `<div id="seo-content" class="sr-only-seo">${sections.join('\n')}</div>`;
            const jsonLd = JSON.stringify(buildJsonLd(content)).replace(/</g, '\\u003c');
            return html
                .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${escapeHtml(site.url)}/">`)
                .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${escapeHtml(site.url)}/">`)
                .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(site.siteTitle)}</title>`)
                .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(site.siteDescription)}">`)
                .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeHtml(site.siteTitle)}">`)
                .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeHtml(site.siteDescription)}">`)
                .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escapeHtml(site.siteTitle)}">`)
                .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escapeHtml(site.siteDescription)}">`)
                .replace(/<div id="seo-content" class="sr-only-seo">[\s\S]*?<\/div>/, seoHtml)
                .replace('</head>', `<script type="application/ld+json">${jsonLd}</script>\n</head>`);
        },
        generateBundle() {
            this.emitFile({ type: 'asset', fileName: 'llms.txt', source: buildLlmsTxt(readContent()) });
        },
    };
}
