import { FormEvent, useEffect, useRef, useState } from 'react';
import Select from '@/Components/Crm/Select';
import type { Column, CustomFieldDef } from '../types';
import { capitalize } from '../utils';

type Tab = 'columns' | 'types' | 'statuses' | 'fields';

interface Props {
    allColumns: Column[];
    visibleColumns: string[];
    onToggleColumn: (key: string) => void;
    listingTypes: string[];
    listingStatuses: string[];
    customFields: CustomFieldDef[];
    newType: string;
    onChangeNewType: (v: string) => void;
    onAddType: (e: FormEvent) => void;
    newStatus: string;
    onChangeNewStatus: (v: string) => void;
    onAddStatus: (e: FormEvent) => void;
    newFieldLabel: string;
    onChangeNewFieldLabel: (v: string) => void;
    newFieldType: string;
    onChangeNewFieldType: (v: string) => void;
    onAddField: (e: FormEvent) => void;
}

/**
 * Dropdown panel above the listings table for picking visible columns and
 * managing the per-account taxonomy (listing types, statuses, custom fields).
 * Owns its own open / active-tab state since neither the parent nor a sibling
 * needs to read it.
 */
export default function ColumnsSettingsDropdown({
    allColumns, visibleColumns, onToggleColumn,
    listingTypes, listingStatuses, customFields,
    newType, onChangeNewType, onAddType,
    newStatus, onChangeNewStatus, onAddStatus,
    newFieldLabel, onChangeNewFieldLabel,
    newFieldType, onChangeNewFieldType, onAddField,
}: Props) {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<Tab>('columns');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function onDoc(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    return (
        <div className="relative hidden md:flex items-center" ref={ref}>
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center h-9 px-3 text-[#5F656D] hover:text-[#111315] bg-white border border-[#C8CCD1] rounded-[4px] hover:bg-[#F9FAFB] transition-colors"
                title="Columns & Settings"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
                <span className="ml-1.5 text-xs font-medium">Columns</span>
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 z-[1001] w-56 bg-white border border-[#E4E7EB] rounded-lg shadow-lg max-h-[480px] overflow-y-auto">
                    <div className="flex border-b border-[#E4E7EB]">
                        {(TABS).map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`flex-1 py-2 text-[10px] font-semibold tracking-wide transition-colors ${
                                    tab === t.key ? 'text-[#111315] border-b-2 border-[#111315]' : 'text-[#8B9096] hover:text-[#5F656D]'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {tab === 'columns' && (
                        <div>
                            {allColumns.map((col) => (
                                <label key={col.key} className="flex items-center px-3 py-1.5 text-xs text-[#5F656D] hover:bg-[#F9FAFB] cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={visibleColumns.includes(col.key)}
                                        onChange={() => onToggleColumn(col.key)}
                                        className="h-3.5 w-3.5 border-[#D1D5DB] text-[#111315] focus:ring-0 focus:ring-offset-0 mr-2.5 cursor-pointer"
                                    />
                                    {col.label}
                                    {col.isCustom && <span className="ml-auto text-[9px] text-[#8B9096]">Custom</span>}
                                </label>
                            ))}
                        </div>
                    )}

                    {tab === 'types' && (
                        <div>
                            {listingTypes.map((t) => (
                                <div key={t} className="flex items-center px-3 py-1.5 text-xs text-[#5F656D]">{capitalize(t)}</div>
                            ))}
                            <AddRowForm
                                value={newType}
                                onChange={onChangeNewType}
                                onSubmit={onAddType}
                                placeholder="e.g. condo"
                                buttonLabel="Add Type"
                            />
                        </div>
                    )}

                    {tab === 'statuses' && (
                        <div>
                            {listingStatuses.map((s) => (
                                <div key={s} className="flex items-center px-3 py-1.5 text-xs text-[#5F656D]">{capitalize(s)}</div>
                            ))}
                            <AddRowForm
                                value={newStatus}
                                onChange={onChangeNewStatus}
                                onSubmit={onAddStatus}
                                placeholder="e.g. under_contract"
                                buttonLabel="Add Status"
                            />
                        </div>
                    )}

                    {tab === 'fields' && (
                        <div>
                            {customFields.map((cf) => (
                                <div key={cf.key} className="flex items-center justify-between px-3 py-1.5 text-xs text-[#5F656D]">
                                    {cf.label}
                                    <span className="text-[9px] text-[#8B9096]">{cf.type}</span>
                                </div>
                            ))}
                            <form onSubmit={onAddField} className="p-3 border-t border-[#E4E7EB] space-y-2">
                                <input
                                    type="text"
                                    value={newFieldLabel}
                                    onChange={(e) => onChangeNewFieldLabel(e.target.value)}
                                    placeholder="Field name"
                                    className="block w-full h-7 px-2 text-xs border border-[#ECEEF1] rounded-md bg-white text-[#303030] placeholder-[#8B9096] focus:outline-none focus:border-[#111315] focus:ring-0"
                                />
                                <Select
                                    size="sm"
                                    fullWidth
                                    triggerClassName="text-xs text-[#303030]"
                                    value={newFieldType}
                                    onChange={onChangeNewFieldType}
                                    options={[
                                        { value: 'text', label: 'Text' },
                                        { value: 'number', label: 'Number' },
                                        { value: 'date', label: 'Date' },
                                    ]}
                                />
                                <button
                                    type="submit"
                                    disabled={!newFieldLabel.trim()}
                                    className="w-full h-7 bg-[#1693C9] text-white text-[10px] font-medium tracking-wider rounded-md hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
                                >
                                    Add Field
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const TABS: ReadonlyArray<{ key: Tab; label: string }> = [
    { key: 'columns', label: 'Cols' },
    { key: 'types', label: 'Types' },
    { key: 'statuses', label: 'Status' },
    { key: 'fields', label: 'Fields' },
];

function AddRowForm({ value, onChange, onSubmit, placeholder, buttonLabel }: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: (e: FormEvent) => void;
    placeholder: string;
    buttonLabel: string;
}) {
    return (
        <form onSubmit={onSubmit} className="p-3 border-t border-[#E4E7EB] space-y-2">
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="block w-full h-7 px-2 text-xs border border-[#ECEEF1] rounded-md bg-white text-[#303030] placeholder-[#8B9096] focus:outline-none focus:border-[#111315] focus:ring-0"
            />
            <button
                type="submit"
                disabled={!value.trim()}
                className="w-full h-7 bg-[#1693C9] text-white text-[10px] font-medium tracking-wider rounded-md hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
            >
                {buttonLabel}
            </button>
        </form>
    );
}
