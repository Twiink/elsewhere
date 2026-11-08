import { readFileSync } from 'node:fs';
import { withProfile, getProfileSections, getSkillLabels } from './src/data/profile.js';

const contentPath = new URL('./src/data/content.json', import.meta.url);
const profilePath = new URL('./src/data/profile.json', import.meta.url);

// 开发与构建均读取本地内容，编辑后无需同步远程服务。
function readContent() {
    return withProfile(
        JSON.parse(readFileSync(contentPath, 'utf8')),
        JSON.parse(readFileSync(profilePath, 'utf8')),
    );
}

function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
}

function absoluteUrl(path, siteUrl) {
    return siteUrl ? new URL(path, `${siteUrl.replace(/\/+$/, '')}/`).href : path;
}

function contentAuthor(item, personId) {
    return item.authorName ? { '@type': 'Person', name: item.authorName } : { '@id': personId };
}

export function buildJsonLd({ site, projects, studio, awards, faq, profile }) {
    const personId = site.url ? `${site.url}/#person` : '#person';
    const graph = [
        {
            '@type': 'Person', '@id': personId,
            name: site.nickname,
            ...(site.url ? { url: site.url } : {}), description: site.aboutMe,
            ...(site.contact?.email ? { email: site.contact.email } : {}),
            ...(profile ? { knowsAbout: getSkillLabels(profile) } : {}),
            sameAs: Object.entries(site).filter(([key, value]) => key.endsWith('Url') && value).map(([, value]) => value),
        },
        {
            '@type': 'WebSite', '@id': site.url ? `${site.url}/#website` : '#website',
            ...(site.url ? { url: site.url } : {}),
            name: site.siteTitle, description: site.siteDescription,
            inLanguage: 'zh-CN', publisher: { '@id': personId },
        },
        { '@type': 'ProfilePage', '@id': site.url ? `${site.url}/#profilepage` : '#profilepage', mainEntity: { '@id': personId } },
        {
            '@type': 'FAQPage', '@id': site.url ? `${site.url}/#faq` : '#faq',
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
                    creator: contentAuthor(item, personId), inLanguage: 'zh-CN',
                },
            })),
        },
        ...studio.map(item => ({
            '@type': item.platform === 'youtube' ? 'VideoObject' : 'Article',
            name: item.seoTitle || item.title, headline: item.seoTitle || item.title,
            description: item.seoDescription || item.description, url: item.url,
            ...(item.date ? { datePublished: `${item.date}T12:00:00Z` } : {}),
            ...(item.paragraphs ? { articleBody: item.paragraphs.join('\n\n') } : {}),
            thumbnailUrl: absoluteUrl(item.frontTexture, site.url),
            author: contentAuthor(item, personId), inLanguage: 'zh-CN',
        })),
        profile ? {
            '@type': 'ItemList', name: profile.titles.highlights, numberOfItems: profile.highlights.length,
            itemListElement: profile.highlights.map((item, index) => ({
                '@type': 'ListItem', position: index + 1,
                item: { '@type': 'CreativeWork', name: item.title, description: item.description, creator: { '@id': personId } },
            })),
        } : {
            '@type': 'ItemList', name: '奖项与荣誉', numberOfItems: awards.length,
            itemListElement: awards.map((item, index) => ({
                '@type': 'ListItem', position: index + 1,
                item: {
                    '@type': 'CreativeWork', name: item.seoTitle || item.title,
                    description: item.seoDescription, url: item.url,
                    image: absoluteUrl(item.image, site.url),
                    dateCreated: item.date, creator: contentAuthor(item, personId),
                },
            })),
        },
    ];
    return { '@context': 'https://schema.org', '@graph': graph };
}

export function buildLlmsTxt({ site, projects, studio, awards, faq, profile }) {
    const lines = [`# ${site.siteTitle}`, `> ${site.siteDescription}`, ''];
    if (profile) {
        for (const section of getProfileSections(profile)) {
            lines.push(`## ${section.title}`, ...(section.paragraphs || []));
            if (section.tags) lines.push(section.tags.join(' / '));
            for (const entry of section.entries || []) {
                lines.push(`- ${entry.date ? `${entry.date} · ` : ''}${entry.title}${entry.technologies ? `（${entry.technologies.join('、')}）` : ''}：${entry.description}`);
            }
            if (section.footer) lines.push(section.footer);
            lines.push('');
        }
    } else {
        lines.push('## 个人介绍', site.aboutMe, '');
    }
    const collections = [['精选项目', projects], ['工作室内容', studio]];
    if (!profile) collections.push(['奖项与荣誉', awards]);
    for (const [title, items] of collections) {
        lines.push(`## ${title}`);
        for (const item of items) {
            lines.push(`- [${item.seoTitle || item.title}](${item.url}): ${item.seoDescription || item.description || ''}`);
            lines.push(...(item.paragraphs || []));
            for (const photo of item.photos || []) {
                if (photo.label) lines.push(`- ${photo.label}：${photo.caption || photo.alt}`);
            }
            for (const section of item.details?.sections || []) {
                lines.push(`### ${section.title}`, ...section.paragraphs);
                for (const entry of section.entries) lines.push(`- ${entry.title}：${entry.description}`);
            }
        }
        lines.push('');
    }
    if (site.contact) {
        lines.push('## 联系我', site.contact.description,
            `- 邮箱：[${site.contact.email}](mailto:${site.contact.email})`,
            `- GitHub：${site.githubUrl}`,
            `- 微信：${site.contact.wechatId}`, '');
    }
    if (site.resume?.url) lines.push('## 简历', `- [查看或下载简历 PDF](${site.resume.url})`, '');
    if (site.studioChannels) {
        lines.push(`## ${site.studioChannels.title}`, site.studioChannels.description,
            `- [工作室 CSDN](${site.studioChannels.csdnUrl})`,
            `- 微信视频号：${site.studioChannels.videoAccount}`, '');
    }
    lines.push('## 常见问题');
    for (const item of faq) lines.push(`- **${item.question}**`, `  ${item.answer}`);
    return `${lines.join('\n')}\n`;
}

export function buildProfileHtml(profile) {
    return getProfileSections(profile).map(section => {
        const paragraphs = (section.paragraphs || []).map(text => `<p>${escapeHtml(text)}</p>`).join('');
        const tags = section.tags ? `<p>${section.tags.map(escapeHtml).join(' / ')}</p>` : '';
        const entries = section.entries ? `<ol>${section.entries.map(entry => `<li>${entry.date ? `<time datetime="${escapeHtml(entry.date)}">${escapeHtml(entry.date)}</time>` : ''}<h4>${escapeHtml(entry.title)}</h4>${entry.technologies ? `<p>${entry.technologies.map(escapeHtml).join(' · ')}</p>` : ''}<p>${escapeHtml(entry.description)}</p></li>`).join('')}</ol>` : '';
        return `<section id="seo-profile-${section.id}"><h3>${escapeHtml(section.title)}</h3>${paragraphs}${tags}${entries}${section.footer ? `<p>${escapeHtml(section.footer)}</p>` : ''}</section>`;
    }).join('\n');
}

function buildProjectBody(item) {
    return (item.details?.sections || []).map(section => {
        const paragraphs = section.paragraphs.map(text => `<p>${escapeHtml(text)}</p>`).join('');
        const entries = section.entries.map(entry => `<li><h5>${escapeHtml(entry.title)}</h5><p>${escapeHtml(entry.description)}</p></li>`).join('');
        return `<section><h4>${escapeHtml(section.title)}</h4>${paragraphs}${entries ? `<ul>${entries}</ul>` : ''}</section>`;
    }).join('');
}

function buildStudioBody(item) {
    if (!item.paragraphs) return '';
    const paragraphs = item.paragraphs.map(text => `<p>${escapeHtml(text)}</p>`).join('');
    const photos = (item.photos || []).map(photo => `<figure><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}" width="${photo.width}" height="${photo.height}" loading="lazy">${photo.label ? `<figcaption>${escapeHtml(photo.label)}${photo.caption ? `：${escapeHtml(photo.caption)}` : ''}</figcaption>` : ''}</figure>`).join('');
    return `${paragraphs}${photos}`;
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
            const { site, projects, studio, awards, faq, profile } = content;
            const shareImage = site.shareImage;
            const sections = [
                `<header><h1>${escapeHtml(site.siteTitle)}</h1><p>${escapeHtml(site.siteDescription)}</p></header>`,
                `<section id="about"><h2>关于我</h2>${profile ? buildProfileHtml(profile) : `<p>${escapeHtml(site.aboutMe)}</p>`}</section>`,
            ];
            const collections = [['projects', '精选项目', projects], ['studio', '工作室', studio]];
            if (!profile) collections.push(['awards', '奖项与证书', awards]);
            for (const [id, title, items] of collections) {
                const entries = items.map(item => `<li><h3>${escapeHtml(item.seoTitle || item.title)}</h3><p>${escapeHtml(item.details ? item.description : item.seoDescription || item.description || '')}</p>${buildProjectBody(item)}${buildStudioBody(item)}<a href="${escapeHtml(item.url)}">查看详情</a></li>`).join('');
                sections.push(`<section id="${id}"><h2>${title}</h2><ul>${entries}</ul></section>`);
            }
            if (site.contact) {
                sections.push(`<section id="contact"><h2>联系我</h2><p>${escapeHtml(site.contact.description)}</p><p><a href="mailto:${escapeHtml(site.contact.email)}">${escapeHtml(site.contact.email)}</a></p><p><a href="${escapeHtml(site.githubUrl)}">GitHub</a></p><p>微信：${escapeHtml(site.contact.wechatId)}</p></section>`);
            }
            if (site.resume?.url) {
                sections.push(`<section id="resume"><h2>${escapeHtml(site.resume.title)}</h2><p>${escapeHtml(site.resume.description)}</p><a href="${escapeHtml(site.resume.url)}" target="_blank" rel="noopener noreferrer">在线查看简历 PDF（新窗口）</a> <a href="${escapeHtml(site.resume.url)}" download="${escapeHtml(site.resume.downloadName)}">下载简历 PDF</a></section>`);
            }
            if (site.studioChannels) {
                const channels = site.studioChannels;
                sections.push(`<section id="studio-channels"><h2>${escapeHtml(channels.title)}</h2><p>${escapeHtml(channels.description)}</p><a href="${escapeHtml(channels.csdnUrl)}" target="_blank" rel="noopener noreferrer">工作室 CSDN（新窗口）</a><p>微信视频号：${escapeHtml(channels.videoAccount)}</p></section>`);
            }
            sections.push(`<section id="faq"><h2>常见问题</h2>${faq.map(item => `<article><h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p></article>`).join('')}</section>`);
            const seoHtml = `<div id="seo-content" class="sr-only-seo">${sections.join('\n')}</div>`;
            const jsonLd = JSON.stringify(buildJsonLd(content)).replace(/</g, '\\u003c');
            const urlTags = site.url
                ? `<link rel="canonical" href="${escapeHtml(site.url)}/"><meta property="og:url" content="${escapeHtml(site.url)}/">`
                : '';
            return html
                .replace(/<meta name="author"[^>]*>/, `<meta name="author" content="${escapeHtml(site.nickname)}">`)
                .replace(/<meta property="og:site_name"[^>]*>/, `<meta property="og:site_name" content="${escapeHtml(site.siteTitle)}">`)
                .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${escapeHtml(absoluteUrl(shareImage.path, site.url))}">`)
                .replace(/<meta property="og:image:width"[^>]*>/, `<meta property="og:image:width" content="${shareImage.width}">`)
                .replace(/<meta property="og:image:height"[^>]*>/, `<meta property="og:image:height" content="${shareImage.height}">`)
                .replace(/<meta property="og:image:type"[^>]*>/, `<meta property="og:image:type" content="${escapeHtml(shareImage.mimeType)}">`)
                .replace(/<meta property="og:image:alt"[^>]*>/, `<meta property="og:image:alt" content="${escapeHtml(shareImage.alt)}">`)
                .replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${escapeHtml(absoluteUrl(shareImage.path, site.url))}">`)
                .replace(/<meta name="twitter:image:alt"[^>]*>/, `<meta name="twitter:image:alt" content="${escapeHtml(shareImage.alt)}">`)
                .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(site.siteTitle)}</title>`)
                .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(site.siteDescription)}">`)
                .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeHtml(site.siteTitle)}">`)
                .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeHtml(site.siteDescription)}">`)
                .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escapeHtml(site.siteTitle)}">`)
                .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escapeHtml(site.siteDescription)}">`)
                .replace(/<div id="seo-content" class="sr-only-seo">[\s\S]*?<\/div>/, seoHtml)
                .replace('</head>', `${urlTags}<script type="application/ld+json">${jsonLd}</script>\n</head>`);
        },
        generateBundle() {
            this.emitFile({ type: 'asset', fileName: 'llms.txt', source: buildLlmsTxt(readContent()) });
        },
    };
}
