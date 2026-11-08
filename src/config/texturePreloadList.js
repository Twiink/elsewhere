/**
 * 整个体验的纹理预加载列表。
 * 初始加载阶段预加载资源，减少进入房间时的卡顿。
 */

// 入口场景纹理。
export const ENTRANCE_TEXTURES = [
    // 核心资源。
    '/textures/paper-texture.webp',
    // 门。
    '/textures/doors/frame_sketch.webp',
    '/textures/doors/twiink-entry-left-ink-v1.webp',
    '/textures/doors/twiink-entry-right-ink-v1.webp',
    '/textures/doors/handle_left_sketch.webp',
    '/textures/doors/handle_right_sketch.webp',
    '/textures/doors/door_back_left_sketch.webp',
    '/textures/doors/pien.webp',
    // 环境。
    '/textures/entrance/wall_bricks_2.webp',
    '/textures/entrance/stone-path.webp',
    '/textures/entrance/floor_paper.webp',
    '/textures/entrance/belka.webp',
    '/textures/entrance/sign-creative-workshop.png',
    // 角色与物体。
    '/textures/entrance/cat_front_body.webp',
    '/textures/entrance/window_sketch.webp',
    '/textures/twiink/window-ink.webp',
    '/textures/entrance/tree_sketch.webp',
    '/textures/entrance/mouse_hanging.webp',
    '/textures/entrance/pot_with_duck.webp',
    '/textures/entrance/bug_sketch.webp',
    '/textures/entrance/speech_bubble.webp',
    // 图片。
    '/images/ink-splash.webp',
];

// 走廊场景纹理。
export const CORRIDOR_TEXTURES = [
    // 墙面、地面与天花板。
    '/textures/corridor/wall_texture.webp',
    '/textures/corridor/kawalekpodlogi.webp',
    '/textures/corridor/texturadoprogow.webp',
    '/textures/corridor/texturadrewnadonozekbiurka.webp',
    '/textures/corridor/ceiling_texture.webp',
    // 走廊尽头的双开门。
    '/textures/corridor/doors/frame_sketch.webp',
    '/textures/corridor/doors/doorrleft.webp',
    '/textures/corridor/doors/dorright.webp',
    '/textures/corridor/doors/handle_left_sketch.webp',
    '/textures/corridor/doors/handle_right_sketch.webp',
    '/textures/corridor/doors/pien.webp',
    // 侧面单门。
    '/textures/corridor/doors/ramkasingledoors.webp',
    '/textures/corridor/doors/klamkadodrzwi.webp',
    '/textures/corridor/doors/backsingledoors.webp',
    '/textures/corridor/doors/drzwiprojekty.webp',
    '/textures/corridor/doors/life-notes-ink-v1.webp',
    '/textures/corridor/doors/drzwiabout.webp',
    '/textures/corridor/doors/drzwikontakt.webp',
    '/textures/corridor/doors/drzwiprojekty_painted.webp',
    '/textures/corridor/doors/life-notes-color-v1.webp',
    '/textures/corridor/doors/drzwiabout_painted.webp',
    '/textures/corridor/doors/drzwikontakt_painted.webp',
    // 标牌。
    '/textures/corridor/pustatabliczka.webp',
    // 装饰。
    '/textures/corridor/decorations/while_true_loop.webp',
    '/textures/corridor/decorations/coffee_debug.webp',
    '/textures/corridor/decorations/idea_process.webp',
    '/textures/corridor/decorations/paper_ball.webp',
    '/textures/corridor/decorations/paper_airplane.webp',
    '/textures/corridor/decorations/pencil.webp',
    '/textures/corridor/decorations/coffee_cup.webp',
    // CorridorDecorations：画框、家具与灯具。
    '/textures/corridor/ramkanazdjecieduza.webp',
    '/textures/corridor/ramkanazdjecieduza_painted.webp',
    '/textures/corridor/ramkanazdjeciemala.webp',
    '/textures/corridor/drzewkowdoniczce.webp',
    '/textures/corridor/kratkawentylacyjna.webp',
    '/textures/corridor/kwiatekwdoniczce.webp',
    '/textures/corridor/kratanalampy.webp',
    '/textures/corridor/bokilampy.webp',
    '/textures/corridor/gorastolika.webp',
    '/textures/corridor/szafkaprzod.webp',
    '/textures/corridor/szafkaprzodgora.webp',
    '/textures/twiink/site-icon-airplane-v1-512.png',
    '/textures/corridor/rysuneknaobrazek3.webp',
    '/content/corridor/bouquet-hands.webp',
    '/content/corridor/hanfu-photo.webp',
    // DoorSection 附加资源。
    '/textures/corridor/strzalka.webp',
    '/textures/corridor/doors/door_back.webp',
    '/textures/corridor/doors/klamkadodrzwi_painted.webp',
];

// 标准 HTML 图片资源，通过 App.jsx 的 new Image() 预加载。
export const IMAGE_ASSETS = [
    '/images/ink-splash.webp',
    '/images/map.webp',
    '/images/map_about_painted.webp',
    '/images/map_contact_painted.webp',
    '/images/map_gallery_painted.webp',
    '/images/map_studio_painted.webp',
    '/images/pin.webp',
    '/images/pin-slot.webp',
];

// App.jsx 与走廊欢迎人物的附加纹理。
export const UI_TEXTURES = [
    '/textures/twiink/waving-ink.webp',
];

// ============================================
// 房间纹理，预加载以加快进入。
// ============================================

// 画廊纹理，通过 Drei 的 useTexture 加载。
// 按条件组织彩色与普通版本。
export const GALLERY_TEXTURES_BASE = [
    '/textures/gallery/floor.webp',
    '/textures/gallery/railing.webp',
    '/textures/gallery/domki.webp',
    '/textures/gallery/miastotlo.webp',
    '/textures/gallery/bird_gray.webp',
    '/textures/gallery/klamerka.webp',
    '/textures/gallery/openliveproject.webp',
];

export const GALLERY_TEXTURES_VERSIONED = [
    // 项目卡片。
    'monetuneprzod',
    'timberkittyprzod',
    'youngmultiprzod',
    'bioprzod',
    // 卡片背面。
    'tylkartki',
    'przyciskdotylukartki',
    // 技术栈标志。
    'csslogo',
    'elementorlogo',
    'firebaselogo',
    'htmllogo',
    'jslogo',
    'netlifylogo',
    'phplogo',
    'reactlogo',
    'tailwindlogo',
    'wordpresslogo',
];

export const GALLERY_TEXTURES = [
    ...GALLERY_TEXTURES_BASE,
    ...GALLERY_TEXTURES_VERSIONED.flatMap(name => [
        `/textures/gallery/${name}.webp`,
        name === 'csslogo' ? `/textures/gallery/css3logo_painted.webp` : `/textures/gallery/${name}_painted.webp`
    ])
];

// 联系我房间纹理，通过 Drei 的 useTexture 加载。
export const CONTACT_TEXTURES = [
    '/textures/contact/faletopdown.webp',
    '/textures/contact/molo.webp',
    '/textures/contact/latarnia.webp',
    '/textures/contact/statek.webp',
    '/textures/contact/paper_form.webp',
    '/textures/contact/send_button.webp',
    '/textures/contact/beczka.webp',
    '/textures/contact/beczka_painted.webp',
];

// 关于我房间纹理，通过 useLoader(TextureLoader) 加载。
export const ABOUT_TEXTURES = [
    // 人物。
    '/textures/twiink/cloud-ink.webp',
    // 可编辑个人资料对应的空白纸片、岛屿和气球。
    '/textures/twiink/profile-note.svg',
    '/textures/twiink/profile-island.svg',
    '/textures/twiink/profile-balloon.svg',
    '/textures/about/button.webp',
    '/textures/about/button_painted.webp',
    '/textures/about/island-free-creation.png',
    // 云层。
    '/textures/clouds/1131c3eb-dfae-423f-924b-ff39d8ccd6dc.webp',
    '/textures/clouds/254b8ec8-d6f7-4275-956f-7bab65b2ce2d.webp',
    '/textures/clouds/2cc88dd1-483c-466d-b07e-f8308c61ccbe.webp',
    '/textures/clouds/5606fcc0-3252-447d-a58a-7bcbac73229a.webp',
    '/textures/clouds/7882dc72-3d01-41fb-ac0e-d07b0184ebc1.webp',
    '/textures/clouds/9b2ca72f-7bd0-473b-ba6e-dd9e0eb79d35.webp',
    '/textures/clouds/c83293c6-d90c-4a32-8d9d-5ac9af7e2296.webp',
    '/textures/clouds/f6e358bc-d27c-41dd-95f4-6787a835c41e.webp',
];

// 工作室纹理，通过 useLoader(TextureLoader) 加载。
export const STUDIO_TEXTURES = [
    // 博客显示器。
    '/textures/studio/monitor_front.webp',
    '/textures/studio/monitor_front_painted.webp',
    '/textures/studio/monitor_back.webp',
    '/textures/studio/monitor_back_painted.webp',
    '/textures/studio/monitor_top.webp',
    '/textures/studio/monitor_top_painted.webp',
    '/textures/studio/monitor_bottom.webp',
    '/textures/studio/monitor_bottom_painted.webp',
    '/textures/studio/monitor_left.webp',
    '/textures/studio/monitor_left_painted.webp',
    '/textures/studio/monitor_right.webp',
    '/textures/studio/monitor_right_painted.webp',
    // YouTube 电视。
    '/textures/studio/tv_front.webp',
    '/textures/studio/tv_front_painted.webp',
    '/textures/studio/tv_back.webp',
    '/textures/studio/tv_back_painted.webp',
    '/textures/studio/tv_top.webp',
    '/textures/studio/tv_top_painted.webp',
    '/textures/studio/tv_bottom.webp',
    '/textures/studio/tv_bottom_painted.webp',
    '/textures/studio/tv_side.webp',
    '/textures/studio/tv_side_painted.webp',
    // TikTok 手机。
    '/textures/studio/phone_front.webp',
    '/textures/studio/phone_front_painted.webp',
    '/textures/studio/phone_back.webp',
    '/textures/studio/phone_back_painted.webp',
    '/textures/studio/phone_side.webp',
    '/textures/studio/phone_side_painted.webp',
    // 自定义内容正面纹理。
    '/textures/studio/monitorfront_postnafbdoublewinner.webp',
    '/textures/studio/monitorfront_postnafbdoublewinner_painted.webp',
    '/textures/studio/phonefront_followmeontiktok.webp',
    '/textures/studio/phonefront_followmeontiktok_painted.webp',
    '/textures/studio/tvfront_filmikedytowaniezdjec.webp',
    '/textures/studio/tvfront_filmikedytowaniezdjec_painted.webp',
    '/textures/studio/tvfront_filmikprojektdlamultiego.webp',
    '/textures/studio/tvfront_filmikprojektdlamultiego_painted.webp',
];

// ============================================
// 合并导出。
// ============================================

// Drei useTexture 加载的纹理：入口、走廊、界面、画廊和联系我。
export const PRELOAD_ALL = [
    ...ENTRANCE_TEXTURES,
    ...CORRIDOR_TEXTURES,
    ...UI_TEXTURES,
    ...GALLERY_TEXTURES,
    ...CONTACT_TEXTURES,
    ...IMAGE_ASSETS,
];


// useLoader(TextureLoader) 加载的纹理：关于我与工作室。
export const PRELOAD_LOADER = [
    ...ABOUT_TEXTURES,
    ...STUDIO_TEXTURES,
];

/**
 * 根据设备是否支持桌面悬停，
 * 或仅支持手机、平板触摸，过滤预加载列表。
 * @param {string[]} list - 待过滤的纹理路径列表。
 * @param {boolean} usePainted - 是否优先使用 _painted 版本。
 * @returns {string[]} 过滤后的列表。
 */
export const filterTexturesByDevice = (list, usePainted) => {
    // 1. 查找所有存在 _painted 版本的路径。
    const paintedVersions = new Set(list.filter(p => p.includes('_painted.webp')));
    
    // 同时处理 css3logo 特例。
    const hasCss3Painted = list.some(p => p.includes('css3logo_painted.webp'));
    
    return list.filter(path => {
        const isPainted = path.includes('_painted.webp');
        const isCss3 = path.includes('css3logo_painted.webp');
        
        // 彩色路径需先找到对应普通路径。
        let standardVersion = null;
        if (isPainted) {
            standardVersion = path.replace('_painted.webp', '.webp');
        } else if (isCss3) {
            standardVersion = path.replace('css3logo_painted.webp', 'csslogo.webp');
        } else {
            // 检查普通路径在列表中是否有彩色版本。
            const pVersion = path.replace('.webp', '_painted.webp');
            const css3Version = path.replace('csslogo.webp', 'css3logo_painted.webp');
            if (list.includes(pVersion) || (path.includes('csslogo.webp') && hasCss3Painted)) {
                // 返回 true 保留普通版本，桌面端与移动端均需要。
                return true; 
            }
            // 没有彩色版本时视为静态纹理，始终保留。
            return true;
        }

        // 此项为彩色版本。
        return usePainted;
    });
};
