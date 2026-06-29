import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { IdxWidget, WidgetAppearance } from '../Index';
import { defaultAppearance } from '../Index';
import ColorPicker from './ColorPicker';
import FieldToggleGroup from './FieldToggleGroup';

const inputClass = 'block w-full h-8 px-2 text-xs border border-[#cbd5e1] bg-white text-[#0f172a] focus:outline-none focus:border-[#0f172a] focus:ring-0 rounded-lg';
const selectClass = 'block w-full h-8 pl-2 pr-8 text-xs border border-[#cbd5e1] bg-white text-[#0f172a] focus:outline-none focus:border-[#0f172a] focus:ring-0 rounded-lg appearance-none py-0 bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyMCAyMCI+PHBhdGggc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41IiBkPSJNNiA4bDQgNCA0LTQiLz48L3N2Zz4=")] bg-[right_0.5rem_center] bg-no-repeat bg-[length:1.5em_1.5em]';
const labelClass = 'block text-[12px] font-medium text-[#334155] mb-1.5';

const shadowOptions = ['none', 'sm', 'md', 'lg', 'xl'];
const hoverOptions = ['none', 'lift', 'shadow', 'scale'];
const aspectRatioOptions = ['4:3', '16:9', '3:2', '1:1'];
const fontOptions = ['Inter, sans-serif', 'Roboto, sans-serif', 'Open Sans, sans-serif', 'Lato, sans-serif', 'System UI, sans-serif'];
const layoutOptions = ['horizontal', 'vertical', 'grid'];

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

const searchFormFields = ['city', 'min_price', 'max_price', 'min_beds', 'min_baths', 'property_type', 'status', 'postal_code', 'min_sqft', 'max_sqft'];

interface Props {
    widget: IdxWidget;
    onClose: () => void;
}

export default function WidgetAppearanceEditor({ widget, onClose }: Props) {
    const [appearance, setAppearance] = useState<WidgetAppearance>({
        ...defaultAppearance,
        ...widget.appearance,
        card: { ...defaultAppearance.card, ...(widget.appearance?.card || {}) },
        typography: { ...defaultAppearance.typography, ...(widget.appearance?.typography || {}) },
        colors: { ...defaultAppearance.colors, ...(widget.appearance?.colors || {}) },
        fields: { ...defaultAppearance.fields, ...(widget.appearance?.fields || {}) },
        searchForm: { ...defaultAppearance.searchForm, ...(widget.appearance?.searchForm || {}) },
    });
    const [saving, setSaving] = useState(false);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({ card: true });

    function toggleSection(key: string) {
        setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    function updateCard(key: string, value: any) {
        setAppearance((prev) => ({ ...prev, card: { ...prev.card, [key]: value } }));
    }

    function updateTypo(key: string, value: any) {
        setAppearance((prev) => ({ ...prev, typography: { ...prev.typography, [key]: value } }));
    }

    function updateColor(key: string, value: string) {
        setAppearance((prev) => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
    }

    function updateField(key: string, value: boolean) {
        setAppearance((prev) => ({ ...prev, fields: { ...prev.fields, [key]: value } }));
    }

    function updateSearchForm(key: string, value: any) {
        setAppearance((prev) => ({ ...prev, searchForm: { ...prev.searchForm, [key]: value } }));
    }

    function save() {
        setSaving(true);
        router.patch(route('crm.idx.widgets.update', widget.id), { appearance: appearance as any }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
            onSuccess: () => onClose(),
        });
    }

    const SectionHeader = ({ id, title }: { id: string; title: string }) => (
        <button onClick={() => toggleSection(id)} className="flex items-center justify-between w-full py-2 text-left">
            <span className="text-[11px] font-semibold text-[#0f172a]">{title}</span>
            <svg className={`h-3.5 w-3.5 text-[#64748b] transition-transform ${openSections[id] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
        </button>
    );

    return (
        <div className="bg-[#f8fafc] border border-t-0 border-[#cbd5e1] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-[#0f172a]">Appearance Customizer</h4>
                <button onClick={onClose} className="text-[#64748b] hover:text-[#0f172a]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="space-y-1 divide-y divide-[#cbd5e1]">
                {/* Card Style */}
                <div>
                    <SectionHeader id="card" title="Card Style" />
                    {openSections.card && (
                        <div className="pb-3 space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                    <label className={labelClass}>Border Radius</label>
                                    <input type="range" min={0} max={24} value={appearance.card.borderRadius} onChange={(e) => updateCard('borderRadius', parseInt(e.target.value))} className="w-full" />
                                    <span className="text-[10px] text-[#64748b]">{appearance.card.borderRadius}px</span>
                                </div>
                                <div>
                                    <label className={labelClass}>Padding</label>
                                    <input type="number" value={appearance.card.padding} onChange={(e) => updateCard('padding', parseInt(e.target.value) || 0)} min={0} max={48} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Margin</label>
                                    <input type="number" value={appearance.card.margin} onChange={(e) => updateCard('margin', parseInt(e.target.value) || 0)} min={0} max={48} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Shadow</label>
                                    <select value={appearance.card.shadow} onChange={(e) => updateCard('shadow', e.target.value)} className={selectClass}>
                                        {shadowOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Hover Effect</label>
                                    <select value={appearance.card.hoverEffect} onChange={(e) => updateCard('hoverEffect', e.target.value)} className={selectClass}>
                                        {hoverOptions.map((h) => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Image Aspect Ratio</label>
                                    <select value={appearance.card.imageAspectRatio} onChange={(e) => updateCard('imageAspectRatio', e.target.value)} className={selectClass}>
                                        {aspectRatioOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Typography */}
                <div>
                    <SectionHeader id="typography" title="Typography" />
                    {openSections.typography && (
                        <div className="pb-3 space-y-3">
                            <div>
                                <label className={labelClass}>Font Family</label>
                                <select value={appearance.typography.fontFamily} onChange={(e) => updateTypo('fontFamily', e.target.value)} className={selectClass}>
                                    {fontOptions.map((f) => <option key={f} value={f}>{f.split(',')[0]}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className={labelClass}>Price Size</label>
                                    <input type="range" min={12} max={28} value={appearance.typography.priceSize} onChange={(e) => updateTypo('priceSize', parseInt(e.target.value))} className="w-full" />
                                    <span className="text-[10px] text-[#64748b]">{appearance.typography.priceSize}px</span>
                                </div>
                                <div>
                                    <label className={labelClass}>Address Size</label>
                                    <input type="range" min={10} max={20} value={appearance.typography.addressSize} onChange={(e) => updateTypo('addressSize', parseInt(e.target.value))} className="w-full" />
                                    <span className="text-[10px] text-[#64748b]">{appearance.typography.addressSize}px</span>
                                </div>
                                <div>
                                    <label className={labelClass}>Details Size</label>
                                    <input type="range" min={9} max={16} value={appearance.typography.detailsSize} onChange={(e) => updateTypo('detailsSize', parseInt(e.target.value))} className="w-full" />
                                    <span className="text-[10px] text-[#64748b]">{appearance.typography.detailsSize}px</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Colors */}
                <div>
                    <SectionHeader id="colors" title="Colors" />
                    {openSections.colors && (
                        <div className="pb-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                <ColorPicker label="Primary" value={appearance.colors.primary} onChange={(v) => updateColor('primary', v)} />
                                <ColorPicker label="Background" value={appearance.colors.background} onChange={(v) => updateColor('background', v)} />
                                <ColorPicker label="Card BG" value={appearance.colors.cardBackground} onChange={(v) => updateColor('cardBackground', v)} />
                                <ColorPicker label="Text" value={appearance.colors.text} onChange={(v) => updateColor('text', v)} />
                                <ColorPicker label="Text Secondary" value={appearance.colors.textSecondary} onChange={(v) => updateColor('textSecondary', v)} />
                                <ColorPicker label="Accent" value={appearance.colors.accent} onChange={(v) => updateColor('accent', v)} />
                                <ColorPicker label="Price Badge" value={appearance.colors.priceBadge} onChange={(v) => updateColor('priceBadge', v)} />
                                <ColorPicker label="Price Badge Text" value={appearance.colors.priceBadgeText} onChange={(v) => updateColor('priceBadgeText', v)} />
                                <ColorPicker label="Status Badge" value={appearance.colors.statusBadge} onChange={(v) => updateColor('statusBadge', v)} />
                                <ColorPicker label="Status Badge Text" value={appearance.colors.statusBadgeText} onChange={(v) => updateColor('statusBadgeText', v)} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Visible Fields */}
                <div>
                    <SectionHeader id="fields" title="Visible Fields" />
                    {openSections.fields && (
                        <div className="pb-3">
                            <FieldToggleGroup fields={visibleFields} values={appearance.fields} onChange={updateField} />
                        </div>
                    )}
                </div>

                {/* Search Form (only for search_form type) */}
                {widget.widget_type === 'search_form' && (
                    <div>
                        <SectionHeader id="searchForm" title="Search Form" />
                        {openSections.searchForm && (
                            <div className="pb-3 space-y-3">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div>
                                        <label className={labelClass}>Border Radius</label>
                                        <input type="number" value={appearance.searchForm.borderRadius} onChange={(e) => updateSearchForm('borderRadius', parseInt(e.target.value) || 0)} min={0} max={24} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Layout</label>
                                        <select value={appearance.searchForm.layout} onChange={(e) => updateSearchForm('layout', e.target.value)} className={selectClass}>
                                            {layoutOptions.map((l) => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Button Text</label>
                                        <input type="text" value={appearance.searchForm.buttonText} onChange={(e) => updateSearchForm('buttonText', e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Visible Search Fields</label>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {searchFormFields.map((f) => {
                                                const isActive = appearance.searchForm.visibleFields?.includes(f);
                                                return (
                                                    <button
                                                        key={f}
                                                        type="button"
                                                        onClick={() => {
                                                            const current = appearance.searchForm.visibleFields || [];
                                                            updateSearchForm('visibleFields', isActive ? current.filter((x: string) => x !== f) : [...current, f]);
                                                        }}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${isActive ? 'bg-[#0f172a] border-[#0f172a] text-white shadow-sm' : 'bg-white border-[#cbd5e1] text-[#475569] hover:border-[#94a3b8] hover:bg-[#f8fafc]'}`}
                                                    >
                                                        {f.replace(/_/g, ' ')}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <ColorPicker label="Button Color" value={appearance.searchForm.buttonColor} onChange={(v) => updateSearchForm('buttonColor', v)} />
                                    <ColorPicker label="Button Text Color" value={appearance.searchForm.buttonTextColor} onChange={(v) => updateSearchForm('buttonTextColor', v)} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Save */}
            <div className="flex items-center gap-2 pt-3 mt-3 border-t border-[#cbd5e1]">
                <button
                    onClick={save}
                    disabled={saving}
                    className="h-8 px-5 bg-[#0f172a] text-white text-[13px] font-medium hover:bg-[#1e3a5f] disabled:opacity-30 rounded-lg transition-colors"
                >
                    {saving ? 'Saving...' : 'Save Appearance'}
                </button>
                <button onClick={onClose} className="h-8 px-3 text-xs font-medium text-[#475569] hover:text-[#0f172a] transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    );
}
