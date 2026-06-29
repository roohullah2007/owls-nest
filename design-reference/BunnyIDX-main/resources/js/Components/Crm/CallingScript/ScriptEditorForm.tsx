import { useState } from 'react';
import NativeSelect from '../NativeSelect';
import { apiPost, apiPut, apiDelete } from '@/utils/api';
import type { CallingScriptDto, ScriptQuestion } from './types';

/**
 * Reusable edit form for a CallingScript. Used by:
 *   - CallingScriptManager (modal launched from the dialer page)
 *   - Settings > Calling Scripts tab (inline panel)
 *
 * Handles its own save/delete API calls and reports back via `onSaved` /
 * `onDeleted` / `onCancel`. The parent owns the list of scripts and reload
 * trigger.
 */

interface Props {
    script: CallingScriptDto;
    onSaved: () => void;
    onCancel: () => void;
    onDeleted?: () => void;
}

export function blankScript(): CallingScriptDto {
    return {
        id: 0, name: '', intro: '', body: '', questions: [],
        is_team_shared: false, is_mine: true, is_editable: true,
        usage_count: 0, last_used_at: null, owner_id: null,
    };
}

export function newQuestion(): ScriptQuestion {
    return {
        id: `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        text: '', type: 'text', options: [],
    };
}

export default function ScriptEditorForm({ script, onSaved, onCancel, onDeleted }: Props) {
    const [draft, setDraft] = useState<CallingScriptDto>({ ...script, questions: [...script.questions] });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const readOnly = !draft.is_editable && draft.id !== 0;

    async function save() {
        if (!draft.name.trim()) { setError('Name is required.'); return; }
        setSaving(true); setError(null);
        try {
            const body = {
                name: draft.name,
                intro: draft.intro,
                body: draft.body,
                questions: draft.questions,
                is_team_shared: draft.is_team_shared,
            };
            if (draft.id === 0) {
                await apiPost(route('crm.calling-scripts.store'), body);
            } else {
                await apiPut(route('crm.calling-scripts.update', { callingScript: draft.id }), body);
            }
            onSaved();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    }

    async function destroy() {
        if (!confirm(`Delete "${draft.name}"? This can't be undone.`)) return;
        try {
            await apiDelete(route('crm.calling-scripts.destroy', { callingScript: draft.id }));
            onDeleted?.();
        } catch (e: any) {
            setError(e.message);
        }
    }

    return (
        <div className="space-y-4">
            {error && (
                <div className="px-3 py-2 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[11px] text-[#DC2626]">{error}</div>
            )}

            <div>
                <label className="block text-[10px] font-semibold text-[#5F656D] tracking-wider mb-1">Name</label>
                <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    disabled={readOnly}
                    placeholder="e.g. Cold call opener — Seller leads"
                    className="w-full py-2 px-3 text-[13px] text-[#111315] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1693C9] focus:border-[#1693C9]"
                />
            </div>

            <div>
                <label className="block text-[10px] font-semibold text-[#5F656D] tracking-wider mb-1">Opening line (optional)</label>
                <input
                    type="text"
                    value={draft.intro ?? ''}
                    onChange={(e) => setDraft({ ...draft, intro: e.target.value })}
                    disabled={readOnly}
                    placeholder="Hi {{first_name}}, this is …"
                    className="w-full py-2 px-3 text-[13px] text-[#111315] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1693C9] focus:border-[#1693C9]"
                />
            </div>

            <div>
                <label className="block text-[10px] font-semibold text-[#5F656D] tracking-wider mb-1">Script body</label>
                <textarea
                    value={draft.body ?? ''}
                    onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                    disabled={readOnly}
                    rows={8}
                    placeholder="What the agent reads during the call. Plain text or markdown."
                    className="w-full px-3 py-2 text-[13px] text-[#111315] border border-[#E4E7EB] rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-[#1693C9] focus:border-[#1693C9]"
                />
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-semibold text-[#5F656D] tracking-wider">Questions</label>
                    <button
                        onClick={() => setDraft({ ...draft, questions: [...draft.questions, newQuestion()] })}
                        className="text-[11px] font-medium text-[#1693C9] hover:underline"
                    >
                        + Add question
                    </button>
                </div>
                {draft.questions.length === 0 ? (
                    <p className="text-[11px] text-[#8B9096] italic">No questions yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {draft.questions.map((q, idx) => (
                            <li key={q.id} className="border border-[#E4E7EB] rounded-md p-3 space-y-2">
                                <div className="flex items-start gap-2">
                                    <span className="text-[10px] font-semibold text-[#8B9096] mt-2 w-5">{idx + 1}.</span>
                                    <input
                                        type="text"
                                        value={q.text}
                                        onChange={(e) => {
                                            const next = [...draft.questions];
                                            next[idx] = { ...q, text: e.target.value };
                                            setDraft({ ...draft, questions: next });
                                        }}
                                        placeholder="What's their timeline?"
                                        className="flex-1 py-1.5 px-2 text-[12px] text-[#111315] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1693C9]"
                                    />
                                    <NativeSelect
                                        size="sm"
                                        value={q.type}
                                        onChange={(e) => {
                                            const next = [...draft.questions];
                                            next[idx] = { ...q, type: e.target.value as ScriptQuestion['type'] };
                                            setDraft({ ...draft, questions: next });
                                        }}
                                    >
                                        <option value="text">Text</option>
                                        <option value="yes_no">Yes / No</option>
                                        <option value="multi">Multi</option>
                                    </NativeSelect>
                                    <button
                                        onClick={() => setDraft({ ...draft, questions: draft.questions.filter((_, i) => i !== idx) })}
                                        className="h-8 w-8 inline-flex items-center justify-center text-[#8B9096] hover:text-[#DC2626]"
                                    >
                                        ✕
                                    </button>
                                </div>
                                {q.type === 'multi' && (
                                    <div className="pl-7">
                                        <input
                                            type="text"
                                            value={(q.options ?? []).join(', ')}
                                            onChange={(e) => {
                                                const opts = e.target.value.split(',').map((o) => o.trim()).filter(Boolean);
                                                const next = [...draft.questions];
                                                next[idx] = { ...q, options: opts };
                                                setDraft({ ...draft, questions: next });
                                            }}
                                            placeholder="Option 1, Option 2, Option 3"
                                            className="w-full py-1.5 px-2 text-[11px] text-[#111315] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1693C9]"
                                        />
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <label className="flex items-center gap-2 text-[12px] text-[#5F656D] cursor-pointer">
                <input
                    type="checkbox"
                    checked={draft.is_team_shared}
                    onChange={(e) => setDraft({ ...draft, is_team_shared: e.target.checked })}
                    className="h-4 w-4 rounded text-[#1693C9] focus:ring-[#1693C9]"
                />
                Share with my team
            </label>

            <div className="flex items-center gap-2 pt-2 border-t border-[#F3F4F6]">
                <button
                    onClick={save}
                    disabled={saving || readOnly}
                    className="h-9 px-4 text-[12px] font-medium text-white bg-[#1693C9] rounded-md hover:bg-[#1380AF] disabled:opacity-50"
                >
                    {saving ? 'Saving…' : draft.id === 0 ? 'Create script' : 'Save changes'}
                </button>
                <button
                    onClick={onCancel}
                    className="h-9 px-4 text-[12px] font-medium text-[#5F656D] bg-[#F3F4F6] rounded-md hover:bg-[#E4E7EB]"
                >
                    Cancel
                </button>
                {draft.id !== 0 && draft.is_editable && onDeleted && (
                    <button
                        onClick={destroy}
                        className="ml-auto h-9 px-4 text-[12px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] rounded-md"
                    >
                        Delete
                    </button>
                )}
            </div>
        </div>
    );
}
