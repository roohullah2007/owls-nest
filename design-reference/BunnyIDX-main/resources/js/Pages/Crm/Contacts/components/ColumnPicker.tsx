import { Ref, useEffect, useMemo, useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';

/**
 * Trigger button + two-pane "Manage Column Settings" modal.
 *
 * Left pane: searchable list of every available field (built-in + custom),
 * with a checkbox to add it to the table.
 * Right pane: the currently-selected columns in display order, with drag-to-
 * reorder and an X to remove. Footer has an inline "Add custom field" form.
 *
 * Changes are kept in local draft state until the user clicks Save, so they
 * can experiment freely without rebuilding the underlying table.
 */

interface ColumnDef {
    key: string;
    label: string;
    isCustom?: boolean;
}

interface NewFieldData {
    label: string;
    type: string;
}

interface Props {
    /** Kept for backward compat; no longer used (modal handles its own outside-click via backdrop). */
    pickerRef?: Ref<HTMLDivElement>;
    isOpen: boolean;
    onToggle: () => void;
    columns: ColumnDef[];
    visibleColumns: string[];
    onToggleColumn: (key: string) => void;
    /** Applies a new ordered list of visible column keys. */
    onApplyColumns?: (next: string[]) => void;
    showAddField: boolean;
    onToggleAddField: (show: boolean) => void;
    newFieldData: NewFieldData;
    onChangeNewFieldData: (next: NewFieldData) => void;
    onSubmitNewField: (e: React.FormEvent) => void;
    onResetNewField: () => void;
    /** Label for the entity whose columns we're managing (used in heading copy). */
    entityLabel?: string;
}

export default function ColumnPicker({
    isOpen, onToggle, columns, visibleColumns, onToggleColumn, onApplyColumns,
    showAddField, onToggleAddField, newFieldData, onChangeNewFieldData,
    onSubmitNewField, onResetNewField, entityLabel = 'Contact',
}: Props) {
    return (
        <div className="hidden md:flex items-center">
            <button
                onClick={onToggle}
                title="Manage columns"
                className="flex items-center h-9 px-3 text-[#5F656D] hover:text-[#111315] bg-white border border-[#C8CCD1] rounded-[4px] hover:bg-[#F9FAFB] transition-colors"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
                <span className="ml-1.5 text-xs font-medium">Columns</span>
            </button>

            {isOpen && (
                <ColumnPickerModal
                    columns={columns}
                    visibleColumns={visibleColumns}
                    onToggleColumn={onToggleColumn}
                    onApplyColumns={onApplyColumns}
                    onClose={onToggle}
                    entityLabel={entityLabel}
                    showAddField={showAddField}
                    onToggleAddField={onToggleAddField}
                    newFieldData={newFieldData}
                    onChangeNewFieldData={onChangeNewFieldData}
                    onSubmitNewField={onSubmitNewField}
                    onResetNewField={onResetNewField}
                />
            )}
        </div>
    );
}

/* ===================== Modal ===================== */

interface ModalProps {
    columns: ColumnDef[];
    visibleColumns: string[];
    onToggleColumn: (key: string) => void;
    onApplyColumns?: (next: string[]) => void;
    onClose: () => void;
    entityLabel: string;
    showAddField: boolean;
    onToggleAddField: (show: boolean) => void;
    newFieldData: NewFieldData;
    onChangeNewFieldData: (next: NewFieldData) => void;
    onSubmitNewField: (e: React.FormEvent) => void;
    onResetNewField: () => void;
}

function ColumnPickerModal({
    columns, visibleColumns, onToggleColumn, onApplyColumns, onClose, entityLabel,
    showAddField, onToggleAddField, newFieldData, onChangeNewFieldData,
    onSubmitNewField, onResetNewField,
}: ModalProps) {
    // Draft state — only flushed on Save.
    const [draft, setDraft] = useState<string[]>(visibleColumns);
    const [search, setSearch] = useState('');
    const [dragKey, setDragKey] = useState<string | null>(null);

    useEffect(() => { setDraft(visibleColumns); }, [visibleColumns.join('|')]); // resync if parent changes

    const colMap = useMemo(() => {
        const m: Record<string, ColumnDef> = {};
        columns.forEach((c) => { m[c.key] = c; });
        return m;
    }, [columns]);

    const filteredLeft = useMemo(() => {
        const q = search.trim().toLowerCase();
        return columns
            .filter((c) => !q || c.label.toLowerCase().includes(q))
            .sort((a, b) => {
                // Built-in first, then custom; alphabetical within each group.
                if (!!a.isCustom !== !!b.isCustom) return a.isCustom ? 1 : -1;
                return a.label.localeCompare(b.label);
            });
    }, [columns, search]);

    function toggleDraft(key: string) {
        setDraft((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
    }

    function removeFromDraft(key: string) {
        setDraft((prev) => prev.filter((k) => k !== key));
    }

    function handleDragStart(key: string) {
        setDragKey(key);
    }

    function handleDragOver(e: React.DragEvent, key: string) {
        e.preventDefault();
        if (!dragKey || dragKey === key) return;
        setDraft((prev) => {
            const next = [...prev];
            const from = next.indexOf(dragKey);
            const to = next.indexOf(key);
            if (from === -1 || to === -1) return prev;
            next.splice(from, 1);
            next.splice(to, 0, dragKey);
            return next;
        });
    }

    function applyAndClose() {
        if (onApplyColumns) {
            onApplyColumns(draft);
        } else {
            // Fallback: emit per-toggle calls for added/removed keys (order won't change).
            const added = draft.filter((k) => !visibleColumns.includes(k));
            const removed = visibleColumns.filter((k) => !draft.includes(k));
            [...added, ...removed].forEach(onToggleColumn);
        }
        onClose();
    }

    const footer = (
        <>
            <span className="text-[12px] text-[#5F656D] mr-auto">
                {draft.length} of {columns.length} selected
            </span>
            <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={applyAndClose}
                className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] transition-colors"
            >
                Save
            </button>
        </>
    );

    return (
        <SlideOverModal title="Manage Column Settings" onClose={onClose} footer={footer} width={720}>
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT — available fields */}
                <div className="w-1/2 border-r border-[#E4E7EB] flex flex-col">
                    <div className="px-4 py-3 border-b border-[#E4E7EB]">
                        <div className="text-[12px] font-semibold tracking-wider text-[#5F656D] mb-2">
                            All {entityLabel} Fields
                        </div>
                        <input
                            type="text"
                            placeholder="Search fields…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto py-1">
                        {filteredLeft.length === 0 ? (
                            <div className="px-4 py-8 text-[12px] text-[#8B9096] text-center">No fields match "{search}".</div>
                        ) : (
                            filteredLeft.map((col) => {
                                const selected = draft.includes(col.key);
                                return (
                                    <label
                                        key={col.key}
                                        className="flex items-center gap-2.5 px-4 py-1.5 text-[13px] text-[#1f2530] hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={() => toggleDraft(col.key)}
                                            className="h-4 w-4 rounded border-[#D1D5DB] text-[#1693C9] focus:ring-[#1693C9] focus:ring-offset-0 cursor-pointer"
                                        />
                                        <span className="flex-1 truncate">{col.label}</span>
                                        {col.isCustom && (
                                            <span className="text-[10px] text-[#8B9096] bg-[#F3F4F6] border border-[#E4E7EB] rounded-full px-1.5 py-0.5">Custom</span>
                                        )}
                                    </label>
                                );
                            })
                        )}
                    </div>

                    {/* Add custom field footer */}
                    <div className="border-t border-[#E4E7EB]">
                        {!showAddField ? (
                            <button
                                type="button"
                                onClick={() => onToggleAddField(true)}
                                className="flex items-center gap-1.5 w-full px-4 py-2.5 text-[12px] font-medium text-[#1693C9] hover:bg-[#F9FAFB] transition-colors"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                Add custom field
                            </button>
                        ) : (
                            <form onSubmit={onSubmitNewField} className="p-3 space-y-2 bg-[#F7F8FB]">
                                <div>
                                    <FieldLabel htmlFor="cp_field_label">Label</FieldLabel>
                                    <input
                                        id="cp_field_label"
                                        type="text"
                                        value={newFieldData.label}
                                        onChange={(e) => onChangeNewFieldData({ ...newFieldData, label: e.target.value })}
                                        placeholder="e.g. Anniversary"
                                        autoFocus
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <FieldLabel htmlFor="cp_field_type">Type</FieldLabel>
                                    <select
                                        id="cp_field_type"
                                        value={newFieldData.type}
                                        onChange={(e) => onChangeNewFieldData({ ...newFieldData, type: e.target.value })}
                                        className={inputClass}
                                    >
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                        <option value="date">Date</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="submit"
                                        disabled={!newFieldData.label.trim()}
                                        className="h-7 px-3 bg-[#1693C9] text-white text-[11px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30"
                                    >
                                        Add Field
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { onToggleAddField(false); onResetNewField(); }}
                                        className="h-7 px-3 text-[11px] font-medium text-[#5F656D] hover:text-[#111315]"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* RIGHT — selected fields, sortable */}
                <div className="w-1/2 flex flex-col">
                    <div className="px-4 py-3 border-b border-[#E4E7EB] flex items-center justify-between">
                        <div className="text-[12px] font-semibold tracking-wider text-[#5F656D]">
                            Selected Columns
                        </div>
                        <span className="text-[11px] text-[#8B9096]">{draft.length} shown</span>
                    </div>
                    <div className="flex-1 overflow-y-auto py-1">
                        {draft.length === 0 ? (
                            <div className="px-4 py-8 text-[12px] text-[#8B9096] text-center">
                                No columns selected. Pick fields from the left.
                            </div>
                        ) : (
                            draft.map((key) => {
                                const col = colMap[key];
                                if (!col) return null;
                                const isDragging = dragKey === key;
                                return (
                                    <div
                                        key={key}
                                        draggable
                                        onDragStart={() => handleDragStart(key)}
                                        onDragOver={(e) => handleDragOver(e, key)}
                                        onDragEnd={() => setDragKey(null)}
                                        onDrop={() => setDragKey(null)}
                                        className={`flex items-center gap-2 px-3 py-1.5 mx-1 rounded transition-colors group ${
                                            isDragging ? 'opacity-40 bg-[#F3F4F6]' : 'hover:bg-[#F9FAFB]'
                                        }`}
                                    >
                                        <span className="shrink-0 text-[#C4C9D1] group-hover:text-[#8B9096] cursor-grab active:cursor-grabbing">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                                            </svg>
                                        </span>
                                        <span className="flex-1 text-[13px] text-[#1f2530] truncate">{col.label}</span>
                                        {col.isCustom && (
                                            <span className="text-[10px] text-[#8B9096] bg-[#F3F4F6] border border-[#E4E7EB] rounded-full px-1.5 py-0.5">Custom</span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeFromDraft(key)}
                                            title="Remove"
                                            className="shrink-0 h-6 w-6 inline-flex items-center justify-center rounded text-[#8B9096] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </SlideOverModal>
    );
}
