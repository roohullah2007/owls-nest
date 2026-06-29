import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { AgentWebsite } from '../../../types';
import { inputClass, labelClass } from '../../../constants';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import RichTextField from '@/Components/Crm/RichTextField';
import MediaField from '../../MediaField';

interface TeamMember {
    id: number;
    name: string;
    slug: string;
    title: string | null;
    photo: string | null;
    phone: string | null;
    email: string | null;
    bio: string | null;
    socials: Record<string, string>;
    mls_agent_id: string | null;
    sort_order: number;
    is_active: boolean;
}

interface Props {
    website: AgentWebsite;
    onActionChange: (action: { label: string; onClick: () => void } | null) => void;
}

// Mirrors the networks the shared social-icons partial can render.
const SOCIAL_KEYS = ['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok', 'x'] as const;
const SOCIAL_LABELS: Record<(typeof SOCIAL_KEYS)[number], string> = {
    facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn',
    youtube: 'YouTube', tiktok: 'TikTok', x: 'X (Twitter)',
};

const EMPTY_FORM = {
    name: '', title: '', phone: '', email: '', bio: '', mls_agent_id: '',
    facebook: '', instagram: '', linkedin: '', youtube: '', tiktok: '', x: '',
    is_active: true,
};

/** Teal person chip for list rows without a photo — same chip style as the Pages/Blog rows. */
function MemberChip({ src }: { src: string | null }) {
    if (src) {
        return <span className="h-10 w-10 rounded-[4px] bg-[#F3F4F6] bg-cover bg-center block" style={{ backgroundImage: `url(${src})` }} />;
    }
    return (
        <span className="h-10 w-10 rounded-[4px] bg-[#E0F2FE] flex items-center justify-center">
            <svg className="h-5 w-5 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
        </span>
    );
}

/**
 * Website settings → Team manager. Members power the public /team page (auto-
 * added to navigation once members exist), each member's own page (bio + their
 * MLS listings via the MLS Agent ID), and the auto-populated Team block.
 * List/editor layout matches the Pages & Blog Posts tabs: row cards with a
 * drag handle + icon chip, the add action in the tab's top bar, and a
 * back-link editor view.
 */
export default function TeamSection({ website, onActionChange }: Props) {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<TeamMember | null>(null);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    // Media Library path (or the member's existing photo URL); only sent when changed.
    const [photo, setPhoto] = useState('');
    const [photoChanged, setPhotoChanged] = useState(false);
    const [aiBusy, setAiBusy] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [dragId, setDragId] = useState<number | null>(null);

    const base = `/api/website-editor/${website.id}`;

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${base}/team`);
            setMembers(data.members || []);
        } finally {
            setLoading(false);
        }
    }, [base]);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    const openCreate = () => {
        setForm({ ...EMPTY_FORM });
        setPhoto('');
        setPhotoChanged(false);
        setAiError(null);
        setEditing(null);
        setCreating(true);
    };

    const openEdit = (m: TeamMember) => {
        setForm({
            name: m.name, title: m.title || '', phone: m.phone || '', email: m.email || '',
            bio: m.bio || '', mls_agent_id: m.mls_agent_id || '',
            facebook: m.socials?.facebook || '', instagram: m.socials?.instagram || '', linkedin: m.socials?.linkedin || '',
            youtube: m.socials?.youtube || '', tiktok: m.socials?.tiktok || '', x: m.socials?.x || '',
            is_active: m.is_active,
        });
        setPhoto(m.photo || '');
        setPhotoChanged(false);
        setAiError(null);
        setEditing(m);
        setCreating(true);
    };

    const closeForm = () => { setCreating(false); setEditing(null); };

    const save = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const socials: Record<string, string> = {};
            SOCIAL_KEYS.forEach((k) => { if (form[k]) socials[k] = form[k]; });

            const payload: Record<string, unknown> = {
                name: form.name,
                title: form.title,
                phone: form.phone,
                email: form.email,
                bio: form.bio,
                mls_agent_id: form.mls_agent_id,
                is_active: form.is_active,
                socials,
            };
            // The photo is a Media Library path; only send it when changed
            // ('' clears it — the backend treats an absent key as untouched).
            if (photoChanged) payload.photo = photo;

            await axios.post(editing ? `${base}/team/${editing.id}` : `${base}/team`, payload);
            closeForm();
            fetchMembers();
        } finally {
            setSaving(false);
        }
    };

    // Top-bar action mirrors the Blog tab: add on the list, save on the form.
    const saveRef = useRef<() => void>(() => {});
    saveRef.current = save;
    useEffect(() => {
        if (!creating) {
            onActionChange({ label: '+ Add Team Member', onClick: () => openCreate() });
        } else {
            onActionChange({ label: editing ? 'Save Changes' : 'Add Member', onClick: () => saveRef.current() });
        }
        return () => onActionChange(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [creating, editing]);

    const remove = async (m: TeamMember) => {
        if (!confirm(`Remove ${m.name} from the team?`)) return;
        await axios.delete(`${base}/team/${m.id}`);
        fetchMembers();
    };

    // Drag-to-reorder (same interaction as the Pages tab): rebuild the local
    // order live as the dragged card passes over a target, persist on drop.
    function reorderTo(overId: number) {
        if (dragId === null || dragId === overId) return;
        setMembers((prev) => {
            const from = prev.findIndex((m) => m.id === dragId);
            const to = prev.findIndex((m) => m.id === overId);
            if (from < 0 || to < 0) return prev;
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
    }

    async function persistOrder() {
        setDragId(null);
        await axios.patch(`${base}/team-order`, { ids: members.map((m) => m.id) });
    }

    const writeBioWithAi = async () => {
        if (!form.name.trim()) {
            setAiError('Add the member name first.');
            return;
        }
        setAiBusy(true);
        setAiError(null);
        try {
            const { data } = await axios.post(`${base}/ai/generate-team-bio`, {
                name: form.name,
                title: form.title || null,
                current_value: form.bio || null,
            });
            if (data.value) setForm((f) => ({ ...f, bio: data.value }));
        } catch (err: any) {
            setAiError(err.response?.data?.error || 'Could not generate a bio.');
        } finally {
            setAiBusy(false);
        }
    };

    // ── Editor form view ──
    if (creating) {
        return (
            <div className="space-y-6">
                {/* Back to the list — the save action lives in the tab's top bar. */}
                <button type="button" onClick={closeForm} className="flex items-center gap-1.5 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                    All Team Members
                </button>

                <div className="border border-[#E4E7EB] bg-white rounded-xl p-6 space-y-5">
                    <p className="text-sm font-semibold text-[#111315]">{editing ? `Edit ${editing.name}` : 'New Team Member'}</p>
                    <div>
                        <label className={labelClass}>Photo</label>
                        <MediaField websiteId={website.id} value={photo} onChange={(p) => { setPhoto(p); setPhotoChanged(true); }} size="md" />
                        <p className="mt-1 text-[11px] text-[#5F656D]">Pick from your Media Library or upload — portrait orientation looks best on the member's page.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className={labelClass}>Name *</label>
                            <input type="text" className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div>
                            <label className={labelClass}>Title / Role</label>
                            <input type="text" className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Buyer Specialist" />
                        </div>
                        <div>
                            <label className={labelClass}>Phone</label>
                            <input type="text" className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div>
                            <label className={labelClass}>Email</label>
                            <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className={labelClass}>MLS Agent ID <span className="text-[#9AA1A9]">(shows their listings on their page)</span></label>
                            <input type="text" className={inputClass} value={form.mls_agent_id} onChange={(e) => setForm({ ...form, mls_agent_id: e.target.value })} />
                        </div>
                        <div className="sm:col-span-2">
                            <div className="flex items-center justify-between">
                                <label className={labelClass}>Bio</label>
                                <button type="button" onClick={writeBioWithAi} disabled={aiBusy || !form.name.trim()} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] disabled:opacity-50 transition-colors">
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.6 4.8L18 8l-4.4 1.2L12 14l-1.6-4.8L6 8l4.4-1.2L12 2zm6 9l.9 2.6L21 14l-2.1.7L18 17l-.9-2.3L15 14l2.1-.4L18 11zM6 13l.9 2.6L9 16l-2.1.7L6 19l-.9-2.3L3 16l2.1-.4L6 13z" /></svg>
                                    {aiBusy ? 'Writing…' : form.bio.trim() ? 'Improve with AI' : 'Write with AI'}
                                </button>
                            </div>
                            <RichTextField
                                value={form.bio}
                                onChange={(bio) => setForm((f) => ({ ...f, bio }))}
                                minHeight={180}
                                placeholder="A professional bio — or click Write with AI."
                            />
                            {aiError && <p className="mt-1 text-[12px] text-red-600">{aiError}</p>}
                        </div>
                        {SOCIAL_KEYS.map((k) => (
                            <div key={k}>
                                <label className={labelClass}>{SOCIAL_LABELS[k]} URL</label>
                                <input type="url" className={inputClass} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder="https://…" />
                            </div>
                        ))}
                    </div>
                    <label className="flex items-center gap-2 text-[13px] text-[#111315]">
                        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-[#C8CCD1]" />
                        Visible on the website
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                        <PrimaryButton type="button" onClick={save} disabled={saving || !form.name.trim()} label={saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Member'} />
                        <button type="button" onClick={closeForm} className="rounded-md border border-[#C8CCD1] bg-white px-3 py-[6px] text-[13px] hover:bg-[#F7F8F9]">Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

    // ── List view — row cards matching the Pages / Blog Posts tabs ──
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <svg className="animate-spin h-5 w-5 text-[#8B9096]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    if (members.length === 0) {
        return (
            <div className="bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] p-12 text-center">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#E0F2FE] mb-3">
                    <svg className="h-5 w-5 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
                </div>
                <h4 className="text-sm font-semibold text-[#111315] mb-1">No team members yet</h4>
                <p className="text-[12px] text-[#5F656D] mb-4">
                    Your team powers a public /team page (added to your site navigation automatically),
                    an individual page per member, and the Team content block.
                </p>
                <button type="button" onClick={openCreate} className="h-8 px-4 bg-[#1693C9] text-white text-[12px] font-medium rounded-[4px] hover:bg-[#1380AF] transition-colors">
                    Add First Team Member
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="space-y-2.5">
                {members.map((m) => {
                    const open = () => openEdit(m);
                    return (
                        <div
                            key={m.id}
                            draggable
                            onDragStart={() => setDragId(m.id)}
                            onDragOver={(e) => { e.preventDefault(); reorderTo(m.id); }}
                            onDragEnd={persistOrder}
                            onDrop={persistOrder}
                            className={`group bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)] hover:border-[#D1D5DB] transition-all flex items-center ${m.is_active ? '' : 'opacity-60'} ${dragId === m.id ? 'opacity-40 ring-1 ring-[#1693C9]' : ''}`}
                        >
                            {/* Drag handle — at the very beginning */}
                            <span className="shrink-0 pl-3 text-[#C4C9D1] hover:text-[#8B9096] cursor-grab active:cursor-grabbing" aria-label="Drag to reorder" title="Drag to reorder">
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM18 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /></svg>
                            </span>

                            {/* Photo / icon chip */}
                            <button type="button" onClick={open} className="shrink-0 pl-3 flex items-center" aria-label={`Edit ${m.name}`}>
                                <MemberChip src={m.photo} />
                            </button>

                            {/* Content + actions */}
                            <div className="flex-1 min-w-0 flex items-center gap-4 px-4 py-4">
                                <div className="min-w-0 flex-1">
                                    <button type="button" onClick={open} className="block max-w-full text-left">
                                        <span className="inline-flex items-center gap-2 max-w-full">
                                            <span className="text-[15px] font-semibold text-[#111315] truncate hover:text-[#1693C9] transition-colors">{m.name}</span>
                                            {!m.is_active && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 bg-[#F3F4F6] text-[#5F656D]">Hidden</span>
                                            )}
                                        </span>
                                    </button>
                                    <p className="text-[11px] text-[#8B9096] truncate mt-0.5">
                                        <span className="font-mono">/team/{m.slug}</span>
                                        {m.title ? ` · ${m.title}` : ''}
                                        {m.mls_agent_id ? ` · MLS: ${m.mls_agent_id}` : ''}
                                    </p>
                                </div>

                                <a
                                    href={`/site/${website.slug}/team/${m.slug}`}
                                    target="_blank"
                                    rel="noopener"
                                    className="h-8 px-3.5 text-[12px] font-medium text-[#1693C9] border border-[#1693C9]/40 rounded-[4px] hover:bg-[#E0F2FE] transition-colors flex items-center gap-1.5 shrink-0"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                                    View
                                </a>
                                <button
                                    type="button"
                                    onClick={open}
                                    className="h-8 px-3.5 text-[12px] font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors flex items-center gap-1.5 shrink-0"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => remove(m)}
                                    className="h-8 px-3 text-[12px] font-medium text-[#DC2626] border border-[#F0C2C2] rounded-[4px] hover:bg-[#FEF2F2] transition-colors flex items-center gap-1.5 shrink-0"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                    Delete
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-[11px] text-[#8B9096]">
                Members power the public <a href={`/site/${website.slug}/team`} target="_blank" rel="noopener" className="text-[#1693C9] hover:underline">/team page</a> (added
                to your navigation automatically), an individual page per member, and the Team content block.
                Add an <b>MLS Agent ID</b> to show that member's active &amp; sold listings on their page.
            </p>
        </div>
    );
}
