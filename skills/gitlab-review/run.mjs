import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GitLabReviewService } from './api.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 强制加载脚本所在目录下的 .env 文件
dotenv.config({ path: join(__dirname, '.env') });

const [,, action, rawData] = process.argv;

const CONFIG = {
    host: process.env.GITLAB_HOST || 'https://gitlab.xpaas.lenovo.com',
    token: process.env.GITLAB_TOKEN,
    projectId: process.env.GITLAB_PROJECT_ID, 
};

async function run() {
    if (!CONFIG.token) throw new Error('GITLAB_TOKEN is missing. Please set it in your environment or CONFIG.');
    
    const service = new GitLabReviewService(CONFIG.host, CONFIG.token, CONFIG.projectId);

    // 获取基础信息
    const branch = service.getCurrentBranch();
    const projectId = service.getProjectId();
    service.projectId = projectId;

    if (action === 'info') {
        process.stdout.write(`Branch: ${branch}\n`);
        process.stdout.write(`Project: ${decodeURIComponent(projectId)}\n`);
        if (branch) {
            const mrIid = await service.getMrIidByBranch(branch);
            process.stdout.write(`MR: ${mrIid ? `!${mrIid}` : 'None found'}\n`);
        }
        return;
    }

    if (action === 'changes') {
        const targetMrIid = rawData || (branch ? await service.getMrIidByBranch(branch) : null);
        if (!targetMrIid) {
            console.error('[Error] Please provide MR IID or ensure current branch has an open MR.');
            return;
        }
        console.log(`[Info] Fetching changes for MR !${targetMrIid}...`);
        const changes = await service.getMrChanges(targetMrIid);
        if (changes.length > 0) {
            console.log(`[Info] Found ${changes.length} changed files:`);
            changes.forEach(c => {
                const status = c.new_file ? 'A' : (c.deleted_file ? 'D' : (c.renamed_file ? 'R' : 'M'));
                console.log(`  ${status}  ${c.new_path}`);
            });
        } else {
            console.log('[Info] No changes found.');
        }
        return;
    }

    if (!rawData && action !== 'auto') {
        throw new Error('Usage: node run.mjs <auto|mrIid|info|changes> [json_data|mr_iid]');
    }

    let comments = [];
    if (rawData) {
        if (rawData.endsWith('.json')) {
            // 如果传入的是文件名，则读取文件内容
            const fs = await import('fs');
            const content = fs.readFileSync(join(process.cwd(), rawData), 'utf8');
            comments = JSON.parse(content);
        } else {
            try {
                comments = JSON.parse(rawData);
            } catch (e) {
                throw new Error(`Failed to parse comments JSON: ${e.message}`);
            }
        }
    }

    // 如果 action 为 'auto' 或未提供，则自动检测
    const targetMrIid = (action === 'auto' || !action) ? null : action;
    await service.autoSync(comments, targetMrIid);
    console.log('Done.');
}

run().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
