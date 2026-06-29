import { router, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import CrmCard from '@/Components/Crm/CrmCard';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import type { PageProps } from '@/types';
import type { Team } from '../types';
import { inputClass, labelClass, btnDanger } from '../../constants';

interface Props {
    team: Team;
    userRole: string | null;
    canManage: boolean;
    currentUserId: number;
    teamStats: { memberCount: number; activeCount: number; pendingInvitations: number };
}

interface SeatInfo {
    included: number;
    purchased: number;
    used: number;
    limit: number;
    extra_seat_price_cents: number;
}

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function SettingsTab({ team, userRole, canManage, currentUserId, teamStats }: Props) {
    const settingsForm = useForm({ name: team.name ?? '' });
    const billing = (usePage<PageProps>().props as { billing?: { seats?: SeatInfo | null } }).billing;
    const seats = billing?.seats ?? null;

    const saveSettings = (e: FormEvent) => {
        e.preventDefault();
        settingsForm.patch(route('crm.team.update', team.id), { preserveScroll: true });
    };

    const deleteTeam = () => {
        if (!confirm('Are you sure? This will remove all team members and cannot be undone.')) return;
        router.delete(route('crm.team.destroy', team.id));
    };

    const leaveTeam = () => {
        const myMember = team.members.find((m) => m.user_id === currentUserId && m.role !== 'owner');
        if (!myMember) return;
        if (!confirm('Leave this team? You will lose access to all team data.')) return;
        router.delete(route('crm.team.members.remove', myMember.id));
    };

    const [purchasedSeats, setPurchasedSeats] = useState(seats?.purchased ?? 0);
    const [savingSeats, setSavingSeats] = useState(false);
    const saveSeats = () => {
        setSavingSeats(true);
        router.post(route('crm.team.seats.update'), { purchased_seats: purchasedSeats }, {
            preserveScroll: true,
            onFinish: () => setSavingSeats(false),
        });
    };

    return (
        <div className="space-y-4 max-w-2xl">
            <CrmCard title="Team Information">
                <form onSubmit={saveSettings} className="space-y-4">
                    <div>
                        <label className={labelClass}>Team Name</label>
                        {canManage ? (
                            <input
                                type="text"
                                value={settingsForm.data.name}
                                onChange={(e) => settingsForm.setData('name', e.target.value)}
                                className={inputClass}
                            />
                        ) : (
                            <p className="text-[13px] text-[#111315] py-2">{team.name}</p>
                        )}
                        {settingsForm.errors.name && <p className="text-xs text-red-500 mt-1">{settingsForm.errors.name}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {team.created_at && (
                            <Meta label="Created" value={new Date(team.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
                        )}
                        <Meta label="Owner" value={team.members.find((m) => m.role === 'owner')?.name ?? 'Unknown'} />
                    </div>

                    {canManage && (
                        <div className="pt-1">
                            <PrimaryButton
                                type="submit"
                                label={settingsForm.processing ? 'Saving…' : 'Save Changes'}
                                disabled={settingsForm.processing || settingsForm.data.name === team.name}
                                icon={null}
                            />
                        </div>
                    )}
                </form>
            </CrmCard>

            <CrmCard title="Workspace Stats">
                <div className="grid grid-cols-3 gap-4">
                    <Meta label="Members" value={teamStats.memberCount} />
                    <Meta label="Active" value={teamStats.activeCount} valueClass="text-[#059669]" />
                    <Meta label="Pending" value={teamStats.pendingInvitations} valueClass="text-[#D97706]" />
                </div>
            </CrmCard>

            {seats && (
                <CrmCard title="Seats & Billing">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <Meta label="Seats used" value={`${seats.used} / ${seats.limit}`} />
                        <Meta label="Included" value={seats.included} />
                        <Meta label="Extra purchased" value={seats.purchased} />
                    </div>

                    {userRole === 'owner' ? (
                        <div className="border-t border-[#E4E7EB] pt-4">
                            <label className={labelClass}>
                                Extra seats {seats.extra_seat_price_cents > 0 && <>({dollars(seats.extra_seat_price_cents)}/seat / month)</>}
                            </label>
                            <p className="text-[12px] text-[#5F656D] mb-2">
                                {seats.included} seats are included in your plan. Add more to invite beyond that — billed via Stripe with proration.
                            </p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min={0}
                                    value={purchasedSeats}
                                    onChange={(e) => setPurchasedSeats(Math.max(0, Number(e.target.value) || 0))}
                                    className={`${inputClass} w-28`}
                                />
                                <PrimaryButton
                                    onClick={saveSeats}
                                    label={savingSeats ? 'Updating…' : 'Update seats'}
                                    disabled={savingSeats || purchasedSeats === seats.purchased}
                                    icon={null}
                                />
                            </div>
                        </div>
                    ) : (
                        <p className="text-[12px] text-[#5F656D] border-t border-[#E4E7EB] pt-4">
                            Only the team owner can purchase additional seats.
                        </p>
                    )}
                </CrmCard>
            )}

            <div className="border border-red-200 bg-white rounded-xl shadow-sm">
                <div className="px-5 py-3 border-b border-red-200">
                    <p className="text-sm font-semibold text-red-600">Danger Zone</p>
                </div>
                <div className="px-5 py-4 space-y-3">
                    {userRole === 'owner' ? (
                        <>
                            <p className="text-[12px] text-[#5F656D]">
                                Deleting the team will remove all members and unlink shared data. This action cannot be undone.
                            </p>
                            <button onClick={deleteTeam} className={btnDanger}>Delete Team</button>
                        </>
                    ) : (
                        <>
                            <p className="text-[12px] text-[#5F656D]">
                                Leaving the team will remove your access to all team data.
                            </p>
                            <button onClick={leaveTeam} className={btnDanger}>Leave Team</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function Meta({ label, value, valueClass = '' }: { label: string; value: React.ReactNode; valueClass?: string }) {
    return (
        <div>
            <label className={labelClass}>{label}</label>
            <p className={`text-[13px] font-medium text-[#111315] ${valueClass}`}>{value}</p>
        </div>
    );
}
