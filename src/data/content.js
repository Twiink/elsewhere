import content from './content.json';
import profile from './profile.json';
import { withProfile } from './profile.js';

// 关于我集中编辑 profile.json；作品、文章与站点设置继续编辑 content.json。
export const personalProfile = profile;
export const siteInfo = withProfile(content, profile).site;
export const contactInfo = content.site.contact;
export const resumeInfo = content.site.resume;
export const studioChannels = content.site.studioChannels;
export const galleryProjects = content.projects;
export const studioContent = content.studio;
export const studioWishCard = content.studioWishCard;
export const studioWishes = content.wishes;
export const awardCertificates = content.awards;
export const frequentlyAskedQuestions = content.faq;

const awardCategories = [
    { key: 'sotd', title: '每日最佳网站', label: '获奖成就', icon: '🏆' },
    { key: 'sotm', title: '每月最佳网站', label: '月度奖项', icon: '📅' },
    { key: 'other', title: '其他奖项', label: '荣誉认可', icon: '👑' },
];

export const awardGroups = Object.fromEntries(awardCategories.map(({ key, title, label, icon }) => [
    key,
    {
        id: `award-${key}`,
        layout: 'certificate_grid',
        title,
        items: awardCertificates.filter(item => item.category === key).map(item => ({
            label: item.title,
            date: new Date(`${item.date}T12:00:00Z`).toLocaleDateString('zh-CN', {
                year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
            }),
            image: item.image,
            url: item.url || null,
        })),
        platformConfig: { label, color: '#1a1a1a', icon },
    },
]));

// 彩色贴图只在支持悬停的设备上预加载，避免移动端占用额外显存。
export function getContentTextures(includePainted) {
    return [...new Set([
        ...galleryProjects.flatMap(item => [item.front, includePainted && item.painted]),
        ...[...studioContent, studioWishCard].flatMap(item => [item.frontTexture, includePainted && item.paintedFrontTexture]),
    ].filter(Boolean))];
}

export const certificateImages = [...new Set(awardCertificates.map(item => item.image).filter(Boolean))];
