import React from 'react';
import { AgentWebsite, WebsiteFormData, FormSetData, FormErrors } from '../../../types';
import { inputClass, textareaClass, labelClass, cardClass, US_STATES } from '../../../constants';
import AiFieldButton from '../../AiFieldButton';
import ImageUploadField from '../ImageUploadField';
import Select from '@/Components/Crm/Select';
import { sectionHeading } from '../navConfig';

interface Props {
    data: WebsiteFormData;
    setData: FormSetData;
    errors: FormErrors;
    website: AgentWebsite;
}

export default function GeneralSection({ data, setData, errors, website }: Props) {
    return (
        <div className="space-y-6">
            <div className={`${cardClass} p-6 space-y-5`}>
                <p className={sectionHeading}>Agent Information</p>

                <div className="flex items-center gap-4">
                    <ImageUploadField
                        imageUrl={website.agent_photo}
                        routeName="crm.websites.upload-photo"
                        routeParam={website.id}
                        fileKey="photo"
                        variant="circle"
                        placeholder=""
                    />
                    <div>
                        <p className="text-[12px] font-medium text-[#111315]">Agent Photo</p>
                        <p className="text-[10px] text-[#8B9096] mt-0.5">Square image, at least 400x400px</p>
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Full Name <span className="text-red-400">*</span></label>
                    <input type="text" value={data.agent_name} onChange={(e) => setData('agent_name', e.target.value)} className={inputClass} placeholder="Nichole Johnson" required />
                    {errors.agent_name && <p className="mt-1.5 text-[11px] text-red-500">{errors.agent_name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Title</label>
                        <input type="text" value={data.agent_title} onChange={(e) => setData('agent_title', e.target.value)} className={inputClass} placeholder="Your San Diego Realtor" />
                    </div>
                    <div>
                        <label className={labelClass}>Tagline</label>
                        <input type="text" value={data.agent_tagline} onChange={(e) => setData('agent_tagline', e.target.value)} className={inputClass} placeholder="Your trusted real estate partner" />
                    </div>
                </div>
                <div>
                    <div className="flex items-center mb-1.5">
                        <label className={labelClass}>Bio</label>
                        <AiFieldButton field="agent_bio" websiteId={website.id} currentValue={data.agent_bio} onResult={(v) => setData('agent_bio', v)} />
                    </div>
                    <textarea value={data.agent_bio} onChange={(e) => setData('agent_bio', e.target.value)} rows={4} className={textareaClass} placeholder="Tell clients about yourself, your experience, and what sets you apart..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>City</label>
                        <input type="text" value={data.agent_city} onChange={(e) => setData('agent_city', e.target.value)} className={inputClass} placeholder="San Diego" />
                    </div>
                    <div>
                        <label className={labelClass}>State</label>
                        <Select
                            fullWidth
                            appearance="form"
                            value={data.agent_state}
                            onChange={(v) => setData('agent_state', v)}
                            placeholder="Select state"
                            options={[
                                { value: '', label: 'Select state' },
                                ...US_STATES.map((s) => ({ value: s.code, label: s.name })),
                            ]}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>License #</label>
                        <input type="text" value={data.agent_license_number} onChange={(e) => setData('agent_license_number', e.target.value)} className={inputClass} placeholder="DRE# 01234567" />
                    </div>
                    <div>
                        <label className={labelClass}>Brokerage Name</label>
                        <input type="text" value={data.brokerage_name} onChange={(e) => setData('brokerage_name', e.target.value)} className={inputClass} placeholder="Compass, Keller Williams, etc." />
                    </div>
                </div>
            </div>
        </div>
    );
}
