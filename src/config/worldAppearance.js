// 昼夜使用相同的几何体、透明边缘、动画引用与命中区域；这里仅描述月色材质。
export const WORLD_ART = {
    brick: '/media/images/textures/moonlight/wall-watercolor-v1.webp',
    wall: '/media/images/textures/moonlight/corridor-brick-watercolor-v2.webp',
    ceiling: '/media/images/textures/moonlight/ceiling-pearl-watercolor-v1.webp',
    corridorPlant: '/media/images/textures/moonlight/corridor-plant-watercolor-v1.webp',
    wood: '/media/images/textures/moonlight/fidelity/corridor-floor-oak-v2.webp',
    sky: '/media/images/textures/moonlight/sky-watercolor-v1.webp',
    waving: '/media/images/textures/moonlight/waving-watercolor-v1.webp',
    cloud: '/media/images/textures/moonlight/cloud-watercolor-v1.webp',
    window: '/media/images/textures/moonlight/window-bouquet-v1.webp',
    flowers: '/media/images/textures/moonlight/floral-corner-v1.webp',
    tree: '/media/images/textures/moonlight/tree-watercolor-v1.webp',
    planter: '/media/images/textures/moonlight/planter-watercolor-v1.webp',
    windowRoom: '/media/images/textures/moonlight/window-interior-v1.webp',
    roofs: '/media/images/textures/moonlight/roofs-watercolor-v1.webp',
    city: '/media/images/textures/moonlight/city-watercolor-v1.webp',
    lighthouse: '/media/images/textures/moonlight/lighthouse-watercolor-v1.webp',
    grain: '/media/images/textures/paper-texture.webp',
};

export const WORLD_PALETTES = {
    wall: ['#929bbc', '#7786aa', '#52536f'],
    ceiling: ['#727da6', '#656d97', '#454762'],
    ground: ['#ada9ae', '#b8ab98', '#797b86'],
    wood: ['#f2dec3', '#d9bdb4', '#80615b'],
    frame: ['#f7e6ce', '#e3c5b0', '#79605a'],
    paper: ['#f6ead8', '#e8cfbf', '#59464d'],
    window: ['#ffe3b3', '#e5bd95', '#82645c'],
    stone: ['#ddd0c6', '#b9adbd', '#82718a'],
    foliage: ['#b8c2a2', '#8d9f93', '#59645f'],
    tree: ['#b8c2a2', '#dfc7b2', '#605c61'],
    cloud: ['#f5e6e5', '#c7c5df', '#9b90ad'],
    sea: ['#a1b0d0', '#788fb8', '#596f99'],
    skyline: ['#b8bad2', '#92a0bf', '#69728e'],
    portrait: ['#f3dfd2', '#e4c2cd', '#5b4559'],
};

export function worldSurfaceFor(texture, explicitRole) {
    if (explicitRole) return { role: explicitRole };
    const path = texture?.userData?.sourceUrl || texture?.name || texture?.image?.src || '';
    // 正文照片、视频封面、项目水彩和已有彩绘层保持素材色彩。
    if (/\/content\/|\/moonlight\/|_painted\.|-color-|cover-color|\/draft\//.test(path)) return null;
    if (/waving-ink/.test(path)) return { role: 'portrait', artwork: 'waving' };
    if (/cloud-(?:ink|wink|surprise)/.test(path)) return { role: 'portrait', artwork: 'cloud', tintOnly: !path.includes('cloud-ink') };
    if (/window-ink/.test(path)) return { role: 'portrait', artwork: 'window' };
    if (/wall_bricks/.test(path)) return { role: 'wall', artwork: 'brick', repeat: [3, 1.5], facade: true };
    if (/corridor\/wall_texture/.test(path)) return { role: 'wall', artwork: 'wall', repeat: [1, 1] };
    if (/ceiling_texture/.test(path)) return { role: 'ceiling', artwork: 'ceiling', repeat: [1, 1] };
    if (/entrance\/floor_paper/.test(path)) return { role: 'ground' };
    if (/kawalekpodlogi|gallery\/floor/.test(path)) return { role: 'wood', artwork: 'wood', repeat: [1, 1] };
    if (/faletopdown/.test(path)) return { role: 'sea' };
    if (/\/clouds\//.test(path)) return { role: 'cloud' };
    if (/tree_sketch/.test(path)) return { role: 'tree', artwork: 'tree' };
    if (/pot_with_duck/.test(path)) return { role: 'foliage', artwork: 'planter' };
    if (/drzewkowdoniczce/.test(path)) return { role: 'foliage', artwork: 'corridorPlant' };
    if (/kwiatekwdoniczce/.test(path)) return { role: 'foliage' };
    if (/stone-path/.test(path)) return { role: 'stone' };
    if (/window_sketch/.test(path)) return { role: 'window' };
    if (/miastotlo/.test(path)) return { role: 'skyline', artwork: 'city' };
    if (/domki/.test(path)) return { role: 'skyline', artwork: 'roofs' };
    if (/latarnia/.test(path)) return { role: 'skyline', artwork: 'lighthouse' };
    if (/\/doors\/|frame|railing|molo|beczka|sign-|belka|stolika|szafka/.test(path)) return { role: 'frame' };
    if (/\/textures\/|\/ui\//.test(path)) return { role: 'paper' };
    return null;
}
