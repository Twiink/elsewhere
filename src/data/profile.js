// 纯数据转换供三维场景、阅读面板和 SEO 共用，文案只维护 profile.json。
export function getProfileSections(profile) {
    return [
        { id: 'intro', title: profile.greeting, paragraphs: profile.introduction, tags: profile.keywords },
        { id: 'current', title: profile.titles.current, paragraphs: [profile.role, profile.currentFocus] },
        { id: 'purpose', title: profile.titles.purpose, paragraphs: [profile.sitePurpose] },
        {
            id: 'skills', title: profile.titles.skills, paragraphs: profile.strengths ? [profile.strengths] : [],
            entries: profile.skills,
            footer: profile.tools.length ? `日常写代码和理思路时，也常拉上 ${profile.tools.join('、')} 一起干活。` : null,
        },
        { id: 'timeline', title: profile.titles.timeline, entries: profile.timeline },
        { id: 'interests', title: profile.titles.interests, entries: profile.interests },
        { id: 'highlights', title: profile.titles.highlights, entries: profile.highlights, footer: profile.closing },
        ...(profile.honors?.length ? [{ id: 'honors', title: profile.titles.honors, entries: profile.honors }] : []),
    ];
}

export function getSkillLabels(profile) {
    return [...new Set(profile.skills.flatMap(group => group.technologies))];
}

export function withProfile(content, profile) {
    return {
        ...content,
        profile,
        site: { ...content.site, aboutMe: [profile.greeting, ...profile.introduction].join('\n\n') },
    };
}

export function formatProfileDate(date) {
    return date ? date.replace('-', '.') : '';
}
