# 无界宇宙 Infinite Cosmos：项目资料

这批资料是「无界宇宙」小程序的原始素材、来源入口与确认版项目介绍。已接入画廊第二张卡片，页面内容在 `src/data/content.json` 的 `projects[id=boundless-universe]` 中编辑；发布素材位于 `public/content/projects/boundless-universe/`。

## 文字资料

- [确认版项目介绍](copy-draft.md)：面向个人网站的生活化文案，包括玩法、负责内容、几个小细节与项目感想，可直接编辑。
- [资料来源与核对记录](sources.md)：原始素材、设计稿、项目记录与本地源码的核对范围。

## 文件

| 文件 | 内容 | 规格 |
| --- | --- | --- |
| `originals/01-miniprogram-code.jpg` | 用户提供的微信小程序码 | 430 × 430，原文件完整保留 |
| `originals/02-promo-video.mp4` | 用户提供的竖屏宣传/开场视频 | 288 × 640，5.08 秒，H.264，无音轨，原文件完整保留 |

## 参考链接

- [Figma：元界·小程序（node-id=1-150）](https://www.figma.com/design/l0pPGdqEcY8gVEbB4vgwXW/%E5%85%83%E7%95%8C%C2%B7%E5%B0%8F%E7%A8%8B%E5%BA%8F?node-id=1-150)：设计稿入口，已在浏览器中打开确认可访问；未导出 `.fig` 文件。
- [微信视频号：实际游玩视频](https://weixin.qq.com/sph/AHdBL0F00C)：用户提供的实际游玩记录入口；当前仅保存链接，未下载或转存视频内容。

## 页面使用

- 画廊卡片和顶部「阅读项目介绍」可打开完整介绍，在阅读面板中可切换项目。
- 小程序码与 MP4 均使用原始字节的发布副本；`derived/promo-poster.jpg` 是开场视频三秒处的 288 × 640 静帧。
- 卡片封面为内嵌该静帧的手绘 SVG，分为灰度和彩色两版；无须额外请求图片。
- 开场视频保留原始比例与原生播放控件，由访客点击播放。实际游玩的视频号另提供外部入口。
- 原始文件继续保留在本目录，页面正文以 JSON 为准；`copy-draft.md` 留存用户确认的文案。

## 发布副本

`public/content/projects/boundless-universe/` 包含 `cover-sketch.svg`、`cover-color.svg`、`miniprogram-code.jpg`、`promo-poster.jpg`、`promo-video.mp4`。

详细来源与校验信息见 [sources.md](sources.md) 和 [asset-manifest.json](asset-manifest.json)。
