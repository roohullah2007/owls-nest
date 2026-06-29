import { useState } from 'react';

export type Disposition = 'connected' | 'voicemail' | 'no_answer' | 'wrong_number' | 'do_not_call' | 'callback_scheduled';

/**
 * Disposition (outcome) picker shown when a call ends. 5 main outcomes + a
 * Follow-up button that reveals an inline datetime picker. Saves with notes.
 */

const DISPOSITIONS: { key: Disposition; label: string; tone: 'success' | 'warning' | 'neutral' | 'danger' }[] = [
    { key: 'connected', label: 'Talked', tone: 'success' },
    { key: 'voicemail', label: 'Voicemail', tone: 'warning' },
    { key: 'no_answer', label: 'No Answer', tone: 'neutral' },
    { key: 'wrong_number', label: 'Bad Number', tone: 'warning' },
    { key: 'do_not_call', label: 'DNC', tone: 'danger' },
];

interface Props {
    saving: boolean;
    notes: string;
    callbackAt: string;
    onNotesChange: (n: string) => void;
    onCallbackAtChange: (n: string) => void;
    onPick: (d: Disposition) => Promise<void>;
}

export default function DispositionPicker({ saving, notes, callbackAt, onNotesChange, onCallbackAtChange, onPick }: Props) {
    const [pendingCallback, setPendingCallback] = useState(false);

    const handlePick = async (d: Disposition) => {
        if (d === 'callback_scheduled' && !callbackAt) {
            setPendingCallback(true);
            return;
        }
        await onPick(d);
        setPendingCallback(false);
    };

    return (
        <div className="mt-3 px-4 py-3 border-t border-[#E4E7EB] space-y-2 bg-[#FAFBFC]">
            <p className="text-[10px] font-semibold text-[#5F656D] tracking-wider">How did it go?</p>
            <div className="grid grid-cols-2 gap-1.5">
                {DISPOSITIONS.map((d) => (
                    <button
                        key={d.key}
                        disabled={saving}
                        onClick={() => handlePick(d.key)}
                        className={`px-2 py-2 rounded-md text-[12px] font-medium border transition-colors disabled:opacity-50 ${toneClass(d.tone)}`}
                    >
                        {d.label}
                    </button>
                ))}
                <button
                    disabled={saving}
                    onClick={() => setPendingCallback(true)}
                    className={`px-2 py-2 rounded-md text-[12px] font-medium border transition-colors disabled:opacity-50 ${toneClass('neutral')} ${pendingCallback ? 'ring-2 ring-[#1693C9]' : ''}`}
                >
                    Follow-up
                </button>
            </div>

            {pendingCallback && (
                <div className="pt-1">
                    <label className="block text-[10px] font-semibold text-[#5F656D] tracking-wider mb-1">Schedule callback</label>
                    <input
                        type="datetime-local"
                        value={callbackAt}
                        onChange={(e) => onCallbackAtChange(e.target.value)}
                        className="w-full py-2 px-2 text-[12px] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1693C9]"
                    />
                    <button
                        disabled={!callbackAt || saving}
                        onClick={() => handlePick('callback_scheduled')}
                        className="mt-2 w-full h-9 rounded-md bg-[#1693C9] text-white text-[12px] font-medium hover:bg-[#1380AF] disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Schedule callback'}
                    </button>
                </div>
            )}

            <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Add a note about this call (optional)…"
                rows={2}
                className="w-full px-3 py-2 text-[12px] border border-[#E4E7EB] rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-[#1693C9]"
            />
        </div>
    );
}

function toneClass(tone: 'success' | 'warning' | 'neutral' | 'danger'): string {
    switch (tone) {
        case 'success': return 'border-[#A7F3D0] bg-[#ECFDF5] text-[#047857] hover:bg-[#D1FAE5]';
        case 'warning': return 'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309] hover:bg-[#FEF3C7]';
        case 'danger':  return 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2]';
        default:        return 'border-[#E4E7EB] bg-white text-[#111315] hover:bg-[#F9FAFB]';
    }
}
