// 坐标取自门的原始贴图，文字字号使用门所在场景的单位。
export const DOOR_ANNOTATIONS = {
    gallery: {
        idle: '进来看看', loading: '布展中…', fontSize: 0.086,
        uv: [0.53, 0.7972], rotation: 0.012,
    },
    studio: {
        idle: '翻翻手记', loading: '整理中…', fontSize: 0.095,
        uv: [0.49, 0.281], rotation: 0.035,
    },
    about: {
        idle: '认识一下', loading: '准备中…', fontSize: 0.088,
        uv: [0.527, 0.319], rotation: 0.065,
        textX: -0.025, strokeX: 0.15, strokeScale: 0.65,
        artwork: '/media/images/textures/corridor/doors/about-smile-margin-v1.png',
        paper: [[0.291, 0.194], [0.700, 0.183], [0.739, 0.336], [0.329, 0.347]],
    },
    contact: {
        idle: '来聊聊', loading: '准备中…', fontSize: 0.088,
        uv: [0.622, 0.375], rotation: 0.23,
        textX: 0, textScaleX: 0.64,
        readyX: -0.022, arrowX: 0.05, arrowScale: 0.65,
        strokeX: -0.06, strokeY: 0.055, strokeScale: 0.85,
        artwork: '/media/images/textures/corridor/doors/contact-letter-margin-v1.png',
        paper: [[0.408, 0.325], [0.643, 0.326], [0.765, 0.382], [0.576, 0.412]],
    },
};

// 墨迹贴在平整的木横梁上。关于我的门使用底部横梁，避开蕾丝。
const MOONLIGHT_ANNOTATIONS = Object.fromEntries(Object.entries(DOOR_ANNOTATIONS).map(([id, config]) => [id, {
    ...config,
    uv: [0.5, id === 'about' ? 0.937 : 0.515], rotation: 0, fontSize: 0.095,
    textX: -0.035, textScaleX: 1, readyX: -0.025,
    strokeX: 0.19, strokeY: -0.003, strokeScale: 0.65,
    arrowX: 0.08, arrowScale: 0.8,
}]));

export function getDoorAnnotation(doorId, theme = 'paper') {
    return (theme === 'moonlight' ? MOONLIGHT_ANNOTATIONS : DOOR_ANNOTATIONS)[doorId];
}
