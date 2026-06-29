import React from 'react';
import { WebsiteFormData, FormSetData } from '../../../types';
import { inputClass } from '../../../constants';
import { SettingsCard } from '@/Components/Crm/SettingsPane';
import { FieldLabel } from '@/Components/Crm/FormField';

interface Props {
    data: WebsiteFormData;
    setData: FormSetData;
}

const FIELDS = [
    { key: 'email', label: 'Email address', field: 'agent_email', placeholder: 'agent@example.com', type: 'email' },
    { key: 'phone', label: 'Phone number', field: 'agent_phone', placeholder: '(555) 123-4567', type: 'text' },
    { key: 'whatsapp', label: 'WhatsApp', field: 'agent_whatsapp', placeholder: '+1 555 123 4567', type: 'text' },
    { key: 'address', label: 'Office address', field: 'office_address', placeholder: '123 Main St, City, ST', type: 'text' },
] as const;

export default function DisplayContactsSection({ data, setData }: Props) {
    const display = data.contact_display || {};
    const setField = (field: string, value: string) => (setData as (k: string, v: string) => void)(field, value);
    const toggle = (key: string) => setData('contact_display', { ...display, [key]: !display[key] });

    return (
        <div className="space-y-6">
            <SettingsCard>
                <div>
                    <p className="text-[14px] font-semibold text-[#111315]">Contact methods</p>
                    <p className="mt-0.5 text-[13px] text-[#5F656D]">
                        Choose which contact details appear on your public site, and toggle each one on or off.
                    </p>
                </div>

                {FIELDS.map((f) => {
                    const shown = !!display[f.key];
                    return (
                        <div key={f.key} className="flex items-end gap-4">
                            <div className="flex-1 min-w-0">
                                <FieldLabel>{f.label}</FieldLabel>
                                <input
                                    type={f.type}
                                    value={(data as unknown as Record<string, string>)[f.field] || ''}
                                    onChange={(e) => setField(f.field, e.target.value)}
                                    className={inputClass}
                                    placeholder={f.placeholder}
                                />
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={shown}
                                onClick={() => toggle(f.key)}
                                title={shown ? 'Shown on site' : 'Hidden'}
                                className={`mb-[6px] relative inline-flex h-[20px] w-[36px] shrink-0 items-center rounded-full transition-colors ${shown ? 'bg-[#1693C9]' : 'bg-[#C8CCD1]'}`}
                            >
                                <span className={`inline-block h-[14px] w-[14px] rounded-full bg-white shadow transition-transform ${shown ? 'translate-x-[19px]' : 'translate-x-[2px]'}`} />
                            </button>
                        </div>
                    );
                })}
            </SettingsCard>
        </div>
    );
}
