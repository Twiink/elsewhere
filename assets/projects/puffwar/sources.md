# 泡芙大作战：资料来源与核对记录

本文用于文案维护与事实核对，面向网站的文字在 [copy-draft.md](copy-draft.md)。

## 名称与范围

- 对外名称沿用用户确认的「泡芙大作战 PuffWar 乐园」。本地资料中的 PuffBattle 是项目及代码仓库名称。
- 用户提供的三张照片属于现场游玩素材；描述只记录画面内容，不据此推断画面中的人物身份或具体设备的技术实现。
- 用户提供的 Figma 链接是设计参考。已在浏览器中查看文件 `internship project 1` 与页面「泡芙大作战小程序」，未导出完整文件或逐层检查所有页面。
- 文案使用「参与前后端开发」与模块职责，不写为独立设计或独自完成整个项目。

## 文字依据

1. `/home/xyz/obsidianlibrary/求职/02-项目资料/01-泡芙大作战-PuffBattle.md`
2. `/home/xyz/obsidianlibrary/求职/02-项目资料/02-PuffBattle-大屏互动.md`
3. `/home/xyz/obsidianlibrary/求职/01-简历/素材/实习经历-泡芙大作战.md`
4. `/home/xyz/obsidianlibrary/求职/01-简历/素材/实习经历-泡芙大作战-大屏互动.md`
5. `/home/xyz/obsidianlibrary/求职/02-项目资料/功能细节/01-熵减纪元-功能细节.md`
6. `/home/xyz/obsidianlibrary/求职/04-面试实战/项目故事库-熵减纪元场馆小程序矩阵-260803.md`

项目资料及简历素材优先用于确认功能与职责，面试问答稿只作补充；未将其中所有技术方案视为当前代码已经实现。

## 本轮静态核对的源码

| 主题 | 本机文件与符号 | 已确认内容 |
| --- | --- | --- |
| 任务积分 | `/home/xyz/Projects/PuffBattle/PuffBattleBackend/PuffBattleBackend/apps/Task/utils.py` / `handle_dynamic_task` | 读取历史积分记录，并计算 `current_integral - sum_integral` 的差额 |
| 商城收款与履约 | `/home/xyz/Projects/PuffBattle/PuffBattleBackend/PuffBattleBackend/apps/Mall/services/fulfillment.py` / `mark_mall_order_paid`、`fulfill_mall_order` | 事务行锁记录收款结果，以订单状态条件更新认领履约 |
| 手机摇杆 | `/home/xyz/Projects/BoundlessUniverse/BoundlessUniverseFrontend/pages/toMap/toMap.vue` / `normalizePosition`、`touchMove`、`touchEnd` | 坐标归一化、半径约束、100ms 持续发送定时器、松手归位与有限重连 |
| 大屏消息转发 | `/home/xyz/Projects/BoundlessUniverse/BoundlessUniverseBackend/BoundlessUniverseBackend/apps/websocket/consumers.py` / `PhoneConsumer.receive`、`broadcast_direction` | 方向、表情、文字消息经 `channel_layer.group_send` 转发 |

大屏模块的源码位于 BoundlessUniverse 仓库，沿用项目资料对该模块的归属说明；未将整套 BoundlessUniverse 项目计为 PuffWar 的独立开发成果。

本轮只读核对源码，未启动这些业务服务、访问运营数据库、进行支付或现场联机测试。

## 暂未写进对外稿的内容

- **项目月份**：求职素材写项目阶段为 2026.03–2026.04，先前个人时间线从 2026.02 开始描述第二段实习。实习开始时间与具体项目阶段可能不同，因此本稿暂不填项目月份，已有时间线未改动。
- **场馆编号**：较早对话提及七号展馆，面试故事稿出现五号场馆。正文统一写「线下场馆」，待核对后再补具体编号。
- **运营数字**：资料中的日活 500+、日均交易额 5k+、累计用户 4w+、商品 300+ 为既有运营口径，本轮未复核统计范围。对外稿暂不加入这些数字。
- **性能与可靠性承诺**：代码有指令发送、重连和交易判重逻辑；不据此写成经过本轮测量的延迟、吞吐量、零故障或多实例一致性保证。
- **上线与扫码**：上线状态沿用用户自述和项目资料；小程序码已做像素保留验证，未实际使用微信扫码。

## 本地交付状态

- 四张附件原图完整保存，校验值记录在 `asset-manifest.json`。
- 小程序码另存 336 × 336 PNG，裁掉上下说明并保留白底，未缩放或改动码图。
- 已按用户确认文稿接入画廊首项，包含完整介绍、三张现场图和小程序码；正文来自 `src/data/content.json` 的 `projects[].details`。尚未提交 Git 或部署。

## 画廊接入验证

- `npm run check:content`：21 项通过；`npm run build`：通过。
- 桌面 1440 × 900、手机 390 × 844：介绍、照片、小程序码与工具展开正常，没有横向溢出；控制台未记录错误。
- 原生对话框支持关闭按钮、背景点击和 Esc；Esc 的事件不会继续触发房间退出。
- 三张现场照片与发布用小程序码均与归档文件逐字节一致；封面 SVG 内嵌的是海洋球区原图。未通过微信实际扫码验证。
- 截图与浏览器验证记录保存在 `output/verification/puffwar-gallery/`。
