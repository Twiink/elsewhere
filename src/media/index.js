import manifest from 'virtual:media-manifest';
import { createMediaRuntime } from './imageRuntime';

export const media = manifest;
export const { loadImage, localImageUrl, preferredImageUrl, install: installMediaFallbacks } = createMediaRuntime(manifest);
