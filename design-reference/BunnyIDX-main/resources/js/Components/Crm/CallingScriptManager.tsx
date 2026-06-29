import { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/api';
import ScriptEditorForm, { blankScript } from './CallingScript/ScriptEditorForm';
import type { CallingScriptDto, ScriptQuestion } from './CallingScript/types';

// Re-export for backwards compat (existing imports across the codebase).
export type { CallingScriptDto, ScriptQuestion };

/**
 * Modal CRUD for calling scripts. Used from the Power Dialer campaign page
 * (Manage scripts button). For inline (non-modal) management, see
 * Settings > Calling Scripts which uses the same ScriptEditorForm.
 */

interface Props {
    onClose: () => void;
    onChange?: (scripts: CallingScriptDto[]) => void;
    onUse?: (script: CallingScriptDto) => void;
}

export default function CallingScriptManager({ onClose, onChange, onUse }: Props) {
    const [scripts, setScripts] = useState<CallingScriptDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<CallingScriptDto | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const data = await apiFetch(route('crm.calling-scripts.index'));
            setScripts(data.scripts);
            onChange?.(data.scripts);
        } catch (e: any) {
            setError(e.message ?? 'Failed to load scripts.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E4E7EB] flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-[15px] font-semibold text-[#111315]">Calling Scripts</h2>
                        <p className="text-[11px] text-[#5F656D] mt-0.5">Manage scripts and questionnaires the agent reads during calls.</p>
                    </div>
                    <button onClick={onClose} className="text-[#8B9096] hover:text-[#111315]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-hidden grid grid-cols-[280px_1fr]">
                    {/* List */}
                    <div className="border-r border-[#E4E7EB] bg-[#F9FAFB] overflow-y-auto">
                        <div className="p-3">
                            <button
                                onClick={() => setEditing(blankScript())}
                                className="w-full h-9 text-[12px] font-medium text-white bg-[#1693C9] rounded-md hover:bg-[#1380AF]"
                            >
                                + New script
                            </button>
                        </div>
                        {loading ? (
                            <p className="text-center text-[11px] text-[#8B9096] py-6">Loading…</p>
                        ) : scripts.length === 0 ? (
                            <p className="text-center text-[11px] text-[#8B9096] px-4 py-6">No scripts yet. Create one to get started.</p>
                        ) : (
                            <ul className="px-2 pb-3">
                                {scripts.map((s) => (
                                    <li
                                        key={s.id}
                                        className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer ${editing?.id === s.id ? 'bg-white border border-[#E4E7EB]' : 'hover:bg-white'}`}
                                        onClick={() => setEditing({ ...s, questions: [...s.questions] })}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-medium text-[#111315] truncate">{s.name}</p>
                                            <p className="text-[10px] text-[#8B9096] mt-0.5">
                                                {s.questions.length} question{s.questions.length === 1 ? '' : 's'}
                                                {s.is_team_shared && <span className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded bg-[#EDE5FB] text-[#1693C9] text-[9px] font-medium">Team</span>}
                                            </p>
                                        </div>
                                        {onUse && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onUse(s); }}
                                                className="opacity-0 group-hover:opacity-100 text-[10px] text-[#1693C9] hover:underline"
                                            >
                                                Use
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Editor */}
                    <div className="overflow-y-auto">
                        {error && (
                            <div className="m-5 px-3 py-2 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[11px] text-[#DC2626]">{error}</div>
                        )}
                        {!editing ? (
                            <div className="flex items-center justify-center h-full p-6 text-center">
                                <p className="text-[13px] text-[#5F656D]">Pick a script to edit, or create a new one.</p>
                            </div>
                        ) : (
                            <div className="p-5">
                                <ScriptEditorForm
                                    script={editing}
                                    onSaved={async () => { await load(); setEditing(null); }}
                                    onCancel={() => setEditing(null)}
                                    onDeleted={async () => { await load(); setEditing(null); }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
