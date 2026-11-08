# 无界宇宙：资料来源与归档记录

## 名称与范围

- 项目对外名称沿用用户表述「无界宇宙」，小程序码上的英文名为 `Infinite Cosmos`。
- 目录标识沿用既有代码仓库名 `BoundlessUniverse`，统一写作 `boundless-universe`。
- Figma 文件名显示为「元界·小程序」，链接指向 `node-id=1-150`；本次只保存设计稿入口，未导出整份设计文件。
- 用户提供的 JPEG 是小程序码图片，用户提供的 MP4 是宣传/开场视频素材，二者均按原字节保存。

## 参考入口

| 类型 | 地址 | 当前处理 |
| --- | --- | --- |
| Figma 设计稿 | `https://www.figma.com/design/l0pPGdqEcY8gVEbB4vgwXW/%E5%85%83%E7%95%8C%C2%B7%E5%B0%8F%E7%A8%8B%E5%BA%8F?node-id=1-150` | 已在浏览器打开，确认文件名为「元界·小程序」、可定位到 node `1-150`；未导出设计文件 |
| 微信视频号 | `https://weixin.qq.com/sph/AHdBL0F00C` | 用户提供的实际游玩视频入口；仅保存链接，未登录、未播放、未下载 |

## 文件说明

- `originals/01-miniprogram-code.jpg`：430 × 430 JPEG，79,476 字节。图片内容为「无界宇宙 Infinite Cosmos」小程序码，未裁剪、缩放或改写像素。
- `originals/02-promo-video.mp4`：288 × 640 竖屏 MP4，5.08 秒，H.264 视频轨、无音轨，264,059 字节。首帧为「无界宇宙 Infinite Cosmos / 戴上手腕，探索无界宇宙 / GAMING ON」品牌开场。

## 当前状态

- 原始素材已归档到 `assets/projects/boundless-universe/originals/`，SHA-256 与字节数记录在 `asset-manifest.json`。
- 确认版文案已写入 `src/data/content.json`，选用素材已复制到 `public/content/projects/boundless-universe/`。
- 未扫码验证小程序码，未播放视频号内容，未核对 Figma 各页面与最终上线版本的一致性。

## 2026-11-06 项目文稿整理

- 用户在当前聊天中引用了 Codex 聊天 `01a1abcd-53ad-7801-95ed-b45afed9a200`，要求重点查看其中自己发送的素材，并按「泡芙大作战」的语气整理文字介绍。本轮已使用 `read_thread` 读取该聊天，确认用户提供的是小程序码、开场 MP4、Figma 链接和实际游玩的视频号链接。
- 小程序码可见名称「无界宇宙 Infinite Cosmos」。已查看此前从本地 MP4 提取的开头与后段画面，内容为品牌名称、太空图形及「戴上手环，探索无界宇宙 / GAMING ON」开场；不将其写成现场游玩实录。
- 本轮已在浏览器查看 Figma 文件「元界·小程序」：可见勋章陈列室、勋章已获得与未获得的详情、我的装备，以及全稿中的训练中心、账号设置和大屏遥控区域。设计稿是功能与视觉参考，不据此认定所有设计页面均已上线。
- 视频号链接本轮被浏览器站点安全策略拦截，未能观看，也未下载。文稿中的具体玩法依据下列项目记录和源码，不依据未观看的视频补写现场细节。

### 文字与职责依据

- `/home/xyz/obsidianlibrary/求职/归档/素材旧版/260728-优化前/实习经历-无界宇宙.md`：科技馆小程序、前端职责、角色装扮、任务与积分、勋章、海报分享和 2025 年 1 月投入使用的记录。
- 本聊天中用户此前确认的个人经历：2025.01 参与工作室与杭州公司的合作，为科技馆开发「无界宇宙」，是自己参与的第一个正式投入使用的小程序。
- 文稿将职责写为「主要负责前端页面和交互，也参与手机操控大屏部分」，不写为独立设计或独自完成整个项目。

### 静态源码核对

| 内容 | 本地源码位置（相对 `/home/xyz/Projects/BoundlessUniverse/`） | 文稿表述范围 |
| --- | --- | --- |
| 登录和手环 | `BoundlessUniverseFrontend/pages/login/login.vue`、`pages/bingingBracelet/bingingBracelet.vue`、`pages/bindingedBracelet/bindingedBracelet.vue` | 设置昵称、绑定和切换手环 |
| 装备与勋章 | `BoundlessUniverseFrontend/pages/myEquipment/myEquipment.vue`、`pages/medalGallery/medalGallery.vue` | 更换装备、查看角色、勋章收集与佩戴 |
| 章节任务 | `BoundlessUniverseFrontend/pages/trainingCenter/trainingCenter.vue`、`pages/taskDetails/taskDetails.vue` | 查看章节任务、完成进度，区分已获得与未获得的装备和勋章 |
| 积分与奖品 | `BoundlessUniverseFrontend/components/creditsEcchange/integralInfo.vue`、`pages/integralRecord/integralRecord.vue` | 账号积分、积分记录、奖品及兑换信息展示；不扩写为完整线上商城、支付或核销流程 |
| 角色海报 | `BoundlessUniverseFrontend/components/index/spaceman.vue` / `generatePoster`、`shareToWechat` | 生成角色海报、展示图片与微信分享入口 |
| 手机大屏互动 | `BoundlessUniverseFrontend/pages/toMap/toMap.vue`；另参照求职资料 `02-项目资料/02-PuffBattle-大屏互动.md` 的代码核查记录 | 扫码、摇杆、文字与表情、连接状态和重连；不写未测量的时延或无故障承诺 |

文稿保留自己的角色、装备、勋章和游玩记录这些特点。不将「泡芙大作战」的商城交易、阵营排名等功能移入本项目；不加入尚未复核的用户量、场馆具体名称或运营数字。

### 文稿整理时的交付状态

- 新增 `copy-draft.md` 并更新本目录说明，供用户先审阅和修改。
- 仅整理文稿；原始图片、视频、页面数据和运行代码未改动。未提交 Git，未部署。


## 2026-11-06 确认文稿接入画廊

- 用户确认生活化文稿后，原文按段落写入 `projects[id=boundless-universe].details.sections`，替换第二张示例项目卡片。
- 小程序码 JPEG 与开场 MP4 直接复制原件；未裁剪、压缩或修改原件。发布副本的 SHA-256 记录在 `asset-manifest.json`。
- 视频封面提取自原始开场视频约三秒处，保留 288 × 640 尺寸；SVG 卡片封面内嵌该画面，并加入与现有纸卡一致的边框及太空、勋章、手柄图案。
- 阅读面板展示的是五秒品牌开场动画，提供原生播放控件；实际游玩的视频号链接另列为外部入口。
- 项目名称、图片替代文字、小程序码原图链接与目录按当前项目显示；可在阅读面板内切换两个个人项目。
- 本次为本地页面接入，未提交 Git，未部署。

### 接入验证结果

- 内容检查 21/21 通过；生产构建通过；设计检测无发现；`git diff --check` 通过。
- 桌面 1440 × 900 与手机视口 390 × 844 检查通过，正文和小程序码无横向溢出。
- 原生视频播放、保持比例、项目切换、关闭按钮、Esc 与返回焦点均已检查；关闭或切换后原视频暂停。
- 两个项目的小程序码名称正确；泡芙项目三张现场照片保留；浏览器控制台无错误。
- 原始图片、视频和全部发布素材校验和核对通过。项目记忆更新已受理，等待异步抽取。
