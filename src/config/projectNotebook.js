const NOTEBOOK_ASSET_BASE = '/media/images/textures/gallery/notebook';

export const NOTEBOOK_ASSETS = {
    paper: `${NOTEBOOK_ASSET_BASE}/paper.png`,
    illustration: `${NOTEBOOK_ASSET_BASE}/puffwar-illustration.png`,
    icons: `${NOTEBOOK_ASSET_BASE}/feature-icons.png`,
    button: `${NOTEBOOK_ASSET_BASE}/button.png`,
};

export const NOTEBOOK_FEATURE_SPRITES = ['tent', 'gift', 'journal', 'joystick']
    .map(name => `${NOTEBOOK_ASSET_BASE}/${name}.png`);

// 图集为四列三行，与纸背上的四条功能提示对应。
export const NOTEBOOK_FEATURE_ICONS = {
    puffwar: [0, 1, 2, 3],
    'boundless-universe': [10, 2, 1, 3],
    secknow: [4, 9, 6, 2],
    'rag-center': [4, 6, 5, 4],
    'harness-prd': [6, 9, 4, 1],
    qiainong: [5, 8, 11, 6],
    haijing: [7, 4, 11, 11],
    'open-source': [4, 6, 9, 11],
};
