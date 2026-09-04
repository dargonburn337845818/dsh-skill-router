type ClientContext = {
    effect(fn: () => unknown, label?: string): unknown;
    slots: {
        inject(slot: string, factory: () => unknown): unknown;
        register(reg: Record<string, unknown>, component: (props?: any) => any): unknown;
    };
};
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
export {};
