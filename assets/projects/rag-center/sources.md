# RAG-Center 文稿与素材来源

## 用户提供的图片

- `originals/01-project-poster.png`：来自附件 `codex-clipboard-000b4548-7e39-438d-9b6b-f89bdf00e251.png`。主文案为“让知识，成为可靠的答案。”，展示知识归集、混合检索和深度研究三个方向。
- `originals/02-workbench-prototype.png`：来自附件 `codex-clipboard-b9188330-e19a-4a28-aada-ab92da904bce.png`。画面包含知识库、文档上传、检索和研究入口，右下角注明“原型演示 · 示例数据”。本文稿不将其写为线上实录，不使用其中示例数量或文档名作为运营事实。
- 两张附件保留原始字节，未裁剪、转码或修改。

## 文字与职责依据

- 本地仓库 `/home/xyz/Projects/RAG-Center` 的 `README.md`、`docs/architecture.md`、`docs/api.md`：知识库管理、PDF/DOCX/文本导入、异步整理、关键词与语义检索、Research、证据和隔离范围。
- 求职资料 `01-简历/郑越-Agent全栈开发-261104.md` 的“企业 RAG 中台”段落，以及 `01-简历/郑越-Agent全栈开发.md` 对应项目段落：检索流程、文档整理、团队隔离、评测和 React 检索调试台等职责。
- 文稿面向个人网站访客，用日常查资料、核对规则和比较方案的场景解释功能；未采用简历中尚未在本次复验的指标数字，也未补写上线规模或使用人数。

## 当前源码核对

以下位置相对 `/home/xyz/Projects/RAG-Center/`：

| 位置 | 支撑的表述 |
| --- | --- |
| `Frontend/src/hooks/useUploadDocuments.ts` | txt、md、pdf、docx 上传，后台任务状态查询，成功与失败反馈 |
| `Frontend/src/pages/RetrievePage.tsx` | 单次检索与研究模式、速度/均衡/质量策略、候选结果、证据、研究步骤和不足提示 |
| `Backend/src/rag_center/modules/evidence/schemas.py` | 来源文档、章节路径、原文与证据分组 |
| `Backend/src/rag_center/prompts/research_planner.md` | 把问题拆成必要要点，依据真实资料确认前置条件 |
| `Backend/src/rag_center/prompts/research_decider.md` | 区分线索与直接依据，针对缺失内容补查 |
| `Backend/src/rag_center/prompts/research_finalizer.md` | 根据给定资料生成带依据的回答，标注材料不足和不同来源的冲突 |
| `docs/architecture.md` 的“当前索引与可靠发布” | 文件后台整理、失败重试和恢复、重建期间保留当前可查内容 |

普通检索用于返回资料片段；深度研究在已有知识库范围内组织查询、补查和回答。文稿不将普通检索直接写为生成答案，也不将研究描述为无限轮次或全网搜索。

## 本次接入

- 用户已确认 `copy-draft.md` 中的生活化文案，五个章节已同步至 `src/data/content.json` 的 `rag-center` 项目。
- 两张原始附件保持原字节，网页副本保存至 `public/content/projects/rag-center/`；封面保留标题留白，提供彩色和灰度两版。
- 阅读面板的工作台图片明确标注为原型演示与示例数据，末尾提供 `https://github.com/Twiink/RAG-Center` 源码入口。
- 本次仅调整个人网站的内容与展示素材，未执行 RAG-Center 应用测试、模型请求、数据库操作或部署，未提交 Git。
