import { TextureLoader } from 'three';
import { useLoader } from '@react-three/fiber';
import { GALLERY_TEXTURES, STUDIO_TEXTURES, ABOUT_TEXTURES, CONTACT_TEXTURES, filterTexturesByDevice } from './texturePreloadList';
import { galleryProjects, studioContent, studioWishCard } from '../data/content';
import { createResourceCache } from '../utils/resourceCache';

const loadImage = createResourceCache(url => new Promise((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    useLoader.preload(TextureLoader, url);
    resolve();
  };
  image.onerror = () => reject(new Error('房间图片加载失败'));
  image.src = url;
}));

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
  return Promise.all(urls.map(loadImage));
}
