import { formatNumber } from './util';

export interface FunnelStage {
    key: string;
    label: string;
    value: number;
}

interface Props {
    stages: FunnelStage[];
    color?: string;
}

/**
 * Vertical conversion funnel. Each stage bar is sized relative to the first
 * stage, with the step-over-step conversion rate shown between bars.
 */
export default function Funnel({ stages, color = '#1693C9' }: Props) {
    const base = Math.max(1, stages[0]?.value ?? 0);

    return (
        <div className="space-y-1">
            {stages.map((stage, i) => {
                const widthPct = Math.max((stage.value / base) * 100, 3);
                const overall = Math.round((stage.value / base) * 100);
                const stepPct =
                    i > 0 && stages[i - 1].value > 0
                        ? Math.round((stage.value / stages[i - 1].value) * 100)
                        : null;
                return (
                    <div key={stage.key}>
                        {i > 0 && (
                            <div className="flex items-center justify-center py-0.5">
                                <span className="text-[10px] font-medium text-[#8B9096]">
                                    ↓ {stepPct}% step conversion
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-28 shrink-0 text-right">
                                <p className="text-[12px] font-medium text-[#111315]">{stage.label}</p>
                                <p className="text-[10px] text-[#8B9096]">{overall}% of leads</p>
                            </div>
                            <div className="relative h-9 flex-1 overflow-hidden rounded-md bg-[#F1F3F5]">
                                <div
                                    className="flex h-full items-center justify-end rounded-md px-3"
                                    style={{
                                        width: `${widthPct}%`,
                                        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                                    }}
                                >
                                    <span className="text-[12px] font-bold tabular-nums text-white">{formatNumber(stage.value)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
