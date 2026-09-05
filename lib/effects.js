/**
 * Effect-sensitive routing — tiny runtime sensor for the skill router.
 *
 * Reads the same `effect-log.json` that dsh-skill-vault writes and derives
 * demotion signals. This module is intentionally small: the router only needs
 * "is this skill currently hurting more than helping?" — the detailed
 * governance controller lives in dsh-skill-vault.
 */
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
export function effectLogPath() {
    const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh');
    return join(dshHome, 'skill-vault', 'effect-log.json');
}
export function loadEffectMetrics(file = effectLogPath()) {
    if (!existsSync(file))
        return [];
    let entries;
    try {
        const raw = JSON.parse(readFileSync(file, 'utf8'));
        entries = Array.isArray(raw) ? raw : Array.isArray(raw?.entries) ? raw.entries : [];
    }
    catch {
        return [];
    }
    const map = new Map();
    const latest = new Map();
    for (const e of entries) {
        if (!e || typeof e.skill !== 'string')
            continue;
        let row = map.get(e.skill);
        if (!row) {
            row = { skill: e.skill, total: 0, triggered: 0, used: 0, pos: 0, neu: 0, neg: 0, effectRate: 0, misuseRate: 0, lastAt: null };
            map.set(e.skill, row);
        }
        row.total += 1;
        if (e.triggered)
            row.triggered += 1;
        if (e.used)
            row.used += 1;
        if (e.outcome === 'pos')
            row.pos += 1;
        else if (e.outcome === 'neg')
            row.neg += 1;
        else
            row.neu += 1;
        if (e.at && (!latest.get(e.skill) || e.at > latest.get(e.skill)))
            latest.set(e.skill, e.at);
    }
    const rows = [...map.values()];
    for (const row of rows) {
        row.effectRate = row.total > 0 ? row.pos / row.total : 0;
        row.misuseRate = row.triggered > 0 ? Math.max(0, (row.triggered - row.used) / row.triggered) : 0;
        row.lastAt = latest.get(row.skill) || null;
    }
    return rows;
}
/** Skills with enough evidence where the signal is currently negative. */
export function demotedSkillIds(rows, opts = {}) {
    const minSamples = opts.minSamples ?? 3;
    const effectThreshold = opts.effectThreshold ?? 0.4;
    const misuseThreshold = opts.misuseThreshold ?? 0.3;
    const out = new Set();
    for (const r of rows) {
        if (r.total < minSamples)
            continue;
        if (r.effectRate < effectThreshold || r.misuseRate > misuseThreshold)
            out.add(r.skill);
    }
    return out;
}
/** Skills with strong positive evidence; can be promoted into suggestions. */
export function promotedSkillIds(rows, opts = {}) {
    const minSamples = opts.minSamples ?? 3;
    const out = new Set();
    for (const r of rows) {
        if (r.total < minSamples)
            continue;
        if (r.effectRate >= 0.5 && r.misuseRate <= 0.3)
            out.add(r.skill);
    }
    return out;
}
//# sourceMappingURL=effects.js.map