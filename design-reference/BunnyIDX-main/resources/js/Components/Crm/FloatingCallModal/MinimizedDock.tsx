import type { CallApi } from '@/hooks/useTelnyxDialer';

/**
 * Minimized version of the floating call modal — compact bottom-right dock
 * showing just name + timer + End + expand button.
 */

interface Props {
    contactName: string;
    dialer: CallApi;
    onExpand: () => void;
    style?: React.CSSProperties;
}

export default function MinimizedDock({ contactName, dialer, onExpand, style }: Props) {
    const inCall = dialer.callState !== 'idle' && dialer.callState !== 'ended';
    return (
        <div
            className="fixed bottom-6 right-6 z-50 w-[300px] bg-[#282B36] text-white rounded-xl shadow-2xl overflow-hidden select-none flex items-center"
            style={style}
        >
            <button
                onClick={onExpand}
                title="Expand dialer"
                className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2.5 hover:bg-white/5 text-left"
            >
                {inCall ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse shrink-0" />
                ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />
                )}
                <span className="text-[12px] font-medium truncate">{contactName}</span>
                {inCall && dialer.callState === 'active' && (
                    <span className="text-[12px] text-white/70 tabular-nums shrink-0">{formatDuration(dialer.duration)}</span>
                )}
            </button>
            {inCall && (
                <button
                    onClick={() => dialer.endCall()}
                    title="End call"
                    className="h-9 w-9 inline-flex items-center justify-center bg-[#DC2626] hover:bg-[#B91C1C] text-white shrink-0"
                >
                    <svg className="w-4 h-4 rotate-[135deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                </button>
            )}
            <button
                onClick={onExpand}
                title="Expand"
                className="h-9 w-9 inline-flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 shrink-0 border-l border-white/10"
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
            </button>
        </div>
    );
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}
