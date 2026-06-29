import { useEffect, useRef, useState } from 'react';
import PrimaryButton from '@/Components/Crm/PrimaryButton';

export type ExportFilters = {
    search?: string;
    type?: string;
    status?: string;
    source?: string;
    city?: string;
    tag?: string;
    view?: string;
    lead_score_min?: string;
    lead_score_max?: string;
    has_email?: string;
    has_phone?: string;
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
    selectedIds: number[];
    totalInView: number;
    activeViewLabel?: string;
    filters: ExportFilters;
}

type Scope = 'view' | 'selected' | 'all';

const FIELDS: { key: string; label: string; defaultOn: boolean }[] = [
    { key: 'first_name', label: 'First Name', defaultOn: true },
    { key: 'last_name', label: 'Last Name', defaultOn: true },
    { key: 'email', label: 'Email', defaultOn: true },
    { key: 'phone', label: 'Phone', defaultOn: true },
    { key: 'mobile', label: 'Mobile', defaultOn: false },
    { key: 'type', label: 'Lead Type', defaultOn: true },
    { key: 'status', label: 'Status', defaultOn: true },
    { key: 'source', label: 'Source', defaultOn: false },
    { key: 'lead_score', label: 'Lead Score', defaultOn: false },
    { key: 'address', label: 'Address', defaultOn: false },
    { key: 'city', label: 'City', defaultOn: true },
    { key: 'state_province', label: 'State / Province', defaultOn: false },
    { key: 'postal_code', label: 'Postal Code', defaultOn: false },
    { key: 'country', label: 'Country', defaultOn: false },
    { key: 'description', label: 'Notes', defaultOn: false },
    { key: 'last_contacted_at', label: 'Last Contacted', defaultOn: false },
    { key: 'created_at', label: 'Created At', defaultOn: true },
];

export default function ExportLeadsModal({
    isOpen,
    onClose,
    selectedIds,
    totalInView,
    activeViewLabel,
    filters,
}: Props) {
    const [scope, setScope] = useState<Scope>(selectedIds.length > 0 ? 'selected' : 'view');
    const [selectedFields, setSelectedFields] = useState<string[]>(
        FIELDS.filter((f) => f.defaultOn).map((f) => f.key),
    );
    const backdropRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            setScope(selectedIds.length > 0 ? 'selected' : 'view');
        }
    }, [isOpen, selectedIds.length]);

    if (!isOpen) return null;

    function toggleField(key: string) {
        setSelectedFields((prev) =>
            prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key],
        );
    }

    function selectAllFields() {
        setSelectedFields(FIELDS.map((f) => f.key));
    }

    function clearFields() {
        setSelectedFields([]);
    }

    function buildExportUrl(): string {
        const url = new URL(route('crm.contacts.export'), window.location.origin);
        selectedFields.forEach((f) => url.searchParams.append('fields[]', f));

        if (scope === 'selected') {
            selectedIds.forEach((id) => url.searchParams.append('ids[]', String(id)));
        } else if (scope === 'view') {
            const params: Record<string, string | undefined> = {
                search: filters.search,
                type: filters.type,
                status: filters.status,
                source: filters.source,
                city: filters.city,
                tag: filters.tag,
                view: filters.view,
                lead_score_min: filters.lead_score_min,
                lead_score_max: filters.lead_score_max,
                has_email: filters.has_email,
                has_phone: filters.has_phone,
            };
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== '' && v !== null) {
                    url.searchParams.set(k, String(v));
                }
            });
        }
        return url.toString();
    }

    function handleExport() {
        if (selectedFields.length === 0) return;
        window.location.href = buildExportUrl();
        onClose();
    }

    const viewLabel = activeViewLabel ?? 'Current view';
    const scopeOptions: { value: Scope; label: string; sub: string; disabled?: boolean }[] = [
        {
            value: 'view',
            label: `Current view${activeViewLabel ? ` (${activeViewLabel})` : ''}`,
            sub: `${totalInView} contact${totalInView === 1 ? '' : 's'} matching current filters`,
        },
        {
            value: 'selected',
            label: `Selected only`,
            sub:
                selectedIds.length === 0
                    ? 'No contacts selected — pick rows first'
                    : `${selectedIds.length} selected contact${selectedIds.length === 1 ? '' : 's'}`,
            disabled: selectedIds.length === 0,
        },
        {
            value: 'all',
            label: 'Everything (ignores filters)',
            sub: 'All contacts you have access to, regardless of filters or view',
        },
    ];

    return (
        <div
            ref={backdropRef}
            onClick={(e) => e.target === backdropRef.current && onClose()}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40 overflow-y-auto pb-10"
        >
            <div className="w-full max-w-lg bg-white shadow-xl border border-[#E4E7EB] rounded-xl">
                <div className="flex items-center justify-between px-5 h-11 border-b border-[#E4E7EB]">
                    <h2 className="text-sm font-semibold text-[#111315]">Export Leads</h2>
                    <button onClick={onClose} className="text-[#8B9096] hover:text-[#111315] transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="px-5 py-4 space-y-5">
                    <div>
                        <h3 className="text-[11px] font-semibold text-[#8B9096] tracking-wider mb-2">
                            Which contacts?
                        </h3>
                        <div className="space-y-1.5">
                            {scopeOptions.map((opt) => (
                                <label
                                    key={opt.value}
                                    className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                                        scope === opt.value
                                            ? 'border-[#1693C9] bg-[#EFF6FF]'
                                            : 'border-[#E4E7EB] hover:bg-[#F9FAFB]'
                                    } ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="scope"
                                        value={opt.value}
                                        checked={scope === opt.value}
                                        onChange={() => !opt.disabled && setScope(opt.value)}
                                        disabled={opt.disabled}
                                        className="mt-0.5 h-3.5 w-3.5 text-[#1693C9] border-[#C8CCD1] focus:ring-0 focus:ring-offset-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[13px] font-medium text-[#111315]">{opt.label}</div>
                                        <div className="text-xs text-[#8B9096] mt-0.5">{opt.sub}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[11px] font-semibold text-[#8B9096] tracking-wider">
                                Columns to include
                            </h3>
                            <div className="flex items-center gap-2 text-[11px]">
                                <button
                                    type="button"
                                    onClick={selectAllFields}
                                    className="text-[#1693C9] hover:underline"
                                >
                                    Select all
                                </button>
                                <span className="text-[#E4E7EB]">·</span>
                                <button
                                    type="button"
                                    onClick={clearFields}
                                    className="text-[#5F656D] hover:text-[#111315]"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 border border-[#E4E7EB] rounded-lg p-2 max-h-64 overflow-y-auto">
                            {FIELDS.map((f) => (
                                <label
                                    key={f.key}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#F9FAFB] cursor-pointer text-[13px] text-[#111315]"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedFields.includes(f.key)}
                                        onChange={() => toggleField(f.key)}
                                        className="h-3.5 w-3.5 border-[#C8CCD1] text-[#1693C9] focus:ring-0 focus:ring-offset-0"
                                    />
                                    {f.label}
                                </label>
                            ))}
                        </div>
                        <div className="mt-1.5 text-[11px] text-[#8B9096]">
                            {selectedFields.length} of {FIELDS.length} columns selected
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#E4E7EB] bg-[#FAFBFC] rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-9 px-4 inline-flex items-center text-xs font-medium text-[#5F656D] hover:text-[#111315] border border-[#C8CCD1] rounded-full hover:bg-white transition-colors"
                    >
                        Cancel
                    </button>
                    <PrimaryButton
                        label="Download CSV"
                        onClick={handleExport}
                        disabled={selectedFields.length === 0 || (scope === 'selected' && selectedIds.length === 0)}
                        icon={
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                            </svg>
                        }
                        labelClassName=""
                    />
                </div>
            </div>
        </div>
    );
}
