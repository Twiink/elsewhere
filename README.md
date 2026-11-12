# Twiink's Space

这是基于 Tomasz “ITom” Szmajda 作品集改造的 Twiink 个人空间，使用 React 19、Three.js、React Three Fiber、GSAP 和 Vite。用户从入口进入无限走廊，探索作品画廊、生活手记、关于我和联系我四个房间；`/start` 是独立的静态链接页。

已接入第一批个人资料：网站名为 **Twiink's Space**，介绍为“做点有趣的东西，放一些舍不得关掉的脑洞。”入口窗边、走廊和云上人物使用根据用户照片制作的黑白线稿，发布用纹理位于 `public/media/images/textures/twiink/`。照片参考仅在本地忽略目录中保存。

「关于我」已接入个人简介、技术栈、六段经历、兴趣和项目成果，统一编辑 `src/data/profile.json`。房间里的纸片、经历岛屿、技能气球和完整阅读面板共用这些资料。画廊已接入「泡芙大作战 PuffWar 乐园」「无界宇宙 Infinite Cosmos」「SecKnow AI 教育平台」「RAG 中台 RAG-Center」「HarnessPRD 智能需求文档平台」「齐爱农」和「海晶集团全员创新平台」七个个人项目，提供完整介绍，以及已备齐的图片、开场视频、小程序码、官网或 GitHub 源码入口。「联系我」已接入邮箱、GitHub、微信和站内留言入口，纸页中的「随便聊聊」展示六条已确认的常见问题；生活手记收录四篇生活存档与一篇人物形象制作记录。示例内容中的 `authorName` 保留原作者归属。站点域名按用户提供的 `http://space.twiink.cn` 配置，站点与联系人信息在 `content.json` 的 `site` 中编辑。

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

# 为已配置预压缩服务的托管环境额外生成 gzip / Brotli
npm run build:compressed
```

## Git 跟踪范围

仓库跟踪源码、内容数据、发布素材、依赖锁文件和共享配置。

`assets/` 是仅保存在本地的素材制作归档，包含附件原件、确认文稿、来源记录、提示词和生成历史，由 `.gitignore` 排除。下文提到的 `assets/` 路径均指本地档案，新克隆的仓库需要另行取回。`public/` 中的 `backups/`、临时文件、试验图及图片生成元数据也排除在 Git 之外，发布用图片与封面继续跟踪。

工具缓存和构建目录统一忽略。需要保留的制作档案应单独备份；Git 停止跟踪后仍保留本地文件，历史提交中的副本也仍然存在。

## 内容维护

网站从仓库内的 JSON 读取文字，图片使用 `/media/images/` 下的站内路径。本地素材位于 `public/media/`，由 `manifest.json` 登记并在构建时写入 `dist/media/`；将整个 `dist/` 上传到网站的对象存储桶即可。浏览器通过网站自己的域名读取图片，响应格式与压缩由托管端已有配置处理。图片加载最多等待 30 秒，场景整体超时后提供重试入口。修改内容后，开发服务会更新页面；发布环境需重新构建部署。

| 文件或目录 | 用途 |
| --- | --- |
| `src/data/profile.json` | 关于我的可编辑资料：身份、简介、技能、工具、经历、爱好和成果 |
| `src/data/profile.js` | 将个人资料整理为页面与搜索正文共用的数据 |
| `src/data/content.json` | 站点设置、画廊、生活手记、想做的事、FAQ，以及保留供对照的示例奖项 |
| `src/data/content.js` | 将本地内容整理为页面、奖项分组与预加载数据 |
| `src/hooks/useContentData.js` | 各房间读取本地内容的入口 |
| `public/media/manifest.json` | 图片源名称与站内发布路径映射，以及音频、视频和字体的统一清单 |
| `public/media/images/` | 图片、场景贴图与界面素材的发布副本 |
| `public/media/audio/`、`public/media/video/` | 声音和视频的发布副本 |
| `public/start/` | 独立静态起始页的 HTML、CSS、脚本 |
| `public/scripts/resume-download.js` | 主站与独立链接页共用的简历下载处理 |

`content.json` 的内容如下：

| 字段 | 内容 | 数量 |
| --- | --- | --- |
| `site` | 站点标题、一句话介绍、域名及社交链接 | 1 |
| `projects` | 画廊条目：7 个个人项目及 1 份开源贡献记录 | 8 |
| `studio` | 四篇生活存档与一篇人物形象制作记录 | 5 |
| `studioWishCard` | 旋转显示器塔中的「想做的事」卡片入口与封面 | 1 |
| `wishes` | 想做的事：长白山、雪山与滑雪 | 3 |
| `awards` | 原作者示例证书，保留供对照，不作为当前个人成果展示 | 16 |
| `faq` | 六条个人问答，展示在联系纸页并同步至搜索正文 | 6 |

画廊项目的 `title`、`description`、`url`、`front`、`painted`、`techStack` 控制卡片文字、链接、正反面相关纹理及技术图标。生活手记的 `platform`、`device`、`frontTexture` 和 `paintedFrontTexture` 控制分类标签、设备外形与屏幕纹理；`platform` 使用 `life` 或 `making`，`device` 使用 `monitor`、`tv` 或 `phone`。证书的 `category` 使用 `sotd`、`sotm` 或 `other`。

`seoTitle` 和 `seoDescription` 用于搜索正文与结构化数据。`seo-plugin.js` 在开发和构建时读取本地 JSON，并生成中文静态正文、JSON-LD 和 `/llms.txt`；首页标题、一句话介绍与规范域名来自 `site`，个人介绍和成果来自 `profile.json`。

### 编辑项目介绍

画廊的纸卡依次是「泡芙大作战 PuffWar 乐园」「无界宇宙 Infinite Cosmos」「SecKnow AI 教育平台」「RAG 中台 RAG-Center」「HarnessPRD 智能需求文档平台」「齐爱农」「海晶集团全员创新平台」和「开源贡献」。点击翻转，再点「查看项目」即可阅读完整介绍，也可在面板内切换项目。介绍中提供项目图片或开场视频、小程序码、官网、PR 或 GitHub 源码链接，工具说明默认收起。视频由访客点击播放，切换项目或关闭介绍时停止播放。

纸卡数量取自实际项目，每个条目一张；循环滚动只改变位置，不补重复卡片。阅读面板通过标题旁的「切换项目」下拉菜单选择条目，下方保留一排正文目录；窄屏可横向滚动目录。

页面读取 `src/data/content.json` 的 `projects`，七个个人项目的 `id` 分别为 `puffwar`、`boundless-universe`、`secknow`、`rag-center`、`harness-prd`、`qiainong` 和 `haijing`；`open-source` 是开源贡献合集。保存 JSON 后开发预览会更新；线上环境需要重新构建部署。

「齐爱农」已接入确认文案、两条报道链接、小程序首页设计图与微信小程序码，并在三维画廊展示秋收与粮库主题的新封面。图片从站内 `/media/images/content/projects/qiainong/` 加载，封面使用 `cover-sketch-v2.png`、`cover-color-v2.png`，标题由场景文字层绘制。附件原件、上传清单与来源记录保存在本地忽略目录 `assets/projects/qiainong/`。

「海晶集团全员创新平台」已接入确认文案、黑白和彩色纸卡及微信小程序码。三张图片均从站内 `/media/images/content/projects/haijing/` 加载，封面使用厂区同事讨论主题的 `cover-sketch-v2.png`、`cover-color-v2.png`，标题由场景文字层绘制。附件原件、文稿及上传和核验摘要保存在 `assets/projects/haijing/`。

「开源贡献」收录 Agenta、LoopX、DeerFlow、Apache Superset 的六个 PR，以及自己的 AgentTemplate、EnvSetup 仓库。四张手绘示意图解释对应改动，每段正文下直接提供原始链接。协作工作台主题的黑白和彩色封面从站内 `/media/images/content/projects/open-source/cover-{sketch,color}-v2.png` 加载。正文配图组件为 `src/components/ui/ContributionIllustration.jsx`，以网页代码绘制；正文、链接和插画说明统一编辑 `content.json`。

画廊全部八个条目已统一为铅笔线稿与淡彩插画，每个条目包含黑白、彩色两版，使用随整站发布的 `cover-sketch-v2.png`、`cover-color-v2.png`。1086×1448 PNG 原件统一位于 `public/media/images/content/projects/` 下各项目目录，精确提示词、尺寸与哈希记录在本地 `assets/gallery/cover-provenance.json`。八个条目均使用 `titleInCover: false`，标题由场景文字层绘制在图片顶部留白处；支持悬停的设备显现彩色版。

| 字段 | 用途 |
| --- | --- |
| `title`、`shortTitle`、`cardTitle` | 完整名称、简称和卡片上的分行标题，换行写成 `\n` |
| `titleInCover` | 封面本身已画好标题时设为 `true`，纸卡使用图中的标题 |
| `front`、`painted` 为空 | 素材上传前可先开放完整文字介绍，上传核验后填写图片地址启用纸卡 |
| `description`、`cardNotes`、`cardNotesTitle` | 纸卡背面的短介绍、游玩提示和提示栏标题 |
| `details.tagline` | 阅读面板的一句话介绍 |
| `details.sections` | 正文各节：`paragraphs` 一项一段，`entries` 填标题 `title` 和说明 `description`；保留 `id` 以供目录定位，`collapsible: true` 表示默认折叠 |
| `details.sections[].navLabel` | 可选的目录文字，适用于开源小记、贡献记录和自己的项目等章节 |
| `details.sections[].entries[].links` | 段落下的原始链接，各项填写 `title` 和 `url`；同步输出到搜索 HTML 与 `/llms.txt` |
| `details.sections[].entries[].illustration` | 手绘配图：`kind` 为 `agenta`、`loopx`、`deerflow` 或 `superset`；`alt` 描述画面，`caption` 是图注 |
| `details.photos` | 项目图片：`src` 是图片路径，`alt` 是画面描述，`caption` 是图片下的文字，`width`、`height` 填原尺寸 |
| `details.photosLabel`、`details.photosTitle` | 图片目录的名称和图片区标题，未设置时沿用现场照片的称呼 |
| `details.videos` | 视频：`src`、`poster` 是视频和封面路径，`title`、`caption` 描述内容，`mimeType` 填视频格式，`width`、`height` 填原尺寸，`hasAudio: false` 表示无声 |
| `details.references`、`details.referencesTitle` | 相关报道或补充链接：各项填写 `title` 和 `url`，可自定义这一节的标题 |
| `details.entry` | 项目入口：`title`、`description` 和可选 `hint` 填说明；小程序填 `image`、`width`、`height`，网站填 `url` 与链接文字 `label` |
| `seoTitle`、`seoDescription` | 搜索摘要；详细正文也会同步输出到搜索 HTML 和 `/llms.txt` |

早期项目素材归档分别在 `public/media/images/content/projects/puffwar/`、`public/media/images/content/projects/boundless-universe/`、`public/media/images/content/projects/secknow/`、`public/media/images/content/projects/rag-center/` 和 `public/media/images/content/projects/harness-prd/`；附件原件、确认版文稿与来源记录保存在 `assets/projects/` 下的对应目录，页面图片以 JSON 中的配置路径为准。页面正文以 JSON 为准，`copy-draft.md` 是确认文稿的归档。SecKnow 的横版海报、两张页面截图和户外照片用于阅读面板。RAG-Center 与 HarnessPRD 的阅读面板展示界面展示图与海报，并在底部提供 GitHub 仓库入口。

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
3. 开发预览会在保存后更新。运行 `npm run lint` 检查代码，再运行 `npm run build` 生成用于发布的 `dist/`。

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

替换图片时，将文件放入 `public/media/images/`，在 `public/media/manifest.json` 的 `images` 中登记源名称和 `/media/images/` 发布路径，再将该站内路径写入 JSON 或对应组件。保留原有目录层级、宽高比和透明通道。构建后图片与站点代码一起位于 `dist/` 中，按整站部署流程上传。

图片预加载、CSS 背景、分享图与 `/start` 同步使用站内发布路径。图片的自动格式转换与压缩由网站托管端处理；覆盖同一路径后，按部署环境需要刷新对应缓存。字体、音效和视频同样随整站发布；简历沿用独立的 PDF 下载地址。

入口文字、导航、教程、成就、联系表单、各房间固定标题以及源码说明注释均已中文化；ITom、作者姓名、技术和平台名称保留原名。固定交互文案仍位于对应的 `src/components/` 与 `src/context/` 组件中，`/start` 的文案位于其 HTML 中。原图和图中嵌入的文字留待后续替换。

## 字体

中文使用霞鹜文楷轻便版，源字体与许可证保留在 `public/media/fonts/`。Vite 会从运行源码、内容 JSON 和 `/start` 收集字符，使用 `subset-font` 自动生成 DOM 使用的 WOFF2 和三维文字使用的 WOFF，并逐字检查生成结果。开发时新增文字会更新子集并刷新页面，生产构建也会自动更新；生成缓存位于 Git 忽略的 `.cache/fonts/`。

三维文字统一通过 `SiteText` 加载字体；访客在留言中输入子集以外的汉字时，按需使用完整文楷。DOM 字体通过 `unicode-range` 选择子集与完整字体。原有品牌拉丁字体保留。

## 加载与发布

入口与走廊就绪后即可开始探索，四个房间分别按需加载。高性能且未启用省流的设备会在空闲时逐个预取，深链接房间优先；门与地图点击也会提前准备目标房间。房间资源就绪后才打开门与纸幕，加载失败或长时间无响应时提供重新加载和返回入口。后台标签页暂停三维渲染，返回前台后恢复。阅读面板在打开时加载；背景音乐在首次交互时初始化，访问统计仅在配置了 Key 时异步加载。

画廊房门沿用原有下方建筑图纸，纸面下沿常驻手写边注：平时为「进来看看」，资源准备时为「布展中…」，就绪后为「请进」与小箭头，再随房门开启。纸边、蓝胶带与门木纹沿用原图；图纸内部素材随站点发布，整理后的门纹理由重复门段共用，等待笔画不表示真实加载百分比。系统启用减少动态效果时，笔画保持静止。

生活手记、关于我与联系我的房门共用 `DoorAnnotation`，分别在相机与山景间、笑脸纸下沿和信封正面展示单行状态。生活手记为「翻翻手记 / 整理中…」，关于我为「认识一下 / 准备中…」，联系我为「来聊聊 / 准备中…」，就绪后均为「请进」与手绘箭头。笑脸与信纸内部素材由原门纹理的一次合绘保留纸边，重复门段共用结果；移动端等待视角按实际投影字号靠近原画面，进入房间后恢复正常镜头高度。

构建按 `public/media/manifest.json` 打包图片、音频、视频、字体和光标，统一输出到 `dist/media/`。普通图片、CSS 背景、视频封面、图标及三维贴图均使用随站点发布的文件；同一图片的并发请求共用结果，失败或超时后进入现有加载失败处理。独立 `/start` 页面也使用站内素材路径。制作过程、原始附件和旧版本继续留在忽略的 `assets/`，发布所需文件不依赖该目录。

发布前运行 `npm run lint` 和 `npm run build`，再通过 `npm run preview` 查看生产构建的页面与交互。构建会校验发布文件清单与四个房间的独立加载边界，并输出完整产物、入口与走廊共享依赖的 gzip 总量、首次中文字体体积。

素材目录约定见 `public/media/README.md`。

默认构建输出通用静态文件。`npm run build:compressed` 额外生成 `.gz` 与 `.br`，需要托管服务根据 `Accept-Encoding` 返回对应文件并设置 `Content-Encoding`。静态托管的缓存、默认首页和路由回退在腾讯云 COS/CDN 控制台配置。

## 外部服务

内容展示与 SEO 构建均已改为本地读取，原内容服务的客户端依赖、管理后台、请求代理和读取 Hook 已移除。

项目仍保留原有可选的邮件提交和访问统计集成：

- `VITE_WEB3FORMS_KEY`：绑定收件邮箱的 Web3Forms 配置，放在本地 `.env` 或部署平台环境变量中。允许提交的域名来自 `site.url`；未配置、预览域名或发送被拦截时均明确提示，只有服务确认接收才显示成功。
- `VITE_POSTHOG_KEY`、`VITE_POSTHOG_HOST`：PostHog 访问统计配置。
- 生活手记收录四篇生活存档与一篇人物形象制作记录。编辑 `src/data/content.json` 的 `studio` 数组即可修改标题、`paragraphs` 正文和 `photos` 图片；每张图的 `alt` 是图片说明，人物制作过程另有 `label` 和 `caption`。没有提供日期的记录不填写 `date`。点击场景中的屏幕或「翻翻生活手记」可在站内阅读，也可使用 `/studio?note=记录的id` 直接打开对应记录。
- 点击房间顶部「翻翻生活手记」，在阅读面板的导航中选择「想做的事」，即可翻到旅行心愿手账；它与东灵山、华山、飞拉达、双人成行和人物制作共用面板，可直接来回切换。长白山插画放在主画面，雪山与滑雪插画错落排列，配以纸张、照片边框和手写愿望；点击插画可查看大图。手机按纵向手账排版，正文可滚动。愿望编辑 `content.json` 的 `wishes` 数组：`id` 唯一、`title` 为一句话愿望、`description` 可选，`image` 与 `imageAlt` 配置插画及其说明，`status` 保存状态并供辅助技术读取。`/studio?view=wishes` 从入口开门后自动打开面板中的心愿手账。三幅淡彩画是对未来旅行的想象，PNG 位于 `public/media/images/content/studio/wish-journal/`，生成提示词保存在 `assets/studio/wish-journal/illustrations.json`，当前三条均为「想做的」。
- 旋转显示器塔同时展示「想做的事」卡片，点击后打开同一页手账。卡片配置在 `content.json` 的 `studioWishCard`，封面默认为黑白版，支持悬停的设备显现彩色版；预加载沿用这一设备规则。三幅插画和两张 SVG 封面统一使用站内 `/media/images/content/studio/wish-journal/` 目录。SVG 封面中的文字使用文楷字形路径。阅读页沿用生活手记的纸白底色与文字颜色。
- 生活照片的原图与素材清单保存在 `assets/studio/life-notes/`，页面图片位于 `public/media/images/content/studio/`，人物黑白线稿沿用 `public/media/images/textures/twiink/start-bouquet.png`。联系房间已使用 Twiink 的联系方式；`/start` 提供站内导航、GitHub 入口与 Twiink 人物插画。

Matrix 工作室的 CSDN 与微信视频号在 `src/data/content.json` 的 `site.studioChannels` 中编辑，集中展示在联系方式中。视频号支持复制；浏览器不允许自动复制时，会选中账号，方便手动复制。

生活手记的门牌、地图和页面标题统一显示「生活手记」。门贴图位于 `public/media/images/textures/corridor/doors/life-notes-ink-v1.webp` 与 `life-notes-color-v1.webp`，图案为相机、山间日出和手柄；生成提示词与处理说明保存在 `assets/studio/door-textures.json`。阅读面板展示个人记录，房间背景使用日出、合照、存档等手写词。

简历 PDF 使用对象存储地址 `https://media.secknow-ai.com/space/Resume.pdf`，入口位于「关于我」「联系我」与独立链接页 `/start`。「联系我」同时支持新窗口查看和下载。下载文件名为 `郑越-13990529155-Agent全栈开发.pdf`；`public/scripts/resume-download.js` 将 PDF 获取为 Blob 后保存，保证跨域下载时的中文文件名。说明、地址和下载文件名在 `site.resume` 中编辑；若更改地址或文件名，也要同步 `/start/index.html` 中的静态链接。两个页面均加载这份共享下载脚本。

走廊的两幅竖版照片位于 `public/media/images/content/corridor/`：右侧 `frame-3` 展示花束与牵手照，左侧 `frame-4` 展示红灯笼前的古风合照。原图与处理记录保存在 `assets/corridor/`。图片按原始比例展示，桌面端点击查看时会自动适配视口高度；路径和画框尺寸在 `src/components/canvas/corridor/CorridorDecorations.jsx` 的 `frames` 中编辑，新增图片时同步 `src/config/texturePreloadList.js`。

网站图标使用浅绿纸飞机与金色星星，保留奶油色纸底和完整构图。主站与 `/start` 的浏览器图标分别使用 `public/media/images/textures/twiink/site-icon-airplane-v1-32.png`、`site-icon-airplane-v1-64.png`，手机主屏幕图标使用同目录的 `site-icon-airplane-v1-180.png`；走廊 `frame-1` 与纹理预加载使用 `site-icon-airplane-v1-512.png`。更换时同步两处 HTML、走廊画框与预加载清单。

入口双门的技术贴纸与 `profile.json` 一致：左门展示 TypeScript、Vue、React、Python、Django、FastAPI，右门展示 Java、Spring Boot、Docker、RAG、LangChain、LangGraph。贴图位于 `public/media/images/textures/doors/twiink-entry-{left,right}-{ink,color}-v1.webp`，各有黑白和彩色版本；生成提示词、技术清单与文件校验信息保存在 `assets/entrance/door-textures.json`。后续修改门上的技术名称时需重新制作贴图，并同步 `EntranceDoors.jsx` 与 `texturePreloadList.js` 中的路径。

分享封面使用 `public/media/images/content/social/twiink-share-cover-v1.jpg`，为已确认的淡彩古风横版图片，尺寸 1200×630。主站的 Open Graph 与 Twitter 分享信息由 `site.shareImage` 和 `seo-plugin.js` 输出；独立链接页 `/start` 的同类标签位于 `public/start/index.html`。更换图片路径、尺寸或说明时，同步这两处配置。

这些配置不影响本地 JSON 的读取，也不提供内容管理功能。凭据和私人配置不要写入 Git。

## 场景结构

`App.jsx` 组合三维画布、全局状态和 DOM 界面。`Experience.jsx` 挂载入口与无限走廊；`DoorSection.jsx` 负责房间加载、开关门和相机过渡。`StartupReady.jsx` 与 `renderPreparation.js` 准备纹理和着色器，`PerformanceContext.jsx` 按设备能力和持续帧率调整画质。动画中的高频位置更新通过 ref、`useFrame` 或着色器完成。

场景装饰在 `src/components/canvas/atmosphere/` 维护：画廊有吊车和烟囱烟雾，海面远处有带树林与小屋的岛屿，走廊有浮尘，关于我有暖色手绘萤火虫。纹理由 `sketchTextures.js` 在本地绘制；吊车吊钩与臂架缓慢运动，粒子由 GPU 更新。四个房间的背景层提供轻微视差，阅读面板打开时停止视差；系统选择减少动态时，新增装饰保持静态。

高、中、低档会实际调整渲染像素密度、阴影、抗锯齿、纹理各向异性、云与粒子数量、装饰更新频率和可见距离。画廊与海面的同类云层批量绘制；越远的云逐步淡出并退出实例绘制，吊车远景保留主体、隐藏吊钩，更远时整体隐藏。低档进一步减少数量。WebGL 创建时关闭原生抗锯齿，由 `AdaptiveQuality.jsx` 在高、中档启用屏幕抗锯齿；降档会释放相应资源，保留房间与交互状态。GPU 偏好是创建上下文时的提示，使用固定的 `default`。

入口加载页读取真实素材完成数量；入口就绪时保存该批素材计数，后续走廊预取不改变已完成的入口进度。素材加载完成而场景仍在准备时，会给出相应提示。纸幕展开时，石板路上的“准备好了”“一起进去看看”和铅笔箭头淡入；文字贴合地面透视，并按视口补偿字形，点击入口门后收起。`EntranceInvitation.jsx` 维护这组场景文字，声音开关保留在入口右上角。入口与走廊房门等待时，门板下部的灰白便签用蓝胶带固定，显示“正在布置”“好了就开门”；就绪后轻淡切换为“请进”和手绘箭头，随房门打开。`DoorLoadingTag.jsx` 将纸纹、轻投影和胶带合绘为一张小纹理，便签保持固定透视；手机按横竖屏调整尺寸，减少动态时保持静态状态。地图传送在纸幕上显示手写准备提示，屏幕阅读器继续播报加载状态。桌面入口支持点击和 Enter，手绘光标仅用于支持精确指针的设备。

## 许可与署名

代码采用 [MIT 许可证](LICENSE)。原作者为 [Tomasz Szmajda（ITom Dev）](https://itomdev.com)。原项目中的个人素材、3D 纹理、图片和文案版权属于原作者；未经明确许可，不得擅自复用或复制。中文化和本地内容改造不改变原素材的权利归属。
