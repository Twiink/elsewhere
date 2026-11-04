import { galleryProjects, studioContent, awardGroups } from '../data/content';

// 本地模块在页面渲染前就已就绪，各房间直接使用同一份稳定数据。
export function useGalleryProjects() {
    return galleryProjects;
}

export function useStudioContent() {
    return studioContent;
}

export function useAwards() {
    return awardGroups;
}
