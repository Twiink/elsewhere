# Twiink's Space：项目说明

本项目是 React 19 + React Three Fiber 的沉浸式三维作品集。入口连接无限走廊，左右门通往作品画廊、内容工作室、关于我和联系我。视觉以手绘线条、纸张和速写纹理为主，交互时可显现彩色层。

## 当前内容架构

- 实际内容位于 `src/data/content.json`，通过 `src/data/content.js` 整理，供 `src/hooks/useContentData.js` 和搜索输出使用。
- `content.original.json` 是原始已发布响应的只读参考备份，不导入运行代码。
- 内容图片保存在 `public/content/`。场景与装饰纹理保存在 `public/textures/`。
- 第一批个人身份已接入：昵称 Twiink，网站名 Twiink's Space；介绍与网站用途来自用户确认的文案。入口、走廊和关于我使用 `public/textures/twiink/` 下的黑白人物，宽高比取纹理实际尺寸。原作者的九帧人物动画已换成 Twiink 挥手姿势与轻微摆动。
- 网站地址为用户提供的 `http://space.twiink.cn`，GitHub 主页和联系资料位于 `content.json` 的 `site`；「关于我」读取 `profile.json`；画廊已接入「泡芙大作战 PuffWar 乐园」「无界宇宙 Infinite Cosmos」「SecKnow AI 教育平台」「RAG 中台 RAG-Center」和「HarnessPRD 智能需求文档平台」五个个人项目。联系房间已接入邮箱、GitHub、微信及站内留言，六条生活化 FAQ 位于联系纸页的「随便聊聊」中；工作室后续替换。示例内容用 `authorName` 标注原作者，搜索数据不将其归为 Twiink 的作品。
- 当前保留站点信息 1 份、画廊项目 5 个（均为个人项目）、工作室内容 11 条、示例证书 16 张和个人 FAQ 6 条；个人荣誉来自 `profile.json`。
- 内容读取同步完成，不需要网络内容查询、管理后台或数据库。
- 个人项目的完整文案、图片、视频与项目入口在 `content.json` 的 `projects[].details` 中编辑。`ProjectDetails.jsx` 使用原生纸张对话框阅读，技术工具默认折叠；Gallery 卡片和无障碍按钮共用该入口，也能在面板中切换项目。图片目录与标题可通过 `photosLabel`、`photosTitle` 设置；`entry.image` 展示小程序码，`entry.url` 提供外部网站入口。视频使用原生播放器，由访客点击播放；切换或关闭时卸载。对话框打开时暂停 Gallery 的滚轮与拖动，避免正文滚动带动画廊。
- RAG-Center 的图片位于 `public/content/projects/rag-center/`，封面保留黑白与彩色两版，阅读面板展示工作台原型和竖版海报，原型中的数量为示例数据；项目入口为源码仓库。
- HarnessPRD 的图片位于 `public/content/projects/harness-prd/`，封面保留黑白与彩色两版，阅读面板展示首页流程展示图和竖版海报，项目入口为 `https://github.com/Twiink/HarnessPRD` 源码仓库。
- `seo-plugin.js` 在开发和构建时从本地内容生成中文语义正文、JSON-LD 和 `/llms.txt`。
- FAQ 统一编辑 `content.json` 的 `faq`，由 `ContactDetails.jsx` 的原生折叠问答及搜索输出共用；`answer` 用 `\n\n` 分段，`content.original.json` 保留原始快照。
- 文字与源码说明注释使用中文，技术标识、品牌及平台名保留原名。入口招牌改为“创意工坊”，经历浮岛改为“自由创作”，使用用户确认的透明 PNG 原图，后续再压缩；其他图片内的文字保留原素材内容。

## 关键路径

| 位置 | 职责 |
| --- | --- |
| `src/App.jsx` | 画布、预加载、上下文、导航及遮罩 |
| `src/components/canvas/Experience.jsx` | 主三维场景 |
| `src/components/canvas/entrance/` | 开门入口与装饰 |
| `src/components/canvas/corridor/` | 走廊分段、门、相机过渡与房间预热 |
| `src/components/canvas/rooms/Gallery/` | 衣绳上悬挂的可翻转项目卡片 |
| `src/components/canvas/rooms/Studio/` | 可旋转、循环移动的内容显示器塔 |
| `src/components/canvas/rooms/About/` | 云中飞行、经历、奖项与技能气球 |
| `src/components/canvas/rooms/Contact/` | 海面、码头、社交木桶与纸张表单 |
| `src/components/ui/` | 导航、地图、内容弹层、成就和屏幕阅读器界面 |
| `src/context/SceneContext.jsx` | 房间、传送、退出请求与全局弹层状态 |
| `src/hooks/useInfiniteCamera.js` | 走廊滚动、侧看与视差 |
| `public/start/` | 独立静态链接页 |

## 字体与纹理

中文三维文字必须指定 `/fonts/LXGWWenKaiLite-Regular.ttf`。DOM 字体在 `src/styles/_base.scss` 注册为“霞鹜文楷”；原有拉丁手绘字体不包含中文，不能单独用于汉字。

```jsx
<Text font="/fonts/LXGWWenKaiLite-Regular.ttf" fontSize={0.05}>
    中文文字
</Text>
```

本地图片路径以 `/content/` 或 `/textures/` 开头，对应 `public/` 下的文件。替换图像时注意原始宽高比、透明通道与设备分支。彩色纹理通常只在支持悬停的设备上加载。不要改变图片内的文字，除非用户另外要求。

## 房间和相机

`DoorSection.jsx` 将墙、门与标签作为一个单元，接管相机后对齐门，等待房间 `onReady`，再开门进入。退出时反向执行动画。房间需在退出和传送期间停止相机更新，避免与 GSAP 冲突。

`useInfiniteCamera` 在走廊中负责滚动和视差；进入房间时暂停。高频动画通过 ref、`useFrame` 和 GSAP 更新对象，尽量避免逐帧 setState 或创建向量。

## 联系表单

`MessagePaper.jsx` 用隐藏的 DOM 输入框接收键盘输入，用 Drei Text 显示邮箱、主题和留言。中文换行按实际字宽处理；`src/utils/contactValidation.js` 对中文与拉丁词语分别处理，避免正常中文被误判为空内容。

联系方式集中于 `content.json` 的 `site.contact`，`ContactDetails.jsx` 提供纸张阅读面板、邮件与 GitHub 链接、微信复制及手动复制回退。`ContactRoom.jsx` 的五个木桶对应联系方式、GitHub、微信、邮箱、站内留言。欢迎技术交流、项目合作及实习／工作机会。

表单仍使用 Web3Forms，需在受忽略的本地 `.env` 或部署环境配置绑定收件邮箱的 `VITE_WEB3FORMS_KEY`，模板见 `.env.example`。`src/utils/contactDelivery.js` 按 `site.url` 检查提交域名；未配置或处于预览域名时明确显示尚未发送。频率限制、停留时间与蜜罐检查仍保留，拦截不再假报成功；只有 HTTP 成功且服务返回 success 才通知成功并清空表单。测试不发送真实邮件。

## 开发与验证

```bash
npm run dev
npm run build
npm run preview
node --test scripts/test-content.mjs scripts/test-contact-validation.mjs scripts/test-start.mjs
```

`npm run lint` 包含项目原有的检查问题，修改时需比较基线，避免混入不相关清理。内容改动需验证 JSON、图片存在性、搜索输出与对应房间的显示。

代码采用 MIT 许可证，个人纹理、图片和文案仍受原作者的单独版权声明约束，详见 README。
