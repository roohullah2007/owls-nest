import { router } from '@inertiajs/react';
import type { PlanRow } from '../Index';

interface Subscription {
    tier: string;
    effective_tier: string;
    is_lifetime: boolean;
    trialing: boolean;
    trial_plan: string | null;
    trial_ends_at: string | null;
    trial_days_remaining: number;
    trial_used: boolean;
    stripe_configured: boolean;
    has_billing_account: boolean;
}

interface Props {
    subscription: Subscription;
    plans: PlanRow[];
    featureCatalog: Record<string, string>;
}

const tierRank: Record<string, number> = { free: 0, pro: 1, enterprise: 2 };

export default function SubscriptionTab({ subscription, plans, featureCatalog }: Props) {
    const effective = subscription.effective_tier;

    function handleCheckout(plan: string) {
        router.post(route('crm.subscription.checkout'), { plan });
    }
    function handlePortal() {
        router.post(route('crm.subscription.portal'));
    }
    function handleStartTrial(plan: string) {
        router.post(route('crm.subscription.start-trial'), { plan });
    }

    const currentPlan = plans.find((p) => p.key === effective);

    return (
        <div className="max-w-3xl mx-auto">
            {/* Current plan / status banner */}
            <div className="bg-white border border-[#E4E7EB] rounded-xl px-6 py-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-[#E6F0FF] flex items-center justify-center">
                        <svg className="h-5 w-5 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
                    </div>
                    <div>
                        <p className="text-[11px] text-[#8B9096] tracking-wider font-medium">Current Plan</p>
                        <p className="text-sm font-semibold text-[#111315] flex items-center gap-2">
                            {currentPlan?.name ?? effective}
                            {subscription.is_lifetime && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F3FF] text-[#7C36EE]">Lifetime</span>}
                            {subscription.trialing && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#B45309]">Trial · {subscription.trial_days_remaining}d left</span>}
                        </p>
                    </div>
                </div>
                {subscription.stripe_configured && subscription.has_billing_account && !subscription.is_lifetime && (
                    <button onClick={handlePortal} className="h-8 px-4 text-xs font-medium border border-[#E4E7EB] text-[#5F656D] hover:bg-[#F3F4F6] rounded-lg transition-colors">
                        Manage Billing
                    </button>
                )}
            </div>

            {subscription.trialing && (
                <div className="mb-6 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[12px] text-[#92400E]">
                    You're trialing the {plans.find((p) => p.key === subscription.trial_plan)?.name ?? subscription.trial_plan} plan.
                    It ends in {subscription.trial_days_remaining} day{subscription.trial_days_remaining === 1 ? '' : 's'}. Upgrade any time to keep these features.
                </div>
            )}

            {/* Plan cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {plans.map((plan) => {
                    const isCurrent = effective === plan.key;
                    const rank = tierRank[plan.key] ?? 99;
                    const currentRank = tierRank[effective] ?? 0;
                    const isUpgrade = plan.is_paid && rank > currentRank;
                    // Self-serve trial is offered for a paid plan the user is above-free-eligible
                    // for, hasn't used a trial, and isn't already on a paid/lifetime plan.
                    const canTrial = plan.is_paid && plan.trial_days > 0 && !subscription.trial_used
                        && !subscription.is_lifetime && effective === 'free' && !subscription.trialing;

                    return (
                        <div key={plan.key} className={`relative bg-white border rounded-xl p-5 flex flex-col ${isCurrent ? 'border-[#1693C9] ring-1 ring-[#1693C9]/20' : 'border-[#E4E7EB]'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-semibold text-[#111315]">{plan.name}</h4>
                                {isCurrent && <span className="text-[10px] font-medium bg-[#E6F0FF] text-[#1693C9] px-1.5 py-0.5 rounded-full">Current</span>}
                            </div>
                            <p className="text-[11px] text-[#8B9096] mb-4 min-h-[28px]">{plan.description}</p>

                            <div className="mb-5">
                                <span className="text-2xl font-bold text-[#111315]">{plan.monthly_price || '$0'}</span>
                                <span className="text-xs text-[#5F656D]">/month</span>
                            </div>

                            <ul className="space-y-2.5 mb-5 flex-1">
                                {Object.entries(featureCatalog).map(([key, label]) => {
                                    const on = plan.features.includes(key);
                                    return (
                                        <li key={key} className={`flex items-start gap-2 text-xs ${on ? 'text-[#5F656D]' : 'text-[#C8CCD1] line-through'}`}>
                                            <svg className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${on ? 'text-[#059669]' : 'text-[#D1D5DB]'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                            </svg>
                                            {label}
                                        </li>
                                    );
                                })}
                            </ul>

                            {isCurrent ? (
                                <div className="h-9 flex items-center justify-center text-xs font-medium text-[#8B9096] border border-[#E4E7EB] rounded-lg">Current Plan</div>
                            ) : !plan.is_paid ? (
                                <div className="h-9" />
                            ) : !subscription.stripe_configured ? (
                                <div className="h-9 flex items-center justify-center text-[11px] text-[#8B9096] border border-[#E4E7EB] rounded-lg">Stripe not configured</div>
                            ) : (
                                <div className="space-y-2">
                                    <button
                                        onClick={() => handleCheckout(plan.key)}
                                        className={`w-full h-9 text-xs font-medium rounded-lg transition-colors ${isUpgrade ? 'bg-[#1693C9] text-white hover:bg-[#1380AF]' : 'border border-[#E4E7EB] text-[#5F656D] hover:bg-[#F3F4F6]'}`}
                                    >
                                        {isUpgrade ? 'Upgrade' : 'Switch'}
                                    </button>
                                    {canTrial && (
                                        <button
                                            onClick={() => handleStartTrial(plan.key)}
                                            className="w-full h-9 text-xs font-medium rounded-lg border border-[#1693C9] text-[#1693C9] hover:bg-[#E6F0FF] transition-colors"
                                        >
                                            Start {plan.trial_days}-day free trial
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
