export interface EffectEntry {
    at: string;
    skill: string;
    task: string;
    triggered: boolean;
    used: boolean;
    outcome: 'pos' | 'neu' | 'neg';
    note: string;
}
export interface EffectMetricsRow {
    skill: string;
    total: number;
    triggered: number;
    used: number;
    pos: number;
    neu: number;
    neg: number;
    effectRate: number;
    misuseRate: number;
    lastAt: string | null;
}
export declare function effectLogPath(): string;
export declare function loadEffectMetrics(file?: string): EffectMetricsRow[];
export interface DemoteOptions {
    minSamples?: number;
    effectThreshold?: number;
    misuseThreshold?: number;
}
/** Skills with enough evidence where the signal is currently negative. */
export declare function demotedSkillIds(rows: EffectMetricsRow[], opts?: DemoteOptions): Set<string>;
/** Skills with strong positive evidence; can be promoted into suggestions. */
export declare function promotedSkillIds(rows: EffectMetricsRow[], opts?: DemoteOptions): Set<string>;
