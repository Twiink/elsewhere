# Twiink's Space：项目说明

本项目是 React 19 + React Three Fiber 的沉浸式三维作品集。入口连接无限走廊，左右门通往作品画廊、内容工作室、关于我和联系我。视觉以手绘线条、纸张和速写纹理为主，交互时可显现彩色层。

## 当前内容架构

- 实际内容位于 `src/data/content.json`，通过 `src/data/content.js` 整理，供 `src/hooks/useContentData.js` 和搜索输出使用。
- `content.original.json` 是原始已发布响应的只读参考备份，不导入运行代码。
- 内容图片保存在 `public/content/`。场景与装饰纹理保存在 `public/textures/`。
- 第一批个人身份已接入：昵称 Twiink，网站名 Twiink's Space；介绍与网站用途来自用户确认的文案。入口、走廊和关于我使用 `public/textures/twiink/` 下的黑白人物，宽高比取纹理实际尺寸。原作者的九帧人物动画已换成 Twiink 挥手姿势与轻微摆动。
- 个人域名与社交资料未提供，站点信息留空；项目、内容、经历、技能、奖项和联系房间仍为示例，后续分批替换。示例内容用 `authorName` 标注原作者，搜索数据不将其归为 Twiink 的作品。
- 当前保留站点信息 1 份、画廊项目 4 个、工作室内容 11 条、证书 16 张、FAQ 8 条。
- 内容读取同步完成，不需要网络内容查询、管理后台或数据库。
- `seo-plugin.js` 在开发和构建时从本地内容生成中文语义正文、JSON-LD 和 `/llms.txt`。
- 文字与源码说明注释使用中文，技术标识、品牌及平台名保留原名。图片内的文字仍为原素材内容。

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

表单仍使用 Web3Forms；需配置 `VITE_WEB3FORMS_KEY` 和 `ALLOWED_ORIGINS`。开发域名默认不真实发送邮件。测试只验证本地逻辑，不提交真实邮件。频率限制与时间陷阱属于原有行为。

## 开发与验证

```bash
npm run dev
npm run build
npm run preview
node --test scripts/test-content.mjs scripts/test-contact-validation.mjs scripts/test-start.mjs
```

`npm run lint` 包含项目原有的检查问题，修改时需比较基线，避免混入不相关清理。内容改动需验证 JSON、图片存在性、搜索输出与对应房间的显示。

代码采用 MIT 许可证，个人纹理、图片和文案仍受原作者的单独版权声明约束，详见 README。
