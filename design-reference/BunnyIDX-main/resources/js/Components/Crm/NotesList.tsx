import { router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { PageProps } from '@/types';
import MentionInput from './MentionInput';

interface Note {
    id: number;
    body: string;
    is_pinned: boolean;
    created_at: string;
    mentions?: Array<{ user_id: number; name: string }> | null;
    user?: { id: number; name: string } | null;
}

interface Props {
    notes: Note[];
    notableType: 'contact' | 'deal' | 'company' | 'listing';
    notableId: number;
    inputOnly?: boolean;
    initialData?: { body?: string };
}

function renderNoteBody(body: string) {
    const mentionRegex = /@\[([^\]]+)\]\((\d+)\)/g;
    const result: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(body)) !== null) {
        // Add text before this mention
        if (match.index > lastIndex) {
            result.push(body.slice(lastIndex, match.index));
        }
        // Add styled mention
        result.push(
            <span key={match.index} className="inline text-[#1693C9] font-medium cursor-default">
                @{match[1]}
            </span>
        );
        lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < body.length) {
        result.push(body.slice(lastIndex));
    }
    return result.length > 0 ? result : [body];
}

export default function NotesList({ notes, notableType, notableId, inputOnly, initialData }: Props) {
    const { auth } = usePage<PageProps>().props;
    const [editing, setEditing] = useState<number | null>(null);
    const form = useForm({ notable_type: notableType, notable_id: notableId, body: '' });
    const editForm = useForm({ body: '' });

    const teamMembers = auth.team?.members || [];

    useEffect(() => {
        if (initialData) {
            form.setData((prev) => ({ ...prev, body: initialData.body || prev.body }));
        }
    }, [initialData]);

    function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        form.post(route('crm.notes.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset('body'),
        });
    }

    function handleEdit(e: React.FormEvent, noteId: number) {
        e.preventDefault();
        editForm.patch(route('crm.notes.update', noteId), {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    }

    function handleDelete(noteId: number) {
        router.delete(route('crm.notes.destroy', noteId), { preserveScroll: true });
    }

    function handlePin(noteId: number) {
        router.patch(route('crm.notes.pin', noteId), {}, { preserveScroll: true });
    }

    if (inputOnly) {
        return (
            <form onSubmit={handleAdd} className="space-y-3">
                <div>
                    {teamMembers.length > 0 ? (
                        <MentionInput
                            value={form.data.body}
                            onChange={(val) => form.setData('body', val)}
                            teamMembers={teamMembers}
                            placeholder="Write a note... (type @ to mention)"
                            rows={3}
                            className="w-full bg-white border border-[#E4E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111315] placeholder:text-[#8B9096] resize-y focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]"
                            required
                        />
                    ) : (
                        <textarea
                            value={form.data.body}
                            onChange={(e) => form.setData('body', e.target.value)}
                            placeholder="Write a note..."
                            rows={3}
                            className="w-full bg-white border border-[#E4E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111315] placeholder:text-[#8B9096] resize-y focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]"
                            required
                        />
                    )}
                </div>
                <div className="flex items-center justify-end pt-1">
                    <button
                        type="submit"
                        disabled={form.processing || !form.data.body.trim()}
                        className="flex items-center gap-1.5 bg-[#1693C9] px-4 py-1.5 text-xs font-semibold text-white rounded-lg hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                        Add Note
                    </button>
                </div>
            </form>
        );
    }

    const pinned = notes.filter((n) => n.is_pinned);
    const unpinned = notes.filter((n) => !n.is_pinned);

    return (
        <div>
            {/* Add note form */}
            <form onSubmit={handleAdd} className="mb-5 bg-[#F9FAFB] border border-[#E4E7EB] rounded-xl p-3">
                {teamMembers.length > 0 ? (
                    <MentionInput
                        value={form.data.body}
                        onChange={(val) => form.setData('body', val)}
                        teamMembers={teamMembers}
                        placeholder="Write a note... (type @ to mention)"
                        rows={2}
                        className="w-full bg-white border border-[#E4E7EB] rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]"
                        required
                    />
                ) : (
                    <textarea
                        value={form.data.body}
                        onChange={(e) => form.setData('body', e.target.value)}
                        placeholder="Write a note..."
                        rows={2}
                        className="w-full bg-white border border-[#E4E7EB] rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]"
                        required
                    />
                )}
                <div className="mt-2.5 flex justify-end">
                    <button
                        type="submit"
                        disabled={form.processing || !form.data.body.trim()}
                        className="flex items-center gap-1.5 bg-[#1693C9] px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg hover:bg-[#1380AF] disabled:opacity-40 transition-colors"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                        Add Note
                    </button>
                </div>
            </form>

            {/* Pinned notes */}
            {pinned.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center gap-1.5 mb-2">
                        <svg className="h-3 w-3 text-[#D97706]" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                        <p className="text-[11px] font-semibold text-[#D97706] tracking-wider">Pinned</p>
                    </div>
                    <NoteItems
                        notes={pinned}
                        editing={editing}
                        setEditing={setEditing}
                        editForm={editForm}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onPin={handlePin}
                        teamMembers={teamMembers}
                    />
                </div>
            )}

            {/* Other notes */}
            <NoteItems
                notes={unpinned}
                editing={editing}
                setEditing={setEditing}
                editForm={editForm}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPin={handlePin}
                teamMembers={teamMembers}
            />
        </div>
    );
}

function NoteItems({
    notes,
    editing,
    setEditing,
    editForm,
    onEdit,
    onDelete,
    onPin,
    teamMembers,
}: {
    notes: Note[];
    editing: number | null;
    setEditing: (id: number | null) => void;
    editForm: any;
    onEdit: (e: React.FormEvent, id: number) => void;
    onDelete: (id: number) => void;
    onPin: (id: number) => void;
    teamMembers: any[];
}) {
    return (
        <ul className="space-y-3">
            {notes.map((note) => (
                <li key={note.id} className="bg-white border border-[#E4E7EB] rounded-xl p-4 hover:shadow-sm transition-shadow">
                    {editing === note.id ? (
                        <form onSubmit={(e) => onEdit(e, note.id)}>
                            {teamMembers.length > 0 ? (
                                <MentionInput
                                    value={editForm.data.body}
                                    onChange={(val: string) => editForm.setData('body', val)}
                                    teamMembers={teamMembers}
                                    rows={3}
                                    className="w-full border border-[#E4E7EB] rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]"
                                    required
                                />
                            ) : (
                                <textarea
                                    value={editForm.data.body}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => editForm.setData('body', e.target.value)}
                                    rows={3}
                                    className="w-full border border-[#E4E7EB] rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]"
                                    required
                                />
                            )}
                            <div className="mt-2.5 flex justify-end gap-2">
                                <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs font-medium text-[#5F656D] bg-[#F3F4F6] rounded-lg hover:bg-[#E4E7EB] transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="bg-[#1693C9] px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:bg-[#1380AF] transition-colors">
                                    Save
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <p className="text-[13px] text-[#111315] whitespace-pre-wrap leading-relaxed">{renderNoteBody(note.body)}</p>
                            <div className="mt-3 pt-2.5 border-t border-[#F3F4F6] flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[11px] text-[#8B9096]">
                                    {note.user && (
                                        <span className="font-medium text-[#5F656D]">{note.user.name}</span>
                                    )}
                                    <span>{new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => onPin(note.id)}
                                        className={`h-6 px-2 rounded-md text-[11px] font-medium transition-colors ${note.is_pinned ? 'text-[#D97706] bg-[#FEF3C7] hover:bg-[#FDE68A]' : 'text-[#8B9096] hover:text-[#5F656D] hover:bg-[#F3F4F6]'}`}
                                        title={note.is_pinned ? 'Unpin' : 'Pin'}
                                    >
                                        {note.is_pinned ? 'Unpin' : 'Pin'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            editForm.setData('body', note.body);
                                            setEditing(note.id);
                                        }}
                                        className="h-6 px-2 rounded-md text-[11px] font-medium text-[#8B9096] hover:text-[#1693C9] hover:bg-[#EBF5FF] transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button onClick={() => onDelete(note.id)} className="h-6 px-2 rounded-md text-[11px] font-medium text-[#8B9096] hover:text-[#DC2626] hover:bg-red-50 transition-colors">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </li>
            ))}
        </ul>
    );
}
