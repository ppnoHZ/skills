import axios from 'axios';
import { execSync } from 'child_process';

export class GitLabReviewService {
    constructor(host, token, projectId) {
        this.host = host;
        this.token = token;
        this.projectId = projectId;
    }

    /**
     * 获取 GitLab 项目 ID
     * 如果构造函数没传，尝试从 git remote 中提取 (例如 lenovo/qes/one-process-web)
     */
    getProjectId() {
        if (this.projectId) return this.projectId;
        try {
            // 尝试获取远程仓库地址，优先检查 upstream，其次是 origin
            let remote = '';
            try {
                remote = execSync('git remote get-url upstream').toString().trim();
            } catch {
                remote = execSync('git remote get-url origin').toString().trim();
            }
            
            let path = '';
            if (remote.startsWith('git@')) {
                // git@host:group/project.git
                path = remote.split(':').slice(1).join(':').replace(/\.git$/, '');
            } else if (remote.startsWith('http')) {
                // http(s)://host/group/project.git
                const url = new URL(remote);
                path = url.pathname.replace(/^\/|\.git$/g, '');
            }
            if (path) {
                return encodeURIComponent(path);
            }
        } catch (e) {
            console.error('[Error] Failed to detect project ID:', e.message);
        }
        return null;
    }

    /**
     * 获取当前 git 分支名称
     */
    getCurrentBranch() {
        try {
            // 使用 rev-parse 获取分支名，兼容性更好
            const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
            if (branch === 'HEAD') {
                // 如果是 detached HEAD，尝试找关联的远程分支或直接报错
                console.error('[Error] Detached HEAD state detected. Cannot safely determine current branch.');
                return null;
            }
            return branch;
        } catch (e) {
            console.error('[Error] Failed to get current branch:', e.message);
            return null;
        }
    }

    /**
     * 根据分支名获取合并请求 (MR) 的 IID
     */
    async getMrIidByBranch(branchName) {
        if (!branchName) return null;
        // 增加 order_by 和 sort 确保获取的是最近更新的 MR
        const url = `${this.host}/api/v4/projects/${this.projectId}/merge_requests?source_branch=${encodeURIComponent(branchName)}&state=opened&order_by=updated_at&sort=desc`;
        try {
            console.log(`[Debug] Checking MRs for branch "${branchName}" at: ${url}`);
            const response = await axios.get(url, { headers: { 'PRIVATE-TOKEN': this.token } });
            if (response.data && response.data.length > 0) {
                if (response.data.length > 1) {
                    console.warn(`[Warn] Found ${response.data.length} open MRs for branch "${branchName}". Choosing the latest updated one: !${response.data[0].iid}`);
                    response.data.forEach(mr => console.warn(`  - !${mr.iid}: ${mr.title} (Target: ${mr.target_branch}, Updated: ${mr.updated_at})`));
                }
                return response.data[0].iid;
            }
            console.warn(`[Warn] No open MR found with source_branch="${branchName}" in project ${this.projectId}`);
        } catch (e) {
            console.error('[Error] Failed to fetch MR IID:', e.response?.data?.message || e.message);
        }
        return null;
    }

    /**
     * 获取指定 MR 的变更文件列表
     */
    async getMrChanges(mrIid) {
        if (!mrIid) return [];
        const url = `${this.host}/api/v4/projects/${this.projectId}/merge_requests/${mrIid}/changes`;
        try {
            const response = await axios.get(url, { headers: { 'PRIVATE-TOKEN': this.token } });
            // changes 字段包含文件列表
            return response.data.changes || [];
        } catch (e) {
            console.error('[Error] Failed to fetch MR changes:', e.response?.data?.message || e.message);
            return [];
        }
    }

    /**
     * 自动执行同步流程：检测分支 -> 查找 MR -> 同步评论
     */
    async autoSync(comments, manualMrIid = null) {
        const projectId = this.getProjectId();
        if (!projectId) {
            console.error('[Error] Project ID is required and could not be detected.');
            return;
        }
        this.projectId = projectId;

        let mrIid = manualMrIid;
        if (!mrIid) {
            const branch = this.getCurrentBranch();
            console.log(`[Info] Detected current branch: ${branch}`);
            mrIid = await this.getMrIidByBranch(branch);
        }

        if (!mrIid) {
            console.error('[Error] Could not find an open MR for the current branch. Please provide MR IID manually.');
            return;
        }

        console.log(`[Info] Projects ID: ${this.projectId}, MR: !${mrIid}`);
        console.log(`[Info] Syncing ${comments.length} comments...`);
        await this.postDiscussion(mrIid, comments);
    }

    async postDiscussion(mrIid, comments) {
        const discussionUrl = `${this.host}/api/v4/projects/${this.projectId}/merge_requests/${mrIid}/discussions`;
        const mrUrl = `${this.host}/api/v4/projects/${this.projectId}/merge_requests/${mrIid}`;
        const diffUrl = `${this.host}/api/v4/projects/${this.projectId}/merge_requests/${mrIid}/diffs`;

        try {
            const [mrResponse, diffResponse] = await Promise.all([
                axios.get(mrUrl, { headers: { 'PRIVATE-TOKEN': this.token } }),
                axios.get(diffUrl, { headers: { 'PRIVATE-TOKEN': this.token } })
            ]);

            const diffRefs = mrResponse.data.diff_refs;
            const changes = diffResponse.data;
            const mrWebUrl = mrResponse.data.web_url.split('/-/merge_requests')[0];

            let successCount = 0;
            let fallbackCount = 0;

            for (const comment of comments) {
                const fileLineUrl = `${mrWebUrl}/-/blob/${diffRefs.head_sha}/${comment.file}#L${comment.line}`;
                
                const fileChange = changes.find(c => c.new_path === comment.file || c.old_path === comment.file);
                let positionData = null;

                if (fileChange && fileChange.diff) {
                    const lineInfo = this.findLineInDiff(fileChange.diff, comment.line);
                    if (lineInfo) {
                        positionData = {
                            base_sha: diffRefs.base_sha,
                            head_sha: diffRefs.head_sha,
                            start_sha: diffRefs.start_sha,
                            new_path: fileChange.new_path,
                            old_path: fileChange.old_path,
                            position_type: 'text',
                            new_line: lineInfo.newLine,
                            old_line: lineInfo.oldLine
                        };
                    }
                }

                if (positionData) {
                    try {
                        const body = this.formatMessage(comment, fileLineUrl, false);
                        await axios.post(discussionUrl, { body, position: positionData }, {
                            headers: { 'PRIVATE-TOKEN': this.token },
                        });
                        console.log(`[Success] Posted positional comment: ${comment.file}:${comment.line}`);
                        successCount++;
                        continue;
                    } catch (error) {
                        console.warn(`[Warn] Positional post failed for ${comment.file}:${comment.line}, falling back:`, error.response?.data?.message || error.message);
                    }
                }

                // Fallback
                const fallbackBody = this.formatMessage(comment, fileLineUrl, true);
                if (await this.postFallbackNote(mrIid, comment, fallbackBody)) {
                    fallbackCount++;
                }
            }

            // Post Summary
            await this.postSummary(mrIid, successCount, fallbackCount, comments.length);

        } catch (error) {
            console.error(`[Fatal] GitLab API error:`, error.response?.data || error.message);
        }
    }

    async postSummary(mrIid, success, fallback, total) {
        const noteUrl = `${this.host}/api/v4/projects/${this.projectId}/merge_requests/${mrIid}/notes`;
        const body = `### 🤖 Code Review Sync Summary
- **Total Issues Found:** ${total}
- **Positional Comments:** ${success} ✅
- **Legacy Code Notes:** ${fallback} ℹ️
- **Status:** Sync completed successfully.`;
        try {
            await axios.post(noteUrl, { body }, { headers: { 'PRIVATE-TOKEN': this.token } });
        } catch (e) {
            console.warn('[Warn] Failed to post summary:', e.message);
        }
    }

    /**
     * 在 diff 内容中查找特定行号对应的位置信息
     */
    findLineInDiff(diffText, targetNewLine) {
        if (!diffText) return null;
        // 改进正则以更好地提取 hunk header
        const hunks = diffText.split(/^@@/m).slice(1);
        for (const hunk of hunks) {
            const headerMatch = hunk.match(/ -(\d+),?\d* \+(\d+),?\d* @@/);
            if (!headerMatch) continue;

            let oldLine = parseInt(headerMatch[1]);
            let newLine = parseInt(headerMatch[2]);
            
            const lines = hunk.split('\n').slice(1);
            for (const line of lines) {
                if (line.startsWith('-')) {
                    oldLine++;
                } else if (line.startsWith('+')) {
                    if (newLine === targetNewLine) return { oldLine: null, newLine: newLine };
                    newLine++;
                } else {
                    if (newLine === targetNewLine) return { oldLine: oldLine, newLine: newLine };
                    oldLine++;
                    newLine++;
                }
                // 如果当前 newLine 已经超过目标，说明不在这个 hunk 里，或者是没找到
                if (newLine > targetNewLine) break;
            }
        }
        return null;
    }

    async postFallbackNote(mrIid, comment, body) {
        try {
            const fallbackUrl = `${this.host}/api/v4/projects/${this.projectId}/merge_requests/${mrIid}/notes`;
            await axios.post(fallbackUrl, { body }, {
                headers: { 'PRIVATE-TOKEN': this.token }
            });
            console.log(`[Fallback] Posted note for ${comment.file}:${comment.line}`);
            return true;
        } catch (err) {
            console.error(`[Error] Fallback note failed:`, err.message);
            return false;
        }
    }

    formatMessage(c, fileLineUrl, isFallback) {
        let msg = `**Issue:** ${c.description}
${c.suggestion ? `**Suggestion:**
\`\`\`vue
${c.suggestion}
\`\`\`` : ''}`;

        if (isFallback) {
            msg = `**File:** [${c.file} (Line ${c.line})](${fileLineUrl})\n` + msg + 
            `\n\n---\n*💡 此行不在本次 MR 的直接 Diff 范围内，点击上方文件名链接可在文件浏览器中查看对应位置。*`;
        }
        return msg;
    }
}
