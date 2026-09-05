window.__ModuleLoader__.load({
  id: "@dsh-external/dsh-skill-router",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    /**
 * @dsh-external/dsh-skill-router — 过程监视器。
 *
 * 顶部显示当前模式/进程；中间是调用链；
 * 教师/科研模式显示专家讨论流。数据来源于 vault 的 /teacher/status 与 /skill-router/api/status，不做假数据兜底。
 */
const { createElement, useEffect, useMemo, useRef, useState } = require('react');
const inject = ['slots'];
const MODES = [
    { id: 'base', label: '搜索/底座' },
    { id: 'dev', label: '开发' },
    { id: 'distill', label: '蒸馏' },
    { id: 'teacher', label: '教师' },
    { id: 'research', label: '科研' },
    { id: 'writing', label: '文稿' },
    { id: 'domain', label: '领域' },
];
const PANEL_CLASS = 'dsh-skill-router-monitor';
/* 视觉统一：颜色/字体/边框走 DSH host 变量，明暗主题自动适配。 */
const UI_CSS = `
.${PANEL_CLASS} {
  box-sizing: border-box;
  padding: 12px;
  color: var(--dsw-alias-label-primary, #1f2328);
  font-family: var(--dsw-font-family, ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif);
  font-size: 13px;
  line-height: 20px;
}

.${PANEL_CLASS} *,
.${PANEL_CLASS} *::before,
.${PANEL_CLASS} *::after {
  box-sizing: border-box;
}

.${PANEL_CLASS} .dsh-monitor-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  margin-bottom: 10px;
}

.${PANEL_CLASS} .dsh-monitor-head-main {
  min-width: 0;
}

.${PANEL_CLASS} .dsh-monitor-title {
  margin: 0;
  color: var(--dsw-alias-label-primary, #1f2328);
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
}

.${PANEL_CLASS} .dsh-monitor-current {
  margin: 2px 0 0;
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
  line-height: 18px;
}

.${PANEL_CLASS} .dsh-monitor-team {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border: .5px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, .16));
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary, #444951);
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, .02));
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
}

.${PANEL_CLASS} .dsh-monitor-team-label {
  color: var(--dsw-alias-label-tertiary, #62676d);
}

.${PANEL_CLASS} .dsh-monitor-team-names {
  font-weight: 500;
  color: var(--dsw-alias-label-primary, #1f2328);
}

.${PANEL_CLASS} .dsh-monitor-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.${PANEL_CLASS} .dsh-monitor-mode {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border: .5px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, .16));
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary, #444951);
  background: transparent;
  font-size: 12px;
  line-height: 18px;
}

.${PANEL_CLASS} .dsh-monitor-mode.is-active {
  border-color: var(--dsw-alias-state-business-primary, #3866b3);
  color: var(--dsw-alias-label-primary, #1f2328);
  background: var(--dsw-alias-bg-module-platform, rgba(56, 102, 179, .08));
  font-weight: 500;
}

.${PANEL_CLASS} .dsh-monitor-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.${PANEL_CLASS} .dsh-monitor-col {
  min-width: 0;
  border: .5px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .06));
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, .02));
  padding: 10px;
}

.${PANEL_CLASS} .dsh-monitor-col-title {
  margin: 0 0 6px;
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
}

.${PANEL_CLASS} .dsh-monitor-trace,
.${PANEL_CLASS} .dsh-monitor-discussion {
  margin: 0;
  padding: 0;
  list-style: none;
}

.${PANEL_CLASS} .dsh-monitor-trace-row {
  display: grid;
  grid-template-columns: 8px 34px minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  padding: 6px 0;
  border-bottom: .5px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .06));
}

.${PANEL_CLASS} .dsh-monitor-trace-row:last-child {
  border-bottom: 0;
}

.${PANEL_CLASS} .dsh-monitor-dot {
  align-self: center;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dsw-alias-state-success-primary, #16794b);
}

.${PANEL_CLASS} .dsh-monitor-dot.is-adjudicated {
  background: var(--dsw-alias-state-business-primary, #3866b3);
}

.${PANEL_CLASS} .dsh-monitor-dot.is-running {
  background: var(--dsw-alias-state-warn-primary, #8a5a00);
}

.${PANEL_CLASS} .dsh-monitor-time {
  flex: none;
  color: var(--dsw-alias-label-tertiary, #62676d);
  font-variant-numeric: tabular-nums;
}

.${PANEL_CLASS} .dsh-monitor-body-text {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
  line-height: 18px;
}

.${PANEL_CLASS} .dsh-monitor-actor {
  color: var(--dsw-alias-label-primary, #1f2328);
  font-weight: 500;
}

.${PANEL_CLASS} .dsh-monitor-status {
  flex: none;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 16px;
  font-weight: 500;
}

.${PANEL_CLASS} .dsh-monitor-status.is-done {
  color: var(--dsw-alias-state-success-primary, #16794b);
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16794b) 10%, transparent);
}

.${PANEL_CLASS} .dsh-monitor-status.is-adjudicated {
  color: var(--dsw-alias-state-business-primary, #3866b3);
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #3866b3) 10%, transparent);
}

.${PANEL_CLASS} .dsh-monitor-status.is-running {
  color: var(--dsw-alias-state-warn-primary, #8a5a00);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #8a5a00) 10%, transparent);
}

.${PANEL_CLASS} .dsh-monitor-discussion-row {
  display: flex;
  gap: 8px;
  min-width: 0;
  padding: 8px 0;
  border-bottom: .5px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .06));
}

.${PANEL_CLASS} .dsh-monitor-discussion-row:last-child {
  border-bottom: 0;
}

.${PANEL_CLASS} .dsh-monitor-round {
  flex: none;
  display: grid;
  place-items: center;
  width: 30px;
  height: 20px;
  border-radius: 6px;
  background: var(--dsw-alias-bg-module-platform, rgba(0, 0, 0, .05));
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
}

.${PANEL_CLASS} .dsh-monitor-discussion-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.${PANEL_CLASS} .dsh-monitor-expert {
  color: var(--dsw-alias-label-primary, #1f2328);
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
}

.${PANEL_CLASS} .dsh-monitor-stance {
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}

.${PANEL_CLASS} .dsh-monitor-verdict {
  align-self: flex-start;
  margin-top: 2px;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 16px;
  font-weight: 500;
}

.${PANEL_CLASS} .dsh-monitor-verdict.is-adopt {
  color: var(--dsw-alias-state-success-primary, #16794b);
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16794b) 10%, transparent);
}

.${PANEL_CLASS} .dsh-monitor-verdict.is-ref {
  color: var(--dsw-alias-state-warn-primary, #8a5a00);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #8a5a00) 10%, transparent);
}

.${PANEL_CLASS} .dsh-monitor-note {
  margin: 12px 2px 0;
  color: var(--dsw-alias-label-tertiary, #62676d);
  font-size: 11px;
  line-height: 16px;
}

@media (max-width: 520px) {
  .${PANEL_CLASS} {
    padding: 10px;
  }

  .${PANEL_CLASS} .dsh-monitor-body {
    grid-template-columns: 1fr;
  }

  .${PANEL_CLASS} .dsh-monitor-trace-row {
    grid-template-columns: 8px 30px minmax(0, 1fr);
  }

  .${PANEL_CLASS} .dsh-monitor-status {
    grid-column: 2 / 4;
    justify-self: start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .${PANEL_CLASS} * {
    transition: none;
  }
}
`;
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className)
        node.className = className;
    if (text !== undefined)
        node.textContent = text;
    return node;
}
function statusClass(status) {
    if (status === 'done')
        return 'is-done';
    if (status === 'adjudicated')
        return 'is-adjudicated';
    return 'is-running';
}
function dotClass(status) {
    if (status === 'adjudicated')
        return 'is-adjudicated';
    if (status !== 'done')
        return 'is-running';
    return '';
}
function verdictClass(verdict) {
    return ['采纳', '裁决', '结论', 'merge', 'adopt_a', 'adopt_b'].includes(verdict) ? 'is-adopt' : 'is-ref';
}
function buildTrace(data) {
    const s = data?.teacher?.current;
    if (s) {
        const domainName = s.domain ? `${s.domain.name}（${s.domain.id}）` : '未知领域';
        const names = (s.experts || []).map((e) => e.displayNameZh || e.displayName || e.name).join(' / ');
        const trace = [
            { time: 'now', actor: '路由', action: `识别领域：${domainName}`, status: 'done' },
            { time: 'now', actor: '专家库', action: `专家团：${names || '无 ready 专家'}`, status: s.discussion?.status === 'expert_gap' ? 'running' : 'done' },
        ];
        for (const r of s.discussion?.rounds || []) {
            for (const sp of r.speaks || []) {
                trace.push({
                    time: `R${r.round}`,
                    actor: sp.expert_name,
                    action: sp.stance,
                    status: r.adjudications?.length ? 'adjudicated' : 'done',
                });
            }
        }
        return trace;
    }
    const r = data?.router;
    if (r?.label) {
        const trace = [
            { time: 'now', actor: '路由', action: `当前工作流：${r.label}`, status: 'done' },
        ];
        if (r.enabled?.length) {
            trace.push({ time: 'now', actor: '技能库', action: `已启用 ${r.enabled.length} 个 skill`, status: 'done' });
        }
        if (r.suggested?.length) {
            trace.push({ time: 'now', actor: '推荐', action: `建议调用：${r.suggested.join('、')}`, status: 'running' });
        }
        return trace;
    }
    return [];
}
function modeFromRouter(router) {
    const route = router?.route || 'base';
    if (route === 'core')
        return 'distill';
    if (route === 'dev')
        return 'dev';
    if (route === 'domain') {
        if (router?.scenario === 'research')
            return 'research';
        if (router?.scenario === 'teaching')
            return 'teacher';
        if (router?.scenario === 'writing')
            return 'writing';
        return 'domain';
    }
    return 'base';
}
function buildDiscussion(data) {
    const s = data?.teacher?.current;
    if (!s)
        return [];
    if (s.discussion?.status === 'expert_gap') {
        return [{
                round: 0,
                expert: '专家缺口',
                stance: s.discussion?.gap_fallback?.question || '该领域暂无 ready 人名专家',
                verdict: '缺口',
            }];
    }
    const rows = [];
    for (const r of s.discussion?.rounds || []) {
        for (const sp of r.speaks || []) {
            rows.push({ round: r.round, expert: sp.expert_name, stance: sp.stance, verdict: r.adjudications?.length ? '裁决' : '表态' });
        }
        for (const c of r.conflicts || []) {
            rows.push({
                round: r.round,
                expert: `${c.claim_a?.expert_name} vs ${c.claim_b?.expert_name}`,
                stance: c.topic,
                verdict: '冲突',
            });
        }
        for (const cc of r.conclusions || []) {
            rows.push({ round: r.round, expert: cc.expert_name, stance: cc.text, verdict: cc.decision || '结论' });
        }
    }
    if (!rows.length) {
        rows.push({ round: 0, expert: '教师会话', stance: '尚无讨论轮次；调用 teacher_discussion_start / teacher_discussion_round 开始。', verdict: '待开始' });
    }
    return rows;
}
function createMonitorPanel(data) {
    return {
        render() {
            const root = el('div', PANEL_CLASS);
            const style = document.createElement('style');
            style.textContent = UI_CSS;
            root.appendChild(style);
            const current = data?.teacher?.current;
            const router = data?.router;
            const mode = modeFromRouter(router);
            const activeMode = MODES.find((m) => m.id === mode);
            const routerLabel = router?.label || activeMode?.label || '搜索 / 查资料';
            const domainLabel = current?.domain ? `${current.domain.name}（${current.domain.id}）` : '';
            const teamNames = current?.experts?.length
                ? current.experts.map((e) => e.displayNameZh || e.displayName || e.name).join(' / ')
                : mode === 'teacher'
                    ? '未开始'
                    : '';
            const sessionState = current?.discussion?.status === 'expert_gap'
                ? '· 专家缺口'
                : current?.discussion?.status === 'finished'
                    ? '· 已完成'
                    : current
                        ? `· 第 ${current.discussion?.current_round || 0} 轮`
                        : '';
            const processLine = current
                ? `当前进程：${routerLabel} · 领域：${domainLabel}${sessionState}`
                : `当前进程：${routerLabel}`;
            const head = el('header', 'dsh-monitor-head');
            const headMain = el('div', 'dsh-monitor-head-main');
            headMain.append(el('h2', 'dsh-monitor-title', '专家组'), el('p', 'dsh-monitor-current', processLine));
            const team = el('span', 'dsh-monitor-team');
            if (teamNames) {
                team.append(el('span', 'dsh-monitor-team-label', '专家团'), el('span', 'dsh-monitor-team-names', teamNames));
            }
            else {
                team.append(el('span', 'dsh-monitor-team-label', '技能库'), el('span', 'dsh-monitor-team-names', `已启用 ${router?.enabled?.length || 0} 个`));
            }
            head.append(headMain, team);
            root.appendChild(head);
            const modes = el('div', 'dsh-monitor-modes');
            modes.setAttribute('role', 'list');
            for (const m of MODES) {
                const isActive = m.id === mode;
                const chip = el('span', `dsh-monitor-mode${isActive ? ' is-active' : ''}`, m.label);
                chip.setAttribute('role', 'listitem');
                if (isActive)
                    chip.setAttribute('aria-current', 'true');
                modes.appendChild(chip);
            }
            root.appendChild(modes);
            const body = el('div', 'dsh-monitor-body');
            const traceCol = el('section', 'dsh-monitor-col');
            traceCol.append(el('h3', 'dsh-monitor-col-title', '调用链'));
            const trace = el('ul', 'dsh-monitor-trace');
            trace.setAttribute('role', 'list');
            const traceItems = buildTrace(data);
            for (const item of traceItems) {
                const row = el('li', 'dsh-monitor-trace-row');
                row.setAttribute('role', 'listitem');
                const dot = el('span', `dsh-monitor-dot ${dotClass(item.status)}`);
                dot.setAttribute('aria-hidden', 'true');
                const time = el('span', 'dsh-monitor-time', item.time);
                time.setAttribute('aria-hidden', 'true');
                const bodyText = el('span', 'dsh-monitor-body-text');
                bodyText.append(el('span', 'dsh-monitor-actor', item.actor), document.createTextNode(`：${item.action}`));
                const st = el('span', `dsh-monitor-status ${statusClass(item.status)}`, item.status);
                row.append(dot, time, bodyText, st);
                trace.appendChild(row);
            }
            traceCol.appendChild(trace);
            body.appendChild(traceCol);
            const discussionCol = el('section', 'dsh-monitor-col');
            discussionCol.append(el('h3', 'dsh-monitor-col-title', '专家讨论'));
            const discussion = el('ul', 'dsh-monitor-discussion');
            discussion.setAttribute('role', 'list');
            const discussionItems = buildDiscussion(data);
            for (const item of discussionItems) {
                const row = el('li', 'dsh-monitor-discussion-row');
                row.setAttribute('role', 'listitem');
                const round = el('span', 'dsh-monitor-round', `R${item.round}`);
                round.setAttribute('aria-hidden', 'true');
                const content = el('div', 'dsh-monitor-discussion-content');
                content.append(el('span', 'dsh-monitor-expert', item.expert), el('span', 'dsh-monitor-stance', item.stance), el('span', `dsh-monitor-verdict ${verdictClass(item.verdict)}`, item.verdict));
                row.append(round, content);
                discussion.appendChild(row);
            }
            discussionCol.appendChild(discussion);
            body.appendChild(discussionCol);
            const note = current
                ? '教师讨论流来自 /skill-vault/api/teacher/status（只读展示）。'
                : router?.label
                    ? '当前数据来自 /skill-router/api/status；教师讨论仅在教师会话数据返回后展示。'
                    : '暂无路由状态数据（未返回真实轨迹）。';
            root.append(body, el('p', 'dsh-monitor-note', note));
            return root;
        },
    };
}
async function fetchJson(url, signal) {
    const res = await fetch(url, { headers: { accept: 'application/json' }, signal });
    if (!res.ok)
        throw new Error(`${url} ${res.status}`);
    return await res.json();
}
function SkillRouterPanelComponent() {
    const hostRef = useRef(null);
    useEffect(() => {
        const container = hostRef.current;
        if (!container)
            return;
        let cancelled = false;
        let timer;
        let currentAbort = null;
        let refreshing = false;
        const render = (data) => {
            if (cancelled)
                return;
            container.replaceChildren(createMonitorPanel(data).render());
        };
        const refresh = async () => {
            if (cancelled || refreshing || document.visibilityState === 'hidden')
                return;
            refreshing = true;
            currentAbort?.abort();
            const controller = new AbortController();
            currentAbort = controller;
            try {
                const [router, teacher] = await Promise.all([
                    fetchJson('/skill-router/api/status', controller.signal).catch(() => null),
                    fetchJson('/skill-vault/api/teacher/status', controller.signal).catch(() => null),
                ]);
                if (!cancelled && !controller.signal.aborted)
                    render({ router, teacher });
            }
            catch {
                // Abort/network errors: keep the last rendered state.
            }
            finally {
                if (currentAbort === controller)
                    currentAbort = null;
                refreshing = false;
            }
        };
        const startTimer = () => {
            if (!timer)
                timer = setInterval(() => void refresh(), 5000);
        };
        const stopTimer = () => {
            if (timer) {
                clearInterval(timer);
                timer = undefined;
            }
        };
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') {
                stopTimer();
                currentAbort?.abort();
            }
            else {
                startTimer();
                void refresh();
            }
        };
        void refresh();
        if (document.visibilityState !== 'hidden')
            startTimer();
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            cancelled = true;
            stopTimer();
            currentAbort?.abort();
            document.removeEventListener('visibilitychange', onVisibility);
            if (container.isConnected)
                container.replaceChildren();
        };
    }, []);
    return createElement('div', { ref: hostRef });
}
const FLOW_COLORS = {
    research: '#2563eb',
    dev: '#059669',
    teacher: '#8b5cf6',
    writing: '#d97706',
    distill: '#7c3aed',
    base: '#64748b',
};
const AI_FLOW_CSS = `
.ai-blackbox-flow {
  box-sizing: border-box;
  padding: 12px;
  min-height: 320px;
  color: var(--dsw-alias-label-primary, #1f2328);
  font-family: var(--dsw-font-family, ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif);
  font-size: 13px;
  line-height: 20px;
}
.ai-blackbox-flow * , .ai-blackbox-flow *::before, .ai-blackbox-flow *::after { box-sizing: border-box; }
.ai-blackbox-flow .ai-flow-head {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.ai-blackbox-flow .ai-flow-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
}
.ai-blackbox-flow .ai-flow-sub {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
}
.ai-blackbox-flow .ai-flow-tag {
  padding: 2px 8px;
  border: .5px solid var(--dsw-alias-border-l3, rgba(0,0,0,.16));
  border-radius: 999px;
  font-weight: 500;
}
.ai-blackbox-flow .ai-flow-running {
  color: var(--dsw-alias-state-warn-primary, #8a5a00);
}
.ai-blackbox-flow .ai-flow-hint {
  color: var(--dsw-alias-label-tertiary, #62676d);
}
.ai-blackbox-flow .ai-flow-svg {
  display: block;
  width: 100%;
  height: auto;
  background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,.02));
  border: .5px solid var(--dsw-alias-border-l1, rgba(0,0,0,.06));
  border-radius: 12px;
}
.ai-blackbox-flow .ai-flow-current {
  filter: drop-shadow(0 0 6px rgba(37, 99, 235, .35));
  animation: ai-flow-pulse 1.6s ease-in-out infinite;
}
@keyframes ai-flow-pulse {
  0%, 100% { stroke-opacity: .85; }
  50% { stroke-opacity: 1; }
}
.ai-blackbox-flow .ai-flow-empty {
  color: var(--dsw-alias-label-tertiary, #62676d);
  padding: 24px 0;
  text-align: center;
}
.ai-blackbox-flow .ai-flow-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-bottom: 10px;
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
}
.ai-blackbox-flow .ai-flow-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.ai-blackbox-flow .ai-flow-legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.ai-blackbox-flow .ai-flow-now {
  margin-bottom: 8px;
  padding: 6px 8px;
  border-left: 3px solid var(--dsw-alias-state-business-primary, #3866b3);
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
  line-height: 18px;
  word-break: break-word;
}
.ai-blackbox-flow .ai-natural-card {
  margin-bottom: 10px;
  padding: 8px 10px;
  border: .5px solid var(--dsw-alias-border-l2, rgba(0,0,0,.1));
  border-left: 3px solid var(--dsw-alias-state-business-primary, #3866b3);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,.02));
}
.ai-blackbox-flow .ai-natural-title {
  color: var(--dsw-alias-label-tertiary, #62676d);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .04em;
  margin-bottom: 4px;
}
.ai-blackbox-flow .ai-natural-text {
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 13px;
  line-height: 20px;
  word-break: break-word;
}
.ai-blackbox-flow .ai-flow-node {
  animation: ai-flow-enter .25s ease;
}
.ai-blackbox-flow .ai-flow-clickable:hover {
  filter: brightness(.96);
}
.ai-blackbox-flow .ai-flow-edge {
  animation: ai-flow-dash 1.2s linear infinite;
}
@keyframes ai-flow-enter {
  from { opacity: .35; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes ai-flow-dash {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -18; }
}
.ai-blackbox-flow .ai-work-flow {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 6px;
  margin: 12px 0;
}
.ai-blackbox-flow .ai-phase-card {
  flex: 1;
  min-width: 150px;
  border: .5px solid var(--dsw-alias-border-l2, rgba(0,0,0,.1));
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,.02));
  padding: 10px;
}
.ai-blackbox-flow .ai-phase-card.active {
  border-color: var(--dsw-alias-state-business-primary, #3866b3);
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #3866b3) 7%, transparent);
}
.ai-blackbox-flow .ai-phase-icon { font-size: 18px; line-height: 22px; }
.ai-blackbox-flow .ai-phase-title { font-weight: 600; font-size: 13px; line-height: 20px; margin-top: 4px; }
.ai-blackbox-flow .ai-phase-count { color: var(--dsw-alias-state-business-primary, #3866b3); font-size: 12px; margin-top: 2px; }
.ai-blackbox-flow .ai-phase-tools { color: var(--dsw-alias-label-secondary, #444951); font-size: 12px; line-height: 18px; margin-top: 4px; word-break: break-all; }
.ai-blackbox-flow .ai-phase-files { color: var(--dsw-alias-label-tertiary, #62676d); font-size: 11px; line-height: 16px; margin-top: 4px; word-break: break-all; }
.ai-blackbox-flow .ai-phase-arrow { align-self: center; color: var(--dsw-alias-label-tertiary, #62676d); font-size: 18px; }
.ai-blackbox-flow .ai-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.ai-blackbox-flow .ai-summary-card {
  border: .5px solid var(--dsw-alias-border-l2, rgba(0,0,0,.1));
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,.02));
  padding: 10px;
}
.ai-blackbox-flow .ai-summary-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--dsw-alias-label-tertiary, #62676d);
  margin-bottom: 6px;
}
.ai-blackbox-flow .ai-summary-text {
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
  line-height: 18px;
}
.ai-blackbox-flow .ai-summary-muted {
  color: var(--dsw-alias-label-tertiary, #62676d);
  font-size: 12px;
}
.ai-blackbox-flow .ai-recent-line {
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
  line-height: 18px;
}
.ai-blackbox-flow .ai-file-chip {
  display: block;
  padding: 3px 6px;
  margin: 2px 0;
  border: .5px solid var(--dsw-alias-border-l2, rgba(0,0,0,.1));
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,.02));
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  word-break: break-all;
}
.ai-blackbox-flow .ai-map-block {
  margin: 12px 0;
}
.ai-blackbox-flow .ai-map-title {
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .04em;
  margin-bottom: 8px;
}
.ai-blackbox-flow .ai-map-svg {
  display: block;
  width: 100%;
  height: auto;
  overflow-x: auto;
}
.ai-blackbox-flow .ai-map-node {
  animation: ai-flow-enter .25s ease;
  user-select: none;
  -webkit-user-select: none;
}
.ai-blackbox-flow .ai-map-node text,
.ai-blackbox-flow .ai-map-svg {
  user-select: none;
  -webkit-user-select: none;
}
.ai-blackbox-flow .ai-map-node,
.ai-blackbox-flow .ai-map-node text {
  cursor: pointer;
}
.ai-blackbox-flow .ai-map-node.active,
.ai-blackbox-flow .ai-map-node.selected {
  filter: drop-shadow(0 0 6px rgba(56, 102, 179, .30));
}
.ai-blackbox-flow .ai-map-edge {
  animation: ai-flow-dash 1.2s linear infinite;
}
.ai-blackbox-flow .ai-stage-detail {
  margin-bottom: 12px;
}
.ai-blackbox-flow .ai-stage-detail-row {
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
  line-height: 18px;
  margin: 3px 0;
  word-break: break-all;
}
.ai-blackbox-flow .ai-trace-block,
.ai-blackbox-flow .ai-eng-block {
  margin-top: 8px;
  padding-top: 6px;
  border-top: .5px solid var(--dsw-alias-border-l2, rgba(0,0,0,.1));
}
.ai-blackbox-flow .ai-trace-title {
  color: var(--dsw-alias-label-tertiary, #62676d);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .04em;
  margin-bottom: 4px;
}
.ai-blackbox-flow .ai-trace-line {
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
  line-height: 18px;
  margin: 2px 0;
  word-break: break-word;
}
.ai-blackbox-flow .ai-stage-close,
.ai-blackbox-flow .ai-stage-link {
  margin-top: 8px;
  margin-right: 6px;
  border: .5px solid var(--dsw-alias-border-l3, rgba(0,0,0,.16));
  border-radius: 8px;
  padding: 3px 10px;
  font-size: 12px;
  background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,.02));
  color: var(--dsw-alias-label-secondary, #444951);
  cursor: pointer;
}
.ai-blackbox-flow .ai-stage-link {
  color: var(--dsw-alias-state-business-primary, #3866b3);
  border-color: var(--dsw-alias-state-business-primary, #3866b3);
}
.ai-blackbox-flow .ai-stage-close:hover {
  color: var(--dsw-alias-state-business-primary, #3866b3);
  border-color: var(--dsw-alias-state-business-primary, #3866b3);
}
.ai-blackbox-flow .ai-gen-card {
  margin-top: 12px;
  padding: 10px;
  border: .5px solid var(--dsw-alias-border-l2, rgba(0,0,0,.1));
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,.02));
}
.ai-blackbox-flow .ai-gen-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}
.ai-blackbox-flow .ai-gen-hint {
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
  line-height: 18px;
  margin-bottom: 8px;
}
.ai-blackbox-flow .ai-gen-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.ai-blackbox-flow .ai-gen-error {
  margin-top: 8px;
  color: var(--dsw-alias-state-danger-primary, #dc2626);
  font-size: 12px;
  line-height: 18px;
}
`;
function truncateText(value, max = 48) {
    if (!value)
        return '';
    const s = String(value).replace(/\s+/g, ' ').trim();
    return s.length > max ? s.slice(0, max) + '…' : s;
}
function nodeText(node) {
    const blocks = node.content ?? node.blocks ?? [];
    if (!Array.isArray(blocks))
        return '';
    return blocks
        .map((b) => typeof b === 'string' ? b : (b?.text ?? ''))
        .filter(Boolean)
        .join(' ');
}
function domainOf(label, detail) {
    const s = `${label} ${detail}`.toLowerCase();
    if (/expert|teacher|教学|讨论|专家团/.test(s))
        return 'teacher';
    if (/arxiv|doi|论文|科研|research|web_search|web_fetch|search|source/.test(s))
        return 'research';
    if (/prompt|文案|文稿|writing|report|ppt|copywriting/.test(s))
        return 'writing';
    if (/vault|skill|蒸馏|distill|core-iteration|元能力|迭代/.test(s))
        return 'distill';
    if (/bash|git|build|dev_|grep|glob|edit|tsc|code|plugin|fix|debug|npm|python/.test(s))
        return 'dev';
    return 'base';
}
function buildFlowNodes(trajectory) {
    if (!trajectory)
        return [];
    const out = [];
    for (const n of trajectory.eventNodes ?? []) {
        if (n.kind === 'user') {
            const detail = truncateText(nodeText(n), 56);
            out.push({ key: `u${n.seq}`, kind: 'prompt', label: '用户输入', detail, time: n.time, domain: 'base' });
        }
        else if (n.kind === 'assistant') {
            const reason = (n.blocks ?? []).filter((b) => b.kind === 'reasoning').map((b) => b.text).join(' ');
            const text = (n.blocks ?? []).filter((b) => b.kind === 'text').map((b) => b.text).join(' ');
            if (reason || text) {
                const model = n.provenance?.model ? String(n.provenance.model).split('/').pop() : '';
                out.push({
                    key: `a${n.seq}`,
                    kind: 'think',
                    label: model ? `AI · ${model}` : 'AI 阶段',
                    detail: truncateText(reason || text, 56),
                    time: n.time,
                    domain: 'base',
                });
            }
        }
        else if (n.kind === 'tool-result') {
            const name = n.call?.name ?? 'tool';
            const duration = n.callTime && n.time ? ` · ${Math.max(0, Math.round((n.time - n.callTime) / 1000))}s` : '';
            const detail = (n.isError
                ? `错误：${n.error?.name ?? ''} ${truncateText(nodeText(n), 32)}`
                : (truncateText(nodeText(n), 40) || '完成')) + duration;
            out.push({
                key: `t${n.seq}`,
                kind: 'tool',
                label: name,
                detail,
                time: n.time,
                error: !!n.isError,
                domain: domainOf(name, detail),
                callId: n.callId,
            });
        }
        else if (n.kind === 'command') {
            const name = n.name ?? '命令';
            out.push({
                key: `c${n.seq}`,
                kind: 'command',
                label: `命令 · ${name}`,
                detail: truncateText(n.args || '', 40),
                time: n.time,
                domain: domainOf(name, n.args || ''),
            });
        }
        else if (n.kind === 'turn-error' || n.kind === 'turn-max-tokens') {
            out.push({
                key: `e${n.seq}`,
                kind: 'error',
                label: n.kind === 'turn-max-tokens' ? '输出截断' : '错误',
                detail: truncateText(n.message || '', 40),
                time: n.time,
                error: true,
                domain: 'base',
            });
        }
        else if (n.kind === 'compaction') {
            out.push({
                key: `m${n.seq}`,
                kind: 'compaction',
                label: '上下文压缩',
                detail: n.summary ? truncateText(n.summary, 40) : '',
                time: n.time,
                domain: 'base',
            });
        }
    }
    for (const r of trajectory.runningCalls ?? []) {
        out.push({
            key: `r${r.callId}`,
            kind: 'tool',
            label: r.name,
            detail: '运行中…',
            time: r.time,
            running: true,
            domain: domainOf(r.name, ''),
            callId: r.callId,
        });
    }
    return out.slice(-24);
}
function kindText(kind) {
    switch (kind) {
        case 'prompt': return '输入';
        case 'think': return '阶段';
        case 'tool': return '工具';
        case 'command': return '命令';
        case 'error': return '异常';
        case 'compaction': return '压缩';
    }
}
function FlowGraph({ nodes, onOpen }) {
    const cols = 4;
    const nodeW = 150;
    const nodeH = 54;
    const gapX = 86;
    const gapY = 34;
    const margin = 24;
    const rows = Math.max(1, Math.ceil(nodes.length / cols));
    const width = margin * 2 + cols * (nodeW + gapX);
    const height = margin * 2 + rows * (nodeH + gapY);
    const elements = [
        createElement('defs', { key: 'defs' }, [
            createElement('marker', {
                id: 'ai-flow-arrow',
                viewBox: '0 0 10 10',
                refX: '9',
                refY: '5',
                markerWidth: '6',
                markerHeight: '6',
                orient: 'auto-start-reverse',
            }, [
                createElement('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#94a3b8' }),
            ]),
        ]),
    ];
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = margin + col * (nodeW + gapX);
        const y = margin + row * (nodeH + gapY);
        const color = FLOW_COLORS[node.domain] || FLOW_COLORS.base;
        const isLast = i === nodes.length - 1;
        const clickable = !!onOpen && !!node.callId;
        if (i > 0) {
            const prev = nodes[i - 1];
            const pc = (i - 1) % cols;
            const pr = Math.floor((i - 1) / cols);
            const px = margin + pc * (nodeW + gapX);
            const py = margin + pr * (nodeH + gapY);
            const sx = px + nodeW;
            const sy = py + nodeH / 2;
            const ex = x;
            const ey = y + nodeH / 2;
            if (pr === row) {
                elements.push(createElement('line', {
                    key: `edge-${i}`,
                    className: 'ai-flow-edge',
                    x1: sx,
                    y1: sy,
                    x2: ex,
                    y2: ey,
                    stroke: '#94a3b8',
                    strokeWidth: 1.5,
                    strokeDasharray: '5 4',
                    markerEnd: 'url(#ai-flow-arrow)',
                }));
            }
            else {
                elements.push(createElement('path', {
                    key: `edge-${i}`,
                    className: 'ai-flow-edge',
                    d: `M ${sx} ${sy} L ${sx + 20} ${sy} L ${sx + 20} ${ey} L ${ex} ${ey}`,
                    fill: 'none',
                    stroke: '#94a3b8',
                    strokeWidth: 1.5,
                    strokeDasharray: '5 4',
                    markerEnd: 'url(#ai-flow-arrow)',
                }));
            }
        }
        const title = [node.detail || node.label, node.callId ? `call: ${node.callId}` : ''].filter(Boolean).join('\n');
        elements.push(createElement('rect', {
            key: `n-${node.key}`,
            className: [
                'ai-flow-node',
                isLast ? 'ai-flow-current' : '',
                clickable ? 'ai-flow-clickable' : '',
            ].filter(Boolean).join(' '),
            x,
            y,
            width: nodeW,
            height: nodeH,
            rx: 10,
            style: {
                fill: 'var(--dsw-alias-bg-layer-1, #ffffff)',
                stroke: color,
                strokeWidth: isLast ? 2.5 : 1.5,
                cursor: clickable ? 'pointer' : 'default',
                transition: 'stroke .15s ease, filter .15s ease',
            },
            onClick: clickable ? () => onOpen?.(node.callId) : undefined,
        }, [
            createElement('title', {}, [title]),
        ]));
        elements.push(createElement('text', {
            key: `l-${node.key}`,
            x: x + 10,
            y: y + 20,
            fontSize: '12px',
            fontWeight: 600,
            style: { fill: 'var(--dsw-alias-label-primary, #111827)' },
        }, [node.label]));
        elements.push(createElement('text', {
            key: `k-${node.key}`,
            x: x + 10,
            y: y + 38,
            fontSize: '10px',
            style: { fill: color },
        }, [kindText(node.kind), node.running ? ' · 运行中' : node.error ? ' · 异常' : '']));
    }
    return createElement('svg', {
        viewBox: `0 0 ${width} ${height}`,
        className: 'ai-flow-svg',
        width: '100%',
        height: 'auto',
    }, elements);
}
const PHASE_META = {
    research: { title: '调研 / 找资料', icon: '🔍' },
    build: { title: '实现 / 创作', icon: '✏️' },
    verify: { title: '验证 / 检查', icon: '✅' },
    deliver: { title: '产出 / 总结', icon: '📦' },
};
function toolArgsRaw(node) {
    const raw = node.call?.argsRaw ?? '';
    if (!raw)
        return '';
    try {
        return raw.startsWith('{') || raw.startsWith('[') ? JSON.stringify(JSON.parse(raw)) : String(raw);
    }
    catch {
        return String(raw);
    }
}
function toolPhase(name, args) {
    const s = `${name} ${args}`.toLowerCase();
    if (/test|check|verify|validate|doctor|audit|smoke/.test(s))
        return 'verify';
    if (/search|web_|source|paper|arxiv|doi|grep|glob|read|find|fetch|ls|cat/.test(s))
        return 'research';
    if (/write|edit|str_replace|build|dev_build|dev_install|dev_inject|dev_reload|bash|run|npm|git|python|node|tsc/.test(s))
        return 'build';
    if (/skill|distill|vault|teacher|expert|discussion|document|article|ppt|report|summary|copy|writing/.test(s))
        return 'deliver';
    return null;
}
function topTools(map, max = 3) {
    return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, max)
        .map(([name, count]) => count > 1 ? `${name}×${count}` : name);
}
function extractChangedFiles(nodes) {
    const files = new Set();
    const re = /"(?:file_path|path|file|files|target|outputPath|out)"\s*:\s*"([^"]+)"/g;
    for (const n of nodes) {
        if (n.kind !== 'tool-result')
            continue;
        const raw = n.call?.argsRaw ?? '';
        let m;
        while ((m = re.exec(raw)) !== null) {
            const p = m[1];
            if (p && !p.startsWith('node:') && !p.startsWith('http'))
                files.add(p);
        }
    }
    return [...files].slice(0, 12);
}
function traceLine(n) {
    if (n.kind === 'tool-result') {
        const name = n.call?.name ?? 'tool';
        const content = truncateText(nodeText(n), 40);
        if (n.isError)
            return `工具 ${name} 出错${content ? `：${content}` : ''}`;
        return content ? `工具 ${name} → ${content}` : `工具 ${name} 完成`;
    }
    if (n.kind === 'command') {
        const name = n.name ?? 'command';
        const args = n.args ? ` ${truncateText(n.args, 32)}` : '';
        return `执行命令 ${name}${args}`;
    }
    if (n.kind === 'turn-error')
        return `错误：${truncateText(n.message || '', 40)}`;
    if (n.kind === 'turn-max-tokens')
        return `输出截断`;
    if (n.kind === 'compaction')
        return `上下文压缩`;
    return null;
}
function argField(n, field) {
    const raw = n.call?.argsRaw ?? '';
    if (!raw)
        return '';
    try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj[field] === 'string')
            return obj[field];
        if (obj && Array.isArray(obj[field]))
            return obj[field].join(' ');
        if (obj && typeof obj[field] === 'object')
            return JSON.stringify(obj[field]);
    }
    catch {
        return raw;
    }
    return '';
}
function fileArg(n) {
    const raw = n.call?.argsRaw ?? '';
    const re = /"(?:file_path|path|file|files|target|outputPath|out)"\s*:\s*"([^"]+)"/g;
    let m;
    while ((m = re.exec(raw)) !== null) {
        const p = m[1];
        if (p && !p.startsWith('node:') && !p.startsWith('http'))
            return p;
    }
    return '';
}
function engineeringLine(n) {
    if (n.kind === 'command') {
        const name = n.name ?? 'command';
        const args = n.args ? ` ${truncateText(n.args, 48)}` : '';
        return `执行命令 ${name}${args}`;
    }
    if (n.kind !== 'tool-result')
        return null;
    const name = n.call?.name ?? 'tool';
    const lname = name.toLowerCase();
    const path = fileArg(n);
    if (lname === 'write' || lname === 'edit' || lname.includes('str_replace')) {
        return path ? `修改 ${path}` : `修改内容（${name}）`;
    }
    if (lname === 'bash') {
        const cmd = argField(n, 'command') || argField(n, 'cmd') || name;
        return `执行 ${truncateText(cmd, 64)}`;
    }
    if (lname === 'dev_reload_package') {
        const target = argField(n, 'packageName') || argField(n, 'match');
        return target ? `热重载 ${target}` : '热重载插件';
    }
    if (lname === 'dev_build_plugin') {
        const dir = argField(n, 'dir');
        return dir ? `构建 ${dir}` : '构建插件';
    }
    if (lname === 'dev_install_package' || lname === 'dev_inject_plugin' || lname === 'dev_uninject_plugin') {
        const target = argField(n, 'dir') || argField(n, 'match');
        return target ? `插件装配 ${target}` : '插件装配';
    }
    if (lname === 'web_search') {
        const q = argField(n, 'queries');
        return `搜索 ${truncateText(q || rawDisplay(n), 64)}`;
    }
    if (lname === 'read' || lname === 'glob' || lname === 'grep' || lname === 'cat' || lname === 'ls' || lname === 'find') {
        const target = path || argField(n, 'pattern') || argField(n, 'path');
        return `查看 ${truncateText(target || name, 64)}`;
    }
    if (lname === 'git' || lname === 'npm' || lname === 'node' || lname === 'python' || lname === 'tsc' || lname === 'pnpm') {
        return `执行 ${name} ${truncateText(rawDisplay(n), 48)}`;
    }
    if (name.startsWith('dev_'))
        return `插件操作 ${name}`;
    return `工具 ${name}`;
}
function rawDisplay(n) {
    const raw = n.call?.argsRaw ?? '';
    return raw.startsWith('{') ? JSON.stringify(JSON.parse(raw)) : raw;
}
function buildWorkSummary(trajectory, status) {
    const nodes = trajectory?.eventNodes ?? [];
    const goalNode = [...nodes].reverse().find((n) => n.kind === 'user');
    const lastAssistant = [...nodes].reverse().find((n) => n.kind === 'assistant' && nodeText(n));
    const phaseInfo = {
        research: { count: 0, tools: new Map(), callIds: [], trace: [], engineering: [] },
        build: { count: 0, tools: new Map(), callIds: [], trace: [], engineering: [] },
        verify: { count: 0, tools: new Map(), callIds: [], trace: [], engineering: [] },
        deliver: { count: 0, tools: new Map(), callIds: [], trace: [], engineering: [] },
    };
    let activePhase = 'goal';
    for (const n of nodes) {
        if (n.kind !== 'tool-result' && n.kind !== 'command')
            continue;
        const name = n.kind === 'tool-result' ? (n.call?.name ?? 'tool') : (n.name ?? 'command');
        const phase = toolPhase(name, toolArgsRaw(n));
        if (phase && phaseInfo[phase]) {
            phaseInfo[phase].count++;
            const m = phaseInfo[phase].tools;
            m.set(name, (m.get(name) ?? 0) + 1);
            const cid = n.callId ?? n.commandId;
            if (cid)
                phaseInfo[phase].callIds.push(cid);
            const line = traceLine(n);
            if (line)
                phaseInfo[phase].trace.push(line);
            const eng = engineeringLine(n);
            if (eng)
                phaseInfo[phase].engineering.push(eng);
            activePhase = phase;
        }
    }
    const running = [];
    for (const r of trajectory?.runningCalls ?? []) {
        running.push(r.name);
        const phase = toolPhase(r.name, '');
        if (phase && phaseInfo[phase])
            activePhase = phase;
    }
    const changedFiles = extractChangedFiles(nodes);
    const phases = [];
    for (const key of ['research', 'build', 'verify', 'deliver']) {
        const info = phaseInfo[key];
        if (info.count > 0) {
            phases.push({
                key,
                ...PHASE_META[key],
                count: info.count,
                tools: topTools(info.tools),
                files: key === 'build' ? changedFiles : undefined,
                callIds: info.callIds,
                trace: info.trace.slice(-10),
                engineering: info.engineering.slice(-12),
                active: activePhase === key,
            });
        }
    }
    if (phases.length === 0) {
        phases.push({ key: 'goal', title: '等待动作', icon: '⏳', count: 0, tools: [], active: true });
    }
    const recent = nodes.slice(-5).map((n) => {
        if (n.kind === 'user')
            return '收到目标';
        if (n.kind === 'assistant')
            return nodeText(n) ? '总结 / 回复' : '思考';
        if (n.kind === 'tool-result')
            return `工具：${n.call?.name ?? 'tool'}`;
        if (n.kind === 'command')
            return `命令：${n.name ?? 'command'}`;
        if (n.kind === 'turn-error' || n.kind === 'turn-max-tokens')
            return '错误';
        if (n.kind === 'compaction')
            return '压缩上下文';
        return n.kind;
    });
    return {
        goal: goalNode ? truncateText(nodeText(goalNode), 80) : '',
        routeLabel: status?.label || '搜索 / 查资料',
        suggested: status?.suggested ?? [],
        running,
        recent,
        phases,
        changedFiles,
        lastSummary: lastAssistant ? truncateText(nodeText(lastAssistant), 120) : '',
        totalTools: nodes.filter((n) => n.kind === 'tool-result').length,
    };
}
function buildNarrative(summary) {
    const parts = [];
    if (summary.goal)
        parts.push(`你现在在做「${summary.goal}」`);
    else
        parts.push('当前动作还在刚开始');
    const done = [];
    const has = (k) => summary.phases.some((p) => p.key === k);
    if (has('research'))
        done.push('先把相关资料和事实确认了一遍');
    if (has('build')) {
        const files = summary.changedFiles.slice(0, 3);
        if (files.length)
            done.push(`然后把改动落到了 ${files.join('、')} 这些地方`);
        else
            done.push('然后开始把方案落到实际文件或代码里');
    }
    if (has('verify'))
        done.push('接着做了验证，确认没有破坏已有内容');
    if (has('deliver'))
        done.push('最后把结果整理成了可读的产出');
    if (done.length)
        parts.push(`：${done.join('，')}`);
    else if (summary.running.length)
        parts.push('，正在推进当前步骤');
    if (summary.running.length)
        parts.push('，现在还在继续做');
    if (summary.lastSummary)
        parts.push(`。目前的阶段结论：${summary.lastSummary}`);
    return parts.join('').replace(/^(:|，)/, '');
}
function buildStageDetail(mapKey, stageKey, status, summary) {
    const stage = (WORK_MAPS[mapKey]?.stages ?? []).find((s) => s.key === stageKey);
    const label = stage?.label ?? stageKey;
    if (status === 'active')
        return `当前正在「${label}」，下面列出这一阶段实际发生的动作。`;
    if (status === 'done')
        return `「${label}」已经完成，下面列出这一阶段实际发生的动作。`;
    return `「${label}」还没有开始。`;
}
function shortPath(p) {
    const parts = p.split('/').filter(Boolean);
    return parts.slice(-3).join('/');
}
function skinPreset() {
    return 'signal-flow';
}
const CARD_DOTS = ['cyan', 'emerald', 'violet', 'amber', 'rose', 'orange', 'slate'];
function buildArchifyWorkflowIR(summary) {
    const phases = summary.phases.filter((p) => p.key !== 'goal');
    const lanes = [];
    const nodes = [];
    const edges = [];
    const cards = [];
    const pushNode = (id, label) => {
        lanes.push({ id, label });
        nodes.push({ id, lane: id, col: 0, type: 'backend', label });
    };
    if (summary.goal) {
        pushNode('goal', '目标');
        cards.push({ dot: 'cyan', title: '目标', items: [truncateText(summary.goal, 60)] });
    }
    phases.forEach((p, i) => {
        pushNode(`phase-${p.key}`, p.title);
        cards.push({
            dot: CARD_DOTS[i % CARD_DOTS.length],
            title: p.title,
            items: (p.engineering?.length ? p.engineering.slice(0, 4) : [engineeringSentence(p)]).filter(Boolean),
        });
    });
    if (summary.lastSummary) {
        pushNode('summary', '总结');
        cards.push({ dot: 'slate', title: '总结', items: [truncateText(summary.lastSummary, 60)] });
    }
    if (nodes.length === 0) {
        pushNode('empty', '暂无会话');
        cards.push({ dot: 'slate', title: '暂无会话', items: ['等待会话完成后生成完整流程图'] });
    }
    for (let i = 0; i < nodes.length - 1; i++) {
        edges.push({ id: `e${i}`, from: nodes[i].id, to: nodes[i + 1].id });
    }
    return {
        schema_version: 1,
        diagram_type: 'workflow',
        meta: {
            title: '会话完整流程图',
            animation: 'none',
            visual_preset: skinPreset(),
            quality_profile: 'standard',
            viewBox: [2000, 1200],
        },
        lanes,
        nodes,
        edges,
        cards,
        mainPath: nodes.map((n) => n.id),
    };
}
function engineeringSentence(phase) {
    if (!phase?.engineering?.length)
        return '';
    const files = [];
    const commands = [];
    const ops = [];
    for (const line of phase.engineering) {
        if (line.startsWith('修改 '))
            files.push(shortPath(line.slice(3)));
        else if (line.startsWith('执行 '))
            commands.push(line.slice(3).split(' ').slice(0, 3).join(' '));
        else if (line.startsWith('热重载 ') || line.startsWith('构建 ') || line.startsWith('插件装配 '))
            ops.push(line);
        else if (line.startsWith('查看 ') || line.startsWith('工具 '))
            ops.push(line);
    }
    const unique = (arr) => [...new Set(arr)];
    const parts = [];
    if (files.length)
        parts.push(`改了 ${unique(files).slice(0, 3).join('、')}`);
    if (commands.length)
        parts.push(`执行了 ${unique(commands).slice(0, 3).join('、')}`);
    if (ops.length)
        parts.push(unique(ops).slice(0, 3).join('；'));
    if (!parts.length)
        return unique(phase.engineering).slice(0, 2).join('；');
    return parts.join('，') + '。';
}
const WORK_MAPS = {
    research: {
        title: '科研生命周期图',
        stages: [
            { key: 'question', label: '研究问题' },
            { key: 'evidence', label: '查证/资料' },
            { key: 'conflict', label: '争议/决策' },
            { key: 'plan', label: '方案计划' },
            { key: 'execute', label: '执行验证' },
            { key: 'deliver', label: '总结交付' },
        ],
    },
    dev: {
        title: '开发工作流图',
        stages: [
            { key: 'req', label: '需求理解' },
            { key: 'spec', label: '规格/接口' },
            { key: 'implement', label: '实现' },
            { key: 'test', label: '测试/验证' },
            { key: 'deliver', label: '交付/文档' },
        ],
    },
    teacher: {
        title: '教学讨论时序图',
        stages: [
            { key: 'question', label: '学生提问' },
            { key: 'expert', label: '专家团' },
            { key: 'discuss', label: '讨论/冲突' },
            { key: 'adjudicate', label: '裁决' },
            { key: 'answer', label: '讲解答疑' },
        ],
    },
    writing: {
        title: '文稿工作流图',
        stages: [
            { key: 'topic', label: '主题/受众' },
            { key: 'outline', label: '大纲' },
            { key: 'draft', label: '草稿' },
            { key: 'polish', label: '审校/去AI味' },
            { key: 'deliver', label: '交付' },
        ],
    },
    distill: {
        title: '蒸馏数据流图',
        stages: [
            { key: 'source', label: '源材料' },
            { key: 'extract', label: '抽取要点' },
            { key: 'distill', label: '蒸馏规则' },
            { key: 'validate', label: '验证' },
            { key: 'publish', label: '入库/引用' },
        ],
    },
    generic: {
        title: 'Agent 工作流程图',
        stages: [
            { key: 'goal', label: '用户目标' },
            { key: 'research', label: '调研/资料' },
            { key: 'implement', label: '实现/创作' },
            { key: 'verify', label: '验证/检查' },
            { key: 'deliver', label: '交付/总结' },
        ],
    },
};
const ACTIVE_STAGE_BY_MAP = {
    generic: { research: 'research', build: 'implement', verify: 'verify', deliver: 'deliver' },
    research: { research: 'evidence', build: 'plan', verify: 'execute', deliver: 'deliver' },
    dev: { build: 'implement', verify: 'test', deliver: 'deliver' },
    teacher: { research: 'discuss', build: 'expert', verify: 'adjudicate', deliver: 'answer' },
    writing: { research: 'outline', build: 'draft', verify: 'polish', deliver: 'deliver' },
    distill: { research: 'extract', build: 'distill', verify: 'validate', deliver: 'publish' },
};
const STAGE_PHASE = {
    generic: { goal: '', research: 'research', implement: 'build', verify: 'verify', deliver: 'deliver' },
    research: { question: '', evidence: 'research', conflict: 'build', plan: 'build', execute: 'verify', deliver: 'deliver' },
    dev: { req: '', spec: '', implement: 'build', test: 'verify', deliver: 'deliver' },
    teacher: { question: '', expert: 'build', discuss: 'research', adjudicate: 'verify', answer: 'deliver' },
    writing: { topic: '', outline: 'research', draft: 'build', polish: 'verify', deliver: 'deliver' },
    distill: { source: 'research', extract: 'research', distill: 'build', validate: 'verify', publish: 'deliver' },
};
const STAGE_NARRATIVE = {
    generic: {
        goal: '先接住用户真正想要什么，校准目标再动手，避免后面做偏。',
        research: '先找可信资料而不是凭记忆开工，后续实现才建立在已验证的事实上。',
        implement: '把方案落成实际文件或代码，核心是把想法变成可运行、可交付的东西。',
        verify: '跑检查、测试和构建，确认改动没有破坏已有功能，让交付可信。',
        deliver: '把结果整理成可读产物或总结，让用户拿到的不只是过程，而是能直接用的东西。',
    },
    research: {
        question: '先明确要回答的研究问题，问题清楚，查证才不会漫无目的。',
        evidence: '带着问题去找来源和证据，让结论有依据，而不是猜。',
        conflict: '把不同证据或观点的冲突摆出来，冲突往往是真正需要决策的地方。',
        plan: '基于证据定方案，先想清楚怎么执行，减少做到一半再改方向。',
        execute: '按计划实际验证或实验，只有真正跑过，才知道方案是否成立。',
        deliver: '把结论、证据和限制整理成可读交付，让读者能判断可信度，而不是只看结论。',
    },
    dev: {
        req: '先理解用户问题或需求，避免一开始就写错方向。',
        spec: '把接口和边界定下来，先锁规格后写实现，减少返工。',
        implement: '按规格写代码或改文件，把设计变成可运行系统。',
        test: '跑测试、构建或检查，让改动可回归，而不是靠感觉交差。',
        deliver: '整理变更、文档和产物，交付时让人知道改了什么、为什么改、怎么验证。',
    },
    teacher: {
        question: '先接住学生的真实问题，问题找准，讲解答疑才有针对性。',
        expert: '调对应领域的专家视角，多视角能减少单一模型的盲区。',
        discuss: '把不同思路或冲突摆开讨论，找到真正的分歧点，而不是走流程。',
        adjudicate: '对分歧做裁决，明确采用哪条路线，避免一直悬着。',
        answer: '把最终结论转成学生能懂的话，教学的价值是让人理解为什么。',
    },
    writing: {
        topic: '先确定写给谁、要解决什么，受众和目的不清，写得再好也用不上。',
        outline: '先搭结构再写内容，提纲是防止写到一半跑题。',
        draft: '把想法落成初稿，初稿允许粗糙，关键是先把内容生产出来。',
        polish: '回头删冗、去套话、调节奏，这一步决定读者读起来顺不顺。',
        deliver: '交付定稿或文案，同时说明为什么这样写，让读者知道意图。',
    },
    distill: {
        source: '先找到可追溯的源材料，没有来源的蒸馏不可信。',
        extract: '从源材料里抽关键点或规则，这一步决定后面蒸馏的质量。',
        distill: '把碎片整理成可复用的启发式规则，让知识能迁移，而不是一次性答案。',
        validate: '用例子或测试验证规则是否成立，避免把偶然经验当成规律。',
        publish: '入库并保留来源引用，以后能查证、能更新、能复用。',
    },
};
function workMapKey(status) {
    if (status?.route === 'core')
        return 'distill';
    const scenario = status?.scenario;
    if (scenario === 'research')
        return 'research';
    if (scenario === 'teaching')
        return 'teacher';
    if (scenario === 'writing')
        return 'writing';
    if (status?.route === 'dev')
        return 'dev';
    return 'generic';
}
function stageStates(mapKey, summary) {
    const phases = new Map(summary.phases.map((p) => [p.key, p]));
    const cnt = (k) => phases.get(k)?.count ?? 0;
    const hasResearch = cnt('research') > 0;
    const hasBuild = cnt('build') > 0;
    const hasVerify = cnt('verify') > 0;
    const hasDeliver = cnt('deliver') > 0;
    const activePhaseKey = summary.phases.find((p) => p.active)?.key ?? null;
    const activeStageKey = activePhaseKey ? (ACTIVE_STAGE_BY_MAP[mapKey]?.[activePhaseKey] ?? null) : null;
    const map = WORK_MAPS[mapKey] ?? WORK_MAPS.generic;
    const doneByKey = {};
    if (mapKey === 'research') {
        doneByKey.question = !!summary.goal;
        doneByKey.evidence = hasResearch;
        doneByKey.conflict = hasBuild;
        doneByKey.plan = hasBuild;
        doneByKey.execute = hasVerify;
        doneByKey.deliver = hasDeliver || !!summary.lastSummary;
    }
    else if (mapKey === 'dev') {
        doneByKey.req = !!summary.goal;
        doneByKey.spec = !!summary.goal;
        doneByKey.implement = hasBuild;
        doneByKey.test = hasVerify;
        doneByKey.deliver = hasDeliver || !!summary.lastSummary;
    }
    else if (mapKey === 'teacher') {
        doneByKey.question = !!summary.goal;
        doneByKey.expert = hasBuild;
        doneByKey.discuss = hasResearch;
        doneByKey.adjudicate = hasVerify;
        doneByKey.answer = !!summary.lastSummary;
    }
    else if (mapKey === 'writing') {
        doneByKey.topic = !!summary.goal;
        doneByKey.outline = hasResearch;
        doneByKey.draft = hasBuild;
        doneByKey.polish = hasVerify;
        doneByKey.deliver = hasDeliver || !!summary.lastSummary;
    }
    else if (mapKey === 'distill') {
        doneByKey.source = hasResearch;
        doneByKey.extract = hasResearch;
        doneByKey.distill = hasBuild;
        doneByKey.validate = hasVerify;
        doneByKey.publish = hasDeliver || !!summary.lastSummary;
    }
    else {
        doneByKey.goal = !!summary.goal;
        doneByKey.research = hasResearch;
        doneByKey.implement = hasBuild;
        doneByKey.verify = hasVerify;
        doneByKey.deliver = hasDeliver || !!summary.lastSummary;
    }
    const firstPending = map.stages.find((s) => !doneByKey[s.key]);
    return map.stages.map((stage) => {
        const active = stage.key === activeStageKey || (activeStageKey == null && firstPending?.key === stage.key);
        const done = !active && !!doneByKey[stage.key];
        return { key: stage.key, label: stage.label, status: active ? 'active' : done ? 'done' : 'pending' };
    });
}
function ArchifyWorkMap({ summary, status, selectedKey, onSelect }) {
    const mapKey = workMapKey(status);
    const map = WORK_MAPS[mapKey] ?? WORK_MAPS.generic;
    const stages = stageStates(mapKey, summary);
    const nodeW = 138;
    const nodeH = 48;
    const gap = 62;
    const margin = 28;
    const height = margin * 2 + nodeH + 26;
    const width = margin * 2 + stages.length * nodeW + (stages.length - 1) * gap;
    const colorOf = (status) => {
        if (status === 'active')
            return 'var(--dsw-alias-state-business-primary, #3866b3)';
        if (status === 'done')
            return 'var(--dsw-alias-state-success-primary, #16794b)';
        return 'var(--dsw-alias-label-tertiary, #62676d)';
    };
    const elements = [
        createElement('defs', { key: 'defs' }, [
            createElement('marker', {
                id: 'ai-map-arrow',
                viewBox: '0 0 10 10',
                refX: '9',
                refY: '5',
                markerWidth: '6',
                markerHeight: '6',
                orient: 'auto-start-reverse',
            }, [
                createElement('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: 'var(--dsw-alias-border-l3, #94a3b8)' }),
            ]),
        ]),
    ];
    for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const x = margin + i * (nodeW + gap);
        const y = margin;
        const color = colorOf(stage.status);
        if (i > 0) {
            const prevX = margin + (i - 1) * (nodeW + gap);
            const prevY = margin;
            elements.push(createElement('line', {
                key: `edge-${i}`,
                className: 'ai-map-edge',
                x1: prevX + nodeW,
                y1: prevY + nodeH / 2,
                x2: x,
                y2: y + nodeH / 2,
                stroke: 'var(--dsw-alias-border-l3, #94a3b8)',
                strokeWidth: 1.5,
                strokeDasharray: '5 4',
                markerEnd: 'url(#ai-map-arrow)',
            }));
        }
        elements.push(createElement('rect', {
            key: `stage-${stage.key}`,
            x,
            y,
            width: nodeW,
            height: nodeH,
            rx: 10,
            className: [
                'ai-map-node',
                stage.status === 'active' ? 'active' : '',
                selectedKey === stage.key ? 'selected' : '',
            ].filter(Boolean).join(' '),
            style: {
                fill: 'var(--dsw-alias-bg-layer-1, #ffffff)',
                stroke: color,
                strokeWidth: stage.status === 'active' || selectedKey === stage.key ? 2.5 : 1.5,
                strokeDasharray: stage.status === 'pending' && selectedKey !== stage.key ? '4 4' : undefined,
                cursor: onSelect ? 'pointer' : 'default',
                transition: 'stroke .15s ease, filter .15s ease',
            },
            onClick: onSelect ? () => onSelect(stage.key) : undefined,
        }, [
            createElement('title', {}, [
                stage.status === 'active' ? '当前正在这个阶段（点击查看详情）' :
                    stage.status === 'done' ? '这个阶段已完成（点击查看详情）' : '尚未开始（点击查看详情）',
            ]),
        ]));
        elements.push(createElement('text', {
            key: `stage-label-${stage.key}`,
            x: x + nodeW / 2,
            y: y + nodeH / 2 + 5,
            textAnchor: 'middle',
            fontSize: '13px',
            fontWeight: 600,
            style: { fill: 'var(--dsw-alias-label-primary, #111827)' },
            onClick: onSelect ? () => onSelect(stage.key) : undefined,
        }, [stage.label]));
    }
    return createElement('div', { className: 'ai-map-block' }, [
        createElement('div', { className: 'ai-map-title' }, [map.title]),
        createElement('svg', {
            viewBox: `0 0 ${width} ${height}`,
            className: 'ai-map-svg',
            width: '100%',
            height: 'auto',
        }, elements),
    ]);
}
function ArchifyFullFlow({ summary, status }) {
    const phases = summary.phases.filter((p) => p.key !== 'goal');
    const mainW = 300;
    const mainH = 66;
    const chipH = 26;
    const chipGap = 6;
    const margin = 28;
    const vGap = 34;
    const width = 640;
    const regionHeight = (p) => {
        const chips = Math.min(3, p.engineering?.length ?? 0);
        return mainH + (chips ? 12 + chips * (chipH + chipGap) : 0) + vGap;
    };
    const hasContent = phases.length > 0 || !!summary.goal || !!summary.lastSummary;
    const height = margin * 2 + (hasContent ? (summary.goal ? 70 : 0) + phases.reduce((sum, p) => sum + regionHeight(p), 0) + 34 : 80);
    const elements = [
        createElement('defs', { key: 'defs' }, [
            createElement('marker', {
                id: 'ai-full-arrow',
                viewBox: '0 0 10 10',
                refX: '9',
                refY: '5',
                markerWidth: '6',
                markerHeight: '6',
                orient: 'auto-start-reverse',
            }, [
                createElement('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: 'var(--dsw-alias-border-l3, #94a3b8)' }),
            ]),
        ]),
    ];
    let y = margin;
    const drawNode = (label, sub, color) => {
        elements.push(createElement('rect', {
            key: `n-${label}`,
            x: margin,
            y,
            width: mainW,
            height: mainH,
            rx: 10,
            style: {
                fill: 'var(--dsw-alias-bg-layer-1, #ffffff)',
                stroke: color,
                strokeWidth: 1.5,
            },
        }));
        elements.push(createElement('text', {
            key: `t-${label}`,
            x: margin + 14,
            y: y + 24,
            fontSize: '14px',
            fontWeight: 600,
            style: { fill: 'var(--dsw-alias-label-primary, #111827)' },
        }, [label]));
        if (sub) {
            elements.push(createElement('text', {
                key: `s-${label}`,
                x: margin + 14,
                y: y + 44,
                fontSize: '11px',
                style: { fill: 'var(--dsw-alias-label-secondary, #444951)' },
            }, [truncateText(sub, 48)]));
        }
        const top = y;
        y += mainH;
        return top;
    };
    if (summary.goal) {
        drawNode('目标', summary.goal, 'var(--dsw-alias-state-business-primary, #3866b3)');
        y += 8;
    }
    for (let i = 0; i < phases.length; i++) {
        const p = phases[i];
        const color = p.active
            ? 'var(--dsw-alias-state-business-primary, #3866b3)'
            : 'var(--dsw-alias-state-success-primary, #16794b)';
        drawNode(p.title, engineeringSentence(p), color);
        const chips = (p.engineering ?? []).slice(0, 3);
        if (chips.length) {
            let chipY = y + 12;
            for (const chip of chips) {
                elements.push(createElement('rect', {
                    key: `c-${p.key}-${chip}`,
                    x: margin + 12,
                    y: chipY,
                    width: mainW - 24,
                    height: chipH,
                    rx: 6,
                    style: {
                        fill: 'var(--dsw-alias-bg-layer-1, rgba(255,255,255,.02))',
                        stroke: 'var(--dsw-alias-border-l2, rgba(0,0,0,.1))',
                        strokeWidth: 1,
                    },
                }));
                elements.push(createElement('text', {
                    key: `ct-${p.key}-${chip}`,
                    x: margin + 22,
                    y: chipY + 17,
                    fontSize: '11px',
                    style: { fill: 'var(--dsw-alias-label-secondary, #444951)' },
                }, [truncateText(chip, 44)]));
                chipY += chipH + chipGap;
            }
            y = chipY - chipGap;
        }
        if (i < phases.length - 1 || summary.lastSummary) {
            elements.push(createElement('line', {
                key: `edge-${p.key}`,
                x1: margin + mainW / 2,
                y1: y,
                x2: margin + mainW / 2,
                y2: y + vGap - 6,
                stroke: 'var(--dsw-alias-border-l3, #94a3b8)',
                strokeWidth: 1.5,
                markerEnd: 'url(#ai-full-arrow)',
            }));
            y += vGap;
        }
    }
    if (summary.lastSummary) {
        drawNode('总结', summary.lastSummary, 'var(--dsw-alias-state-business-primary, #3866b3)');
    }
    return createElement('div', { className: 'ai-map-block' }, [
        createElement('div', { className: 'ai-map-title' }, [status?.label || '完整会话流程图']),
        hasContent
            ? createElement('svg', {
                viewBox: `0 0 ${width} ${height}`,
                className: 'ai-map-svg',
                width: '100%',
                height: 'auto',
            }, elements)
            : createElement('div', { className: 'ai-flow-empty' }, ['会话完成后会生成完整的流程结构图。']),
    ]);
}
function AiBlackboxFlow(props) {
    const useTrajectory = props.useTrajectory;
    const [status, setStatus] = useState(null);
    const [genState, setGenState] = useState('idle');
    const [lastUrl, setLastUrl] = useState('');
    const [genError, setGenError] = useState('');
    useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
                const r = await fetch('/skill-router/api/status');
                const j = await r.json();
                if (alive && j)
                    setStatus(j);
            }
            catch {
                // 状态接口失败时保持上一次显示，不打断流程。
            }
        };
        void load();
        const timer = setInterval(() => void load(), 3000);
        return () => {
            alive = false;
            clearInterval(timer);
        };
    }, []);
    const trajectory = useTrajectory ? useTrajectory((s) => s) : null;
    const summary = useMemo(() => buildWorkSummary(trajectory, status), [trajectory, status]);
    const currentLabel = status?.label || '等待工作流';
    const generate = async () => {
        if (genState === 'busy')
            return;
        setGenState('busy');
        setGenError('');
        try {
            const ir = buildArchifyWorkflowIR(summary);
            const r = await fetch('/skill-router/archify/api/render', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ ir }),
            });
            const data = await r.json();
            if (!data.ok)
                throw new Error(data?.detail || data?.error || '生成失败');
            setLastUrl(data.url);
            const dark = document.documentElement.classList.contains('dark')
                || document.documentElement.getAttribute('data-theme') === 'dark';
            window.open(`${data.url}?theme=${dark ? 'dark' : 'light'}`, '_blank');
            setGenState('idle');
        }
        catch (e) {
            setGenError(String(e?.message ?? e));
            setGenState('error');
        }
    };
    return createElement('div', { className: 'ai-blackbox-flow' }, [
        createElement('style', { key: 'ai-flow-css' }, [AI_FLOW_CSS]),
        createElement('div', { className: 'ai-flow-head' }, [
            createElement('div', { className: 'ai-flow-title' }, ['流程图']),
            createElement('div', { className: 'ai-flow-sub' }, [
                createElement('span', { className: 'ai-flow-tag' }, [currentLabel]),
                summary.suggested[0]
                    ? createElement('span', { className: 'ai-flow-hint' }, [`推荐：${summary.suggested[0]}`])
                    : null,
                createElement('span', { className: 'ai-flow-hint' }, ['会话完成后生成完整图']),
            ]),
        ]),
        createElement('div', { className: 'ai-flow-empty' }, ['下方生成的是 Archify 原生可缩放完整图，不再显示本地缩略图。']),
        createElement('div', { className: 'ai-gen-card' }, [
            createElement('div', { className: 'ai-gen-title' }, ['Archify 完整图']),
            summary.running.length === 0 && summary.totalTools > 0
                ? createElement('div', { className: 'ai-gen-hint' }, ['会话已结束，可以生成完整流程图'])
                : createElement('div', { className: 'ai-gen-hint' }, ['会话结束后生成一张可缩放的 Archify 完整图']),
            createElement('div', { className: 'ai-gen-actions' }, [
                lastUrl
                    ? createElement('a', { href: lastUrl, target: '_blank', className: 'ai-stage-link' }, ['查看已生成图'])
                    : null,
                createElement('button', {
                    className: 'ai-stage-close',
                    disabled: genState === 'busy',
                    onClick: () => void generate(),
                }, [genState === 'busy' ? '生成中…' : '生成 Archify 完整图']),
            ]),
            genError
                ? createElement('div', { className: 'ai-gen-error' }, [genError])
                : null,
        ]),
    ]);
}
function apply(ctx) {
    ctx.effect(() => ctx.slots.inject('conversation.view', () => ctx.slots.register({
        name: 'conversation.view',
        id: '@dsh-external/dsh-skill-router-panel',
        label: () => '专家组',
        order: 30,
    }, SkillRouterPanelComponent)), '@dsh-external/dsh-skill-router: monitor panel');
    ctx.effect(() => ctx.slots.inject('conversation.view', () => ctx.slots.register({
        name: 'conversation.view',
        id: '@dsh-external/dsh-ai-blackbox-flow',
        label: () => '流程图',
        order: 40,
    }, AiBlackboxFlow)), '@dsh-external/dsh-skill-router: AI blackbox flow panel');
}
//# sourceMappingURL=index.js.map
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
