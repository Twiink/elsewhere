# HarnessPRD 文稿与素材来源

## 用户提供的图片

- `originals/01-project-poster.png`：附件 `codex-clipboard-2b7ca889-04d4-4fe6-a744-583d8e2b1c55.png`。图片中的产品名为 ReqFlow，展示从需求录入到文档交付的过程。
- `originals/02-homepage-showcase.png`：附件 `codex-clipboard-15bfdb0e-c1a6-4725-b046-9c05afc49797.png`。展示从零填写、导入 PRD、导入 PRD 与接口文档三种起点，以及方案保存和导出。
- 图片来源为用户附件，不将其表述为本次运行验证的页面实录。

## 项目事实与职责

以下路径相对 `/home/xyz/Projects/HarnessPRD/`：

| 位置 | 支撑的说明 |
| --- | --- |
| `README.md` | 三种起点、需求追问、人工确认、三类文档生成与审查、版本记录、方案保存与交付包导出 |
| `PRODUCT.md` | 当前产品名 ReqFlow，面向产品经理与需求分析师，需求变更后下游文档待同步 |
| `frontend/src/App.tsx` 的 `syncSummaryBackToForm` | 将澄清内容转成更新后的摘要，对比改动后交给用户确认 |
| `frontend/src/utils/baseline.ts` | 已确认版本或内容发生变化时撤销原有需求确认 |
| `frontend/src/utils/deliveryStage.ts` | 需求确认后才能生成接口文档或开发提示词 |
| `frontend/src/hooks/useDocumentVersions.ts` | 版本列表、内容预览、保存快照、恢复版本与修改备注 |
| `backend/README.md` | 后台生成任务、进度与草稿查询、事件回放、结果保存；服务中断后的新尝试会重新生成，不等同于模型从原断点续写 |
| `frontend/package.json`、`backend/pyproject.toml` | React、TypeScript、Tailwind CSS、Python、FastAPI、Pydantic、SQLite、LangChain |
| `skills/`、`config/skills.yaml` | PRD、接口文档、开发提示词的生成规范 |

职责与仓库链接还参考了 `/home/xyz/obsidianlibrary/求职/01-简历/郑越-Agent全栈开发.md` 中「HarnessPRD 智能需求文档平台」段落。项目链接与本地 Git origin 均为 `https://github.com/Twiink/HarnessPRD`。文稿保留用户要求的 HarnessPRD 项目名，并说明界面使用 ReqFlow。

## 文稿边界

- 使用日常讨论想法、补齐需求和准备开发资料的场景描述功能，预约与取消仅为解释需求变更的例子。
- AI 追问后的实质改动需用户审阅确认；需求更新后提醒重新核对下游文档，不写成自动保证所有文档一致。
- 刷新页面后查看已有任务的进度与结果，与服务中断后模型继续生成的行为分别理解。
- 本次只读核对源码与文档，未运行 HarnessPRD、未调用模型、未操作业务数据库，未补写上线规模或成效指标。
- 用户已确认生活化文稿，五个章节与两张展示图已接入 `src/data/content.json` 的 `harness-prd` 项目；`rag-center` 与 `harness-prd` 均保留 GitHub 源码入口。
