# Twiink's Space

这是基于 Tomasz “ITom” Szmajda 作品集改造的 Twiink 个人空间，使用 React 19、Three.js、React Three Fiber、GSAP 和 Vite。用户从入口进入无限走廊，探索作品画廊、内容工作室、关于我和联系我四个房间；`/start` 是独立的静态链接页。

已接入第一批个人资料：网站名为 **Twiink's Space**，介绍为“做点有趣的东西，放一些舍不得关掉的脑洞。”入口窗边、走廊和云上人物使用根据用户照片制作的黑白线稿，发布用纹理位于 `public/textures/twiink/`。PNG 原稿与生成说明保存在 `output/imagegen/`；照片参考仅在本地忽略目录中保存。

个人经历、技能、作品、文章、奖项和联系房间仍保留示例，等待后续资料逐部分替换。示例内容中的 `authorName` 保留原作者归属。个人域名与社交链接尚未提供，`site.url` 和相关链接字段留空；未配置域名时不输出规范域名标签，设置 `site.url` 后构建即可生成。

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

# 本地内容、中文校验和静态起始页的行为检查
node --test scripts/test-content.mjs scripts/test-contact-validation.mjs scripts/test-start.mjs
```

## 内容维护

网站直接读取仓库内的 JSON 与图片，不需要内容管理后台、后台账号、SQLite 或其他数据库。修改内容后，开发服务会更新页面；发布环境需重新构建部署。

| 文件或目录 | 用途 |
| --- | --- |
| `src/data/content.json` | 实际使用的中文内容，后续替换的主要入口 |
| `src/data/content.original.json` | 已发布内容的原始返回备份，保留原文和资产引用供对照，不参与运行或构建 |
| `src/data/content.js` | 将本地内容整理为页面、奖项分组与预加载数据 |
| `src/hooks/useContentData.js` | 各房间读取本地内容的入口 |
| `public/content/` | 本地保存的内容图片，JSON 中以 `/content/文件名.webp` 引用 |
| `public/textures/` | 原有场景、门牌、纸张及装饰纹理 |
| `public/start/` | 独立静态起始页的 HTML、CSS、脚本 |

`content.json` 完整保留此次导出的 40 条记录：

| 字段 | 内容 | 数量 |
| --- | --- | --- |
| `site` | 站点标题、简介、个人介绍、域名及社交链接 | 1 |
| `projects` | 画廊项目 | 4 |
| `studio` | 文章、视频与社交内容 | 11 |
| `awards` | 获奖证书 | 16 |
| `faq` | 常见问题 | 8 |

画廊项目的 `title`、`description`、`url`、`front`、`painted`、`techStack` 控制卡片文字、链接、正反面相关纹理及技术图标。工作室内容的 `platform`、`device`、`frontTexture` 和 `paintedFrontTexture` 控制平台标签、设备外形与屏幕纹理；`device` 使用 `monitor`、`tv` 或 `phone`。证书的 `category` 使用 `sotd`、`sotm` 或 `other`。

`seoTitle` 和 `seoDescription` 用于搜索正文与结构化数据。`seo-plugin.js` 在开发和构建时读取同一份本地 JSON，并生成中文静态正文、JSON-LD 和 `/llms.txt`；首页标题、简介与规范域名也来自 `site`。FAQ 和长篇个人介绍主要呈现在搜索正文中。

替换图片时，将文件放入 `public/content/`，再修改 JSON 中的路径。保留现有图片的宽高比可减少场景布局调整。此次本地图片沿用原页面请求的显示尺寸与质量参数，未修改图内文字和图案；原始返回中的资源标识保存在备份 JSON 中。

入口文字、导航、教程、成就、联系表单、各房间固定标题以及源码说明注释均已中文化；ITom、作者姓名、技术和平台名称保留原名。固定交互文案仍位于对应的 `src/components/` 与 `src/context/` 组件中，`/start` 的文案位于其 HTML 中。原图和图中嵌入的文字留待后续替换。

## 字体

中文 DOM 与三维文字使用本地 `public/fonts/LXGWWenKaiLite-Regular.ttf`（霞鹜文楷轻便版），保证汉字显示；ITOM 品牌字母保留原有拉丁字体。字体许可证保存在 `public/fonts/LXGWWenKaiLite-OFL.txt`。新增中文文字时应继续使用这份中文字体。

## 外部服务

内容展示与 SEO 构建均已改为本地读取，原内容服务的客户端依赖、管理后台、请求代理和读取 Hook 已移除。

项目仍保留原有可选的邮件提交和访问统计集成：

- `VITE_WEB3FORMS_KEY`：联系表单的 Web3Forms 配置，放在本地 `.env` 或部署平台环境变量中。表单还保留 `MessagePaper.jsx` 中的 `ALLOWED_ORIGINS` 域名限制；换域名时需要同步修改。原逻辑在 localhost 和未允许域名上不发送真实邮件。
- `VITE_POSTHOG_KEY`、`VITE_POSTHOG_HOST`：PostHog 访问统计配置。
- 联系房间和示例项目外链仍指向原作者地址，替换对应资料时需要同步修改。`/start` 已改为站内导航与 Twiink 人物插画。

这些配置不影响本地 JSON 的读取，也不提供内容管理功能。凭据和私人配置不要写入 Git。

## 场景结构

`App.jsx` 组合三维画布、全局状态和 DOM 界面。`Experience.jsx` 挂载入口与无限走廊；`DoorSection.jsx` 负责房间加载、开关门和相机过渡。`RoomWarmup.jsx` 预编译房间着色器，`PerformanceContext.jsx` 按设备能力调整画质。动画中的高频位置更新尽量通过 ref 和 `useFrame` 完成。

## 许可与署名

代码采用 [MIT 许可证](LICENSE)。原作者为 [Tomasz Szmajda（ITom Dev）](https://itomdev.com)。原项目中的个人素材、3D 纹理、图片和文案版权属于原作者；未经明确许可，不得擅自复用或复制。中文化和本地内容改造不改变原素材的权利归属。
