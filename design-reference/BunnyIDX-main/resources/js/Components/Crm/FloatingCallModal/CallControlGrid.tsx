import type { CallApi } from '@/hooks/useTelnyxDialer';

/**
 * 5-button in-call control grid: Mute / Keypad / Hold / Record / VM Drop.
 * Always rendered — disabled when there's no live call so the agent sees the
 * full capability set.
 */

interface Props {
    dialer: CallApi;
    inCall: boolean;
    showKeypad: boolean;
    onToggleKeypad: () => void;
    onVmDrop?: () => void;
    onTransfer?: () => void;
    vmDropAvailable?: boolean;
}

export default function CallControlGrid({ dialer, inCall, showKeypad, onToggleKeypad, onVmDrop, onTransfer, vmDropAvailable }: Props) {
    const callControlReady = !!dialer.callRecord?.telnyx_call_control_id;
    return (
        <>
            <div className="grid grid-cols-3 gap-2 px-4">
                <ControlButton icon={dialer.muted ? 'muted' : 'mic'} label={dialer.muted ? 'Unmute' : 'Mute'} active={dialer.muted} disabled={!inCall} onClick={dialer.toggleMute} />
                <ControlButton icon="dialpad" label="Keypad" active={showKeypad} disabled={!inCall} onClick={onToggleKeypad} />
                <ControlButton icon="pause" label={dialer.held ? 'Resume' : 'Hold'} active={dialer.held} disabled={!inCall || !callControlReady} onClick={dialer.toggleHold} />
            </div>
            <div className="grid grid-cols-3 gap-2 px-4 mt-2">
                <ControlButton icon="record" label={dialer.recording ? 'Stop Rec' : 'Record'} active={dialer.recording} danger={dialer.recording} disabled={!inCall || !callControlReady} onClick={dialer.toggleRecord} />
                <ControlButton
                    icon="vmdrop"
                    label="VM Drop"
                    disabled={!inCall || !callControlReady || !vmDropAvailable}
                    title={!vmDropAvailable ? 'Upload a voicemail clip in Settings > Voicemails to enable VM Drop' : !inCall ? 'Only during a live call' : 'Play your default voicemail and hang up'}
                    onClick={onVmDrop ?? (() => {})}
                />
                <ControlButton
                    icon="transfer"
                    label="Transfer"
                    disabled={!inCall || !callControlReady}
                    title={!inCall ? 'Only during a live call' : 'Transfer the call to another number'}
                    onClick={onTransfer ?? (() => {})}
                />
            </div>

            {showKeypad && inCall && (
                <div className="grid grid-cols-3 gap-1 px-4 mt-3">
                    {['1','2','3','4','5','6','7','8','9','*','0','#'].map((k) => (
                        <button
                            key={k}
                            onClick={() => dialer.sendDtmf(k)}
                            className="h-9 text-[14px] font-medium text-[#5F656D] bg-[#F9FAFB] rounded-lg hover:bg-[#F3F4F6]"
                        >
                            {k}
                        </button>
                    ))}
                </div>
            )}
        </>
    );
}

function ControlButton({ icon, label, active, danger, disabled, title, onClick }: { icon: string; label: string; active?: boolean; danger?: boolean; disabled?: boolean; title?: string; onClick: () => void }) {
    const iconSvg: Record<string, JSX.Element> = {
        mic: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />,
        muted: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 19L5 5m14 0l-1.5 1.5M12 18.75a6 6 0 006-6v-1.5M12 18.75v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 015.818-1.182" />,
        pause: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25v13.5m-7.5-13.5v13.5" />,
        record: <><circle cx="12" cy="12" r="6" fill="currentColor" /><circle cx="12" cy="12" r="10" strokeWidth={1.5} fill="none" stroke="currentColor" /></>,
        dialpad: (
            <g fill="currentColor">
                <circle cx="6" cy="6" r="1.6" /><circle cx="12" cy="6" r="1.6" /><circle cx="18" cy="6" r="1.6" />
                <circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" />
                <circle cx="6" cy="18" r="1.6" /><circle cx="12" cy="18" r="1.6" /><circle cx="18" cy="18" r="1.6" />
            </g>
        ),
        vmdrop: (
            <g fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="7" cy="14" r="3.5" />
                <circle cx="17" cy="14" r="3.5" />
                <path d="M7 10.5h10" />
            </g>
        ),
        transfer: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />,
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${
                disabled
                    ? 'bg-[#F3F4F6] text-[#5F656D] cursor-not-allowed'
                    : active
                        ? danger ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#E6F0FF] text-[#1693C9]'
                        : 'bg-[#F3F4F6] text-[#111315] hover:bg-[#E4E7EB]'
            }`}
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {iconSvg[icon]}
            </svg>
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    );
}
