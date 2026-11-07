# SecKnow AI 教育平台：项目素材

这批资料已接入 Twiink's Space 画廊第三张卡片「SecKnow AI 教育平台」。原图保存在 `originals/`，来源和校验信息见 [sources.md](sources.md) 与 [asset-manifest.json](asset-manifest.json)。

## 图片素材

| 文件 | 内容 | 原始尺寸 |
| --- | --- | --- |
| `originals/01-homepage.png` | SecKnow 网站首页首屏截图 | 1855 × 1025 |
| `originals/02-knowledge-planets.png` | 「探索知识星球」区块截图 | 1828 × 964 |
| `originals/03-venue-exterior.jpg` | 带 SecKnow 标识的户外实景照片 | 1920 × 1080 |

三张附件均保留原文件字节，后续可直接从本目录选用。

## 项目文稿

[确认版项目介绍](copy-draft.md)沿用绘本与知识星球展示图的主题，包括使用场景、参与内容、几个细节和感想。页面正文已写入 `src/data/content.json` 的 `projects[id=secknow]`，后续编辑页面以 JSON 为准，本文稿留作归档。

## 项目展示海报

| 文件 | 内容与用途 | 尺寸 |
| --- | --- | --- |
| [竖版海报](generated/showcase-portrait-v5.png) | “让好奇心带你去探索”：绘本与四颗学习星球，适合作品画廊封面 | 1024 × 1536 |
| [横版海报](generated/showcase-landscape-v5.png) | 标题与知识星球的横向绘本构图，适合项目介绍大图 | 1672 × 941 |

两张海报延续 SecKnow 素材的奶油色、水彩行星与童趣手绘风格。绘本托起四颗学习星球，分别呈现 AI 教材生成、互动实验、智能答疑与趣味测验。功能依据来自项目源码与求职资料。完整提示词与参考素材关系见 [生成记录](generation-prompts-v5.md)。

## 网站入口

[SecKnow 官网](https://www.secknow-ai.com/)

## 当前状态

2026-11-06 用户确认文稿后，已接入本地画廊与项目切换面板。竖版海报按原比例排入纸卡封面，提供灰度与彩色两版；阅读面板展示横版海报、两张页面截图及户外照片，并提供官网链接。

## 页面使用的文件

发布副本位于 `public/content/projects/secknow/`：

- `cover-sketch.webp`、`cover-color.webp`：1200 × 1600 纸卡封面，海报放在标题下方，保留完整比例。
- `showcase.webp`：横版水彩绘本海报。
- `homepage.webp`、`knowledge-planets.webp`：用户提供的两张页面截图。
- `venue-exterior.webp`：用户提供的户外实景。

发布副本使用 WebP，原始图片和海报继续保留。图片转码与封面排版记录在 `asset-manifest.json`；检查结果见项目 `output/verification/secknow-gallery/`。本次为本地接入，未提交 Git、未部署。
