/**
 * 按场景组织的纹理预取列表。
 * 房间资源在空闲或交互时按需准备，入口资源由实际场景加载。
 */

// 入口场景纹理。
export const ENTRANCE_TEXTURES = [
    // 核心资源。
    'https://media.secknow-ai.com/space/textures/paper-texture.png',
    // 门。
    'https://media.secknow-ai.com/space/textures/doors/frame_sketch.png',
    'https://media.secknow-ai.com/space/textures/doors/twiink-entry-left-ink-v1.png?imageMogr2/thumbnail/512x1308',
    'https://media.secknow-ai.com/space/textures/doors/twiink-entry-right-ink-v1.png?imageMogr2/thumbnail/512x1308',
    'https://media.secknow-ai.com/space/textures/doors/handle_left_sketch.png',
    'https://media.secknow-ai.com/space/textures/doors/handle_right_sketch.png',
    'https://media.secknow-ai.com/space/textures/doors/door_back_left_sketch.png',
    'https://media.secknow-ai.com/space/textures/doors/pien.png',
    // 环境。
    'https://media.secknow-ai.com/space/textures/entrance/wall_bricks_2.png',
    'https://media.secknow-ai.com/space/textures/entrance/stone-path.png?imageMogr2/thumbnail/389x779',
    'https://media.secknow-ai.com/space/textures/entrance/floor_paper.png?imageMogr2/thumbnail/1024x512',
    'https://media.secknow-ai.com/space/textures/entrance/belka.png',
    'https://media.secknow-ai.com/space/textures/entrance/sign-creative-workshop.png',
    // 角色与物体。
    'https://media.secknow-ai.com/space/textures/entrance/cat_front_body.png',
    'https://media.secknow-ai.com/space/textures/entrance/window_sketch.png?imageMogr2/thumbnail/1024x1024',
    'https://media.secknow-ai.com/space/textures/twiink/window-ink.png',
    'https://media.secknow-ai.com/space/textures/entrance/tree_sketch.png',
    'https://media.secknow-ai.com/space/textures/entrance/mouse_hanging.png',
    'https://media.secknow-ai.com/space/textures/entrance/pot_with_duck.png?imageMogr2/thumbnail/2048x1024',
    'https://media.secknow-ai.com/space/textures/entrance/bug_sketch.png',
    'https://media.secknow-ai.com/space/textures/entrance/speech_bubble.png',
    // 图片。
    'https://media.secknow-ai.com/space/images/ink-splash.png',
];

// 走廊场景纹理。
export const CORRIDOR_TEXTURES = [
    // 墙面、地面与天花板。
    'https://media.secknow-ai.com/space/textures/corridor/wall_texture.png?imageMogr2/thumbnail/1024x512',
    'https://media.secknow-ai.com/space/textures/corridor/kawalekpodlogi.png?imageMogr2/thumbnail/1024x1024',
    'https://media.secknow-ai.com/space/textures/corridor/texturadoprogow.png',
    'https://media.secknow-ai.com/space/textures/corridor/texturadrewnadonozekbiurka.png?imageMogr2/thumbnail/2048x128',
    'https://media.secknow-ai.com/space/textures/corridor/ceiling_texture.png?imageMogr2/thumbnail/1024x512',
    // 走廊尽头的双开门。
    'https://media.secknow-ai.com/space/textures/corridor/doors/frame_sketch.png?imageMogr2/thumbnail/512x512',
    'https://media.secknow-ai.com/space/textures/corridor/doors/doorrleft.png?imageMogr2/thumbnail/256x512',
    'https://media.secknow-ai.com/space/textures/corridor/doors/dorright.png?imageMogr2/thumbnail/256x512',
    'https://media.secknow-ai.com/space/textures/corridor/doors/handle_left_sketch.png?imageMogr2/thumbnail/256x512',
    'https://media.secknow-ai.com/space/textures/corridor/doors/handle_right_sketch.png?imageMogr2/thumbnail/256x512',
    'https://media.secknow-ai.com/space/textures/corridor/doors/pien.png?imageMogr2/thumbnail/32x256',
    // 侧面单门。
    'https://media.secknow-ai.com/space/textures/corridor/doors/ramkasingledoors.png?imageMogr2/thumbnail/512x1024',
    'https://media.secknow-ai.com/space/textures/corridor/doors/klamkadodrzwi.png?imageMogr2/thumbnail/512x1024',
    'https://media.secknow-ai.com/space/textures/corridor/doors/backsingledoors.png?imageMogr2/thumbnail/512x1024',
    'https://media.secknow-ai.com/space/textures/corridor/doors/drzwiprojekty.png?imageMogr2/thumbnail/512x1024',
    'https://media.secknow-ai.com/space/textures/corridor/doors/life-notes-ink-v1.png',
    'https://media.secknow-ai.com/space/textures/corridor/doors/drzwiabout.png?imageMogr2/thumbnail/512x1024',
    'https://media.secknow-ai.com/space/textures/corridor/doors/drzwikontakt.png?imageMogr2/thumbnail/512x1024',
    'https://media.secknow-ai.com/space/textures/corridor/doors/drzwiprojekty_painted.png?imageMogr2/thumbnail/880x1761',
    'https://media.secknow-ai.com/space/textures/corridor/doors/life-notes-color-v1.png',
    'https://media.secknow-ai.com/space/textures/corridor/doors/drzwiabout_painted.png?imageMogr2/thumbnail/1024x2048',
    'https://media.secknow-ai.com/space/textures/corridor/doors/drzwikontakt_painted.png?imageMogr2/thumbnail/880x1761',
    // 标牌。
    'https://media.secknow-ai.com/space/textures/corridor/pustatabliczka.png?imageMogr2/thumbnail/2048x1024',
    // 装饰。
    'https://media.secknow-ai.com/space/textures/corridor/decorations/while_true_loop.png?imageMogr2/thumbnail/1249x624',
    'https://media.secknow-ai.com/space/textures/corridor/decorations/coffee_debug.png?imageMogr2/thumbnail/1761x880',
    'https://media.secknow-ai.com/space/textures/corridor/decorations/idea_process.png?imageMogr2/thumbnail/604x1208',
    'https://media.secknow-ai.com/space/textures/corridor/decorations/paper_ball.png',
    'https://media.secknow-ai.com/space/textures/corridor/decorations/paper_airplane.png',
    'https://media.secknow-ai.com/space/textures/corridor/decorations/pencil.png',
    'https://media.secknow-ai.com/space/textures/corridor/decorations/coffee_cup.png',
    // CorridorDecorations：画框、家具与灯具。
    'https://media.secknow-ai.com/space/textures/corridor/ramkanazdjecieduza.png?imageMogr2/thumbnail/2048x1024',
    'https://media.secknow-ai.com/space/textures/corridor/ramkanazdjecieduza_painted.png?imageMogr2/thumbnail/2048x1024',
    'https://media.secknow-ai.com/space/textures/corridor/ramkanazdjeciemala.png?imageMogr2/thumbnail/512x1024',
    'https://media.secknow-ai.com/space/textures/corridor/drzewkowdoniczce.png?imageMogr2/thumbnail/1024x2048',
    'https://media.secknow-ai.com/space/textures/corridor/kratkawentylacyjna.png?imageMogr2/thumbnail/2048x1024',
    'https://media.secknow-ai.com/space/textures/corridor/kwiatekwdoniczce.png?imageMogr2/thumbnail/128x256',
    'https://media.secknow-ai.com/space/textures/corridor/kratanalampy.png?imageMogr2/thumbnail/1515x757',
    'https://media.secknow-ai.com/space/textures/corridor/bokilampy.png?imageMogr2/thumbnail/1024x64',
    'https://media.secknow-ai.com/space/textures/corridor/gorastolika.png?imageMogr2/thumbnail/2048x512',
    'https://media.secknow-ai.com/space/textures/corridor/szafkaprzod.png?imageMogr2/thumbnail/1024x1024',
    'https://media.secknow-ai.com/space/textures/corridor/szafkaprzodgora.png?imageMogr2/thumbnail/512x1024',
    'https://media.secknow-ai.com/space/textures/twiink/site-icon-airplane-v1-512.png?imageMogr2/thumbnail/512x512',
    'https://media.secknow-ai.com/space/textures/corridor/rysuneknaobrazek3.png?imageMogr2/thumbnail/716x358',
    'https://media.secknow-ai.com/space/content/corridor/bouquet-hands.png?imageMogr2/thumbnail/1536x2048',
    'https://media.secknow-ai.com/space/content/corridor/hanfu-photo.jpg?imageMogr2/thumbnail/1365x2048',
    // DoorSection 附加资源。
    'https://media.secknow-ai.com/space/textures/corridor/strzalka.png?imageMogr2/thumbnail/128x64',
    'https://media.secknow-ai.com/space/textures/corridor/doors/door_back.png?imageMogr2/thumbnail/256x512',
    'https://media.secknow-ai.com/space/textures/corridor/doors/klamkadodrzwi_painted.png?imageMogr2/thumbnail/512x1024',
];

// 标准 HTML 图片资源，通过 App.jsx 的 new Image() 预加载。
export const IMAGE_ASSETS = [
    'https://media.secknow-ai.com/space/images/ink-splash.png',
    'https://media.secknow-ai.com/space/images/map.png',
    'https://media.secknow-ai.com/space/images/map_about_painted.png',
    'https://media.secknow-ai.com/space/images/map_contact_painted.png',
    'https://media.secknow-ai.com/space/images/map_gallery_painted.png',
    'https://media.secknow-ai.com/space/images/map_studio_painted.png',
    'https://media.secknow-ai.com/space/images/pin.png',
    'https://media.secknow-ai.com/space/images/pin-slot.png',
];

// App.jsx 与走廊欢迎人物的附加纹理。
export const UI_TEXTURES = [
    'https://media.secknow-ai.com/space/textures/twiink/waving-ink.png',
];

// ============================================
// 房间纹理，预加载以加快进入。
// ============================================

// 画廊纹理，通过 Drei 的 useTexture 加载。
// 按条件组织彩色与普通版本。
export const GALLERY_TEXTURES_BASE = [
    'https://media.secknow-ai.com/space/textures/gallery/floor.png',
    'https://media.secknow-ai.com/space/textures/gallery/railing.png',
    'https://media.secknow-ai.com/space/textures/gallery/domki.png',
    'https://media.secknow-ai.com/space/textures/gallery/miastotlo.png',
    'https://media.secknow-ai.com/space/textures/gallery/bird_gray.png',
    'https://media.secknow-ai.com/space/textures/gallery/klamerka.png',
    'https://media.secknow-ai.com/space/textures/gallery/openliveproject.png',
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
        `https://media.secknow-ai.com/space/textures/gallery/${name}.png`,
        name === 'csslogo' ? `https://media.secknow-ai.com/space/textures/gallery/css3logo_painted.png` : `https://media.secknow-ai.com/space/textures/gallery/${name}_painted.png`
    ])
];

// 联系我房间纹理，通过 Drei 的 useTexture 加载。
export const CONTACT_TEXTURES = [
    'https://media.secknow-ai.com/space/textures/contact/faletopdown.png?imageMogr2/thumbnail/1351x675',
    'https://media.secknow-ai.com/space/textures/contact/molo.png',
    'https://media.secknow-ai.com/space/textures/contact/latarnia.png?imageMogr2/thumbnail/1024x1024',
    'https://media.secknow-ai.com/space/textures/contact/statek.png',
    'https://media.secknow-ai.com/space/textures/contact/paper_form.png',
    'https://media.secknow-ai.com/space/textures/contact/send_button.png?imageMogr2/thumbnail/256x64',
    'https://media.secknow-ai.com/space/textures/contact/beczka.png?imageMogr2/thumbnail/901x901',
    'https://media.secknow-ai.com/space/textures/contact/beczka_painted.png?imageMogr2/thumbnail/901x901',
];

// 关于我房间纹理，通过 useLoader(TextureLoader) 加载。
export const ABOUT_TEXTURES = [
    // 人物。
    'https://media.secknow-ai.com/space/textures/twiink/cloud-ink.png',
    // 可编辑个人资料对应的空白纸片、岛屿和气球。
    'https://media.secknow-ai.com/space/textures/twiink/profile-note.png?imageMogr2/thumbnail/800x560',
    'https://media.secknow-ai.com/space/textures/twiink/profile-island.png?imageMogr2/thumbnail/800x500',
    'https://media.secknow-ai.com/space/textures/twiink/profile-balloon.png?imageMogr2/thumbnail/520x980',
    'https://media.secknow-ai.com/space/textures/about/button.png?imageMogr2/thumbnail/512x128',
    'https://media.secknow-ai.com/space/textures/about/button_painted.png?imageMogr2/thumbnail/512x128',
    'https://media.secknow-ai.com/space/textures/about/island-free-creation.png',
    // 云层。
    'https://media.secknow-ai.com/space/textures/clouds/1131c3eb-dfae-423f-924b-ff39d8ccd6dc.png',
    'https://media.secknow-ai.com/space/textures/clouds/254b8ec8-d6f7-4275-956f-7bab65b2ce2d.png',
    'https://media.secknow-ai.com/space/textures/clouds/2cc88dd1-483c-466d-b07e-f8308c61ccbe.png?imageMogr2/thumbnail/512x128',
    'https://media.secknow-ai.com/space/textures/clouds/5606fcc0-3252-447d-a58a-7bcbac73229a.png?imageMogr2/thumbnail/512x256',
    'https://media.secknow-ai.com/space/textures/clouds/7882dc72-3d01-41fb-ac0e-d07b0184ebc1.png?imageMogr2/thumbnail/256x256',
    'https://media.secknow-ai.com/space/textures/clouds/9b2ca72f-7bd0-473b-ba6e-dd9e0eb79d35.png',
    'https://media.secknow-ai.com/space/textures/clouds/c83293c6-d90c-4a32-8d9d-5ac9af7e2296.png?imageMogr2/thumbnail/512x128',
    'https://media.secknow-ai.com/space/textures/clouds/f6e358bc-d27c-41dd-95f4-6787a835c41e.png',
];

// 工作室纹理，通过 useLoader(TextureLoader) 加载。
export const STUDIO_TEXTURES = [
    // 博客显示器。
    'https://media.secknow-ai.com/space/textures/studio/monitor_front.png',
    'https://media.secknow-ai.com/space/textures/studio/monitor_front_painted.png',
    'https://media.secknow-ai.com/space/textures/studio/monitor_back.png',
    'https://media.secknow-ai.com/space/textures/studio/monitor_back_painted.png',
    'https://media.secknow-ai.com/space/textures/studio/monitor_top.png',
    'https://media.secknow-ai.com/space/textures/studio/monitor_top_painted.png',
    'https://media.secknow-ai.com/space/textures/studio/monitor_bottom.png',
    'https://media.secknow-ai.com/space/textures/studio/monitor_bottom_painted.png',
    'https://media.secknow-ai.com/space/textures/studio/monitor_left.png',
    'https://media.secknow-ai.com/space/textures/studio/monitor_left_painted.png',
    'https://media.secknow-ai.com/space/textures/studio/monitor_right.png',
    'https://media.secknow-ai.com/space/textures/studio/monitor_right_painted.png',
    // YouTube 电视。
    'https://media.secknow-ai.com/space/textures/studio/tv_front.png',
    'https://media.secknow-ai.com/space/textures/studio/tv_front_painted.png',
    'https://media.secknow-ai.com/space/textures/studio/tv_back.png',
    'https://media.secknow-ai.com/space/textures/studio/tv_back_painted.png',
    'https://media.secknow-ai.com/space/textures/studio/tv_top.png',
    'https://media.secknow-ai.com/space/textures/studio/tv_top_painted.png',
    'https://media.secknow-ai.com/space/textures/studio/tv_bottom.png',
    'https://media.secknow-ai.com/space/textures/studio/tv_bottom_painted.png',
    'https://media.secknow-ai.com/space/textures/studio/tv_side.png',
    'https://media.secknow-ai.com/space/textures/studio/tv_side_painted.png',
    // TikTok 手机。
    'https://media.secknow-ai.com/space/textures/studio/phone_front.png',
    'https://media.secknow-ai.com/space/textures/studio/phone_front_painted.png',
    'https://media.secknow-ai.com/space/textures/studio/phone_back.png',
    'https://media.secknow-ai.com/space/textures/studio/phone_back_painted.png',
    'https://media.secknow-ai.com/space/textures/studio/phone_side.png',
    'https://media.secknow-ai.com/space/textures/studio/phone_side_painted.png',
    // 自定义内容正面纹理。
    'https://media.secknow-ai.com/space/textures/studio/monitorfront_postnafbdoublewinner.png',
    'https://media.secknow-ai.com/space/textures/studio/monitorfront_postnafbdoublewinner_painted.png',
    'https://media.secknow-ai.com/space/textures/studio/phonefront_followmeontiktok.png',
    'https://media.secknow-ai.com/space/textures/studio/phonefront_followmeontiktok_painted.png',
    'https://media.secknow-ai.com/space/textures/studio/tvfront_filmikedytowaniezdjec.png',
    'https://media.secknow-ai.com/space/textures/studio/tvfront_filmikedytowaniezdjec_painted.png',
    'https://media.secknow-ai.com/space/textures/studio/tvfront_filmikprojektdlamultiego.png',
    'https://media.secknow-ai.com/space/textures/studio/tvfront_filmikprojektdlamultiego_painted.png',
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
    return usePainted ? list : list.filter(path => !path.includes('_painted.png'));
};
