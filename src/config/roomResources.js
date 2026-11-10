import { lazy } from 'react';
import { createResourceCache } from '../utils/resourceCache';
import { scheduleRoomPrefetch as schedulePrefetch } from '../utils/roomPrefetch';

export const ROOM_LABELS = {
  '作品画廊': 'gallery', '生活手记': 'studio', '关于我': 'about', '联系我': 'contact',
};

const loaders = {
  gallery: () => import('../components/canvas/rooms/Gallery/GalleryRoom'),
  studio: () => import('../components/canvas/rooms/Studio/StudioRoom'),
  about: () => import('../components/canvas/rooms/About/AboutRoom'),
  contact: () => import('../components/canvas/rooms/Contact/ContactRoom'),
};

export const loadRoom = createResourceCache(id => {
  if (!loaders[id]) throw new Error(`未知房间：${id}`);
  return loaders[id]();
});

export const ROOM_COMPONENTS = Object.fromEntries(Object.keys(loaders).map(id => [id, lazy(() => loadRoom(id))]));

export function prefetchRoom(id) {
  if (!loaders[id]) return Promise.resolve();
  return loadRoom(id).then(async () => {
    const { preloadRoomTextures } = await import('./roomTextures');
    return preloadRoomTextures(id);
  });
}

export function scheduleRoomPrefetch(options) {
  return schedulePrefetch({ ...options, load: prefetchRoom });
}
