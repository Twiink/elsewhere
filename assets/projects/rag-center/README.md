# RAG 中台 RAG-Center 项目资料

本目录保存用户提供的两张展示素材、已确认的项目介绍和来源记录。

## 项目文稿

[确认版项目介绍](copy-draft.md)包含项目用途、参与内容、几个使用细节、工具与感想，已接入 `src/data/content.json` 中 `id: "rag-center"` 的第四个画廊项目。页面正文以 JSON 为准，文稿保留供编辑对照。

## 图片素材

| 文件 | 内容 |
| --- | --- |
| `originals/01-project-poster.png` | RAG-Center 项目海报，主文案为“让知识，成为可靠的答案。” |
| `originals/02-workbench-prototype.png` | 知识工作空间的工作台原型示意，图中注明“原型演示 · 示例数据” |

附件按原字节归档；规格和校验信息见 [asset-manifest.json](asset-manifest.json)。工作台图用作视觉与功能参考，图中数量和示例资料不作为运营数据。

## 网页发布副本

发布用图片位于 `public/content/projects/rag-center/`：

- `cover-color.webp`、`cover-sketch.webp`：海报按原比例缩放至 900×1200，排入 1200×1600 纸卡，左侧留白 150、顶部留白 330，供画廊显示标题；黑白版为同一封面的灰度副本。
- `workbench.webp`：工作台原型的 WebP 副本，保留原尺寸、画面和示例数据说明。
- `poster.webp`：竖版项目海报的 WebP 副本，保留原尺寸与比例。

阅读面板先展示工作台原型，再展示海报；文案按五个章节展示，工具默认折叠，末尾提供源码仓库入口。封面使用 WebP quality 94，阅读图片使用 quality 96；原始附件保持原字节。

功能和职责依据见 [sources.md](sources.md)。本次接入本地画廊，尚未部署或提交 Git。
