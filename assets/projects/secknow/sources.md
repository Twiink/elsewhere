# SecKnow：素材来源与归档记录

## 来源

用户于 2026-11-06 提供三张图片，并说明它们属于 SecKnow 教育平台的素材，供后续引用。

| 归档文件 | 原附件名 | 内容 |
| --- | --- | --- |
| `originals/01-homepage.png` | `codex-clipboard-13209746-6079-43a3-85fd-9f8079c9f078.png` | 网站首页首屏，包含 SecKnow 品牌、导航、介绍文字与入口按钮 |
| `originals/02-knowledge-planets.png` | `codex-clipboard-0347f0b7-f0f3-41df-bfdd-b91a7b0fb6ea.png` | 「探索知识星球」区块，展示以星球排列的学科与素质主题 |
| `originals/03-venue-exterior.jpg` | `codex-clipboard-6da97761-56e2-4d40-868b-f886759979ba.jpg` | 带 SecKnow 标识的户外环境，包含草地、围栏、树木与建筑 |

## 网站入口

- 官网：[SecKnow](https://www.secknow-ai.com/)。用户提供的地址 `https:/www.secknow-ai.com` 已补全 HTTPS 协议中的斜杠。
- 2026-11-06 通过网页请求核对：HTTP 200，页面标题为 `SecKnow`。
- 两张页面截图来自用户附件；归档日期为接收日期，截图及实景照片的拍摄时间未提供。图片上的课程与资源数量仅保留在原图中，未单独核实。

## 保存与验证

原图保存至本项目的 `assets/projects/secknow/originals/`，逐字节比对通过；尺寸、字节数和 SHA-256 记录在 `asset-manifest.json`。用户确认文稿后，选用素材的 WebP 副本已接入本地画廊，原件保留。

## 生成展示图的依据

本次竖版与横版海报于 2026-11-06 生成。美术风格参考用户提供的 SecKnow 首页与知识星球素材；功能简报依据 `/home/xyz/Projects/SecKnow` 与 `/home/xyz/obsidianlibrary/求职` 中的资料整理：

| 来源 | 用于画面的内容 |
| --- | --- |
| SecKnow / `README.md` | 中小学学习平台，教材生产与知识点学习 |
| SecKnow / `Admin/src/views/content/curricula/components/TeacherSidebar.vue`、`TeacherCurriculumArticle.vue` | 教材生成、预览、编辑、教案与批注 |
| SecKnow / `Admin/src/views/content/curricula/composables/useTeacherLessonPlan.ts` | 教案生成、状态查询与教学批注 |
| SecKnow / `Frontend/src/views/learning/point-detail/index.vue` 与 `composables/usePointDetail.ts` | 探究、拓展、测试学习环节 |
| SecKnow / `Frontend/src/views/learning/point-detail/components/CurriculumReadOnlyBlock.vue`、`CurriculumBoxFrame.vue`、`CurriculumQuizRenderer.vue` | 图文、媒体、音频、交互沙盒、测验与“问这个”入口 |
| SecKnow / `Frontend/src/components/AskQuestion/AskPanel.vue` | AI 自学助手、引用内容、对话和继续提问 |
| 求职 / `02-项目资料/03-SecKnow智能教育平台.md` | 教材生产、课程学习与 AI 辅导的项目背景 |
| 求职 / `01-简历/素材/项目经历-SecKnow.md` | 产品能力与项目职责的交叉核对 |

本次海报以“让好奇心带你去探索”为主文案，用绘本与四颗学习星球表达 AI 教材生成、互动实验、智能答疑与趣味测验。奶油色、水彩行星、叶片、星轨与圆润文字延续所提供 SecKnow 素材的美术风格；横版另参考本组竖版以统一插画元素。完整提示词、素材关系、功能依据和尺寸见 [generation-prompts-v5.md](generation-prompts-v5.md)。

## 2026-11-06 项目介绍文稿

- 用户引用 Codex 聊天 `01a1abcd-53ad-7801-95ed-b45afed9a200`，要求结合其中资料与最后生成的展示图编写 SecKnow 文字版介绍。本轮通过 `read_thread` 读取最后成片所在回合及相关素材要求，查看了当前选用的横竖版水彩绘本海报和两张原始页面截图。
- `copy-draft.md` 按现有个人项目文稿结构编写：项目介绍、我做了什么、几个使用细节、工具与感想。面向网站访客，以学习、备课和使用过程解释功能。
- 项目定位与用户职责参照求职资料 `02-项目资料/03-SecKnow智能教育平台.md`、`01-简历/素材/项目经历-SecKnow.md` 及功能细节记录：全栈开发，参与教材生成、学习交互、后台权限和课程交易。
- 当前 SecKnow 源码已静态核对教材预览编辑、内容块显示、互动测验、引用提问与生成失败恢复的入口，位置见上表；另包括 `Backend/Backend/apps/Content/services/curriculum_recovery.py`。教材生成按对接服务表述。
- 语音辅导、共享学习画面与学习进度恢复的职责按求职资料归属到课程辅导部分，对应 `AskOnlineMathLab` 模块；本文稿不将其写成当前 SecKnow Vue 学习端的全部直接功能。
- 展示图作为功能主题与视觉参考；户外照片保留原归档说明。文稿不据此推断授课地点、具体活动或使用人数。
- 本次交付为可编辑文稿，未修改页面数据、运行代码、原图或展示海报。未执行应用测试、支付或生成调用，未提交 Git、未部署。

## 2026-11-06 确认文稿接入画廊

- 用户确认生活化文稿后，已将 `copy-draft.md` 的正文分节写入 `src/data/content.json` 的 `projects[id=secknow].details.sections`，替换第三张示例项目卡片；工具说明默认折叠。
- 纸卡封面选用 `showcaseSelection.portrait`；阅读面板选用 `showcaseSelection.landscape`、首页截图、知识星球截图和带 SecKnow 标识的户外照片。图片标题和说明区分海报、界面与实景。
- 发布副本位于 `public/content/projects/secknow/`，使用 WebP。封面将 1024 × 1536 竖版海报等比例放入 1200 × 1600 纸卡，并为上方卡片标题留白；阅读区图片保留原始尺寸和比例。转换方式与发布文件校验和写入素材清单。
- 阅读面板可切换三个个人项目，SecKnow 入口为官网链接；两个小程序项目继续使用各自的小程序码。
- 本次为本地页面接入，未提交 Git、未部署，未调用教材生成、支付或其他业务服务。

### 页面接入验证

- `npm run check:content` 21/21 通过，`npm run build` 通过；构建保留现有包体积提示。设计检测无发现，`git diff --check` 通过。
- 确认稿五节正文与 JSON 逐节比对一致；原图、全部归档海报和六个发布文件的 SHA-256 均与清单一致。
- Chrome 桌面 1440 × 900、触摸手机视口 390 × 844 和 375 × 812 下，正文无横向溢出，关闭按钮可见；图片保留完整比例。
- 四张阅读区图片正常加载；官网入口的地址、链接文字、新窗口与 `noopener noreferrer` 属性核对通过。
- 点击三维 SecKnow 纸卡可打开正确介绍；三个项目切换会返回正文顶部。关闭、Esc 与返回焦点已检查。
- 两个小程序码的名称正确，泡芙项目三张现场照片保留，无界宇宙视频可播放并在切换项目后停止。浏览器控制台无错误。
