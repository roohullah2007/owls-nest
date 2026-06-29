import { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/api';
import NativeSelect from '@/Components/Crm/NativeSelect';
import type { CallingScriptDto } from '@/Components/Crm/CallingScriptManager';

/**
 * Modal shown when the agent clicks Power Dial on Contacts — lets them
 * optionally pick a calling script before the campaign page opens. Skipping is
 * fine; the script can also be set on the campaign page itself.
 */

interface Props {
    contactCount: number;
    onCancel: () => void;
    onStart: (callingScriptId: number | null) => Promise<void>;
}

export default function PowerDialLauncherModal({ contactCount, onCancel, onStart }: Props) {
    const [scripts, setScripts] = useState<CallingScriptDto[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        apiFetch(route('crm.calling-scripts.index'))
            .then((data) => setScripts(data.scripts ?? []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    async function go() {
        setStarting(true);
        try {
            await onStart(selectedId);
        } finally {
            setStarting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E4E7EB]">
                    <h2 className="text-[14px] font-semibold text-[#111315]">Start Power Dialer</h2>
                    <p className="text-[11px] text-[#5F656D] mt-0.5">
                        {contactCount} contact{contactCount === 1 ? '' : 's'} selected. Pick a calling script to use during the session.
                    </p>
                </div>
                <div className="p-5 space-y-3">
                    <label className="block text-[10px] font-semibold text-[#5F656D] tracking-wider">Calling Script</label>
                    {loading ? (
                        <p className="text-[12px] text-[#8B9096]">Loading scripts…</p>
                    ) : (
                        <NativeSelect
                            fullWidth
                            value={selectedId ?? ''}
                            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="">— No script (pick later) —</option>
                            {scripts.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}{s.is_team_shared ? ' (Team)' : ''}
                                </option>
                            ))}
                        </NativeSelect>
                    )}
                    <p className="text-[11px] text-[#8B9096]">Contacts on Do-Not-Call or without a phone number will be skipped automatically.</p>
                </div>
                <div className="px-5 py-3 border-t border-[#E4E7EB] flex items-center justify-end gap-2">
                    <button
                        onClick={onCancel}
                        disabled={starting}
                        className="h-9 px-4 text-[12px] font-medium text-[#5F656D] bg-[#F3F4F6] rounded-[4px] hover:bg-[#E4E7EB] disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={go}
                        disabled={starting || contactCount === 0}
                        className="h-9 px-4 text-[12px] font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] disabled:opacity-50"
                    >
                        {starting ? 'Starting…' : 'Start dialing'}
                    </button>
                </div>
            </div>
        </div>
    );
}
