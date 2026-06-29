import { StepProps } from '../types';
import { OnboardingTeamMember } from '../types';
import StepShell from '../components/StepShell';
import { labelClass } from '../../Websites/constants';
import { onboardingInputClass } from '../constants';

const EMPTY: OnboardingTeamMember = { first_name: '', last_name: '', role: '', email: '' };

/**
 * Shown only for team sites — collects the agents to feature in the website's
 * Team section. Photos and richer details are added later in the editor. On the
 * Team plan, adding an email also sends that agent a real workspace invitation.
 */
export default function TeamStep({ data, set, page }: StepProps) {
    const members = data.team_members.length ? data.team_members : [EMPTY];
    const canInvite = page.canInviteTeam;

    function update(idx: number, key: keyof OnboardingTeamMember, value: string) {
        const next = members.map((m, i) => (i === idx ? { ...m, [key]: value } : m));
        set('team_members', next);
    }

    function add() {
        set('team_members', [...members, { ...EMPTY }]);
    }

    function remove(idx: number) {
        const next = members.filter((_, i) => i !== idx);
        set('team_members', next);
    }

    return (
        <StepShell
            title="Add your team"
            subtitle={
                canInvite
                    ? 'Add the agents on your team — they’ll appear on your website’s Team section. Add an email to also send them a workspace invitation.'
                    : 'Add the agents on your team — they’ll appear in your website’s Team section. You can add photos and more details, or add the rest, later in the editor.'
            }
            maxWidth="max-w-2xl"
        >
            <div className="space-y-3">
                {members.map((m, idx) => (
                    <div key={idx} className="rounded-xl border border-[#E4E7EB] bg-white p-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[12px] font-semibold text-[#8B9096]">Agent {idx + 1}</p>
                            {members.length > 1 && (
                                <button type="button" onClick={() => remove(idx)} className="text-[12px] font-medium text-[#DC2626] hover:text-[#B91C1C]">
                                    Remove
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                                <label className={labelClass}>First name</label>
                                <input type="text" value={m.first_name} onChange={(e) => update(idx, 'first_name', e.target.value)} className={onboardingInputClass} placeholder="Jane" />
                            </div>
                            <div>
                                <label className={labelClass}>Last name</label>
                                <input type="text" value={m.last_name} onChange={(e) => update(idx, 'last_name', e.target.value)} className={onboardingInputClass} placeholder="Doe" />
                            </div>
                            <div>
                                <label className={labelClass}>Role</label>
                                <input type="text" value={m.role} onChange={(e) => update(idx, 'role', e.target.value)} className={onboardingInputClass} placeholder="Listing Agent" />
                            </div>
                        </div>
                        {canInvite && (
                            <div className="mt-3">
                                <label className={labelClass}>Email <span className="font-normal text-[#8B9096]">(optional — sends a workspace invite)</span></label>
                                <input type="email" value={m.email} onChange={(e) => update(idx, 'email', e.target.value)} className={onboardingInputClass} placeholder="jane@brokerage.com" />
                            </div>
                        )}
                    </div>
                ))}

                <button
                    type="button"
                    onClick={add}
                    className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#1693C9] hover:text-[#1380AF] transition-colors"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Add another agent
                </button>
            </div>
        </StepShell>
    );
}
