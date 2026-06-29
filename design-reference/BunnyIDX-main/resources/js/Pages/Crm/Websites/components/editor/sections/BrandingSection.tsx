import React from 'react';
import { AgentWebsite, WebsiteFormData, FormSetData, TemplateConfig, ColorOption } from '../../../types';
import { inputClass, labelClass, cardClass } from '../../../constants';
import ImageUploadField from '../ImageUploadField';

interface Props {
    data: WebsiteFormData;
    setData: FormSetData;
    website: AgentWebsite;
    templates: Record<string, TemplateConfig>;
}

const DEFAULT_COLOR_SLOTS: ColorOption[] = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
];

export default function BrandingSection({ data, setData, website, templates }: Props) {
    const currentTemplate = data.template || website.template;
    const tpl = templates[currentTemplate];
    const colorSlots = tpl?.colors ?? DEFAULT_COLOR_SLOTS;

    // Primary maps to the existing accent_color (templates already render it);
    // every other slot lives in the custom_colors map.
    const colorValue = (key: string) => (key === 'primary' ? data.accent_color || '' : data.custom_colors?.[key] || '');
    const setColor = (key: string, v: string) => {
        if (key === 'primary') setData('accent_color', v);
        else setData('custom_colors', { ...(data.custom_colors || {}), [key]: v });
    };

    return (
        <div className="space-y-6">
            {/* Colors */}
            <div className={`${cardClass} p-6`}>
                <p className="text-[14px] font-semibold text-[#111315] mb-1">Colors</p>
                <p className="text-[12px] text-[#8B9096] mb-4">Customize the colors this theme supports. Leave empty to use the theme default.</p>
                <div className="space-y-4">
                    {colorSlots.map((slot) => {
                        const val = colorValue(slot.key);
                        const fallback = slot.default || (slot.key === 'primary' ? tpl?.preview?.accent || '#1693C9' : '#0D9488');
                        return (
                            <div key={slot.key}>
                                <label className={labelClass}>{slot.label}</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={val || fallback}
                                        onChange={(e) => setColor(slot.key, e.target.value)}
                                        className="h-10 w-12 rounded-lg cursor-pointer border-0 p-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-[#E4E7EB]"
                                    />
                                    <input
                                        type="text"
                                        value={val}
                                        onChange={(e) => setColor(slot.key, e.target.value)}
                                        className={`${inputClass} max-w-[120px]`}
                                        placeholder={fallback}
                                    />
                                    {val && (
                                        <button type="button" onClick={() => setColor(slot.key, '')} className="text-[11px] font-medium text-[#5F656D] hover:text-[#111315]">
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Assets */}
            <div className={`${cardClass}`}>
                <div className="p-6">
                    <p className="text-[14px] font-semibold text-[#111315] mb-4">Brokerage Logos</p>
                    <div className="grid grid-cols-2 gap-4">
                        <ImageUploadField
                            label="Light (dark bg)"
                            imageUrl={website.brokerage_logo_light}
                            routeName="crm.websites.upload-logo"
                            routeParam={website.id}
                            fileKey="logo"
                            extraData={{ variant: 'light' }}
                            variant="small"
                            placeholder="Upload"
                        />
                        <ImageUploadField
                            label="Dark (light bg)"
                            imageUrl={website.brokerage_logo_dark}
                            routeName="crm.websites.upload-logo"
                            routeParam={website.id}
                            fileKey="logo"
                            extraData={{ variant: 'dark' }}
                            variant="small"
                            placeholder="Upload"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

