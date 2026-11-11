import { MediaTextureLoader } from '../media/MediaTextureLoader';

import { useLoader } from '@react-three/fiber';
import { GALLERY_TEXTURES, STUDIO_TEXTURES, ABOUT_TEXTURES, CONTACT_TEXTURES, filterTexturesByDevice } from './texturePreloadList';
import { galleryProjects, studioContent, studioWishCard } from '../data/content';
import { loadImage } from '../media';

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
  return Promise.all(urls.map(url => loadImage(url).then(() => {
    useLoader.preload(MediaTextureLoader, url);
  })));
}
