---
name: menu-to-interfaces
title: 从 menu.json 到 页面接口 抽取与自然语言查询
version: 1.0
scope: oneportal
---

# Skill: 从 menu.json 到 页面接口 抽取与自然语言查询

Purpose
- 自动化提取仓库中 `menu.json` 的 `oneQESComponent` 对应的前端组件，并统计这些组件与其依赖的 API 模块中通过 `axios`/`http` 发起的 HTTP 接口。
- 提供轻量的自然语言查询（NL）入口，用于根据页面/菜单名称快速列出该页面涉及的接口（URL、源文件、请求参数候选、响应字段候选）。

When to use
- 需要盘点某页面或菜单项使用了哪些后端接口时。
- 需要将前端页面与所调用的接口建立可查询的清单（审计、迁移、接口文档、测试覆盖率等场景）。

Inputs
- `menu.json`（仓库根）
- 源代码：`packages/web/src/views`（组件）与 `packages/web/src/api`（接口模块）

Outputs
- `reports/menu-oneQES-axios.json` — 结构化提取结果
- `reports/menu-oneQES-axios.csv` — 表格导出，便于查看与筛选

Provided scripts (location: `scripts/`)
- `extract-menu-axios.js` — 从 `menu.json` 抽取组件并扫描 axios/http 调用，生成 JSON 报告。
- `export-menu-axios-csv.js` — 将 JSON 报告导出为 CSV。
- `query-report.js` — 基于 JSON 报告的自然语言查询 CLI（短语/菜单名片段模糊匹配）。

How it works (short)
- 读取 `menu.json`，递归收集 `oneQESComponent` 字段。
- 在 `packages/web/src/views` 中按组件名匹配 Vue 文件（多模式匹配）。
- 静态扫描组件文件与被引入的 API 模块（可递归）以提取 `axios` / `http` 请求字符串与基础请求信息（method、params 候选）。
- 将结果写入 JSON/CSV，并允许通过 `query-report.js` 用自然语言片段进行快速检索。

Usage examples
- Extract and export:
```bash
node scripts/extract-menu-axios.js
node scripts/export-menu-axios-csv.js
```
- Query by NL phrase:
```bash
node scripts/query-report.js "Home"
node scripts/query-report.js "Dashboard / PC Quality KPI Overview"
```

Typical responses
- `query-report.js` 会以组件为分组，列出每个接口行：`- URL | file: <path> | source: api|component`，并在可能时显示 `requestParams` 与 `responseFields` 的启发式候选。

Limitations and notes
- 静态提取基于正则和 heuristic，不能保证100% 覆盖：
  - 动态拼接（模板字符串、字符串拼接、复杂变量）将被标注为“动态 URL，需要人工分析”。
  - 响应字段与请求参数为启发式提取，精度有限。
- 建议对以下项进行改进（后续工作）：
  - 使用 AST 解析（Vue SFC/TS/JS）提高接口与参数提取准确率；
  - 使用 embeddings + 向量索引或 SQLite FTS 提升自然语言查询的语义匹配能力；
  - 将脚本加入 `package.json` 的 `scripts` 以便在 CI/PR 中自动运行。

Prompts (examples to trigger this skill)
- "生成 menu.json 中所有 oneQESComponent 的接口报告（JSON/CSV）。"
- "列出页面 'Dashboard / PC Quality KPI Overview' 使用的接口。"
- "把某页面所有 axios 接口导出为 CSV 给我。"

Files referenced
- scripts/extract-menu-axios.js
- scripts/export-menu-axios-csv.js
- scripts/query-report.js
- reports/menu-oneQES-axios.json
- reports/menu-oneQES-axios.csv

Next steps (suggested)
- （optional）我可以把三个脚本添加到 `package.json` scripts，或将 `query-report.js` 做为一个小型 HTTP 服务以供交互式查询。

Maintainer
- GitHub Copilot (generated). Please review and adapt prompts or commands to local workflows.
