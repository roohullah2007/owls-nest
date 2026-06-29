import { useEffect, useRef, useState } from 'react';
import { formatPhone } from '@/utils/phone';
import { useTelnyxDialer } from '@/hooks/useTelnyxDialer';

/**
 * Floating WebRTC dialer (single-call, no session). Triggered by Call buttons throughout
 * the CRM. All the SDK plumbing lives in `useTelnyxDialer`; this component is just the UI.
 */

interface Props {
    visible: boolean;
    initialNumber?: string;
    contactId?: number | null;
    contactName?: string;
    dealId?: number | null;
    onClose: () => void;
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const dialPadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

export default function PhoneDialer({ visible, initialNumber = '', contactId, contactName, dealId, onClose }: Props) {
    const [number, setNumber] = useState(initialNumber);
    const [notes, setNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);
    const [showDialpad, setShowDialpad] = useState(!initialNumber);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

    const {
        sdkReady,
        sdkError,
        callState,
        callRecord,
        duration,
        statusText,
        muted,
        held,
        recording,
        startCall,
        endCall,
        toggleMute,
        toggleHold,
        toggleRecord,
        sendDtmf,
        resetCall,
    } = useTelnyxDialer({ enabled: visible });

    useEffect(() => {
        if (initialNumber) setNumber(initialNumber);
    }, [initialNumber]);

    const handleStartCall = () => {
        if (!number) return;
        startCall({ toNumber: number, contactId, dealId });
    };

    const handleSaveAndClose = async () => {
        setSavingNotes(true);
        // End the call (if still ongoing) and save the notes the user wrote in the post-call form.
        await endCall(notes || undefined, 'completed');
        cleanup();
        onClose();
    };

    const cleanup = () => {
        resetCall();
        setNotes('');
        setSavingNotes(false);
        if (!initialNumber) setNumber('');
    };

    const handleClose = () => {
        if (callState === 'active' || callState === 'ringing' || callState === 'connecting') {
            if (!confirm('End the current call?')) return;
            endCall();
        }
        cleanup();
        onClose();
    };

    const handleDtmfPrompt = () => {
        const digit = prompt('DTMF digit (0-9, *, #):') ?? '';
        if (digit) sendDtmf(digit);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-6 right-6 z-40 w-80 bg-white border border-[#E4E7EB] rounded-2xl shadow-2xl overflow-hidden">
            {/* Hidden audio sink — Telnyx SDK pipes remote audio into this element. */}
            <audio id="telnyx-remote-audio" ref={remoteAudioRef} autoPlay playsInline />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#111315] text-white">
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-xs font-semibold">Phone</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${sdkReady ? 'text-[#86efac] bg-[#064e3b]/40' : 'text-white/50 bg-white/10'}`}>
                        {sdkReady ? 'Ready' : 'Connecting…'}
                    </span>
                </div>
                <button onClick={handleClose} className="text-white/60 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {sdkError && (
                <div className="px-4 py-2 bg-[#FEF2F2] border-b border-[#FECACA] text-[11px] text-[#DC2626]">
                    {sdkError}
                </div>
            )}

            {/* Active call display */}
            {callState !== 'idle' && callState !== 'ended' && (
                <div className="px-4 py-4 text-center border-b border-[#E4E7EB]">
                    <p className="text-[13px] font-medium text-[#111315]">
                        {contactName || formatPhone(number)}
                    </p>
                    {contactName && number && (
                        <p className="text-[11px] text-[#8B9096] mt-0.5">{formatPhone(number)}</p>
                    )}
                    <p className="text-xs text-[#5F656D] mt-0.5">
                        {callState === 'active' ? formatDuration(duration) : statusText ?? '…'}
                    </p>
                    {callState === 'active' && (
                        <div className="flex items-center justify-center gap-1 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse" />
                            <span className="text-[10px] text-[#059669]">Connected</span>
                            {recording && (
                                <>
                                    <span className="mx-1 text-[#8B9096]">·</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" />
                                    <span className="text-[10px] text-[#DC2626]">REC</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Post-call notes */}
            {callState === 'ended' && (
                <div className="px-4 py-4 border-b border-[#E4E7EB]">
                    <p className="text-xs font-semibold text-[#111315] mb-2">Call Notes</p>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this call…"
                        rows={3}
                        className="w-full px-3 py-2 text-[13px] border border-[#E4E7EB] rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]"
                    />
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={handleSaveAndClose}
                            disabled={savingNotes}
                            className="flex-1 h-8 text-xs font-medium text-white bg-[#1693C9] rounded-md hover:bg-[#1380AF] disabled:opacity-50 transition-colors"
                        >
                            {savingNotes ? 'Saving…' : 'Save & Close'}
                        </button>
                        <button
                            onClick={() => { cleanup(); onClose(); }}
                            className="h-8 px-3 text-xs font-medium text-[#5F656D] bg-[#F3F4F6] rounded-md hover:bg-[#E4E7EB] transition-colors"
                        >
                            Skip
                        </button>
                    </div>
                </div>
            )}

            {/* Dialpad (idle state) */}
            {callState === 'idle' && (
                <>
                    {contactName && (
                        <div className="px-4 pt-3 text-center">
                            <p className="text-[13px] font-medium text-[#111315]">{contactName}</p>
                            {number && (
                                <p className="text-[11px] text-[#8B9096] mt-0.5">{formatPhone(number)}</p>
                            )}
                        </div>
                    )}

                    <div className={`px-4 ${contactName ? 'pt-2' : 'pt-4'} pb-2`}>
                        <input
                            type="tel"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            className="w-full h-10 px-3 text-center text-lg font-medium text-[#111315] border border-[#E4E7EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]"
                        />
                    </div>

                    {showDialpad && (
                        <div className="grid grid-cols-3 gap-1 px-4 py-2">
                            {dialPadKeys.map((key) => (
                                <button
                                    key={key}
                                    onClick={() => setNumber((n) => n + key)}
                                    className="h-11 text-lg font-medium text-[#5F656D] bg-[#F9FAFB] rounded-lg hover:bg-[#F3F4F6] active:bg-[#E4E7EB] transition-colors"
                                >
                                    {key}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between px-4 pb-2">
                        <button
                            onClick={() => setShowDialpad(!showDialpad)}
                            className="text-[10px] text-[#8B9096] hover:text-[#5F656D]"
                        >
                            {showDialpad ? 'Hide dialpad' : 'Show dialpad'}
                        </button>
                        <button
                            onClick={() => setNumber((n) => n.slice(0, -1))}
                            className="text-[#8B9096] hover:text-[#5F656D]"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                            </svg>
                        </button>
                    </div>
                </>
            )}

            {(callState === 'active' || callState === 'ringing') && (
                <div className="grid grid-cols-4 gap-2 px-4 py-3">
                    <ControlButton
                        icon={muted ? 'muted' : 'mic'}
                        label={muted ? 'Unmute' : 'Mute'}
                        active={muted}
                        onClick={toggleMute}
                    />
                    <ControlButton
                        icon="pause"
                        label={held ? 'Resume' : 'Hold'}
                        active={held}
                        disabled={callState !== 'active' || !callRecord?.telnyx_call_control_id}
                        onClick={toggleHold}
                    />
                    <ControlButton
                        icon="record"
                        label={recording ? 'Stop' : 'Record'}
                        active={recording}
                        danger={recording}
                        disabled={callState !== 'active' || !callRecord?.telnyx_call_control_id}
                        onClick={toggleRecord}
                    />
                    <ControlButton
                        icon="dialpad"
                        label="Keypad"
                        onClick={handleDtmfPrompt}
                    />
                </div>
            )}

            <div className="px-4 py-3">
                {callState === 'idle' ? (
                    <button
                        onClick={handleStartCall}
                        disabled={!number || !sdkReady}
                        title={!sdkReady ? 'Telnyx is still connecting…' : 'Call'}
                        className="w-full h-10 bg-[#059669] text-white text-sm font-semibold rounded-lg hover:bg-[#047857] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Call
                    </button>
                ) : callState !== 'ended' ? (
                    <button
                        onClick={() => endCall()}
                        className="w-full h-10 bg-[#DC2626] text-white text-sm font-semibold rounded-lg hover:bg-[#B91C1C] transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4 rotate-[135deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        End Call
                    </button>
                ) : null}
            </div>
        </div>
    );
}

function ControlButton({
    icon,
    label,
    active = false,
    danger = false,
    disabled = false,
    onClick,
}: {
    icon: string;
    label: string;
    active?: boolean;
    danger?: boolean;
    disabled?: boolean;
    onClick: () => void;
}) {
    const iconSvg = {
        mic: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />,
        muted: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 19L5 5m14 0l-1.5 1.5M12 18.75a6 6 0 006-6v-1.5M12 18.75v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 015.818-1.182" />,
        pause: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25v13.5m-7.5-13.5v13.5" />,
        record: <><circle cx="12" cy="12" r="6" fill="currentColor" /><circle cx="12" cy="12" r="10" strokeWidth={1.5} fill="none" stroke="currentColor" /></>,
        transfer: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />,
        dialpad: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6h.01M12 6h.01M18 6h.01M6 12h.01M12 12h.01M18 12h.01M6 18h.01M12 18h.01M18 18h.01" />,
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${
                disabled
                    ? 'bg-[#F9FAFB] text-[#D1D5DB] cursor-not-allowed'
                    : active
                        ? danger
                            ? 'bg-[#FEF2F2] text-[#DC2626]'
                            : 'bg-[#E6F0FF] text-[#1693C9]'
                        : 'bg-[#F9FAFB] text-[#5F656D] hover:bg-[#F3F4F6]'
            }`}
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {iconSvg[icon as keyof typeof iconSvg]}
            </svg>
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    );
}
