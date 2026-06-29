import { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/api';
import ScriptEditorForm, { blankScript } from '@/Components/Crm/CallingScript/ScriptEditorForm';
import type { CallingScriptDto } from '@/Components/Crm/CallingScript/types';

/**
 * Settings tab — manage personal + team-shared calling scripts.
 * Mirrors the modal manager (CallingScriptManager) but inline as a settings panel.
 * Shares ScriptEditorForm so editor behavior stays in one place.
 */

export default function CallingScriptsTab() {
    const [scripts, setScripts] = useState<CallingScriptDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<CallingScriptDto | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { load(true); }, []);

    async function load(autoOpenIfEmpty = false) {
        setLoading(true);
        try {
            const data = await apiFetch(route('crm.calling-scripts.index'));
            setScripts(data.scripts);
            // Drop the user straight into the new-script form if their library is empty.
            if (autoOpenIfEmpty && data.scripts.length === 0) setEditing(blankScript());
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-5xl">
            <header className="mb-6">
                <h2 className="text-[18px] font-semibold text-[#111315]">Calling Scripts</h2>
                <p className="text-[13px] text-[#5F656D] mt-1">Scripts and questionnaires the Power Dialer reads from. Use <code className="px-1 bg-[#F3F4F6] rounded text-[12px]">{`{{first_name}}`}</code> in the body to auto-fill contact details.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                <aside>
                    <button
                        onClick={() => setEditing(blankScript())}
                        className="w-full h-9 text-[12px] font-medium text-white bg-[#1693C9] rounded-md hover:bg-[#1380AF] mb-3"
                    >
                        + New script
                    </button>
                    {loading ? (
                        <p className="text-center text-[11px] text-[#8B9096] py-6">Loading…</p>
                    ) : scripts.length === 0 ? (
                        <p className="text-center text-[11px] text-[#8B9096] py-6 bg-[#F9FAFB] rounded-lg">No scripts yet.</p>
                    ) : (
                        <ul className="space-y-1">
                            {scripts.map((s) => (
                                <li
                                    key={s.id}
                                    onClick={() => setEditing({ ...s, questions: [...s.questions] })}
                                    className={`px-3 py-2 rounded-md cursor-pointer ${editing?.id === s.id ? 'bg-[#EBF5FF] border border-[#1693C9]' : 'bg-white border border-[#E4E7EB] hover:bg-[#F9FAFB]'}`}
                                >
                                    <p className="text-[12px] font-medium text-[#111315] truncate">{s.name}</p>
                                    <p className="text-[10px] text-[#8B9096] mt-0.5">
                                        {s.questions.length} question{s.questions.length === 1 ? '' : 's'}
                                        {s.is_team_shared && <span className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded bg-[#EDE5FB] text-[#1693C9] text-[9px] font-medium">Team</span>}
                                        {s.usage_count > 0 && <span className="ml-1.5 text-[#8B9096]">· used {s.usage_count}×</span>}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>

                <section>
                    {error && (
                        <div className="mb-3 px-3 py-2 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[11px] text-[#DC2626]">{error}</div>
                    )}
                    {!editing ? (
                        <div className="bg-white border border-[#E4E7EB] rounded-xl p-8 text-center">
                            <p className="text-[13px] text-[#5F656D] mb-3">Pick a script to edit, or create a new one.</p>
                            <button
                                onClick={() => setEditing(blankScript())}
                                className="h-9 px-4 text-[12px] font-medium text-white bg-[#1693C9] rounded-md hover:bg-[#1380AF]"
                            >
                                + Create script
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white border border-[#E4E7EB] rounded-xl p-5">
                            <ScriptEditorForm
                                script={editing}
                                onSaved={async () => { await load(); setEditing(null); }}
                                onCancel={() => setEditing(null)}
                                onDeleted={async () => { await load(); setEditing(null); }}
                            />
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
