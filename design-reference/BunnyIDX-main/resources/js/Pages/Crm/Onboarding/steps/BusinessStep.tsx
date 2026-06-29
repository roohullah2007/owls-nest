import { StepProps } from '../types';
import StepShell from '../components/StepShell';
import ChoiceCard from '../components/ChoiceCard';
import { labelClass, US_STATES } from '../../Websites/constants';
import { onboardingInputClass, COUNTRIES, CA_PROVINCES } from '../constants';

const PeopleIcon = (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
);
const PersonIcon = (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
);

/**
 * Step 2 — who the site is for (single-agent vs team), the starting design, and
 * the agent's identity (prefilled from their profile). No business description:
 * copy is generated/edited later in the editor.
 */
export default function BusinessStep({ data, set, errors }: StepProps) {
    // State codes differ between US and CA, so clear the selection when country flips.
    function pickCountry(code: string) {
        set('agent_country', code);
        set('agent_state', '');
    }

    const isCanada = data.agent_country === 'CA';
    const regions = isCanada ? CA_PROVINCES : US_STATES;
    const regionLabel = isCanada ? 'Province' : 'State';

    return (
        <StepShell
            title="Set up your website"
            subtitle="Tell us who this site is for. We’ve prefilled what we can from your profile — change anything you like."
            maxWidth="max-w-2xl"
        >
            <div className="space-y-7">
                {/* Single-agent vs team */}
                <div>
                    <p className="text-[13px] font-semibold text-[#111315] mb-3">Who is this website for?</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <ChoiceCard
                            selected={data.site_type === 'agent'}
                            onClick={() => set('site_type', 'agent')}
                            title="Single agent"
                            description="A personal website focusing on you as a realtor."
                            icon={PersonIcon}
                        />
                        <ChoiceCard
                            selected={data.site_type === 'team'}
                            onClick={() => set('site_type', 'team')}
                            title="Team"
                            description="Suited for a team/brokerage with several agents."
                            icon={PeopleIcon}
                        />
                    </div>
                </div>

                {/* Identity — prefilled from profile */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label className={labelClass}>Your name *</label>
                        <input type="text" value={data.agent_name} onChange={(e) => set('agent_name', e.target.value)} className={onboardingInputClass} placeholder="Nichole Johnson" />
                        {errors.agent_name && <p className="mt-1 text-[11px] text-red-500">{errors.agent_name}</p>}
                    </div>
                    <div>
                        <label className={labelClass}>Brokerage *</label>
                        <input type="text" value={data.brokerage_name} onChange={(e) => set('brokerage_name', e.target.value)} className={onboardingInputClass} placeholder="Compass, Keller Williams…" />
                        {errors.brokerage_name && <p className="mt-1 text-[11px] text-red-500">{errors.brokerage_name}</p>}
                    </div>
                    <div>
                        <label className={labelClass}>Country *</label>
                        <select value={data.agent_country} onChange={(e) => pickCountry(e.target.value)} className={onboardingInputClass}>
                            {COUNTRIES.map((c) => (
                                <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>City *</label>
                        <input type="text" value={data.agent_city} onChange={(e) => set('agent_city', e.target.value)} className={onboardingInputClass} placeholder="Miami" />
                        {errors.agent_city && <p className="mt-1 text-[11px] text-red-500">{errors.agent_city}</p>}
                    </div>
                    <div>
                        <label className={labelClass}>{regionLabel}</label>
                        <select value={data.agent_state} onChange={(e) => set('agent_state', e.target.value)} className={onboardingInputClass}>
                            <option value="">Select a {regionLabel.toLowerCase()}</option>
                            {regions.map((s) => (
                                <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </StepShell>
    );
}
