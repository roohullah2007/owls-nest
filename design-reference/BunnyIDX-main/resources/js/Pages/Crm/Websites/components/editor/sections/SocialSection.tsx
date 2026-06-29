import React from 'react';
import { WebsiteFormData, FormSetData } from '../../../types';
import { inputClass, cardClass } from '../../../constants';

const SOCIAL_LINKS = [
    { key: 'social_facebook' as const, label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
    { key: 'social_instagram' as const, label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
    { key: 'social_linkedin' as const, label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourprofile' },
    { key: 'social_youtube' as const, label: 'YouTube', placeholder: 'https://youtube.com/yourchannel' },
    { key: 'social_tiktok' as const, label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle' },
];

interface Props {
    data: WebsiteFormData;
    setData: FormSetData;
}

export default function SocialSection({ data, setData }: Props) {
    return (
        <div className="space-y-6">
            <div className={`${cardClass} p-6 space-y-5`}>
                {SOCIAL_LINKS.map(({ key, label, placeholder }) => (
                    <div key={key}>
                        <label className="block text-[13px] font-medium text-[#111315] mb-1">{label}</label>
                        <input type="url" value={data[key]} onChange={(e) => setData(key, e.target.value)} className={inputClass} placeholder={placeholder} />
                    </div>
                ))}
            </div>
        </div>
    );
}
