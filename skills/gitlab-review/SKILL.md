---
name: GitLab Review Sync Skill
description:  -用户一般会提问：review [MR_IID]
- 当用户没有提供 MR_IID 时，脚本会尝试自动检测当前项目、分支及其关联的 Open MR。
- 对gitlab merge request 提交的代码进行review 并将 GitHub Copilot 生成的 Review 结果同步到指定的 GitLab Merge Request。

## Review 结果 JSON 格式要求
为了确保脚本能够正确解析并发表评论，生成的 JSON 必须是一个对象数组，且**严格遵循以下字段名称**：

| 字段名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `file` | `string` | 是 | 文件的相对路径（如 `packages/bpm-web/src/App.vue`）。 |
| `line` | `number` | 是 | 评论对应的代码行号（1-based）。 |
| `description` | `string` | 是 | **评审内容**。必须使用该字段存储评论，支持 Markdown。请确保使用中文。 |
| `suggestion` | `string` | 否 | 代码修改建议。如果提供，将以 Vue 代码块形式展示。 |

### 示例格式
```json
[
  {
    "file": "packages/bpm-web/src/api/qmp/dataassets.ts",
    "line": 139,
    "description": "### 🐞 参数不匹配\n发现 `deleteMobileUploadFile` API 的参数定义与调用处不一致，请核对后端接口文档。",
    "suggestion": "export const deleteMobileUploadFile = (params: { dataAssetId: string }) => { ... };"
  }
]
```

---

# GitLab Review Sync Skill

## 描述
- 用户一般会提问：review [MR_IID]
- 当用户没有提供 MR_IID 时，脚本会尝试自动检测当前项目、分支及其关联的 Open MR。
- 对gitlab merge request 提交的代码进行review 并将 GitHub Copilot 生成的 Review 结果（JSON 格式）同步到指定的 GitLab Merge Request 的代码行内评论区。

**Review 指南：**
1. **中文评论**：评论请务必使用中文。
2. **全面审查**：请务必对整个文件的内容进行 review，而不仅仅是 diff 部分。
3. **代码规范**：在评审 Vue 组件时，请严格参考 [.github/skills/gitlab-review/vue.md](vue.md) 中定义的编码规范（如强制使用 `defineModel` 等）。


## 使用方法
1. 确保环境变量 `GITLAB_TOKEN` 已设置（或在 `run.mjs` 中配置）。
2. 运行同步脚本：
   - **查看当前状态**: 查看脚本检测到的项目、分支和 MR ID。
     ```bash
     node .github/skills/gitlab-review/run.mjs info
     ```
   - **获取变更文件**: 获取当前或指定 MR 的变更文件列表。
     ```bash
     node .github/skills/gitlab-review/run.mjs changes [MR_IID]
     ```
   - **自动模式** (推荐): 自动检测当前工程项目、当前分支及其关联的 Open MR 并同步评论。
     ```bash
     node .github/skills/gitlab-review/run.mjs auto '<JSON_DATA>'
     ```
   - **手动模式**:
     ```bash
     node .github/skills/gitlab-review/run.mjs <MR_IID> '<JSON_DATA>'
     ```

## 特性
- **智能定位**: 自动解析 Git Diff，尝试将评论发表到具体的改动行。
- **降级支持**: 如果改动行不在当前 MR 范围内（遗留代码），则发表为普通评论并带上文件深层链接。
- **自动汇总**: 完成后在 MR 下方发表本次同步的汇总信息。
- **自动检测**: 自动从 `git remote` 获取项目路径，从 `git branch` 获取合并请求。
