import { useState } from 'react';
import { NewListingFormData } from '../NewListingModal';
import { Field, INPUT_CLASS, SELECT_CLASS, SectionTitle } from './fields';
import { FEATURE_GROUPS, FURNISHED_OPTIONS, FeatureGroupKey } from './featureOptions';

interface Props {
    data: NewListingFormData;
    setData: (key: keyof NewListingFormData, value: any) => void;
    errors: Record<string, string>;
}

/** Toggle chip — two-tone teal selected state (matches the editor block palette). */
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                active
                    ? 'border-[#1693C9] bg-[#E0F2FE] text-[#1693C9]'
                    : 'border-[#E4E7EB] bg-white text-[#5F656D] hover:border-[#C8CCD1] hover:text-[#111315]'
            }`}
        >
            {active && (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
            )}
            {children}
        </button>
    );
}

const HIGHLIGHTS: { key: 'pool' | 'waterfront' | 'new_construction'; label: string }[] = [
    { key: 'pool', label: 'Pool' },
    { key: 'waterfront', label: 'Waterfront' },
    { key: 'new_construction', label: 'New Construction' },
];

export default function FeaturesTab({ data, setData, errors }: Props) {
    const [customInput, setCustomInput] = useState('');

    const toggleInGroup = (key: FeatureGroupKey, value: string) => {
        const arr = (data[key] as string[]) ?? [];
        setData(key, arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
    };

    const addCustom = () => {
        const v = customInput.trim();
        if (!v) return;
        if (!data.custom_features.includes(v)) {
            setData('custom_features', [...data.custom_features, v]);
        }
        setCustomInput('');
    };

    const removeCustom = (value: string) => {
        setData('custom_features', data.custom_features.filter((v) => v !== value));
    };

    return (
        <div className="space-y-5">
            <SectionTitle>Features &amp; amenities</SectionTitle>
            <p className="-mt-3 text-[12px] text-[#8B9096]">
                These show as the property's feature list on your public website and listing pages.
            </p>

            {/* Highlights + furnished */}
            <div className="space-y-2.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8B9096]">Highlights</label>
                <div className="flex flex-wrap gap-2">
                    {HIGHLIGHTS.map((h) => (
                        <Chip
                            key={h.key}
                            active={!!data[h.key]}
                            onClick={() => setData(h.key, !data[h.key])}
                        >
                            {h.label}
                        </Chip>
                    ))}
                </div>
                <div className="max-w-xs pt-1">
                    <Field label="Furnished" error={errors['features.furnished']}>
                        <select
                            value={data.furnished}
                            onChange={(e) => setData('furnished', e.target.value)}
                            className={SELECT_CLASS}
                        >
                            {FURNISHED_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
            </div>

            {/* Grouped amenity chips */}
            {FEATURE_GROUPS.map((group) => {
                const selected = (data[group.key] as string[]) ?? [];
                return (
                    <div key={group.key} className="space-y-2 border-t border-[#F3F4F6] pt-4">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8B9096]">
                            {group.label}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {group.options.map((opt) => (
                                <Chip key={opt} active={selected.includes(opt)} onClick={() => toggleInGroup(group.key, opt)}>
                                    {opt}
                                </Chip>
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* Custom free-form features */}
            <div className="space-y-2 border-t border-[#F3F4F6] pt-4">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8B9096]">
                    Custom features
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustom();
                            }
                        }}
                        placeholder="e.g. Smart-home wiring, Wine cellar…"
                        className={INPUT_CLASS}
                    />
                    <button
                        type="button"
                        onClick={addCustom}
                        disabled={!customInput.trim()}
                        className="shrink-0 rounded-md border border-[#C8CCD1] bg-white px-3 text-[12px] font-medium text-[#111315] transition-colors hover:bg-[#F7F8F9] disabled:opacity-40"
                    >
                        Add
                    </button>
                </div>
                {data.custom_features.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {data.custom_features.map((f) => (
                            <span
                                key={f}
                                className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E7EB] bg-[#FAFBFC] py-1 pl-3 pr-1.5 text-[12px] font-medium text-[#111315]"
                            >
                                {f}
                                <button
                                    type="button"
                                    onClick={() => removeCustom(f)}
                                    className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[#8B9096] hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                                    title="Remove"
                                >
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
