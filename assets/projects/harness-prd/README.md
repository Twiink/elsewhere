# HarnessPRD 智能需求文档平台项目资料

本目录保存用户提供的两张展示素材、已确认的生活化介绍和来源记录。项目展示名称使用「HarnessPRD 智能需求文档平台」，当前界面与海报中的产品名为 ReqFlow。

## 文稿与入口

- [确认版项目介绍](copy-draft.md)：项目用途、我做了什么、三个使用细节、工具、感想与 GitHub 入口，已同步到 `src/data/content.json` 的 `harness-prd`。
- 源码仓库：<https://github.com/Twiink/HarnessPRD>，已核对本地仓库 origin 与求职资料。
- 用户要求 HarnessPRD 与 RAG-Center 均带 GitHub 入口；RAG-Center 页面已提供 <https://github.com/Twiink/RAG-Center>。

## 图片素材

| 文件 | 内容 |
| --- | --- |
| `originals/01-project-poster.png` | ReqFlow 竖版海报，介绍需求录入、AI 澄清、PRD、接口文档与开发提示词 |
| `originals/02-homepage-showcase.png` | ReqFlow 首页展示图，包含三种方案起点、需求确认、版本记录与交付包导出 |

原图按附件原字节保存，未裁剪或转码，规格与校验值见 [asset-manifest.json](asset-manifest.json)。功能说明以当前代码与文档为依据，不从展示图推断使用规模或上线状态。

## 网页发布副本

发布用图片位于 `public/content/projects/harness-prd/`：

- `cover-color.webp`、`cover-sketch.webp`：海报按原比例缩放至 800×1200，排入 1200×1600 纸卡，左侧留白 200、顶部留白 330；黑白版为灰度副本。
- `homepage.webp`：首页展示图的 WebP 副本，保持 1536×1024 原始尺寸与比例。
- `poster.webp`：竖版项目海报的 WebP 副本，保持 1024×1536 原始尺寸与比例。

本次已接入本地画廊，尚未部署或提交 Git。来源与核对范围见 [sources.md](sources.md)。
