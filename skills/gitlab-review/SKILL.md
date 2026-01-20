# GitLab Review Sync Skill

## 描述
将 GitHub Copilot 生成的 Review 结果（JSON 格式）同步到指定的 GitLab Merge Request 的代码行内评论区。

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
