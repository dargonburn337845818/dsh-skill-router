/**
 * dsh-skill-router — 启发式路由分类。
 *
 * 设计遵循 dsh-routing-suite 的“外部路由”原则：模型不自选，由规则/用户决定。
 * 只做确定性、可测试的文本分类，不调用 LLM。
 */
const CORE_RE = /蒸馏|提炼|做成skill|做成技能|知识节点|迭代|收敛|元能力|收益|filter|distill|iterate|validate|收敛判断|价值驱动/i;
const DEV_RE = /开发|编码|写代码|重构|修复|调试|实现|插件|项目|架构|模块|接口|部署|build|develop|implement|refactor|fix|debug|code|plugin/i;
const SEARCH_RE = /查资料|搜索|调研|检索|来源|github|论文|学术|包生态|npm|pypi|osv|漏洞|release|commit|文档|查一下|找一下|search|research|source/i;
const DOMAIN_RE = [
    { scenario: 'teaching', re: /教师|教学|算法竞赛|拆题|思维题|tourist|jiangly|熵减盘问/i },
    { scenario: 'learning', re: /(?<!机器|深度|强化)学习|自学|怎么学|如何学|十倍速|10x|ai学习|AI学习|第二大脑|知识管理|笔记|费曼|主动回忆|学习计划|learn|learning|how to learn|study/i },
    { scenario: 'research', re: /论文|组会|科研|vlpc|汇报|学术|物理|报告/i },
    { scenario: 'writing', re: /提示词|prompt|文案|文稿|写作|写报告|写文档|写周报|写总结|演讲稿|ppt文案|去ai味|去AI味|copywriting/i },
    { scenario: 'github', re: /github|开源仓库|release|actions|readme|仓库页|发布/i },
    { scenario: 'dsh-ops', re: /dsh|运维|插件升级|热更|子代理|重启|回滚|skill管理|技能库|保险库/i },
];
export function classifyRoute(text) {
    const t = String(text || '');
    if (!t.trim())
        return { route: 'base', confidence: 'low' };
    if (CORE_RE.test(t))
        return { route: 'core', confidence: 'high' };
    // 显式“查/搜/找来源”优先归搜索底座，避免把资料查询误判成领域任务。
    if (SEARCH_RE.test(t) && /查|搜|找|调研|来源|检索|search|source|查找/i.test(t)) {
        return { route: 'base', confidence: 'high' };
    }
    for (const domain of DOMAIN_RE) {
        if (domain.re.test(t))
            return { route: 'domain', scenario: domain.scenario, confidence: 'high' };
    }
    if (DEV_RE.test(t))
        return { route: 'dev', confidence: 'high' };
    if (SEARCH_RE.test(t))
        return { route: 'base', confidence: 'medium' };
    // 无法判别时回到常驻搜索底座，让用户在面板显式切换。
    return { route: 'base', confidence: 'low' };
}
export function routeLabel(route, scenario) {
    if (route === 'core')
        return '核心 Skill 迭代';
    if (route === 'dev')
        return '开发 / 重构';
    if (route === 'domain') {
        const map = {
            teaching: '教学 / 算法竞赛',
            learning: 'AI 学习 / 自我提升',
            research: '科研 / 论文',
            github: 'GitHub / 开源',
            'dsh-ops': 'DSH 运维 / 插件',
            writing: '文稿 / 提示词 / 文案 / 报告',
        };
        return map[scenario || ''] || `领域：${scenario || '未知'}`;
    }
    return '搜索 / 查资料';
}
//# sourceMappingURL=classify.js.map