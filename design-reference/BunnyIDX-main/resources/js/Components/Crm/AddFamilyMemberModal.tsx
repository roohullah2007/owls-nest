import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import Avatar from '@/Components/Crm/Avatar';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';

interface ContactSummary {
    id: number;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    contactUuid: string;
    relationshipTypes: Record<string, string>;
}

type Mode = 'existing' | 'new';

export default function AddFamilyMemberModal({
    isOpen,
    onClose,
    contactUuid,
    relationshipTypes,
}: Props) {
    const [mode, setMode] = useState<Mode>('existing');
    const [type, setType] = useState<string>('spouse');
    const [customLabel, setCustomLabel] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [results, setResults] = useState<ContactSummary[]>([]);
    const [selectedContact, setSelectedContact] = useState<ContactSummary | null>(null);
    const [searching, setSearching] = useState(false);

    const [newContact, setNewContact] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
    });

    useEffect(() => {
        if (isOpen) {
            setMode('existing');
            setType('spouse');
            setCustomLabel('');
            setSearch('');
            setResults([]);
            setSelectedContact(null);
            setNewContact({ first_name: '', last_name: '', email: '', phone: '' });
            setError(null);
            runSearch('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    function runSearch(q: string) {
        setSearching(true);
        axios
            .get(route('crm.contacts.relationships.search', contactUuid), { params: { q } })
            .then((res) => setResults(res.data))
            .catch(() => setResults([]))
            .finally(() => setSearching(false));
    }

    useEffect(() => {
        if (!isOpen || mode !== 'existing') return;
        const id = setTimeout(() => runSearch(search), 250);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, isOpen, mode]);

    if (!isOpen) return null;

    function handleSave() {
        setError(null);
        const payload: Record<string, any> = {
            type,
            custom_label: customLabel.trim() || null,
        };

        if (mode === 'existing') {
            if (!selectedContact) {
                setError('Pick a contact to link.');
                return;
            }
            payload.related_contact_id = selectedContact.id;
        } else {
            if (!newContact.first_name.trim()) {
                setError('First name is required for a new contact.');
                return;
            }
            payload.new_contact = {
                first_name: newContact.first_name.trim(),
                last_name: newContact.last_name.trim() || null,
                email: newContact.email.trim() || null,
                phone: newContact.phone.trim() || null,
            };
        }

        setSaving(true);
        router.post(route('crm.contacts.relationships.store', contactUuid), payload, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onError: (errs) => {
                const firstErr = Object.values(errs)[0];
                setError(typeof firstErr === 'string' ? firstErr : 'Could not save.');
            },
            // Always reset — onError only fires for validation (422); a 5xx would
            // otherwise leave the button stuck on "Linking…" with no way back.
            onFinish: () => setSaving(false),
        });
    }

    const footer = (
        <>
            <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
            >
                {saving ? 'Linking…' : 'Add family member'}
            </button>
        </>
    );

    return (
        <SlideOverModal title="Add Family Member" onClose={onClose} footer={footer}>
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                    {/* Mode tabs */}
                    <div className="flex items-center gap-0.5 bg-[#F3F4F6] p-1 rounded">
                        {(
                            [
                                { key: 'existing', label: 'Existing contact' },
                                { key: 'new', label: 'New contact' },
                            ] as { key: Mode; label: string }[]
                        ).map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setMode(t.key)}
                                className={`flex-1 h-7 text-[12px] font-medium rounded transition-colors ${
                                    mode === t.key ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D]'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div>
                        <FieldLabel htmlFor="rel_type">Relationship</FieldLabel>
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                id="rel_type"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className={inputClass}
                            >
                                {Object.entries(relationshipTypes).map(([slug, label]) => (
                                    <option key={slug} value={slug}>{label}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                value={customLabel}
                                onChange={(e) => setCustomLabel(e.target.value)}
                                placeholder='Custom (e.g. "step-mother")'
                                className={inputClass}
                            />
                        </div>
                    </div>

                    {mode === 'existing' ? (
                        <div className="space-y-2">
                            <FieldLabel htmlFor="rel_search">Select contact</FieldLabel>
                            <input
                                id="rel_search"
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or email…"
                                autoFocus
                                className={inputClass}
                            />

                            <div className="max-h-60 overflow-y-auto border border-[#E4E7EB] rounded">
                                {searching && results.length === 0 ? (
                                    <div className="px-3 py-6 text-center text-[12px] text-[#8B9096]">Searching…</div>
                                ) : results.length === 0 ? (
                                    <div className="px-3 py-6 text-center text-[12px] text-[#8B9096]">
                                        {search ? 'No contacts match' : 'No more contacts to link'}
                                    </div>
                                ) : (
                                    results.map((c) => {
                                        const selected = selectedContact?.id === c.id;
                                        return (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => setSelectedContact(c)}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left border-b border-[#F3F4F6] last:border-b-0 transition-colors ${
                                                    selected ? 'bg-[#EFF6FF]' : 'hover:bg-[#F9FAFB]'
                                                }`}
                                            >
                                                <Avatar id={c.id} name={`${c.first_name} ${c.last_name}`} size="sm" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] font-medium text-[#111315] truncate leading-tight">
                                                        {c.first_name} {c.last_name}
                                                    </p>
                                                    {(c.email || c.phone) && (
                                                        <p className="text-[11px] text-[#8B9096] truncate leading-tight">
                                                            {c.email || c.phone}
                                                        </p>
                                                    )}
                                                </div>
                                                {selected && (
                                                    <svg className="h-4 w-4 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                    </svg>
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <FieldLabel htmlFor="nc_first">First name <span className="text-[#DC2626]">*</span></FieldLabel>
                                    <input
                                        id="nc_first"
                                        type="text"
                                        value={newContact.first_name}
                                        onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                                        autoFocus
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <FieldLabel htmlFor="nc_last">Last name</FieldLabel>
                                    <input
                                        id="nc_last"
                                        type="text"
                                        value={newContact.last_name}
                                        onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                            <div>
                                <FieldLabel htmlFor="nc_email">Email</FieldLabel>
                                <input
                                    id="nc_email"
                                    type="email"
                                    value={newContact.email}
                                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <FieldLabel htmlFor="nc_phone">Phone</FieldLabel>
                                <input
                                    id="nc_phone"
                                    type="tel"
                                    value={newContact.phone}
                                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    )}

                    {error && <p className="text-[11px] text-red-500">{error}</p>}
                </div>
            </div>
        </SlideOverModal>
    );
}
