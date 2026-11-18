const FIDELITY_ROOT = '/media/images/textures/moonlight/fidelity';

export const MOONLIT_CORRIDOR_ART = {
    wall: `${FIDELITY_ROOT}/corridor-wall-soft-v2.webp`,
    floor: `${FIDELITY_ROOT}/corridor-floor-oak-v2.webp`,
    timber: `${FIDELITY_ROOT}/timber-oak-v2.webp`,
    doors: `${FIDELITY_ROOT}/room-door-atlas.webp`,
    frame: `${FIDELITY_ROOT}/room-frame.webp`,
    lamp: `${FIDELITY_ROOT}/wall-lamp.webp`,
    window: `${FIDELITY_ROOT}/end-window.webp`,
    endArch: `${FIDELITY_ROOT}/end-arch-set.webp`,
    lightPool: `${FIDELITY_ROOT}/light-pool.webp`,
    props: `${FIDELITY_ROOT}/corridor-props-atlas.webp`,
    sign: `${FIDELITY_ROOT}/hanging-sign.webp`,
};

// The watercolor corridor is staged as four separate, operable doorways.
// Door bays join directly to the following bay along each side of the aisle.
export const MOONLIT_CORRIDOR = {
    halfWidth: 3.5,
    floorY: -1.75,
    wallHeight: 3.4,
    sectionWidth: 1.55,
    baseTilt: 0.72,
    maxTilt: 0.9,
    doorHeight: 3.1,
    doorGroupY: 0,
    frameHeight: 3.35,
    frameWidth: 1.6,
    plaqueY: 1.23,
    doors: [
        { roomId: 'about', relativeZ: -5.55, side: 'left', label: '关于我', enterDistance: 25 },
        { roomId: 'contact', relativeZ: -5.65, side: 'right', label: '联系我' },
        { roomId: 'gallery', relativeZ: -10.5, side: 'left', label: '作品画廊' },
        { roomId: 'studio', relativeZ: -12, side: 'right', label: '生活手记' },
    ],
};

const PORTRAIT_CORRIDOR = {
    ...MOONLIT_CORRIDOR,
    halfWidth: 1.8,
    sectionWidth: 1.05,
    doorHeight: 1.9,
    doorGroupY: -0.6,
    frameHeight: 2.1,
    frameWidth: 1.02,
    plaqueY: 0.75,
    baseTilt: 0.75,
    maxTilt: 0.85,
    doors: MOONLIT_CORRIDOR.doors.map(door => ({
        ...door,
        inset: door.roomId === 'gallery' || door.roomId === 'studio' ? 0.4 : 0,
        relativeZ: door.roomId === 'about' ? -8 : door.roomId === 'contact' ? -8.1 : door.roomId === 'gallery' ? -12 : -12.8,
    })),
};

const SLIM_CORRIDOR = { ...MOONLIT_CORRIDOR, halfWidth: 3.15 };

export function moonlitCorridorLayout(width, height) {
    if (width < 640 && height > width) return PORTRAIT_CORRIDOR;
    return width / height < 1.5 ? SLIM_CORRIDOR : MOONLIT_CORRIDOR;
}

export const MOONLIT_DOOR_COLUMNS = { about: 0, contact: 1, gallery: 2, studio: 3 };
