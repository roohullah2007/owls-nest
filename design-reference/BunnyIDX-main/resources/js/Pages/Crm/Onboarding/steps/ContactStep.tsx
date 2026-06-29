import { StepProps } from '../types';
import StepShell from '../components/StepShell';
import { labelClass } from '../../Websites/constants';
import { onboardingInputClass } from '../constants';

/**
 * Contact details shown on the public website so clients can reach the agent.
 * Email + phone prefill from the user's profile; address is optional.
 */
export default function ContactStep({ data, set }: StepProps) {
    return (
        <StepShell
            title="How can clients reach you?"
            subtitle="These contact details appear on your website. We’ve prefilled what’s on your profile — edit anything, and leave blank what you’d rather not show. You can always change these or add the ones you skip later in the editor."
            maxWidth="max-w-2xl"
        >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" value={data.agent_email} onChange={(e) => set('agent_email', e.target.value)} className={onboardingInputClass} placeholder="agent@example.com" />
                </div>
                <div>
                    <label className={labelClass}>Phone</label>
                    <input type="text" value={data.agent_phone} onChange={(e) => set('agent_phone', e.target.value)} className={onboardingInputClass} placeholder="(555) 123-4567" />
                </div>
                <div>
                    <label className={labelClass}>WhatsApp <span className="text-[#8B9096]">(optional)</span></label>
                    <input type="text" value={data.agent_whatsapp} onChange={(e) => set('agent_whatsapp', e.target.value)} className={onboardingInputClass} placeholder="(555) 123-4567" />
                </div>
                <div>
                    <label className={labelClass}>Office address <span className="text-[#8B9096]">(optional)</span></label>
                    <input type="text" value={data.office_address} onChange={(e) => set('office_address', e.target.value)} className={onboardingInputClass} placeholder="123 Main St, Miami, FL" />
                </div>
            </div>
        </StepShell>
    );
}
