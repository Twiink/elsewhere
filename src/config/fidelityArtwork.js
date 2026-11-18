const ROOT = '/media/images/textures/moonlight/fidelity/';

export const FIDELITY_ART = {
    courtyard: `${ROOT}courtyard-base.webp`,
    entranceDoors: `${ROOT}entrance-door-atlas.webp`,
    entranceProps: `${ROOT}entrance-props-atlas.webp`,
    sign: `${ROOT}hanging-sign.webp`,
    handle: `${ROOT}brass-handle.webp`,
    title: `${ROOT}title-letter-atlas.webp`,
    tagline: `${ROOT}tagline-board.webp`,
    wall: `${ROOT}corridor-wall-soft-v2.webp`,
    floor: `${ROOT}corridor-floor-oak-v2.webp`,
    doors: `${ROOT}room-door-atlas.webp`,
    frame: `${ROOT}room-frame.webp`,
    lamp: `${ROOT}wall-lamp.webp`,
    window: `${ROOT}end-window.webp`,
    props: `${ROOT}corridor-props-atlas.webp`,
};

// 与批准庭院母图的 1586 × 992 画板对应的世界坐标。
export const COURTYARD_HEIGHT = 6.9282032303;
export const COURTYARD_WIDTH = COURTYARD_HEIGHT * (1586 / 992);
// Eye sockets in the cat's 724px square atlas cell, on its 1.44-unit plane.
export const COURTYARD_CAT_EYES = { left: [0.044, 0.37, 0], right: [0.235, 0.374, 0] };
export function courtyardPoint(x, y, z = 0) {
    const depth = (6 - z) / 6;
    return [(x - 0.5) * COURTYARD_WIDTH * depth, 0.2 + (0.5 - y) * COURTYARD_HEIGHT * depth, z];
}
