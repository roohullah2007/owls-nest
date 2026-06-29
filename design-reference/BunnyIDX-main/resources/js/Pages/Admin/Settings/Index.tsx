import AdminLayout from '@/Layouts/AdminLayout';
import { useState } from 'react';
import PhonePricingPane from './panes/PhonePricingPane';

export interface AreaCodePrice {
    id: number;
    area_code: string;
    label: string | null;
    monthly_price: string;
    is_active: boolean;
}

interface Props {
    areaCodePrices: AreaCodePrice[];
    defaultPrice: string | null;
}

type Section = 'phone-pricing';

const sections: { key: Section; label: string; icon: JSX.Element }[] = [
    {
        key: 'phone-pricing',
        label: 'Phone Pricing',
        icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
        ),
    },
];

export default function AdminSettingsIndex({ areaCodePrices, defaultPrice }: Props) {
    const [section, setSection] = useState<Section>('phone-pricing');

    return (
        <AdminLayout active="settings" title="Admin · Settings">
            <div className="flex items-stretch gap-4">
                {/* Settings sub-navigation — mirrors the user-side settings sidebar. */}
                <nav className="w-48 shrink-0">
                    <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#8B9096]">Settings</p>
                    {sections.map((s) => {
                        const active = section === s.key;
                        return (
                            <button
                                key={s.key}
                                onClick={() => setSection(s.key)}
                                className={`flex items-center gap-2.5 w-full h-9 px-3 rounded-lg text-[13px] font-medium transition-colors ${
                                    active ? 'bg-[#E6F0FF] text-[#1693C9]' : 'text-[#5F656D] hover:bg-[#F3F4F6]'
                                }`}
                            >
                                <span className="shrink-0">{s.icon}</span>
                                <span className="flex-1 text-left truncate">{s.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Section content */}
                <div className="flex-1 min-w-0">
                    {section === 'phone-pricing' && (
                        <PhonePricingPane areaCodePrices={areaCodePrices} defaultPrice={defaultPrice} />
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
