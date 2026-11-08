# Twiink's Space

这是基于 Tomasz “ITom” Szmajda 作品集改造的 Twiink 个人空间，使用 React 19、Three.js、React Three Fiber、GSAP 和 Vite。用户从入口进入无限走廊，探索作品画廊、生活手记、关于我和联系我四个房间；`/start` 是独立的静态链接页。

已接入第一批个人资料：网站名为 **Twiink's Space**，介绍为“做点有趣的东西，放一些舍不得关掉的脑洞。”入口窗边、走廊和云上人物使用根据用户照片制作的黑白线稿，发布用纹理位于 `public/textures/twiink/`。照片参考仅在本地忽略目录中保存。

「关于我」已接入个人简介、技术栈、六段经历、兴趣和项目成果，统一编辑 `src/data/profile.json`。房间里的纸片、经历岛屿、技能气球和完整阅读面板共用这些资料。画廊已接入「泡芙大作战 PuffWar 乐园」「无界宇宙 Infinite Cosmos」「SecKnow AI 教育平台」「RAG 中台 RAG-Center」和「HarnessPRD 智能需求文档平台」五个个人项目，包含完整介绍、图片或开场视频，以及小程序码、官网或 GitHub 源码入口。「联系我」已接入邮箱、GitHub、微信和站内留言入口，纸页中的「随便聊聊」展示六条已确认的常见问题；生活手记收录四篇生活存档与一篇人物形象制作记录。示例内容中的 `authorName` 保留原作者归属。站点域名按用户提供的 `http://space.twiink.cn` 配置，站点与联系人信息在 `content.json` 的 `site` 中编辑。

## 本地运行

安装符合 Vite 7 要求的 Node.js：20.19+ 或 22.12+。

```bash
npm install
npm run dev
```

开发地址以终端输出为准，默认是 `http://localhost:5173`。浏览器需支持 WebGL；启用硬件加速有助于流畅显示。

```bash
# 生产构建
npm run build

# 预览构建结果
npm run preview

# 代码检查
npm run lint

# 个人资料、本地内容、表单与静态起始页检查
npm run check:content
```

## 内容维护

网站直接读取仓库内的 JSON 与图片，不需要内容管理后台、后台账号、SQLite 或其他数据库。修改内容后，开发服务会更新页面；发布环境需重新构建部署。

| 文件或目录 | 用途 |
| --- | --- |
| `src/data/profile.json` | 关于我的可编辑资料：身份、简介、技能、工具、经历、爱好和成果 |
| `src/data/profile.js` | 将个人资料整理为页面与搜索正文共用的数据 |
| `src/data/content.json` | 站点设置、画廊、生活手记、FAQ，以及保留供对照的示例奖项 |
| `src/data/content.original.json` | 已发布内容的原始返回备份，保留原文和资产引用供对照，不参与运行或构建 |
| `src/data/content.js` | 将本地内容整理为页面、奖项分组与预加载数据 |
| `src/hooks/useContentData.js` | 各房间读取本地内容的入口 |
| `public/content/` | 本地保存的内容图片，JSON 中以 `/content/文件名.webp` 引用 |
| `public/textures/` | 原有场景、门牌、纸张及装饰纹理 |
| `public/start/` | 独立静态起始页的 HTML、CSS、脚本 |

原始 40 条记录保存在 `content.original.json` 供对照；当前 `content.json` 的内容如下：

| 字段 | 内容 | 数量 |
| --- | --- | --- |
| `site` | 站点标题、一句话介绍、域名及社交链接 | 1 |
| `projects` | 画廊项目：5 个个人项目 | 5 |
| `studio` | 四篇生活存档与一篇人物形象制作记录 | 5 |
| `awards` | 原作者示例证书，保留供对照，不作为当前个人成果展示 | 16 |
| `faq` | 六条个人问答，展示在联系纸页并同步至搜索正文 | 6 |

画廊项目的 `title`、`description`、`url`、`front`、`painted`、`techStack` 控制卡片文字、链接、正反面相关纹理及技术图标。生活手记的 `platform`、`device`、`frontTexture` 和 `paintedFrontTexture` 控制分类标签、设备外形与屏幕纹理；`platform` 使用 `life` 或 `making`，`device` 使用 `monitor`、`tv` 或 `phone`。证书的 `category` 使用 `sotd`、`sotm` 或 `other`。

`seoTitle` 和 `seoDescription` 用于搜索正文与结构化数据。`seo-plugin.js` 在开发和构建时读取本地 JSON，并生成中文静态正文、JSON-LD 和 `/llms.txt`；首页标题、一句话介绍与规范域名来自 `site`，个人介绍和成果来自 `profile.json`。

### 编辑项目介绍

画廊的五张卡片依次是「泡芙大作战 PuffWar 乐园」「无界宇宙 Infinite Cosmos」「SecKnow AI 教育平台」「RAG 中台 RAG-Center」和「HarnessPRD 智能需求文档平台」。点击翻转，再点「查看项目」即可阅读完整介绍；也可以使用画廊顶部的「阅读项目介绍」，在面板内切换项目。介绍中提供项目图片或开场视频、小程序码、官网或 GitHub 源码链接，工具说明默认收起。视频由访客点击播放，切换项目或关闭介绍时停止播放。

页面直接读取 `src/data/content.json` 的 `projects`，五个个人项目的 `id` 分别为 `puffwar`、`boundless-universe`、`secknow`、`rag-center` 和 `harness-prd`。保存 JSON 后开发预览会更新；线上环境需要重新构建部署。

| 字段 | 用途 |
| --- | --- |
| `title`、`shortTitle`、`cardTitle` | 完整名称、简称和卡片上的分行标题，换行写成 `\n` |
| `description`、`cardNotes`、`cardNotesTitle` | 纸卡背面的短介绍、游玩提示和提示栏标题 |
| `details.tagline` | 阅读面板的一句话介绍 |
| `details.sections` | 正文各节：`paragraphs` 一项一段，`entries` 填标题 `title` 和说明 `description`；保留 `id` 以供目录定位，`collapsible: true` 表示默认折叠 |
| `details.photos` | 项目图片：`src` 是图片路径，`alt` 是画面描述，`caption` 是图片下的文字，`width`、`height` 填原尺寸 |
| `details.photosLabel`、`details.photosTitle` | 图片目录的名称和图片区标题，未设置时沿用现场照片的称呼 |
| `details.videos` | 视频：`src`、`poster` 是视频和封面路径，`title`、`caption` 描述内容，`mimeType` 填视频格式，`width`、`height` 填原尺寸，`hasAudio: false` 表示无声 |
| `details.references` | 视频下的补充入口：`title` 填链接文字，`url` 填地址 |
| `details.entry` | 项目入口：`title`、`description` 和可选 `hint` 填说明；小程序填 `image`、`width`、`height`，网站填 `url` 与链接文字 `label` |
| `seoTitle`、`seoDescription` | 搜索摘要；详细正文也会同步输出到搜索 HTML 和 `/llms.txt` |

发布用素材分别在 `public/content/projects/puffwar/`、`public/content/projects/boundless-universe/`、`public/content/projects/secknow/`、`public/content/projects/rag-center/` 和 `public/content/projects/harness-prd/`；附件原件、确认版文稿与来源记录保存在 `assets/projects/` 下的对应目录。页面正文以 JSON 为准，`copy-draft.md` 是确认文稿的归档。SecKnow 的竖版海报用于纸卡封面，横版海报、两张页面截图和户外照片用于阅读面板。RAG-Center 与 HarnessPRD 的竖版海报用于纸卡封面，阅读面板展示界面展示图与海报，并在底部提供 GitHub 仓库入口；发布副本转换为 WebP，原件保留。

### 编辑联系方式

联系房间的木桶、顶部「联系方式」纸页、无障碍导航和搜索正文共用 `src/data/content.json` 中的站点资料：

| 字段 | 内容 |
| --- | --- |
| `site.url` | 网站地址，同时用于规范链接、分享图片绝对地址和留言域名检查 |
| `site.githubUrl` | GitHub 个人主页 |
| `site.contact.title`、`description`、`topics` | 联系纸页的标题、欢迎语与交流方向 |
| `site.contact.email`、`wechatId` | 对外邮箱与微信号；微信提供复制按钮，浏览器限制复制时选中号码供手动复制 |
| `site.contact.showMessageForm` | 是否保留海面上的站内留言入口 |

直接邮件使用 `mailto:` 打开访客的邮件应用。站内留言沿用 Web3Forms：为 `site.contact.email` 对应的收件邮箱申请 Access Key，复制 `.env.example` 为本地 `.env`，填写 `VITE_WEB3FORMS_KEY`；部署环境设置同名变量并重新构建。未配置时页面会明确提示站内留言尚未开通，邮箱和微信仍可使用。

本地预览不会发送真实留言，也不会显示发送成功；发布后仅在 `site.url` 对应的域名允许提交，只有服务确认接收才显示成功。验证在本地进行，不发送测试邮件。

### 编辑常见问题

六条问答集中在 `src/data/content.json` 的 `faq` 中：`id` 保持唯一，`question` 填问题，`answer` 填回答，段落之间用 `\n\n` 分隔。联系纸页的「随便聊聊」、静态正文、FAQ 结构化数据与 `/llms.txt` 共同读取这份内容。回答使用普通文字，新增、删除或调整顺序后，开发预览会同步更新；线上环境需要重新构建部署。

### 编辑关于我

1. 打开 `src/data/profile.json`，直接修改双引号内的文字并保存。
2. 运行 `npm run dev`，进入 `/about`，点击顶部「阅读关于我」查看完整内容。房间里的「查看」「完整经历」「会做的事」「荣誉与证书」按钮也会定位到对应段落。
3. 开发预览会在保存后更新。运行 `npm run check:content` 检查 JSON 和数据格式；线上网站需要重新运行 `npm run build`，再部署生成的 `dist/`。

| 字段 | 编辑内容及页面位置 |
| --- | --- |
| `role`、`currentFocus` | 身份与正在做的事情；`role` 也显示在云上人物下方 |
| `sitePurpose` | 这个空间的用途 |
| `greeting`、`introduction` | 问候与自我介绍，每个数组元素单独显示为一段；同时更新个人搜索介绍 |
| `keywords` | 个人关键词，同时显示在云上人物下方 |
| `titles` | 阅读面板与房间各区域的标题 |
| `skills` | 能力分组：`title` 为方向，`description` 为阅读面板里的自然语言说明；`technologies` 为气球与搜索使用的技术名称，画画等方向可填 `[]` |
| `tools`、`strengths` | 工具用于生成日常协作说明；`strengths` 为额外的能力介绍，可留空 |
| `timeline` | 重要经历，按数组顺序展示；`date` 使用 `YYYY-MM`，例如 `2023-09` |
| `interests` | 兴趣名称和说明 |
| `highlights`、`closing` | 「值得记一笔」的生活与项目记录及结尾文字；日期可省略，`sceneTitle` 可填写用于三维纸片的短标题 |
| `honors` | 荣誉与证书：`title` 为名称，`description` 写赛区、等级或证书说明；日期可后补，填 `[]` 时隐藏这一段 |

新增经历时，复制一个完整对象，改成唯一的 `id`，再修改日期、标题和说明。`kind` 用 `education`、`studio`、`project` 或 `internship`；经历岛屿显示第一条 `education` 的学校与日期，以及第一条 `project` 的日期。学校名称填写在 `organization` 中。不需要的经历、技能组、爱好或成果，可以删除整个对象；暂不展示某一类内容时，保留字段并把列表写成 `[]`。

当前荣誉与证书先展示蓝桥杯天津赛区省级三等奖、软件创新大赛华北赛区省级三等奖、校级三等奖学金和 CET-4。年份未填写，证书图片可后续提供；生活照、古风照和自己的绘画作品也可以之后再补充。

JSON 使用英文双引号和英文逗号，不支持注释或最后一项后的逗号。文字中的英文双引号需写成 `\"`，也可以直接使用中文引号。站点名称、一句话介绍、域名和社交链接继续在 `content.json` 的 `site` 中编辑。

替换图片时，将文件放入 `public/content/`，再修改 JSON 中的路径。保留现有图片的宽高比可减少场景布局调整。此次本地图片沿用原页面请求的显示尺寸与质量参数，未修改图内文字和图案；原始返回中的资源标识保存在备份 JSON 中。

入口文字、导航、教程、成就、联系表单、各房间固定标题以及源码说明注释均已中文化；ITom、作者姓名、技术和平台名称保留原名。固定交互文案仍位于对应的 `src/components/` 与 `src/context/` 组件中，`/start` 的文案位于其 HTML 中。原图和图中嵌入的文字留待后续替换。

## 字体

中文 DOM 与三维文字使用本地 `public/fonts/LXGWWenKaiLite-Regular.ttf`（霞鹜文楷轻便版），保证汉字显示；ITOM 品牌字母保留原有拉丁字体。字体许可证保存在 `public/fonts/LXGWWenKaiLite-OFL.txt`。新增中文文字时应继续使用这份中文字体。

## 外部服务

内容展示与 SEO 构建均已改为本地读取，原内容服务的客户端依赖、管理后台、请求代理和读取 Hook 已移除。

项目仍保留原有可选的邮件提交和访问统计集成：

- `VITE_WEB3FORMS_KEY`：绑定收件邮箱的 Web3Forms 配置，放在本地 `.env` 或部署平台环境变量中。允许提交的域名来自 `site.url`；未配置、预览域名或发送被拦截时均明确提示，只有服务确认接收才显示成功。
- `VITE_POSTHOG_KEY`、`VITE_POSTHOG_HOST`：PostHog 访问统计配置。
- 生活手记收录四篇生活存档与一篇人物形象制作记录。编辑 `src/data/content.json` 的 `studio` 数组即可修改标题、`paragraphs` 正文和 `photos` 图片；每张图的 `alt` 是图片说明，人物制作过程另有 `label` 和 `caption`。没有提供日期的记录不填写 `date`。点击场景中的屏幕或「翻翻生活手记」可在站内阅读，也可使用 `/studio?note=记录的id` 直接打开对应记录。
- 生活照片的原图与素材清单保存在 `assets/studio/life-notes/`，页面图片位于 `public/content/studio/`，人物黑白线稿沿用 `public/textures/twiink/start-bouquet.png`。联系房间已使用 Twiink 的联系方式；`/start` 提供站内导航、GitHub 入口与 Twiink 人物插画。

Matrix 工作室的 CSDN 与微信视频号在 `src/data/content.json` 的 `site.studioChannels` 中编辑，集中展示在联系方式中。视频号支持复制；浏览器不允许自动复制时，会选中账号，方便手动复制。

生活手记的门牌、地图和页面标题统一显示「生活手记」。门贴图位于 `public/textures/corridor/doors/life-notes-ink-v1.webp` 与 `life-notes-color-v1.webp`，图案为相机、山间日出和手柄；生成提示词与处理说明保存在 `assets/studio/door-textures.json`。阅读面板展示个人记录，房间背景使用日出、合照、存档等手写词。

简历 PDF 保存在 `public/files/twiink-resume.pdf`，入口位于「关于我」「联系我」与独立链接页 `/start`。「联系我」同时支持新窗口查看和下载。后续直接替换这一个 PDF 即可更新简历；说明、路径和下载文件名在 `site.resume` 中编辑。若更改文件路径或下载文件名，也要同步 `/start/index.html` 中的静态下载链接。

走廊的两幅竖版照片位于 `public/content/corridor/`：右侧 `frame-3` 展示花束与牵手照，左侧 `frame-4` 展示红灯笼前的古风合照。原图与处理记录保存在 `assets/corridor/`。图片按原始比例展示，桌面端点击查看时会自动适配视口高度；路径和画框尺寸在 `src/components/canvas/corridor/CorridorDecorations.jsx` 的 `frames` 中编辑，新增图片时同步 `src/config/texturePreloadList.js`。

网站图标使用浅绿纸飞机与金色星星，保留奶油色纸底和完整构图。主站与 `/start` 的浏览器图标分别使用 `public/textures/twiink/site-icon-airplane-v1-32.png`、`site-icon-airplane-v1-64.png`，手机主屏幕图标使用同目录的 `site-icon-airplane-v1-180.png`；走廊 `frame-1` 与纹理预加载使用 `site-icon-airplane-v1-512.png`。更换时同步两处 HTML、走廊画框与预加载清单。

入口双门的技术贴纸与 `profile.json` 一致：左门展示 TypeScript、Vue、React、Python、Django、FastAPI，右门展示 Java、Spring Boot、Docker、RAG、LangChain、LangGraph。贴图位于 `public/textures/doors/twiink-entry-{left,right}-{ink,color}-v1.webp`，各有黑白和彩色版本；生成提示词、技术清单与文件校验信息保存在 `assets/entrance/door-textures.json`。后续修改门上的技术名称时需重新制作贴图，并同步 `EntranceDoors.jsx` 与 `texturePreloadList.js` 中的路径。

分享封面使用 `public/content/social/twiink-share-cover-v1.jpg`，为已确认的淡彩古风横版图片，尺寸 1200×630。主站的 Open Graph 与 Twitter 分享信息由 `site.shareImage` 和 `seo-plugin.js` 输出；独立链接页 `/start` 的同类标签位于 `public/start/index.html`。更换图片路径、尺寸或说明时，同步这两处配置。

这些配置不影响本地 JSON 的读取，也不提供内容管理功能。凭据和私人配置不要写入 Git。

## 场景结构

`App.jsx` 组合三维画布、全局状态和 DOM 界面。`Experience.jsx` 挂载入口与无限走廊；`DoorSection.jsx` 负责房间加载、开关门和相机过渡。`RoomWarmup.jsx` 预编译房间着色器，`PerformanceContext.jsx` 按设备能力调整画质。动画中的高频位置更新尽量通过 ref 和 `useFrame` 完成。

## 许可与署名

代码采用 [MIT 许可证](LICENSE)。原作者为 [Tomasz Szmajda（ITom Dev）](https://itomdev.com)。原项目中的个人素材、3D 纹理、图片和文案版权属于原作者；未经明确许可，不得擅自复用或复制。中文化和本地内容改造不改变原素材的权利归属。
