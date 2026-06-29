import { PipelineStage } from './types';
import { chevronClip, tint } from './utils';

interface Props {
    stage: PipelineStage;
    variant: 'won' | 'lost';
    /** True when there's another column to the right (i.e. Won when Lost also exists). Lost is always terminal. */
    hasRightPoint: boolean;
    isDragOver: boolean;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
}

const fallbackColors: Record<'won' | 'lost', string> = {
    won: '#16A34A',
    lost: '#DC2626',
};

const iconPaths: Record<'won' | 'lost', string> = {
    won: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    lost: 'm9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
};

export default function TerminalDropZone({ stage, variant, hasRightPoint, isDragOver, onDragOver, onDragLeave, onDrop }: Props) {
    const stageColor = stage.color || fallbackColors[variant];
    const headerBg = tint(stageColor, 0.22);
    const headerClip = chevronClip(true, hasRightPoint);
    const defaultLabel = variant === 'won' ? 'Won' : 'Lost';

    return (
        <div
            className="min-w-[280px] w-[280px] flex-shrink-0 xl:flex-1 xl:w-auto flex flex-col"
            onDragOver={(e) => { e.preventDefault(); onDragOver(e); }}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <div
                className={`relative pl-7 ${hasRightPoint ? 'pr-7' : 'pr-4'} py-3`}
                style={{ backgroundColor: headerBg, clipPath: headerClip }}
            >
                <h3 className="text-[16px] font-semibold text-[#111315] truncate leading-tight">{stage.name || defaultLabel}</h3>
                <p className="text-[12px] text-[#5F656D] mt-0.5 leading-tight">Drop to mark {variant}</p>
            </div>
            <div className={`mt-2 p-2 flex-1 overflow-y-auto min-h-[80px] rounded-lg bg-[#EBECEF] flex items-center justify-center transition-colors ${isDragOver ? 'ring-2 ring-[#1693C9]/40' : ''}`}>
                <div className="text-center">
                    <svg className="h-6 w-6 text-[#8B9096] mx-auto mb-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[variant]} />
                    </svg>
                    <p className="text-[11px] text-[#5F656D]">Drop a deal here</p>
                </div>
            </div>
        </div>
    );
}
