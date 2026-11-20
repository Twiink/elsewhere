import { media } from '../media';

let bgMusicAudio = null;

function getBackgroundMusic() {
    if (!bgMusicAudio) {
        bgMusicAudio = new Audio();
        bgMusicAudio.loop = true;
    }
    return bgMusicAudio;
}

export function initAudio() {
    const audio = getBackgroundMusic();
    if (!audio.src) {
        audio.preload = 'auto';
        audio.src = media.audio.background;
    }
    return audio;
}

export function applyBackgroundMusicSettings(volume, muted) {
    const audio = getBackgroundMusic();
    audio.volume = volume;
    audio.muted = muted;
}

export function playBackgroundMusic() {
    const audio = getBackgroundMusic();
    if (!audio.paused || audio.muted || audio.volume === 0) return;

    initAudio();
    audio.play().catch(error => {
        if (error.name !== 'NotAllowedError') console.warn('背景音乐播放失败', error);
    });
}
