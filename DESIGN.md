---
name: "Twiink's Space · 画廊项目手记"
description: "画廊项目纸背与项目详情的淡彩手记设计记录"
colors:
  honey-bookmark: "#f6dca3"
  honey-chapter: "#f6dfac"
  honey-mark: "#efd191"
  chapter-green: "#e5e9cf"
  ink: "#3c382f"
  muted-ink: "#655f51"
  current-ink: "#3f3524"
  paper-tab: "#f8f5eb"
  paper-rule: "#cbbfa9"
  focus-ink: "#78603b"
typography:
  headline:
    fontFamily: "'霞鹜文楷', serif"
    fontSize: "clamp(1.5rem, 2.45vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.4
  title:
    fontFamily: "'霞鹜文楷', serif"
    fontSize: "1.4rem"
    fontWeight: 600
    lineHeight: 1.45
  intro:
    fontFamily: "'霞鹜文楷', serif"
    fontSize: "1.13rem"
    lineHeight: 1.7
  body:
    fontFamily: "'霞鹜文楷', serif"
    fontSize: "1.04rem"
    lineHeight: 1.85
  label:
    fontFamily: "'霞鹜文楷', serif"
    fontSize: "1rem"
rounded:
  bookmark: "9px 12px 0 0"
  chapter: "6px 9px 5px 7px"
  section-mark: "7px 3px 9px 4px"
  cover: "7px 11px 6px 9px"
  photo: "8px 12px 7px 10px"
spacing:
  reading-gap: "32px"
  reading-gap-medium: "22px"
  section-gap: "2.1rem"
  bookmark-gap: "3px"
  chapter-gap: "0.55rem"
components:
  project-bookmark:
    backgroundColor: "{colors.paper-tab}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.bookmark}"
    padding: "10px 14px 12px"
  project-bookmark-current:
    backgroundColor: "{colors.honey-bookmark}"
    textColor: "{colors.current-ink}"
    rounded: "{rounded.bookmark}"
  chapter-link:
    backgroundColor: "rgb(255 253 246 / 40%)"
    textColor: "{colors.ink}"
    rounded: "{rounded.chapter}"
    padding: "0.3rem 0.65rem"
  chapter-link-current:
    backgroundColor: "{colors.honey-chapter}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chapter}"
  project-heading:
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
  chapter-heading:
    backgroundColor: "{colors.chapter-green}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.section-mark}"
    padding: "0.05rem 0.45rem"
  site-entry:
    textColor: "{colors.ink}"
    padding: "0.35rem 1rem"
  close-button:
    textColor: "#655e52"
    width: "44px"
    height: "44px"
  notebook-sheet:
    textColor: "{colors.ink}"
    padding: "25px 24px 27px"
---

# Design System: Twiink's Space · 画廊项目手记

## Overview

**Creative North Star: "淡彩项目手记"**

把项目当作一本可以翻开的手记：水彩纸边承接插画与真实照片，石墨手写保持亲近的阅读语气，蜂蜜色标出当前选择与标题重点，浅绿托住正文的章节标题。纸张的细微不规则和柔和投影提供触感，连续文字保持清楚、舒展。

本记录只适用于画廊项目纸背和项目详情。三维纸背先介绍项目，再通过“查看项目”进入完整阅读；详情展开封面、正文与真实媒体。入口页及生活手记、关于、联系等房间各有现有实现，本记录不将这套版式扩展为它们的采用状态。

**Key Characteristics:**

- 水彩纸边与轻微不规则轮廓承载内容。
- 石墨手写、蜂蜜色重点和浅绿章节标题形成阅读层次。
- 八项目纸书签连接封面与可滚动阅读列。
- 三维翻纸与完整项目详情共享项目内容和水彩素材。

记录日期为 2026-11-11，依据当前工作区源码与已有截图。A 稿的开发方向已获批准，批准图为 `.impeccable/mocks/project-notebook-approved.png`，同名 JSON sidecar 标明 `approved: true` 及两种界面的范围。现有截图为 `.impeccable/review/desktop.png`、`mobile.png`、`paper-desktop.png`、`paper-mobile.png`；它们记录桌面和手机的实际两种界面状态。测量规格保存在本机 `.impeccable/build/spec.json`，截图、交互检查与比对证据保存在 `.impeccable/review/`；这些本机验收资料与可发布素材分开保存。

本次源码依据：`src/styles/ProjectDetails.scss` 提供颜色、排版、布局和状态；`src/components/ui/ProjectDetails.jsx` 提供内容、语义与交互；`src/components/canvas/rooms/Gallery/GalleryRoom.jsx` 和 `PaperMaterial.jsx` 提供纸背几何、翻纸与色彩处理；`src/config/projectNotebook.js`、`src/config/texturePreloadList.js` 和 `scripts/publish-assets.mjs` 提供素材映射与发布链。`src/styles/_base.scss` 和 `public/start/style.css` 用于核对已有基础行为和范围差异，`src/styles/_mixins.scss`、`_variables.scss` 补充根字号依据。

## Colors

颜色原值见 frontmatter，来自项目详情实际样式；纸张的纹理色来自水彩素材，不以截图采样色替代。

### Primary

- **蜂蜜书签（`honey-bookmark`）**：当前项目书签的底色。
- **蜂蜜章节（`honey-chapter`）**：当前章节的纸按钮底色，叠加按钮水彩纹理。
- **蜂蜜划痕（`honey-mark`）**：项目标题下方略带倾斜的强调笔触。

### Secondary

- **浅绿章节（`chapter-green`）**：正文三级标题后的小块底色，帮助扫读到照片、贡献和项目入口。

### Neutral

- **石墨墨色（`ink`）**：详情正文、标题与章节导航。
- **淡石墨（`muted-ink`）**：未选项目书签、图注和辅助说明。
- **深蜂蜜墨色（`current-ink`）**：当前项目书签文字。
- **纸签底（`paper-tab`）**：未选书签的底色，与纸纹相乘混合。
- **纸面分隔线（`paper-rule`）**：媒体起始分隔和虚线内容边界。
- **焦点墨色（`focus-ink`）**：项目详情内的可见键盘焦点。

**The 蜂蜜标记 Rule.** 蜂蜜色用于当前项目、当前章节与标题下划线，浅绿用于正文章节标题，石墨文字承担连续阅读。

## Typography

项目详情使用 frontmatter 中的霞鹜文楷与衬线回退。标题和章节标题使用较重字重，正文依靠行距形成呼吸感；未声明的字重、字距和行宽不另立比例尺。

| 层级 | 用法与实际变化 |
| --- | --- |
| 项目标题 `headline` | 桌面使用流动字号；笔记本容器不超过 1100px 时为（1.75rem），视口不超过 700px 时为（1.55rem，行高 1.35），高度不超过 600px 时为（1.4rem，行高 1.3）。 |
| 章节标题 `title` | 正文三级标题，浅绿底；正文小标题另用（1.1rem，600，行高 1.5）。 |
| 项目引言 `intro` | 项目标题下的一句话介绍；不超过 700px 时为（1rem，行高 1.6）。 |
| 正文 `body` | 连续段落；不超过 700px 时为（1rem），行高仍沿用正文规则。 |
| 项目书签 `label` | 默认字号不随窄屏改变；当前项目字重为（600）。章节链接另用（0.98rem），不超过 700px 时为（0.95rem）。 |
| 图注 | 照片说明为（0.9rem，行高 1.65），使用淡石墨。 |

基础根字号为（16px），已有基础样式在不超过（767px）时改为（14px），因此上述 rem 值按实际根字号计算。场景字体与 DOM 字体由发布脚本从同一份霞鹜文楷生成，三维纸背使用场景字体路径 `/fonts/LXGWWenKaiLite-site.woff`。

**The 同一字形 Rule.** 项目详情沿用霞鹜文楷；纸背通过同源场景字体保留相同字形，字号按各自 DOM 或三维坐标体系记录。

## Layout

项目详情为原生模态阅读层。桌面最大外框宽高分别为（1320px、920px），宽度取 `min(1320px, calc(100vw - 4rem))`，高度取 `min(920px, calc(100dvh - 4rem))`。顶部书签与阅读页分开，书签始终是一行，空间不足时横向滚动。

| 范围 | 封面与阅读列 | 留白与纸边 |
| --- | --- | --- |
| 笔记本容器大于 1100px | 两列 `minmax(0, 0.36fr) minmax(0, 0.64fr)`；封面在左，阅读在右。 | 列距见 `reading-gap`；内边距（25px 24px 27px），纸边（20px）。 |
| 笔记本容器不超过 1100px | 顶部为正方形封面小图与标题；章节目录和正文分别占下方整行。小图宽度 `clamp(84px, 18cqi, 152px)`。 | 顶部列距（24px），章节上方留（1rem）；正文保留独立滚动。 |
| 视口不超过 1024px | 外框宽高各留（2rem）；封面与正文按容器查询使用顶部小图布局。 | 内边距（20px 14px），纸边（15px）；容器规则覆盖原中等宽度列配置。 |
| 视口不超过 700px | 继续使用封面小图与标题的顶部布局；外框宽高各留（0.75rem）。 | 顶部列距（14px）；内边距（18px 12px 10px），纸边（12px）。 |
| 视口高度不超过 600px | 缩小标题及上下留白；紧凑布局的小图宽度改为 `clamp(56px, 12cqi, 80px)`。 | 外框高度留（0.75rem），上下内边距及纸边分别为（10px）；正文继续占剩余空间。 |

`.project-notebook` 使用具名 `inline-size` 容器，布局跟随面板实际宽度，容器规则适用于分屏或嵌入窄面板的情况。紧凑布局通过非语义包装层 `.project-reading-sheet` 的 `display: contents` 将标题、章节与正文放入同一网格，DOM 内容与键盘顺序保持连续。

封面图片统一高为图框的（135%），下沿对齐。紧凑图框固定为（1:1），裁去封面顶部预留标题区，同时保留插画的主要内容，避免让图片跟随整页高度变成长条。照片在桌面采用两列，单张占满；不超过 700px 时采用单列。图文贡献与项目入口也按已有断点收成单列。

阅读列内部按“标题／引言 → 章节目录 → 正文”排列，正文使用 `overflow-y: auto`、`min-height: 0` 与 `overscroll-behavior: contain`。书签和章节目录分别使用 `overflow-x: auto`。基础样式通过 `scrollbar-width: none` 和 WebKit 滚动条规则隐藏轨道；入口页也存在同样的隐藏规则。页面本身的 `overflow: hidden` 服务于三维场景，阅读层保留独立滚动。

**The 可滚动阅读 Rule.** 隐藏的是滚动条；项目书签、章节目录和正文分别保留各自的滚动方向及键盘入口。

## Elevation & Depth

项目详情以纸纹、透明边框和柔和环境投影形成纸页厚度。整体笔记本使用 `drop-shadow(0 12px 20px rgb(64 49 28 / 17%))`，模态背板为 `rgb(239 235 225 / 55%)`。这里的深度用于把阅读页从画廊中托起。

三维纸卡保留实际几何尺寸（1.5 × 2，场景单位）与（16 × 16）分段。点选时先移到视野中央，再弯曲、翻到背面并放大至（1.1）；再次点选时归位。纸背的标题、简介、插画、四条功能提示和“查看项目”入口跟随同一张弯曲纸面，排版不另悬浮成一块界面。

近距离阅读色彩由素材和材质共同处理：画廊为颜色纹理创建 sRGB 副本；`PaperMaterial.jsx` 只对正面继续提亮并应用场景 tone mapping，纸背跳过场景色调映射，保留水彩纸素材本身的色阶。背面插画、提示图标和按钮底图的基础材质使用 `toneMapped={false}`、`fog={false}`，恢复素材的纸色与淡彩。这里记录处理原理，颜色以材质源码及后续截图为准，不将现有截图的纸背采样值列为色板。

## Shapes

纸面外缘来自 `paper.png` 的透明纹理轮廓，详情通过 `border-image` 的（48）切片、`fill stretch` 形成纸边。书签、封面、照片和章节标记分别使用 frontmatter 中实际存在的四角圆角；偶数项目书签另用（12px 6px 0 0），让纸签的细小差异保留下来。

项目标题的蜂蜜下划线高为（0.17em）、宽为 `min(13em, 72%)`，采用（45% 21% 40% 18%）圆角并旋转（-0.6deg）。内容分隔采用细实线或虚线，连续阅读仍由正文布局组织。

## Components

首张照片在桌面将原图和图注并排，图注列为 `8rem`、间隔为 `1rem`；700px 以下恢复图注位于照片下方。

### 八项目纸书签

顶部导航来自有 `details` 的项目，当前数据恰为八项，与内容顺序一致。使用项目短名或完整标题，当前项标记 `aria-current="page"`，保留（600）字重与蜂蜜底色。默认最小高度（46px），窄屏为（44px）；悬停改变背景与文字，状态过渡为（160ms ease）。

导航通过左右方向键循环切换，`Home`／`End` 到首尾；只有当前按钮处于顺序 Tab 焦点链。切换后当前项保持可见，正文回到顶部。

### 章节目录与正文

章节由实际存在的介绍、照片、视频、参与内容、相关链接和项目入口组成，当前点击项用 `aria-current="location"` 标记。链接最小高度（44px）；普通状态为浅色半透明纸面，当前状态叠加 `button.png`，悬停有背景变化。章节点击滚动到正文对应位置；当前标记由点击状态驱动。

正文容器具有 `tabIndex={0}` 与“项目介绍正文”标签，可进入键盘焦点。首段之后按数据插入首张照片，余图和视频继续排列；工具说明支持原生 `details`／`summary` 折叠。照片保留替代文字、尺寸、图注和延迟加载；视频保留原生控件、`playsInline`、封面与 `preload="none"`。无界宇宙继续引用原有视频 `/content/projects/boundless-universe/promo-video.mp4`，该路径已列入发布清单，原视频文件不因发布路径补齐而改变。

### 模态阅读与关闭

通过原生 `dialog.showModal()` 打开，并以项目标题命名；关闭按钮有中文标签和内联 SVG。支持 Esc、关闭按钮及点中模态外缘关闭。详情内焦点轮廓为（2px 实线），偏移（3px），项目书签的轮廓偏移另为（-5px）。关闭按钮桌面为（44px × 44px），不超过 700px 时为（38px × 38px），带半透明圆形纸底；此处只记录实现。

项目详情打开动画为（240ms，`cubic-bezier(0.16, 1, 0.3, 1)`），由下方（10px）移入。`prefers-reduced-motion: reduce` 分支取消这一动画及项目书签、章节链接的过渡。三维翻纸和纸面风动仍有逐帧动画，本记录不将该 CSS 分支表述为三维全场景的减少动态支持。

### 项目入口

入口保持真实内容：小程序码链接打开原图，网站链接使用真实网址；文字链接保留下划线与（44px）最小高度。网站入口内边距见 `site-entry`，背景使用水彩按钮素材。入口形态由 `details.entry` 决定。

### 三维纸背与素材

纸背从上至下为项目短标题与蜂蜜笔触、简短介绍、水彩插画、两列两行功能提示和“查看项目”。泡芙大作战使用专用插画，其余项目从自己的封面裁切；功能图标由 `NOTEBOOK_FEATURE_ICONS` 映射到八个项目。图标索引 0–3 使用 `NOTEBOOK_FEATURE_SPRITES` 提供的四张独立图像，其余索引继续从四列三行图集中裁切。四张首项目图标由同一生成图集无损拆出。纸背入口在选中且非切换阶段打开对应项目详情。

| 素材 | 实际用途 |
| 素材 | 对象存储 PNG 地址 | 实际用途 |
| --- | --- | --- |
| `paper.png` | `https://media.secknow-ai.com/space/textures/gallery/notebook/paper.png` | 纸背纹理、详情纸边与项目书签纸纹。 |
| `puffwar-illustration.png` | `https://media.secknow-ai.com/space/textures/gallery/notebook/puffwar-illustration.png` | 泡芙大作战纸背的手环与手机插画。 |
| `feature-icons.png` | `https://media.secknow-ai.com/space/textures/gallery/notebook/feature-icons.png` | 四列三行的水彩功能图集。 |
| `button.png` | `https://media.secknow-ai.com/space/textures/gallery/notebook/button.png` | 纸背入口、详情当前章节与网站入口。 |
| `tent.png`、`gift.png`、`journal.png`、`joystick.png` | `https://media.secknow-ai.com/space/textures/gallery/notebook/tent.png`、`https://media.secknow-ai.com/space/textures/gallery/notebook/gift.png`、`https://media.secknow-ai.com/space/textures/gallery/notebook/journal.png`、`https://media.secknow-ai.com/space/textures/gallery/notebook/joystick.png` | 图集第一行拆分出的四张独立功能图标。 |
| `puffwar-cover.png` | `https://media.secknow-ai.com/space/textures/gallery/notebook/puffwar-cover.png` | 泡芙大作战项目详情封面及纸卡彩色面。 |
| `puffwar-photo.png` | `https://media.secknow-ai.com/space/textures/gallery/notebook/puffwar-photo.png` | 泡芙大作战项目详情首张现场照片。 |
| --- | --- |

纸背与详情共使用十个对象存储 PNG：四个基础素材、四张功能图标，以及泡芙项目封面和现场照片。`NOTEBOOK_ASSETS`、`NOTEBOOK_FEATURE_SPRITES` 直接提供远端地址；泡芙封面与首张现场照片在 `src/data/content.json` 中直接使用对应 PNG 地址。九张场景纹理由 `GALLERY_TEXTURES_BASE` 预载，封面与照片由项目详情加载。`scripts/publish-assets.mjs` 不再将这批云端图片复制到本地发布目录。原始生成 PNG 与提示词归档于被忽略的 `assets/gallery/notebook/`。


`.impeccable/design.json` 采用 schemaVersion 2，只补充这里已有的元数据、阴影、动态、断点与真实组件片段；颜色等原始 token 归 frontmatter。源码没有色阶表，因此 sidecar 不合成额外色阶。

## Do's and Don'ts

### Do:

- **Do** 将这套淡彩手记规则限定于画廊项目纸背与项目详情。
- **Do** 保留八项目的真实文字、照片、视频及小程序或网站入口。
- **Do** 让宽屏封面与阅读列并排，窄面板改为顶部封面小图与标题，下方正文占满宽度。
- **Do** 保留可滚动正文、可见键盘焦点和项目详情已有的减少动态分支。
- **Do** 使用现有水彩素材，并让三维纸背内容跟随纸面弯曲。

### Don't:

- **Don't** 将这套画廊版式记为入口或其他房间已经采用的整站规范。
- **Don't** 用禁用内容滚动或移除焦点轮廓实现隐藏滚动条。
- **Don't** 把仍在校准的纸背截图采样色固化成色板。
- **Don't** 用水彩插画替代项目真实媒体或真实访问入口。
