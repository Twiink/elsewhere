import { NOTEBOOK_ASSETS, NOTEBOOK_FEATURE_SPRITES } from './projectNotebook';
import { localImagePath } from '../media';

/**
 * 按场景组织的纹理预取列表。
 * 房间资源在空闲或交互时按需准备，入口资源由实际场景加载。
 */

// 入口场景纹理。
export const ENTRANCE_TEXTURES = [
    // 核心资源。
    '/media/images/textures/paper-texture.webp',
    // 门。
    '/media/images/textures/doors/frame_sketch.webp',
    '/media/images/textures/doors/twiink-entry-left-ink-v1.webp',
    '/media/images/textures/doors/twiink-entry-right-ink-v1.webp',
    '/media/images/textures/doors/handle_left_sketch.webp',
    '/media/images/textures/doors/handle_right_sketch.webp',
    '/media/images/textures/doors/door_back_left_sketch.webp',
    '/media/images/textures/doors/pien.webp',
    // 环境。
    '/media/images/textures/entrance/wall_bricks_2.webp',
    '/media/images/textures/entrance/stone-path.webp',
    '/media/images/textures/entrance/floor_paper.webp',
    '/media/images/textures/entrance/belka.webp',
    '/media/images/textures/entrance/sign-creative-workshop.png',
    // 角色与物体。
    '/media/images/textures/entrance/cat_front_body.webp',
    '/media/images/textures/entrance/window_sketch.webp',
    '/media/images/textures/twiink/window-ink.webp',
    '/media/images/textures/entrance/tree_sketch.webp',
    '/media/images/textures/entrance/mouse_hanging.webp',
    '/media/images/textures/entrance/pot_with_duck.webp',
    '/media/images/textures/entrance/bug_sketch.webp',
    '/media/images/textures/entrance/speech_bubble.webp',
    // 图片。
    '/media/images/ui/ink-splash.webp',
];

// 走廊场景纹理。
export const CORRIDOR_TEXTURES = [
    // 墙面、地面与天花板。
    '/media/images/textures/corridor/wall_texture.webp',
    '/media/images/textures/corridor/kawalekpodlogi.webp',
    '/media/images/textures/corridor/texturadoprogow.webp',
    '/media/images/textures/corridor/texturadrewnadonozekbiurka.webp',
    '/media/images/textures/corridor/ceiling_texture.webp',
    // 走廊尽头的双开门。
    '/media/images/textures/corridor/doors/frame_sketch.webp',
    '/media/images/textures/corridor/doors/doorrleft.webp',
    '/media/images/textures/corridor/doors/dorright.webp',
    '/media/images/textures/corridor/doors/handle_left_sketch.webp',
    '/media/images/textures/corridor/doors/handle_right_sketch.webp',
    '/media/images/textures/corridor/doors/pien.webp',
    // 侧面单门。
    '/media/images/textures/corridor/doors/ramkasingledoors.webp',
    '/media/images/textures/corridor/doors/klamkadodrzwi.webp',
    '/media/images/textures/corridor/doors/backsingledoors.webp',
    '/media/images/textures/corridor/doors/drzwiprojekty.webp',
    '/media/images/textures/corridor/doors/life-notes-ink-v1.webp',
    '/media/images/textures/corridor/doors/drzwiabout.webp',
    '/media/images/textures/corridor/doors/drzwikontakt.webp',
    '/media/images/textures/corridor/doors/drzwiprojekty_painted.webp',
    '/media/images/textures/corridor/doors/life-notes-color-v1.webp',
    '/media/images/textures/corridor/doors/drzwiabout_painted.webp',
    '/media/images/textures/corridor/doors/drzwikontakt_painted.webp',
    // 标牌。
    '/media/images/textures/corridor/pustatabliczka.webp',
    // 装饰。
    '/media/images/textures/corridor/decorations/while_true_loop.webp',
    '/media/images/textures/corridor/decorations/coffee_debug.webp',
    '/media/images/textures/corridor/decorations/idea_process.webp',
    '/media/images/textures/corridor/decorations/paper_ball.webp',
    '/media/images/textures/corridor/decorations/paper_airplane.webp',
    '/media/images/textures/corridor/decorations/pencil.webp',
    '/media/images/textures/corridor/decorations/coffee_cup.webp',
    // CorridorDecorations：画框、家具与灯具。
    '/media/images/textures/corridor/ramkanazdjecieduza.webp',
    '/media/images/textures/corridor/ramkanazdjecieduza_painted.webp',
    '/media/images/textures/corridor/ramkanazdjeciemala.webp',
    '/media/images/textures/corridor/drzewkowdoniczce.webp',
    '/media/images/textures/corridor/kratkawentylacyjna.webp',
    '/media/images/textures/corridor/kwiatekwdoniczce.webp',
    '/media/images/textures/corridor/kratanalampy.webp',
    '/media/images/textures/corridor/bokilampy.webp',
    '/media/images/textures/corridor/gorastolika.webp',
    '/media/images/textures/corridor/szafkaprzod.webp',
    '/media/images/textures/corridor/szafkaprzodgora.webp',
    '/media/images/textures/twiink/site-icon-airplane-v1-512.png',
    '/media/images/textures/corridor/rysuneknaobrazek3.webp',
    '/media/images/content/corridor/bouquet-hands.webp',
    '/media/images/content/corridor/hanfu-photo.webp',
    // DoorSection 附加资源。
    '/media/images/textures/corridor/strzalka.webp',
    '/media/images/textures/corridor/doors/door_back.webp',
    '/media/images/textures/corridor/doors/klamkadodrzwi_painted.webp',
];

// 标准 HTML 图片资源，通过 App.jsx 的 new Image() 预加载。
export const IMAGE_ASSETS = [
    '/media/images/ui/ink-splash.webp',
    '/media/images/ui/map.webp',
    '/media/images/ui/map_about_painted.webp',
    '/media/images/ui/map_contact_painted.webp',
    '/media/images/ui/map_gallery_painted.webp',
    '/media/images/ui/map_studio_painted.webp',
    '/media/images/ui/pin.webp',
    '/media/images/ui/pin-slot.webp',
];

// App.jsx 与走廊欢迎人物的附加纹理。
export const UI_TEXTURES = [
    '/media/images/textures/twiink/waving-ink.webp',
];

// ============================================
// 房间纹理，预加载以加快进入。
// ============================================

// 画廊纹理，通过 Drei 的 useTexture 加载。
// 按条件组织彩色与普通版本。
export const GALLERY_TEXTURES_BASE = [
    ...Object.values(NOTEBOOK_ASSETS),
    ...NOTEBOOK_FEATURE_SPRITES,
    '/media/images/textures/gallery/floor.webp',
    '/media/images/textures/gallery/railing.webp',
    '/media/images/textures/gallery/domki.webp',
    '/media/images/textures/gallery/miastotlo.webp',
    '/media/images/textures/gallery/bird_gray.webp',
    '/media/images/textures/gallery/klamerka.webp',
    '/media/images/textures/gallery/openliveproject.webp',
];

export const GALLERY_TEXTURES_VERSIONED = [
    // 项目卡片。
    'monetuneprzod',
    'timberkittyprzod',
    'youngmultiprzod',
    'bioprzod',
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
        localImagePath(`textures/gallery/${name}.png`),
        name === 'csslogo' ? localImagePath('textures/gallery/css3logo_painted.png') : localImagePath(`textures/gallery/${name}_painted.png`)
    ])
];

// 联系我房间纹理，通过 Drei 的 useTexture 加载。
export const CONTACT_TEXTURES = [
    '/media/images/textures/contact/faletopdown.webp',
    '/media/images/textures/contact/molo.webp',
    '/media/images/textures/contact/latarnia.webp',
    '/media/images/textures/contact/statek.webp',
    '/media/images/textures/contact/paper_form.webp',
    '/media/images/textures/contact/send_button.webp',
    '/media/images/textures/contact/beczka.webp',
    '/media/images/textures/contact/beczka_painted.webp',
];

// 关于我房间纹理，通过 useLoader(TextureLoader) 加载。
export const ABOUT_TEXTURES = [
    // 人物。
    '/media/images/textures/twiink/cloud-ink.webp',
    // 可编辑个人资料对应的空白纸片、岛屿和气球。
    '/media/images/textures/twiink/profile-note.svg',
    '/media/images/textures/twiink/profile-island.svg',
    '/media/images/textures/twiink/profile-balloon.svg',
    '/media/images/textures/about/button.webp',
    '/media/images/textures/about/button_painted.webp',
    '/media/images/textures/about/island-free-creation.png',
    // 云层。
    '/media/images/textures/clouds/cloud-rounded-bold.webp',
    '/media/images/textures/clouds/cloud-flat-bottom-bold.webp',
    '/media/images/textures/clouds/cloud-wide-sketch.webp',
    '/media/images/textures/clouds/cloud-rounded-sketch.webp',
    '/media/images/textures/clouds/cloud-tall-sketch.webp',
    '/media/images/textures/clouds/cloud-puffy-bold.webp',
    '/media/images/textures/clouds/cloud-horizon-sketch.webp',
    '/media/images/textures/clouds/cloud-soft-bold.webp',
];

// 工作室纹理，通过 useLoader(TextureLoader) 加载。
export const STUDIO_TEXTURES = [
    // 博客显示器。
    '/media/images/textures/studio/monitor_front.webp',
    '/media/images/textures/studio/monitor_front_painted.webp',
    '/media/images/textures/studio/monitor_back.webp',
    '/media/images/textures/studio/monitor_back_painted.webp',
    '/media/images/textures/studio/monitor_top.webp',
    '/media/images/textures/studio/monitor_top_painted.webp',
    '/media/images/textures/studio/monitor_bottom.webp',
    '/media/images/textures/studio/monitor_bottom_painted.webp',
    '/media/images/textures/studio/monitor_left.webp',
    '/media/images/textures/studio/monitor_left_painted.webp',
    '/media/images/textures/studio/monitor_right.webp',
    '/media/images/textures/studio/monitor_right_painted.webp',
    // YouTube 电视。
    '/media/images/textures/studio/tv_front.webp',
    '/media/images/textures/studio/tv_front_painted.webp',
    '/media/images/textures/studio/tv_back.webp',
    '/media/images/textures/studio/tv_back_painted.webp',
    '/media/images/textures/studio/tv_top.webp',
    '/media/images/textures/studio/tv_top_painted.webp',
    '/media/images/textures/studio/tv_bottom.webp',
    '/media/images/textures/studio/tv_bottom_painted.webp',
    '/media/images/textures/studio/tv_side.webp',
    '/media/images/textures/studio/tv_side_painted.webp',
    // TikTok 手机。
    '/media/images/textures/studio/phone_front.webp',
    '/media/images/textures/studio/phone_front_painted.webp',
    '/media/images/textures/studio/phone_back.webp',
    '/media/images/textures/studio/phone_back_painted.webp',
    '/media/images/textures/studio/phone_side.webp',
    '/media/images/textures/studio/phone_side_painted.webp',
    // 自定义内容正面纹理。
    '/media/images/textures/studio/monitorfront_postnafbdoublewinner.webp',
    '/media/images/textures/studio/monitorfront_postnafbdoublewinner_painted.webp',
    '/media/images/textures/studio/phonefront_followmeontiktok.webp',
    '/media/images/textures/studio/phonefront_followmeontiktok_painted.webp',
    '/media/images/textures/studio/tvfront_filmikedytowaniezdjec.webp',
    '/media/images/textures/studio/tvfront_filmikedytowaniezdjec_painted.webp',
    '/media/images/textures/studio/tvfront_filmikprojektdlamultiego.webp',
    '/media/images/textures/studio/tvfront_filmikprojektdlamultiego_painted.webp',
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
