import { preloadMediaTextures } from '../media/MediaTextureLoader';
import { GALLERY_TEXTURES, STUDIO_TEXTURES, ABOUT_TEXTURES, CONTACT_TEXTURES, filterTexturesByDevice } from './texturePreloadList';
import { galleryProjects, studioContent, studioWishCard } from '../data/content';

export function preloadRoomTextures(id) {
  const hover = window.matchMedia('(hover: hover)').matches;
  const lists = {
    gallery: [
      ...GALLERY_TEXTURES.filter(path => !/\/(monetuneprzod|timberkittyprzod|youngmultiprzod|bioprzod)/.test(path)),
      ...galleryProjects.flatMap(item => [item.front, hover && item.painted]),
    ],
    studio: [
      ...STUDIO_TEXTURES.filter(path => !/\/(monitorfront_|phonefront_|tvfront_)/.test(path)),
      ...[...studioContent, studioWishCard].flatMap(item => [item.frontTexture, hover && item.paintedFrontTexture]),
    ],
    about: ABOUT_TEXTURES,
    contact: CONTACT_TEXTURES,
  };
  const urls = [...new Set(filterTexturesByDevice((lists[id] ?? []).filter(Boolean), hover))];
  // 画廊会创建 sRGB 与裁切副本，在场景预热时上传最终实际使用的纹理。
  return preloadMediaTextures(urls, { upload: id !== 'gallery' });
}
