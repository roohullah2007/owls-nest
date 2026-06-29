import CrmLayout from '@/Layouts/CrmLayout';
import QuickAddContactModal from '@/Components/Crm/QuickAddContactModal';
import BulkEmailModal from '@/Components/Crm/BulkEmailModal';
import BulkEmailProgress from '@/Components/Crm/BulkEmailProgress';
import ExportLeadsModal from '@/Components/Crm/ExportLeadsModal';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import SearchInput from '@/Components/Crm/SearchInput';
import SmartListModal from '@/Components/Crm/SmartListModal';
import PillTabs, { PillTab } from '@/Components/Crm/PillTabs';
import { fieldIcon } from '@/Components/Crm/FieldIcon';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { PageProps } from '@/types';

// Extracted cell components, types, constants — keep this page focused on orchestration.
import {
    Contact,
    PaginatedContacts,
    SavedContactView,
    TeamMember,
    Column,
    ContactsIndexProps as Props,
} from './components/types';
import { builtInColumns } from './components/constants';
import { capitalize } from './components/utils';
import { SortIcon } from './components/icons';
import ContactCell from './components/cells/ContactCell';
import ChannelSetupPromptModal from './components/ChannelSetupPromptModal';
import SmartListsSubheader from './components/SmartListsSubheader';
import FilterChip from './components/FilterChip';
import PowerDialLauncherModal from './components/PowerDialLauncherModal';
import LeadTypePills from './components/LeadTypePills';
import BulkActionsRow from './components/BulkActionsRow';
import ColumnPicker from './components/ColumnPicker';
import type { CallingScriptDto } from '@/Components/Crm/CallingScriptManager';
import NativeSelect from '@/Components/Crm/NativeSelect';
import DeleteConfirmModal from '@/Components/Crm/DeleteConfirmModal';
import BulkActionBar from './components/BulkActionBar';
import AiAssistantPanel from './components/AiAssistantPanel';
import MobileContactCards from './components/MobileContactCards';
import EmptyContacts from './components/EmptyContacts';
import { useColumnPreferences } from './components/hooks/useColumnPreferences';
import { useAiAssistant } from './components/hooks/useAiAssistant';
import { useContactFilters } from './components/hooks/useContactFilters';

export default function ContactsIndex({ contacts, filters, leadTypes, contactStatuses, customFields, tags: allTags, savedViews, activeSmartList, builtInViews, activeBuiltInView, teamEnabled, aiEnabled, teamMembers = [], columnPreferences, actionPlans = [] }: Props) {
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [showTagDropdown, setShowTagDropdown] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [showSmartListModal, setShowSmartListModal] = useState(false);
    const [smartListModalMode, setSmartListModalMode] = useState<'save' | 'filter'>('save');
    const [editingSmartList, setEditingSmartList] = useState<SavedContactView | null>(null);
    const [smartListMenuOpen, setSmartListMenuOpen] = useState<number | null>(null);
    const tagDropdownRef = useRef<HTMLDivElement>(null);
    const smartListMenuRef = useRef<HTMLDivElement>(null);
    const hasTeam = teamMembers.length > 1;
    const [showBulkEmail, setShowBulkEmail] = useState(false);
    const [showPowerDialLauncher, setShowPowerDialLauncher] = useState(false);
    const [activeCampaignId, setActiveCampaignId] = useState<number | null>(null);
    const { hasPhoneNumber, hasEmailAccount } = usePage<PageProps>().props;
    const [phoneSetupOpen, setPhoneSetupOpen] = useState(false);
    const [emailSetupOpen, setEmailSetupOpen] = useState(false);
    const [singleEmailContact, setSingleEmailContact] = useState<Contact | null>(null);

    function callContact(contact: Contact, number: string) {
        if (!hasPhoneNumber) {
            setPhoneSetupOpen(true);
            return;
        }
        window.__openDialer?.(number, contact.id, `${contact.first_name} ${contact.last_name}`);
    }

    function emailContact(contact: Contact) {
        if (!hasEmailAccount) {
            setEmailSetupOpen(true);
            return;
        }
        setSingleEmailContact(contact);
    }

    const allColumns: Column[] = [
        ...builtInColumns,
        ...customFields.map((cf) => ({
            key: `cf_${cf.key}`,
            label: cf.label,
            sortable: false,
            defaultVisible: true,
            width: 130,
            isCustom: true,
        })),
    ];

    const [search, setSearch] = useState(filters.search || '');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [showExportModal, setShowExportModal] = useState(false);
    const { visibleColumns, setVisibleColumns, getColWidth, startResize, toggleColumn, activeColumns } = useColumnPreferences(allColumns, columnPreferences);
    const {
        aiQuery, setAiQuery, aiLoading, aiExpanded, chatMessages,
        aiInputRef, chatScrollRef,
        handleAiQuery, handleAiFocus, handleAiBlur, handleAiSuggestionClick,
        handleContactAction, handleDisambiguate, handleAiSelectAll, clearAiChat,
    } = useAiAssistant(aiEnabled, contacts.data, setSelectedIds);
    const {
        handleSearch, submitSearch, applyFilters, activeFilterCount, removeFilter,
        clearAllFilters, handleTypeFilter, handleSort,
    } = useContactFilters(filters, search);

    // Debounced live search — re-query as the agent types (Enter still submits
    // immediately via handleSearch). Skips when the term already matches the
    // applied filter, which also prevents a navigation loop after each fetch.
    useEffect(() => {
        if (search === (filters.search ?? '')) return;
        const t = setTimeout(() => submitSearch(search), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    // True when any search / filter / non-default view narrows the list — drives
    // the contextual empty state so "no results" is never read as "no contacts".
    const isFiltered = activeFilterCount > 0
        || !!filters.search
        || (!!activeBuiltInView && activeBuiltInView !== 'all')
        || !!activeSmartList;

    function clearAllAndSearch() {
        setSearch('');
        router.get(route('crm.contacts.index'));
    }
    const [dragColKey, setDragColKey] = useState<string | null>(null);
    const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
    const [showColumnPicker, setShowColumnPicker] = useState(false);
    const [showAddField, setShowAddField] = useState(false);
    const [showAddLeadType, setShowAddLeadType] = useState(false);
    const [newLeadType, setNewLeadType] = useState('');
    const pickerRef = useRef<HTMLDivElement>(null);
    const leadTypeRef = useRef<HTMLDivElement>(null);

    const newFieldForm = useForm({ label: '', type: 'text' as string });

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowColumnPicker(false);
                setShowAddField(false);
            }
            if (leadTypeRef.current && !leadTypeRef.current.contains(e.target as Node)) {
                setShowAddLeadType(false);
                setNewLeadType('');
            }
            if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
                setShowTagDropdown(false);
            }
            if (smartListMenuRef.current && !smartListMenuRef.current.contains(e.target as Node)) {
                setSmartListMenuOpen(null);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showColumnPicker, showAddLeadType, showTagDropdown, smartListMenuOpen]);

    const checkboxWidth = 36;
    const totalWidth = checkboxWidth + activeColumns.reduce((sum, c) => sum + getColWidth(c), 0);


    function toggleSelect(id: number) {
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
    }

    function toggleAll() {
        setSelectedIds(selectedIds.length === contacts.data.length ? [] : contacts.data.map((c) => c.id));
    }

    function handleAddLeadType(e: React.FormEvent) {
        e.preventDefault();
        const type = newLeadType.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!type) return;
        router.post(route('crm.contacts.lead-types.store'), { type }, {
            preserveState: true,
            onSuccess: () => { setNewLeadType(''); setShowAddLeadType(false); },
        });
    }

    function handleAddField(e: React.FormEvent) {
        e.preventDefault();
        if (!newFieldForm.data.label.trim()) return;
        const key = newFieldForm.data.label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!key) return;
        router.post(route('crm.contacts.custom-fields.store'), {
            key, label: newFieldForm.data.label.trim(), type: newFieldForm.data.type,
        }, {
            preserveState: true,
            onSuccess: () => { newFieldForm.reset(); setShowAddField(false); setVisibleColumns((prev) => [...prev, `cf_${key}`]); },
        });
    }

    /**
     * Open the typed-confirmation modal. Single-select → must type the contact's
     * name. Bulk → must enter account password. Backend re-validates on bulk via
     * `current_password`.
     */
    function handleBulkDelete() {
        if (selectedIds.length === 0) return;
        setDeleteError(null);
        setDeleteModalOpen(true);
    }

    async function confirmBulkDelete(passwordOrEmpty: string) {
        setDeleting(true);
        setDeleteError(null);
        router.post(
            route('crm.contacts.bulk-delete'),
            { ids: selectedIds, password: passwordOrEmpty || undefined },
            {
                preserveState: false,
                onSuccess: () => {
                    setSelectedIds([]);
                    setConfirmDelete(false);
                    setDeleteModalOpen(false);
                },
                onError: (errs) => {
                    // Show password / current_password error inline.
                    const msg = (errs as Record<string, string>).password
                        ?? (errs as Record<string, string>).ids
                        ?? 'Could not delete — try again.';
                    setDeleteError(msg);
                },
                onFinish: () => setDeleting(false),
            },
        );
    }

    function handleSmartListNav(id: number | null) {
        router.get(route('crm.contacts.index'), id !== null ? { smart_list: String(id) } : { smart_list: '' }, { preserveState: true });
    }

    function handleBuiltInViewNav(key: string) {
        router.get(route('crm.contacts.index'), { view: key }, { preserveState: true });
    }

    function handleSetDefault(view: SavedContactView) {
        setSmartListMenuOpen(null);
        router.post(route('crm.contacts.smart-lists.default', view.id), {}, { preserveState: true });
    }

    function handleDeleteSmartList(view: SavedContactView) {
        setSmartListMenuOpen(null);
        router.delete(route('crm.contacts.smart-lists.destroy', view.id), { preserveState: false });
    }

    function handleBulkTag(tagId: number) {
        router.post(route('crm.contacts.bulk-tag'), { ids: selectedIds, tag_ids: [tagId] }, {
            preserveState: true,
            onSuccess: () => { setShowTagDropdown(false); },
        });
    }

    function handleBulkType(type: string) {
        if (selectedIds.length === 0) return;
        router.post(route('crm.contacts.bulk-type'), { ids: selectedIds, type }, {
            preserveState: true,
            onSuccess: () => { setSelectedIds([]); },
        });
    }

    function handleBulkEnrollPlan(planId: number) {
        if (selectedIds.length === 0) return;
        router.post(route('crm.action-plan-enrollments.bulk'), { action_plan_id: planId, contact_ids: selectedIds }, {
            preserveState: true,
            onSuccess: () => { setSelectedIds([]); },
        });
    }

    /**
     * Kick off a Power Dialer session with the currently-selected contacts.
     * The controller filters out contacts with no phone / dnd_mode='all' or 'calls'
     * server-side, so we can pass the raw selection without pre-filtering here.
     *
     * Opens a small launcher modal first so the agent can pick a calling script.
     */
    function handlePowerDial() {
        if (selectedIds.length === 0) return;
        setShowPowerDialLauncher(true);
    }

    async function startPowerDialSession(callingScriptId: number | null) {
        try {
            const res = await fetch(route('crm.dialer.sessions.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    contact_ids: selectedIds,
                    source_type: 'contacts',
                    calling_script_id: callingScriptId,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.session?.id) {
                alert(data.error ?? 'Failed to start power dialer session.');
                return;
            }
            setShowPowerDialLauncher(false);
            router.visit(route('crm.dialer.sessions.show', { dialerSession: data.session.id }));
        } catch {
            alert('Failed to start power dialer session.');
        }
    }

    return (
        <CrmLayout>
            <Head title="Contacts" />

            {/* Content area — scrollable */}
            <SmartListsSubheader
                builtInViews={builtInViews}
                savedViews={savedViews}
                activeBuiltInView={activeBuiltInView ?? null}
                activeSmartList={activeSmartList}
                onBuiltInViewClick={handleBuiltInViewNav}
                onSmartListClick={handleSmartListNav}
                onAddView={() => { setEditingSmartList(null); setSmartListModalMode('save'); setShowSmartListModal(true); }}
            />

            <div className={`flex-1 overflow-auto p-4 sm:p-5 md:p-6 ${aiEnabled ? 'pb-24' : ''}`}>
            <div className="space-y-4">

                {/* Page header — single row with everything inline */}
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-lg font-normal text-[#111315]">Contacts</h1>

                    <LeadTypePills
                        leadTypes={leadTypes}
                        activeType={filters.type ?? null}
                        showAddLeadType={showAddLeadType}
                        newLeadType={newLeadType}
                        leadTypeRef={leadTypeRef}
                        onTypeChange={handleTypeFilter}
                        onToggleAddLeadType={setShowAddLeadType}
                        onNewLeadTypeChange={setNewLeadType}
                        onAddLeadType={handleAddLeadType}
                    />

                    <BulkActionsRow
                        selectedCount={selectedIds.length}
                        activeSmartList={activeSmartList}
                        onCall={() => {
                            const c = contacts.data.find((x) => x.id === selectedIds[0]);
                            const num = c?.phone || c?.mobile;
                            if (num) window.__openDialer?.(num, c!.id, `${c!.first_name} ${c!.last_name}`);
                        }}
                        onEmail={() => setShowBulkEmail(true)}
                        onText={() => alert('Bulk SMS coming soon.')}
                        onDelete={handleBulkDelete}
                        onEditActiveSmartList={() => { if (activeSmartList) { setEditingSmartList(activeSmartList); setSmartListModalMode('save'); setShowSmartListModal(true); } }}
                        onSaveAsSmartList={() => { setEditingSmartList(null); setSmartListModalMode('save'); setShowSmartListModal(true); }}
                    />

                    <div className="flex-1" />

                    {/* Search */}
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        onSubmit={handleSearch}
                        placeholder="Search contacts..."
                    />

                    {/* Filter — opens the SmartListModal in filter-only mode */}
                    <button
                        type="button"
                        onClick={() => { setEditingSmartList(null); setSmartListModalMode('filter'); setShowSmartListModal(true); }}
                        title="Add filters"
                        className={`hidden md:inline-flex items-center gap-1.5 h-9 px-3 text-[12px] font-medium rounded-[4px] border transition-colors ${
                            activeFilterCount > 0
                                ? 'text-[#1693C9] bg-[#EBF5FF] border-[#BFDBFE] hover:bg-[#DBEAFE]'
                                : 'text-[#5F656D] bg-white border-[#C8CCD1] hover:text-[#111315] hover:bg-[#F9FAFB]'
                        }`}
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                        </svg>
                        Filter
                        {activeFilterCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full bg-[#1693C9] text-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    <ColumnPicker
                        pickerRef={pickerRef}
                        isOpen={showColumnPicker}
                        onToggle={() => { setShowColumnPicker(!showColumnPicker); setShowAddField(false); }}
                        columns={allColumns}
                        visibleColumns={visibleColumns}
                        onToggleColumn={toggleColumn}
                        onApplyColumns={setVisibleColumns}
                        showAddField={showAddField}
                        onToggleAddField={setShowAddField}
                        newFieldData={newFieldForm.data}
                        onChangeNewFieldData={(next) => newFieldForm.setData(next)}
                        onSubmitNewField={handleAddField}
                        onResetNewField={() => newFieldForm.reset()}
                        entityLabel="Contact"
                    />

                    <PrimaryButton
                        onClick={() => setShowQuickAdd(true)}
                        label="Add Person"
                        menuItems={[
                            {
                                label: 'Import Leads',
                                href: route('crm.settings', { tab: 'lead-imports' }),
                                icon: (
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>
                                ),
                            },
                            {
                                label: 'Export Leads',
                                onClick: () => setShowExportModal(true),
                                icon: (
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                    </svg>
                                ),
                            },
                        ]}
                    />
                </div>

                {/* Mobile type filters */}
                <div className="flex sm:hidden items-center gap-1 overflow-x-auto">
                    {/* Type filters */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleTypeFilter('')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap ${
                                !filters.type ? 'bg-[#1693C9] text-white' : 'text-[#5F656D] border border-[#C8CCD1] bg-white'
                            }`}
                        >
                            All
                        </button>
                        {leadTypes.map((type) => (
                            <button
                                key={type}
                                onClick={() => handleTypeFilter(type)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap ${
                                    filters.type === type ? 'bg-[#1693C9] text-white' : 'text-[#5F656D] border border-[#C8CCD1] bg-white'
                                }`}
                            >
                                {capitalize(type)}
                            </button>
                        ))}

                        {/* Add lead type */}
                        <div className="flex items-center" ref={leadTypeRef}>
                            {!showAddLeadType ? (
                                <button
                                    onClick={() => setShowAddLeadType(true)}
                                    className="flex items-center justify-center w-7 h-7 rounded-[4px] text-[#8B9096] hover:text-[#111315] hover:bg-white transition-colors"
                                    title="Add lead type"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                </button>
                            ) : (
                                <form onSubmit={handleAddLeadType} className="flex items-center">
                                    <input
                                        type="text"
                                        value={newLeadType}
                                        onChange={(e) => setNewLeadType(e.target.value)}
                                        placeholder="e.g. investor"
                                        className="w-28 h-7 px-3 text-xs border border-[#C8CCD1] rounded-[4px] bg-white text-[#111315] placeholder-[#8B9096] focus:outline-none focus:ring-1 focus:ring-[#1693C9]"
                                        autoFocus
                                        onKeyDown={(e) => { if (e.key === 'Escape') { setShowAddLeadType(false); setNewLeadType(''); } }}
                                    />
                                    <button type="submit" disabled={!newLeadType.trim()} className="ml-1 p-1 text-[#8B9096] hover:text-[#111315] disabled:opacity-30 transition-colors" title="Save">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                        </svg>
                                    </button>
                                    <button type="button" onClick={() => { setShowAddLeadType(false); setNewLeadType(''); }} className="p-1 text-[#8B9096] hover:text-[#111315] transition-colors" title="Cancel">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
                {/* AI filter active banner */}
                {activeFilterCount > 0 && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-[#EBF5FF] border border-[#BFDBFE] rounded-[4px]">
                        <svg className="h-3.5 w-3.5 text-[#1693C9] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" /></svg>
                        <div className="flex flex-wrap gap-1.5 flex-1">
                            {filters.status && <FilterChip label={`Status: ${capitalize(filters.status)}`} onRemove={() => removeFilter('status')} />}
                            {filters.source && <FilterChip label={`Source: ${capitalize(filters.source)}`} onRemove={() => removeFilter('source')} />}
                            {filters.lead_score_min && <FilterChip label={`Score ≥ ${filters.lead_score_min}`} onRemove={() => removeFilter('lead_score_min')} />}
                            {filters.lead_score_max && <FilterChip label={`Score ≤ ${filters.lead_score_max}`} onRemove={() => removeFilter('lead_score_max')} />}
                            {filters.last_contacted_before && <FilterChip label={`No contact since ${filters.last_contacted_before}`} onRemove={() => removeFilter('last_contacted_before')} />}
                            {filters.last_contacted_after && <FilterChip label={`Contacted after ${filters.last_contacted_after}`} onRemove={() => removeFilter('last_contacted_after')} />}
                            {filters.city && <FilterChip label={`City: ${filters.city}`} onRemove={() => removeFilter('city')} />}
                            {filters.tag && <FilterChip label={`Tag: ${filters.tag}`} onRemove={() => removeFilter('tag')} />}
                            {filters.has_email && <FilterChip label="Has email" onRemove={() => removeFilter('has_email')} />}
                            {filters.has_phone && <FilterChip label="Has phone" onRemove={() => removeFilter('has_phone')} />}
                        </div>
                        <button onClick={clearAllFilters} className="shrink-0 text-[11px] font-medium text-[#1693C9] hover:text-[#1380AF] transition-colors">Clear all</button>
                    </div>
                )}

                <MobileContactCards
                    contacts={contacts}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onAddFirstContact={() => setShowQuickAdd(true)}
                    filtered={isFiltered}
                    onClearFilters={clearAllAndSearch}
                />

                {/* Desktop table view */}
                <div className="hidden md:block bg-white border border-[#E4E7EB] shadow-sm overflow-hidden overflow-x-auto">
                    {/* Column headers */}
                    <div className="flex bg-white border-b border-[#E4E7EB] sticky top-0 z-10" style={{ minWidth: `${totalWidth}px` }}>
                        <div className="flex items-center justify-center shrink-0 border-r border-[#E4E7EB]" style={{ width: `${checkboxWidth}px`, height: '44px' }}>
                            <input type="checkbox" checked={contacts.data.length > 0 && selectedIds.length === contacts.data.length} onChange={toggleAll} className="h-[18px] w-[18px] rounded-[4px] border-[#D1D5DB] text-[#1693C9] focus:ring-0 focus:ring-offset-0 cursor-pointer" />
                        </div>
                        {activeColumns.map((col, i) => {
                            const isDrag = dragColKey === col.key;
                            const isDropTarget = dropTargetKey === col.key && dragColKey && dragColKey !== col.key;
                            return (
                                <div
                                    key={col.key}
                                    draggable
                                    onDragStart={(e) => { setDragColKey(col.key); e.dataTransfer.effectAllowed = 'move'; }}
                                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTargetKey(col.key); }}
                                    onDragLeave={() => { if (dropTargetKey === col.key) setDropTargetKey(null); }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        if (!dragColKey || dragColKey === col.key) { setDragColKey(null); setDropTargetKey(null); return; }
                                        setVisibleColumns((prev) => {
                                            const next = [...prev];
                                            const from = next.indexOf(dragColKey);
                                            const to = next.indexOf(col.key);
                                            if (from === -1 || to === -1) return prev;
                                            next.splice(from, 1);
                                            next.splice(to, 0, dragColKey);
                                            return next;
                                        });
                                        setDragColKey(null);
                                        setDropTargetKey(null);
                                    }}
                                    onDragEnd={() => { setDragColKey(null); setDropTargetKey(null); }}
                                    className={`relative flex items-center shrink-0 px-3 cursor-move transition-all ${i < activeColumns.length - 1 ? 'border-r border-[#E4E7EB]' : ''} ${isDrag ? 'opacity-40' : ''} ${isDropTarget ? 'bg-[#EBF5FF]' : ''}`}
                                    style={{ width: `${getColWidth(col)}px`, height: '44px' }}
                                    title="Drag to reorder"
                                >
                                    {col.sortable ? (
                                        <button
                                            onClick={() => handleSort(col.key)}
                                            className="flex items-center gap-1.5 whitespace-nowrap transition-colors"
                                            style={{ fontSize: '14px', lineHeight: '20px', fontWeight: 500, color: 'rgb(7, 9, 15)' }}
                                        >
                                            {fieldIcon(col.key)}
                                            {col.label}
                                            <SortIcon column={col.key} currentSort={filters.sort} currentDirection={filters.direction} />
                                        </button>
                                    ) : (
                                        <span
                                            className="inline-flex items-center gap-1.5 whitespace-nowrap"
                                            style={{ fontSize: '14px', lineHeight: '20px', fontWeight: 500, color: 'rgb(7, 9, 15)' }}
                                        >
                                            {fieldIcon(col.key)}
                                            {col.label}
                                        </span>
                                    )}
                                    <div
                                        draggable={false}
                                        onMouseDown={(e) => { e.stopPropagation(); startResize(e, col); }}
                                        className="absolute right-0 top-0 bottom-0 w-[4px] cursor-col-resize hover:bg-[#1693C9]/30 z-10"
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Rows */}
                    {contacts.data.length === 0 ? (
                        <EmptyContacts
                            filtered={isFiltered}
                            onAddFirstContact={() => setShowQuickAdd(true)}
                            onClearFilters={clearAllAndSearch}
                        />
                    ) : (
                        contacts.data.map((contact) => {
                            const isSelected = selectedIds.includes(contact.id);
                            return (
                                <div
                                    key={contact.id}
                                    className={`flex bg-white border-b border-[#E4E7EB] last:border-b-0 transition-colors ${isSelected ? 'bg-[#F7F8FB]' : ''}`}
                                    style={{ minWidth: `${totalWidth}px` }}
                                >
                                    <div className="flex items-center justify-center shrink-0 border-r border-[#E4E7EB]" style={{ width: `${checkboxWidth}px`, minHeight: '56px' }}>
                                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(contact.id)} className="h-[18px] w-[18px] rounded-[4px] border-[#D1D5DB] text-[#1693C9] focus:ring-0 focus:ring-offset-0 cursor-pointer" />
                                    </div>
                                    {activeColumns.map((col, i) => (
                                        <div key={col.key} className={`flex items-center shrink-0 px-3 py-2 min-w-0 ${i < activeColumns.length - 1 ? 'border-r border-[#E4E7EB]' : ''}`} style={{ width: `${getColWidth(col)}px`, minHeight: '56px' }}>
                                            <ContactCell
                                                contact={contact}
                                                col={col}
                                                leadTypes={leadTypes}
                                                contactStatuses={contactStatuses}
                                                allTags={allTags}
                                                teamMembers={teamMembers}
                                                onCall={callContact}
                                                onEmail={emailContact}
                                            />
                                        </div>
                                    ))}
                                </div>
                            );
                        })
                    )}

                    {/* Pagination */}
                    {contacts.last_page > 1 && (
                        <div className="flex items-stretch h-10 bg-[#F9FAFB] border-t border-[#E4E7EB]">
                            <div className="flex items-center px-4 border-r border-[#E4E7EB] shrink-0">
                                <span className="text-[10px] text-[#5F656D] font-medium">Page {contacts.current_page} / {contacts.last_page}</span>
                            </div>
                            {contacts.links.map((link, i) => (
                                <Link key={i} href={link.url || '#'} className={`flex items-center justify-center min-w-[32px] px-2 text-xs font-medium border-r border-[#E4E7EB] transition-colors ${link.active ? 'bg-[#111315] text-white' : link.url ? 'text-[#5F656D] hover:bg-[#F3F4F6] hover:text-[#111315]' : 'text-[#D1D5DB] cursor-not-allowed'}`} dangerouslySetInnerHTML={{ __html: link.label }} />
                            ))}
                            <div className="flex-1" />
                            <div className="flex items-center px-4 border-l border-[#E4E7EB] shrink-0">
                                <span className="text-[10px] text-[#5F656D] font-medium">{contacts.total} records</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            </div>

            <BulkActionBar
                selectedCount={selectedIds.length}
                allTags={allTags}
                leadTypes={leadTypes}
                actionPlans={actionPlans}
                showTagDropdown={showTagDropdown}
                setShowTagDropdown={setShowTagDropdown}
                tagDropdownRef={tagDropdownRef}
                confirmDelete={confirmDelete}
                onTag={handleBulkTag}
                onChangeType={handleBulkType}
                onEnrollPlan={handleBulkEnrollPlan}
                onSendEmail={() => setShowBulkEmail(true)}
                onPowerDial={handlePowerDial}
                onDelete={handleBulkDelete}
                onClear={() => { setSelectedIds([]); setConfirmDelete(false); setShowTagDropdown(false); }}
            />

            {showQuickAdd && (
                <QuickAddContactModal
                    leadTypes={leadTypes}
                    contactStatuses={contactStatuses}
                    customFields={customFields}
                    onClose={() => setShowQuickAdd(false)}
                />
            )}

            {showSmartListModal && (
                <SmartListModal
                    view={editingSmartList}
                    mode={smartListModalMode}
                    initialFilters={smartListModalMode === 'filter' ? (filters as Record<string, unknown>) : undefined}
                    contactStatuses={contactStatuses}
                    leadTypes={leadTypes}
                    tags={allTags}
                    onApply={(built) => applyFilters(built)}
                    onClose={() => { setShowSmartListModal(false); setEditingSmartList(null); setSmartListModalMode('save'); }}
                />
            )}

            <ExportLeadsModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                selectedIds={selectedIds}
                totalInView={contacts.total ?? contacts.data.length}
                activeViewLabel={
                    activeBuiltInView
                        ? builtInViews.find((v) => v.key === activeBuiltInView)?.label
                        : activeSmartList?.name
                }
                filters={{
                    search: filters.search,
                    type: filters.type,
                    status: filters.status,
                    source: filters.source,
                    city: filters.city,
                    tag: filters.tag,
                    view: activeBuiltInView ?? undefined,
                    lead_score_min: filters.lead_score_min,
                    lead_score_max: filters.lead_score_max,
                    has_email: filters.has_email,
                    has_phone: filters.has_phone,
                }}
            />

            {showBulkEmail && (
                <BulkEmailModal
                    contactIds={selectedIds}
                    contacts={contacts.data.filter((c) => selectedIds.includes(c.id)).map((c) => ({
                        id: c.id,
                        first_name: c.first_name,
                        last_name: c.last_name,
                        email: c.email,
                    }))}
                    onClose={() => setShowBulkEmail(false)}
                    onSent={(campaignId) => {
                        setShowBulkEmail(false);
                        setActiveCampaignId(campaignId);
                        setSelectedIds([]);
                    }}
                />
            )}

            {singleEmailContact && (
                <BulkEmailModal
                    contactIds={[singleEmailContact.id]}
                    contacts={[{
                        id: singleEmailContact.id,
                        first_name: singleEmailContact.first_name,
                        last_name: singleEmailContact.last_name,
                        email: singleEmailContact.email,
                    }]}
                    contactUuid={singleEmailContact.uuid}
                    onClose={() => setSingleEmailContact(null)}
                    onSent={(campaignId) => {
                        setSingleEmailContact(null);
                        setActiveCampaignId(campaignId);
                    }}
                />
            )}

            {activeCampaignId && (
                <BulkEmailProgress
                    campaignId={activeCampaignId}
                    onDone={() => setActiveCampaignId(null)}
                />
            )}

            <AiAssistantPanel
                visible={!!aiEnabled && selectedIds.length === 0}
                hasTeam={hasTeam}
                chatMessages={chatMessages}
                aiQuery={aiQuery}
                aiLoading={aiLoading}
                aiExpanded={aiExpanded}
                chatScrollRef={chatScrollRef}
                aiInputRef={aiInputRef}
                onQueryChange={setAiQuery}
                onSubmit={handleAiQuery}
                onFocus={handleAiFocus}
                onBlur={handleAiBlur}
                onSuggestionClick={handleAiSuggestionClick}
                onContactAction={handleContactAction}
                onDisambiguate={handleDisambiguate}
                onSelectAll={handleAiSelectAll}
                onClearChat={clearAiChat}
            />

            {phoneSetupOpen && (
                <ChannelSetupPromptModal
                    kind="phone"
                    onClose={() => setPhoneSetupOpen(false)}
                />
            )}

            {emailSetupOpen && (
                <ChannelSetupPromptModal
                    kind="email"
                    onClose={() => setEmailSetupOpen(false)}
                />
            )}

            {showPowerDialLauncher && (
                <PowerDialLauncherModal
                    contactCount={selectedIds.length}
                    onCancel={() => setShowPowerDialLauncher(false)}
                    onStart={startPowerDialSession}
                />
            )}

            <DeleteConfirmModal
                open={deleteModalOpen}
                onClose={() => { if (!deleting) setDeleteModalOpen(false); }}
                entity="contact"
                count={selectedIds.length}
                mode={selectedIds.length === 1 ? 'type-name' : 'password'}
                name={selectedIds.length === 1
                    ? (() => {
                        const c = contacts.data.find((x) => x.id === selectedIds[0]);
                        return c ? `${c.first_name} ${c.last_name}`.trim() : '';
                    })()
                    : undefined}
                confirming={deleting}
                error={deleteError}
                onConfirm={confirmBulkDelete}
            />
        </CrmLayout>
    );
}

