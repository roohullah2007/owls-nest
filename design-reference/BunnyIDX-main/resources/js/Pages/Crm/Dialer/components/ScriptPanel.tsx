import PillTabs from '@/Components/Crm/PillTabs';
import NativeSelect from '@/Components/Crm/NativeSelect';
import type { CallingScriptDto, ScriptQuestion } from '@/Components/Crm/CallingScript/types';
import type { ContactDto, ScriptDto } from './types';
import { fillTokens } from './utils';

/**
 * Left column of the campaign page: script picker + tabs (Script / Questionnaire) + body.
 */

interface Props {
    script: ScriptDto | null;
    contact: ContactDto | null;
    allScripts: CallingScriptDto[];
    selectedScriptId: number | null;
    activeTab: 'script' | 'questionnaire';
    onTabChange: (tab: 'script' | 'questionnaire') => void;
    onScriptSelect: (id: number | null) => void;
    onManageScripts: () => void;
    answers: Record<string, string>;
    onAnswersChange: (next: Record<string, string>) => void;
}

export default function ScriptPanel({
    script, contact, allScripts, selectedScriptId,
    activeTab, onTabChange, onScriptSelect, onManageScripts,
    answers, onAnswersChange,
}: Props) {
    return (
        <div className="bg-white border border-[#E4E7EB] rounded-xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E4E7EB] flex items-center gap-3 flex-wrap">
                <ScriptPicker scripts={allScripts} selectedId={selectedScriptId} onSelect={onScriptSelect} />
                <button onClick={onManageScripts} className="text-[11px] font-medium text-[#1693C9] hover:underline">
                    Manage scripts
                </button>
                <div className="ml-auto">
                    <PillTabs
                        size="sm"
                        active={activeTab}
                        onChange={(v) => onTabChange(v as 'script' | 'questionnaire')}
                        tabs={[
                            { key: 'script', label: 'Script' },
                            { key: 'questionnaire', label: 'Questionnaire', count: script?.questions?.length },
                        ]}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
                {!script ? (
                    <div className="h-full flex items-center justify-center text-center">
                        <div>
                            <p className="text-[13px] text-[#5F656D]">No calling script attached to this session.</p>
                            <button
                                onClick={onManageScripts}
                                className="mt-3 h-8 px-3 text-[12px] font-medium text-white bg-[#1693C9] rounded-md hover:bg-[#1380AF]"
                            >
                                Create one
                            </button>
                        </div>
                    </div>
                ) : activeTab === 'script' ? (
                    <ScriptBody script={script} contact={contact} />
                ) : (
                    <QuestionnaireForm questions={script.questions} answers={answers} onChange={onAnswersChange} />
                )}
            </div>
        </div>
    );
}

function ScriptPicker({ scripts, selectedId, onSelect }: { scripts: CallingScriptDto[]; selectedId: number | null; onSelect: (id: number | null) => void }) {
    const selected = scripts.find((s) => s.id === selectedId);
    return (
        <NativeSelect
            value={selectedId ?? ''}
            onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
            title={selected?.name ?? 'Pick a script'}
            className="min-w-[200px]"
        >
            <option value="">— No script —</option>
            {scripts.map((s) => (
                <option key={s.id} value={s.id}>
                    {s.name}{s.is_team_shared ? ' (Team)' : ''}
                </option>
            ))}
        </NativeSelect>
    );
}

function ScriptBody({ script, contact }: { script: ScriptDto; contact: ContactDto | null }) {
    return (
        <div className="space-y-4">
            {script.intro && (
                <div className="rounded-lg bg-[#FFFBEB] border border-[#FDE68A] px-4 py-3">
                    <p className="text-[10px] font-semibold text-[#B45309] tracking-wider mb-1">Opening line</p>
                    <p className="text-[14px] text-[#111315] leading-relaxed">{fillTokens(script.intro, contact)}</p>
                </div>
            )}
            {script.body ? (
                <div className="text-[13px] text-[#111315] leading-relaxed whitespace-pre-wrap">
                    {fillTokens(script.body, contact)}
                </div>
            ) : (
                <p className="text-[12px] text-[#8B9096] italic">This script has no body yet.</p>
            )}
        </div>
    );
}

function QuestionnaireForm({ questions, answers, onChange }: { questions: ScriptQuestion[]; answers: Record<string, string>; onChange: (next: Record<string, string>) => void }) {
    if (questions.length === 0) {
        return <p className="text-[12px] text-[#8B9096] italic">No questions on this script.</p>;
    }
    return (
        <ol className="space-y-4">
            {questions.map((q, idx) => (
                <li key={q.id} className="border-l-2 border-[#E4E7EB] pl-4">
                    <p className="text-[13px] font-medium text-[#111315]">{idx + 1}. {q.text}</p>
                    <div className="mt-2">
                        {q.type === 'text' && (
                            <textarea
                                value={answers[q.id] ?? ''}
                                onChange={(e) => onChange({ ...answers, [q.id]: e.target.value })}
                                rows={2}
                                placeholder="Type the answer…"
                                className="w-full px-3 py-2 text-[13px] border border-[#E4E7EB] rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-[#1693C9]"
                            />
                        )}
                        {q.type === 'yes_no' && (
                            <div className="flex gap-2">
                                {['Yes', 'No'].map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => onChange({ ...answers, [q.id]: opt })}
                                        className={`h-9 px-4 text-[12px] font-medium rounded-md border ${answers[q.id] === opt ? 'bg-[#1693C9] text-white border-[#1693C9]' : 'bg-white text-[#5F656D] border-[#E4E7EB] hover:bg-[#F9FAFB]'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                        {q.type === 'multi' && (
                            <div className="flex flex-wrap gap-1.5">
                                {(q.options ?? []).map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => onChange({ ...answers, [q.id]: opt })}
                                        className={`h-8 px-3 text-[12px] rounded-md border ${answers[q.id] === opt ? 'bg-[#1693C9] text-white border-[#1693C9]' : 'bg-white text-[#5F656D] border-[#E4E7EB] hover:bg-[#F9FAFB]'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </li>
            ))}
        </ol>
    );
}
