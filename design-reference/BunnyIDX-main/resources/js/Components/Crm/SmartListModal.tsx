import { router } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import SlideOverModal from '@/Components/Crm/SlideOverModal';

/**
 * Smart List / Filter modal.
 *
 * Two modes:
 *   - mode="save"   → persist as a SavedContactView the user can pick from the
 *                     Smart Lists list later. (Default. Also used for editing.)
 *   - mode="filter" → apply the same filter set directly as URL params on the
 *                     contacts page (no row in the DB). Lets users do ad-hoc
 *                     multi-filter searches without polluting their saved views.
 *
 * Both modes share the same filter editor so behavior stays consistent.
 */

interface SavedContactView {
    id: number;
    name: string;
    filters: Record<string, unknown>;
    is_default: boolean;
    position: number;
}

interface Props {
    view?: SavedContactView | null;
    contactStatuses: string[];
    leadTypes: string[];
    tags: { id: number; name: string; color: string }[];
    /** Pre-populate filters (used by mode="filter" to seed from current URL state). */
    initialFilters?: Record<string, unknown>;
    mode?: 'save' | 'filter';
    onClose: () => void;
    /** Called with the built filter object when mode="filter" and the user clicks Apply. */
    onApply?: (filters: Record<string, unknown>) => void;
}

const sourceOptions = ['website', 'referral', 'open_house', 'social_media', 'cold_call', 'idx', 'manual', 'other'];

type FilterKey = 'status' | 'type' | 'source' | 'tags' | 'location' | 'lead_score' | 'dates' | 'contact_info';

const FILTER_LABELS: Record<FilterKey, string> = {
    status: 'Status',
    type: 'Type',
    source: 'Source',
    tags: 'Tags',
    location: 'Location',
    lead_score: 'Lead Score',
    dates: 'Dates',
    contact_info: 'Contact Info',
};

const FILTER_ICONS: Record<FilterKey, string> = {
    status:       'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    type:         'M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z',
    source:       'M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244',
    tags:         'M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z',
    location:     'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm4.5 0c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z',
    lead_score:   'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z',
    dates:        'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
    contact_info: 'M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0',
};

function capitalize(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function detectActiveFilters(filters: Record<string, unknown>): Set<FilterKey> {
    const active = new Set<FilterKey>();
    if ((filters.status as string[] | string | undefined)) active.add('status');
    if ((filters.type as string[] | string | undefined)) active.add('type');
    if ((filters.source as string[] | string | undefined)) active.add('source');
    if ((filters.tags as number[] | undefined)?.length || filters.tag) active.add('tags');
    if (filters.city || filters.state_province) active.add('location');
    if (filters.lead_score_min !== undefined || filters.lead_score_max !== undefined) active.add('lead_score');
    if (filters.created_after || filters.created_before || filters.last_contacted_after || filters.last_contacted_before) active.add('dates');
    if (filters.has_email !== undefined || filters.has_phone !== undefined) active.add('contact_info');
    return active;
}

/** Normalize URL-style scalar filters (e.g. "status=hot") into the array form
 * the modal works with internally. */
function normalizeIncoming(filters: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = { ...filters };
    for (const key of ['status', 'type', 'source'] as const) {
        const v = out[key];
        if (typeof v === 'string' && v) out[key] = [v];
    }
    if (typeof out.tag === 'string' || typeof out.tag === 'number') {
        out.tags = [Number(out.tag)];
        delete out.tag;
    }
    return out;
}

export default function SmartListModal({
    view, contactStatuses, leadTypes, tags: allTags, initialFilters,
    mode = 'save', onClose, onApply,
}: Props) {
    const nameRef = useRef<HTMLInputElement>(null);
    const isEditing = !!view;

    const existingFilters = normalizeIncoming(view?.filters ?? initialFilters ?? {});

    const [name, setName] = useState(view?.name ?? '');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(() => detectActiveFilters(existingFilters));
    const [showFilterPicker, setShowFilterPicker] = useState(false);
    const filterPickerRef = useRef<HTMLDivElement>(null);
    const addFilterBtnRef = useRef<HTMLButtonElement>(null);
    // Portal-rendered dropdown position (fixed coords relative to viewport).
    // We compute on every open so scroll/resize don't drift the dropdown.
    const [pickerCoords, setPickerCoords] = useState<{ top: number; left: number; width: number } | null>(null);

    const [filterState, setFilterState] = useState({
        status: (existingFilters.status as string[]) ?? [],
        type: (existingFilters.type as string[]) ?? [],
        source: (existingFilters.source as string[]) ?? [],
        tags: (existingFilters.tags as number[]) ?? [],
        tag_match: (existingFilters.tag_match as string) ?? 'any',
        city: (existingFilters.city as string) ?? '',
        state_province: (existingFilters.state_province as string) ?? '',
        lead_score_min: (existingFilters.lead_score_min as string) ?? '',
        lead_score_max: (existingFilters.lead_score_max as string) ?? '',
        created_after: (existingFilters.created_after as string) ?? '',
        created_before: (existingFilters.created_before as string) ?? '',
        last_contacted_after: (existingFilters.last_contacted_after as string) ?? '',
        last_contacted_before: (existingFilters.last_contacted_before as string) ?? '',
        has_email: existingFilters.has_email === true ? 'yes' : existingFilters.has_email === false ? 'no' : '',
        has_phone: existingFilters.has_phone === true ? 'yes' : existingFilters.has_phone === false ? 'no' : '',
    });

    useEffect(() => {
        if (mode === 'save') nameRef.current?.focus();
    }, [mode]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            const target = e.target as Node;
            // Ignore clicks on the trigger button (it has its own toggle handler) and
            // on the portaled dropdown itself.
            if (addFilterBtnRef.current?.contains(target)) return;
            if (filterPickerRef.current?.contains(target)) return;
            setShowFilterPicker(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    /**
     * Recompute the dropdown position whenever it opens, on resize, and on scroll
     * inside the scrollable form. This keeps it pinned correctly even as the
     * containing scroll area moves.
     */
    useLayoutEffect(() => {
        if (!showFilterPicker) return;
        function reposition() {
            const rect = addFilterBtnRef.current?.getBoundingClientRect();
            if (!rect) return;
            const desiredWidth = Math.max(rect.width, 220);
            const dropdownHeight = 260;
            const margin = 8;
            // Prefer opening upward (button is near the bottom of the modal). Flip down
            // if there's not enough room above.
            const openUp = rect.top - dropdownHeight - margin > 0;
            const top = openUp ? rect.top - margin : rect.bottom + margin;
            setPickerCoords({
                top,
                left: rect.left,
                width: desiredWidth,
            });
        }
        reposition();
        window.addEventListener('resize', reposition);
        window.addEventListener('scroll', reposition, true); // capture so nested scrolls fire too
        return () => {
            window.removeEventListener('resize', reposition);
            window.removeEventListener('scroll', reposition, true);
        };
    }, [showFilterPicker]);

    function buildFilters() {
        const f: Record<string, unknown> = {};
        if (activeFilters.has('status') && filterState.status.length) f.status = filterState.status;
        if (activeFilters.has('type') && filterState.type.length) f.type = filterState.type;
        if (activeFilters.has('source') && filterState.source.length) f.source = filterState.source;
        if (activeFilters.has('tags') && filterState.tags.length) {
            f.tags = filterState.tags;
            f.tag_match = filterState.tag_match;
        }
        if (activeFilters.has('location')) {
            if (filterState.city.trim()) f.city = filterState.city.trim();
            if (filterState.state_province.trim()) f.state_province = filterState.state_province.trim();
        }
        if (activeFilters.has('lead_score')) {
            if (filterState.lead_score_min !== '') f.lead_score_min = Number(filterState.lead_score_min);
            if (filterState.lead_score_max !== '') f.lead_score_max = Number(filterState.lead_score_max);
        }
        if (activeFilters.has('dates')) {
            if (filterState.created_after) f.created_after = filterState.created_after;
            if (filterState.created_before) f.created_before = filterState.created_before;
            if (filterState.last_contacted_after) f.last_contacted_after = filterState.last_contacted_after;
            if (filterState.last_contacted_before) f.last_contacted_before = filterState.last_contacted_before;
        }
        if (activeFilters.has('contact_info')) {
            if (filterState.has_email === 'yes') f.has_email = true;
            else if (filterState.has_email === 'no') f.has_email = false;
            if (filterState.has_phone === 'yes') f.has_phone = true;
            else if (filterState.has_phone === 'no') f.has_phone = false;
        }
        return f;
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const built = buildFilters();

        if (mode === 'filter') {
            onApply?.(built);
            onClose();
            return;
        }

        // mode === 'save'
        setProcessing(true);
        const payload = { name, filters: built } as unknown as Record<string, FormDataConvertible>;
        const options = {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onError: (errs: Record<string, string>) => { setErrors(errs); setProcessing(false); },
            onFinish: () => setProcessing(false),
        };
        if (isEditing) {
            router.patch(route('crm.contacts.smart-lists.update', view!.id), payload, options);
        } else {
            router.post(route('crm.contacts.smart-lists.store'), payload, options);
        }
    }

    function toggleArrayItem<T>(arr: T[], item: T): T[] {
        return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
    }

    function setFilter<K extends keyof typeof filterState>(key: K, value: (typeof filterState)[K]) {
        setFilterState((prev) => ({ ...prev, [key]: value }));
    }

    function addFilter(key: FilterKey) {
        setActiveFilters((prev) => new Set(prev).add(key));
        setShowFilterPicker(false);
    }

    function removeFilter(key: FilterKey) {
        setActiveFilters((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
        });
    }

    function clearAll() {
        setActiveFilters(new Set());
        setFilterState({
            status: [], type: [], source: [], tags: [], tag_match: 'any',
            city: '', state_province: '',
            lead_score_min: '', lead_score_max: '',
            created_after: '', created_before: '', last_contacted_after: '', last_contacted_before: '',
            has_email: '', has_phone: '',
        });
    }

    const availableFilters = (Object.keys(FILTER_LABELS) as FilterKey[]).filter(
        (k) => !activeFilters.has(k) && (k !== 'tags' || allTags.length > 0),
    );
    const activeFilterKeys = (Object.keys(FILTER_LABELS) as FilterKey[]).filter((k) => activeFilters.has(k));
    const isSave = mode === 'save';
    const headerTitle = isSave ? (isEditing ? 'Edit Smart List' : 'New Smart List') : 'Filter contacts';
    const submitLabel = isSave ? (isEditing ? 'Save changes' : 'Create smart list') : 'Apply filters';

    return (
        <>
            <SlideOverModal
                title={headerTitle}
                onClose={onClose}
                width={480}
                footer={
                    <>
                        <button type="button" onClick={onClose} className="h-9 px-4 text-[12px] font-medium text-[#111315] hover:bg-[#F3F4F6] rounded-[4px] transition-colors">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="smart-list-form"
                            disabled={processing || (isSave && !name.trim())}
                            className="h-9 px-5 bg-[#1693C9] text-white text-[12px] font-semibold rounded-[4px] hover:bg-[#1380AF] disabled:opacity-40 transition-colors"
                        >
                            {processing ? 'Saving…' : submitLabel}
                        </button>
                    </>
                }
            >
                <form id="smart-list-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    <p className="text-[12px] text-[#5F656D]">
                        {isSave
                            ? 'Save a reusable filter combination as a Smart List.'
                            : 'Add one or more filters to narrow the contact list. Apply without saving, or save as a Smart List later.'}
                    </p>

                        {/* Name field — save mode only */}
                        {isSave && (
                            <div>
                                <FieldLabel>Name</FieldLabel>
                                <input
                                    ref={nameRef}
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={formInputClass}
                                    placeholder="e.g. Hot Miami buyers"
                                    required
                                />
                                {errors.name && <p className="mt-1 text-[11px] text-[#DC2626]">{errors.name}</p>}
                            </div>
                        )}

                        {/* Filter section header */}
                        <div className="flex items-center justify-between">
                            <label className="block text-[10px] font-semibold text-[#5F656D] tracking-wider">Filters</label>
                            {activeFilterKeys.length > 0 && (
                                <button
                                    type="button"
                                    onClick={clearAll}
                                    className="text-[11px] text-[#5F656D] hover:text-[#DC2626]"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        {/* Active filter chips (one row, removable) */}
                        {activeFilterKeys.length > 0 && (
                            <div className="flex items-center flex-wrap gap-1.5">
                                {activeFilterKeys.map((key) => (
                                    <span key={`chip-${key}`} className="inline-flex items-center gap-1.5 h-6 pl-2 pr-1 bg-white border border-[#C8CCD1] rounded-[4px] text-[11px] font-medium text-[#111315]">
                                        <svg className="h-3 w-3 text-[#111315]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d={FILTER_ICONS[key]} />
                                        </svg>
                                        {FILTER_LABELS[key]}
                                        <button type="button" onClick={() => removeFilter(key)} className="h-4 w-4 inline-flex items-center justify-center rounded-[4px] text-[#5F656D] hover:text-[#111315] hover:bg-[#F3F4F6]">
                                            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Active filter editors */}
                        {activeFilterKeys.length > 0 ? (
                            <div className="space-y-3">
                                {activeFilterKeys.map((key) => (
                                    <FilterEditor
                                        key={key} filterKey={key}
                                        filterState={filterState} setFilter={setFilter} toggleArrayItem={toggleArrayItem}
                                        contactStatuses={contactStatuses} leadTypes={leadTypes} allTags={allTags}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center bg-[#F9FAFB] border border-dashed border-[#E4E7EB] rounded-lg p-6">
                                <svg className="h-7 w-7 text-[#C4C9D1] mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                                </svg>
                                <p className="text-[12px] text-[#5F656D]">
                                    {isSave
                                        ? 'A view with no filters shows all contacts. Add a filter to narrow it down.'
                                        : 'Pick a filter below to start narrowing the list.'}
                                </p>
                            </div>
                        )}

                        {/* Add filter trigger — the dropdown itself is portaled to
                            document.body so it escapes the modal's overflow:auto clipping
                            (it would otherwise get cut by either the header or footer). */}
                        {availableFilters.length > 0 && (
                            <button
                                ref={addFilterBtnRef}
                                type="button"
                                onClick={() => setShowFilterPicker((v) => !v)}
                                className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-[#111315] bg-white border border-[#C8CCD1] hover:bg-[#F3F4F6] rounded-[4px] transition-colors"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                Add filter
                                <svg className={`h-3 w-3 text-[#5F656D] transition-transform ${showFilterPicker ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        )}
                </form>

                {/* Portal-rendered Add filter dropdown — anchored to the trigger button
                    via fixed coords computed in useLayoutEffect. Lives outside the
                    modal's scroll container so it can't be clipped. Auto-flips up/down
                    based on available room. */}
                {showFilterPicker && pickerCoords && createPortal(
                    <div
                        ref={filterPickerRef}
                        className="fixed z-[60] bg-white border border-[#C8CCD1] rounded-[4px] py-1 max-h-[260px] overflow-y-auto"
                        style={{
                            top: pickerCoords.top,
                            left: pickerCoords.left,
                            width: pickerCoords.width,
                            boxShadow: 'rgba(7, 9, 15, .05) 0px 0px 0px 1px, rgba(7, 9, 15, .1) 0px 3px 6px, rgba(7, 9, 15, .2) 0px 9px 24px',
                            // Open upward when there's room above (the typical case for
                            // this button which sits at the bottom of the scrollable area).
                            transform: pickerCoords.top > 280 ? 'translateY(-100%)' : undefined,
                        }}
                    >
                        {availableFilters.map((key) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => { addFilter(key); setShowFilterPicker(false); }}
                                className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-[13px] text-[#111315] hover:bg-[#F3F4F6] transition-colors"
                            >
                                <svg className="h-4 w-4 text-[#111315]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d={FILTER_ICONS[key]} />
                                </svg>
                                {FILTER_LABELS[key]}
                            </button>
                        ))}
                    </div>,
                    document.body,
                )}
            </SlideOverModal>
        </>
    );
}

// ── Filter editor (kept inline since it's only used here) ──────────

interface EditorProps {
    filterKey: FilterKey;
    filterState: any;
    setFilter: (key: any, val: any) => void;
    toggleArrayItem: <T>(arr: T[], item: T) => T[];
    contactStatuses: string[];
    leadTypes: string[];
    allTags: { id: number; name: string; color: string }[];
}

function FilterEditor({ filterKey, filterState, setFilter, toggleArrayItem, contactStatuses, leadTypes, allTags }: EditorProps) {
    const wrapCls = 'rounded-[4px] border border-[#E4E7EB] px-3 py-3 bg-white';
    const labelCls = 'block text-[13px] font-normal text-[#5F656D] mb-1';
    const inputCls = formInputClass;

    function PillSelector({ options, selected, onChange, formatLabel }: { options: string[]; selected: string[]; onChange: (next: string[]) => void; formatLabel?: (s: string) => string }) {
        return (
            <div className="flex flex-wrap gap-1.5">
                {options.map((opt) => {
                    const active = selected.includes(opt);
                    return (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => onChange(toggleArrayItem(selected, opt))}
                            className={`h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors ${
                                active
                                    ? 'bg-[#1693C9] text-white border-[#1693C9]'
                                    : 'bg-white text-[#5F656D] border-[#E4E7EB] hover:bg-[#F3F4F6]'
                            }`}
                        >
                            {formatLabel ? formatLabel(opt) : capitalize(opt)}
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div className={wrapCls}>
            <label className={labelCls}>{FILTER_LABELS[filterKey]}</label>
            {filterKey === 'status' && (
                <PillSelector options={contactStatuses} selected={filterState.status} onChange={(next) => setFilter('status', next)} />
            )}
            {filterKey === 'type' && (
                <PillSelector options={leadTypes} selected={filterState.type} onChange={(next) => setFilter('type', next)} />
            )}
            {filterKey === 'source' && (
                <PillSelector options={sourceOptions} selected={filterState.source} onChange={(next) => setFilter('source', next)} />
            )}
            {filterKey === 'tags' && (
                <>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {allTags.map((tag) => {
                            const active = (filterState.tags as number[]).includes(tag.id);
                            return (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => setFilter('tags', toggleArrayItem(filterState.tags, tag.id))}
                                    className={`inline-flex items-center h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors ${
                                        active ? 'text-white border-transparent' : 'bg-white text-[#5F656D] border-[#E4E7EB] hover:bg-[#F3F4F6]'
                                    }`}
                                    style={active ? { backgroundColor: tag.color } : undefined}
                                >
                                    {tag.name}
                                </button>
                            );
                        })}
                    </div>
                    {filterState.tags.length > 1 && (
                        <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] text-[#8B9096]">Match:</span>
                            {(['any', 'all'] as const).map((mode) => (
                                <label key={mode} className="flex items-center gap-1.5 text-[11px] text-[#5F656D] cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={filterState.tag_match === mode}
                                        onChange={() => setFilter('tag_match', mode)}
                                        className="h-3.5 w-3.5 text-[#1693C9] focus:ring-[#1693C9]"
                                    />
                                    {mode === 'any' ? 'Any of these tags' : 'All of these tags'}
                                </label>
                            ))}
                        </div>
                    )}
                </>
            )}
            {filterKey === 'location' && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <span className="block text-[10px] text-[#8B9096] mb-1">City</span>
                        <input type="text" placeholder="Miami" value={filterState.city} onChange={(e) => setFilter('city', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                        <span className="block text-[10px] text-[#8B9096] mb-1">State / Province</span>
                        <input type="text" placeholder="FL" value={filterState.state_province} onChange={(e) => setFilter('state_province', e.target.value)} className={inputCls} />
                    </div>
                </div>
            )}
            {filterKey === 'lead_score' && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <span className="block text-[10px] text-[#8B9096] mb-1">Min</span>
                        <input type="number" min={0} max={100} placeholder="0" value={filterState.lead_score_min} onChange={(e) => setFilter('lead_score_min', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                        <span className="block text-[10px] text-[#8B9096] mb-1">Max</span>
                        <input type="number" min={0} max={100} placeholder="100" value={filterState.lead_score_max} onChange={(e) => setFilter('lead_score_max', e.target.value)} className={inputCls} />
                    </div>
                </div>
            )}
            {filterKey === 'dates' && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <span className="block text-[10px] text-[#8B9096] mb-1">Created after</span>
                        <input type="date" value={filterState.created_after} onChange={(e) => setFilter('created_after', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                        <span className="block text-[10px] text-[#8B9096] mb-1">Created before</span>
                        <input type="date" value={filterState.created_before} onChange={(e) => setFilter('created_before', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                        <span className="block text-[10px] text-[#8B9096] mb-1">Last contacted after</span>
                        <input type="date" value={filterState.last_contacted_after} onChange={(e) => setFilter('last_contacted_after', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                        <span className="block text-[10px] text-[#8B9096] mb-1">Last contacted before</span>
                        <input type="date" value={filterState.last_contacted_before} onChange={(e) => setFilter('last_contacted_before', e.target.value)} className={inputCls} />
                    </div>
                </div>
            )}
            {filterKey === 'contact_info' && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <span className="block text-[10px] text-[#8B9096] mb-1">Has email</span>
                        <select value={filterState.has_email} onChange={(e) => setFilter('has_email', e.target.value)} className={`appearance-none ${inputCls} pr-6`}>
                            <option value="">Any</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </div>
                    <div>
                        <span className="block text-[10px] text-[#8B9096] mb-1">Has phone</span>
                        <select value={filterState.has_phone} onChange={(e) => setFilter('has_phone', e.target.value)} className={`appearance-none ${inputCls} pr-6`}>
                            <option value="">Any</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}
