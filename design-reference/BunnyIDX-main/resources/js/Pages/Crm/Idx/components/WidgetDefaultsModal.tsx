import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { WidgetAppearance } from '../Index';
import { defaultAppearance } from '../Index';
import ColorPicker from './ColorPicker';
import FieldToggleGroup from './FieldToggleGroup';

const inputClass = 'block w-full h-8 px-2 text-xs border border-[#cbd5e1] bg-white text-[#0f172a] focus:outline-none focus:border-[#0f172a] focus:ring-0 rounded-lg';
const selectClass = 'block w-full h-8 pl-2 pr-8 text-xs border border-[#cbd5e1] bg-white text-[#0f172a] focus:outline-none focus:border-[#0f172a] focus:ring-0 rounded-lg appearance-none py-0 bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyMCAyMCI+PHBhdGggc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41IiBkPSJNNiA4bDQgNCA0LTQiLz48L3N2Zz4=")] bg-[right_0.5rem_center] bg-no-repeat bg-[length:1.5em_1.5em]';
const labelClass = 'block text-[12px] font-medium text-[#334155] mb-1.5';

const shadowOptions = ['none', 'sm', 'md', 'lg', 'xl'];
const hoverOptions = ['none', 'lift', 'shadow', 'scale'];
const fontOptions = ['Inter, sans-serif', 'Roboto, sans-serif', 'Open Sans, sans-serif', 'Lato, sans-serif', 'System UI, sans-serif'];

const visibleFields = [
    { key: 'photo', label: 'Photo' },
    { key: 'price', label: 'Price' },
    { key: 'address', label: 'Address' },
    { key: 'cityStateZip', label: 'City/State/Zip' },
    { key: 'beds', label: 'Beds' },
    { key: 'baths', label: 'Baths' },
    { key: 'sqft', label: 'Sq Ft' },
    { key: 'lotSize', label: 'Lot Size' },
    { key: 'yearBuilt', label: 'Year Built' },
    { key: 'mlsNumber', label: 'MLS #' },
    { key: 'statusBadge', label: 'Status Badge' },
    { key: 'daysOnMarket', label: 'Days on Market' },
    { key: 'agent', label: 'Agent' },
    { key: 'office', label: 'Office' },
    { key: 'photoCount', label: 'Photo Count' },
];

interface Props {
    currentDefaults: Partial<WidgetAppearance>;
    onClose: () => void;
}

export default function WidgetDefaultsModal({ currentDefaults, onClose }: Props) {
    const [defaults, setDefaults] = useState<WidgetAppearance>({
        ...defaultAppearance,
        ...currentDefaults,
        card: { ...defaultAppearance.card, ...(currentDefaults?.card || {}) },
        typography: { ...defaultAppearance.typography, ...(currentDefaults?.typography || {}) },
        colors: { ...defaultAppearance.colors, ...(currentDefaults?.colors || {}) },
        fields: { ...defaultAppearance.fields, ...(currentDefaults?.fields || {}) },
        searchForm: { ...defaultAppearance.searchForm, ...(currentDefaults?.searchForm || {}) },
    });
    const [saving, setSaving] = useState(false);

    function updateCard(key: string, value: any) {
        setDefaults((prev) => ({ ...prev, card: { ...prev.card, [key]: value } }));
    }

    function updateTypo(key: string, value: any) {
        setDefaults((prev) => ({ ...prev, typography: { ...prev.typography, [key]: value } }));
    }

    function updateColor(key: string, value: string) {
        setDefaults((prev) => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
    }

    function updateField(key: string, value: boolean) {
        setDefaults((prev) => ({ ...prev, fields: { ...prev.fields, [key]: value } }));
    }

    function save() {
        setSaving(true);
        router.post(route('crm.idx.widgets.defaults'), { defaults: defaults as any }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
            onSuccess: () => onClose(),
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className="relative bg-white border border-[#cbd5e1] w-full max-w-2xl max-h-[80vh] overflow-y-auto mx-4">
                <div className="sticky top-0 bg-white border-b border-[#cbd5e1] px-5 py-3 flex items-center justify-between z-10">
                    <h3 className="text-sm font-semibold text-[#0f172a]">Widget Defaults</h3>
                    <button onClick={onClose} className="text-[#64748b] hover:text-[#0f172a]">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    <p className="text-[11px] text-[#64748b]">These defaults will be applied to new widgets when created. Existing widgets are not affected.</p>

                    {/* Card Style */}
                    <div>
                        <p className="text-[11px] font-semibold text-[#0f172a] mb-2">Card Style</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className={labelClass}>Border Radius</label>
                                <input type="number" value={defaults.card.borderRadius} onChange={(e) => updateCard('borderRadius', parseInt(e.target.value) || 0)} min={0} max={24} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Padding</label>
                                <input type="number" value={defaults.card.padding} onChange={(e) => updateCard('padding', parseInt(e.target.value) || 0)} min={0} max={48} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Shadow</label>
                                <select value={defaults.card.shadow} onChange={(e) => updateCard('shadow', e.target.value)} className={selectClass}>
                                    {shadowOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Hover Effect</label>
                                <select value={defaults.card.hoverEffect} onChange={(e) => updateCard('hoverEffect', e.target.value)} className={selectClass}>
                                    {hoverOptions.map((h) => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Typography */}
                    <div>
                        <p className="text-[11px] font-semibold text-[#0f172a] mb-2">Typography</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Font Family</label>
                                <select value={defaults.typography.fontFamily} onChange={(e) => updateTypo('fontFamily', e.target.value)} className={selectClass}>
                                    {fontOptions.map((f) => <option key={f} value={f}>{f.split(',')[0]}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className={labelClass}>Price</label>
                                    <input type="number" value={defaults.typography.priceSize} onChange={(e) => updateTypo('priceSize', parseInt(e.target.value) || 18)} min={12} max={28} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Address</label>
                                    <input type="number" value={defaults.typography.addressSize} onChange={(e) => updateTypo('addressSize', parseInt(e.target.value) || 14)} min={10} max={20} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Details</label>
                                    <input type="number" value={defaults.typography.detailsSize} onChange={(e) => updateTypo('detailsSize', parseInt(e.target.value) || 12)} min={9} max={16} className={inputClass} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Colors */}
                    <div>
                        <p className="text-[11px] font-semibold text-[#0f172a] mb-2">Colors</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            <ColorPicker label="Primary" value={defaults.colors.primary} onChange={(v) => updateColor('primary', v)} />
                            <ColorPicker label="Background" value={defaults.colors.background} onChange={(v) => updateColor('background', v)} />
                            <ColorPicker label="Card BG" value={defaults.colors.cardBackground} onChange={(v) => updateColor('cardBackground', v)} />
                            <ColorPicker label="Text" value={defaults.colors.text} onChange={(v) => updateColor('text', v)} />
                            <ColorPicker label="Accent" value={defaults.colors.accent} onChange={(v) => updateColor('accent', v)} />
                        </div>
                    </div>

                    {/* Fields */}
                    <div>
                        <p className="text-[11px] font-semibold text-[#0f172a] mb-2">Default Visible Fields</p>
                        <FieldToggleGroup fields={visibleFields} values={defaults.fields} onChange={updateField} />
                    </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-[#cbd5e1] px-5 py-3 flex items-center gap-2">
                    <button
                        onClick={save}
                        disabled={saving}
                        className="h-9 px-6 bg-[#0f172a] text-white text-xs font-medium hover:bg-[#1e3a5f] disabled:opacity-30 rounded-full transition-colors"
                    >
                        {saving ? 'Saving...' : 'Save Defaults'}
                    </button>
                    <button onClick={onClose} className="h-9 px-4 text-xs font-medium text-[#475569] hover:text-[#0f172a] transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
