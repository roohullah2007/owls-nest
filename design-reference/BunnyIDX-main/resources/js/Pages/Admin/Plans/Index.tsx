import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface Plan {
    id: number;
    key: string;
    name: string;
    description: string | null;
    monthly_price: string | null;
    is_paid: boolean;
    trial_days: number;
    features: string[];
    stripe_price_id: string | null;
    sort_order: number;
    is_active: boolean;
    included_credits_cents: number;
    phone_number_limit: number | null;
    website_limit: number | null;
    email_quota_monthly: number | null;
    included_seats: number;
    extra_seat_price_cents: number;
    per_member_website_price_cents: number | null;
    extra_seat_stripe_price_id: string | null;
}

interface Props {
    plans: Plan[];
    featureCatalog: Record<string, string>;
}

const inputClass =
    'block w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-lg focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9]';

export default function AdminPlansIndex({ plans, featureCatalog }: Props) {
    const [editing, setEditing] = useState<Plan | null>(null);

    return (
        <AdminLayout active="plans" title="Admin · Plans"
            header={
                <>
                    <h1 className="text-lg font-normal text-[#111315]">Plans</h1>
                    <div className="flex-1" />
                    <p className="text-xs text-[#8B9096]">{plans.length} plans</p>
                </>
            }
        >
            <p className="text-[13px] text-[#5F656D] mb-4">
                Each plan grants the checked features to every user on it. Per-user exceptions are set from the Users page.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {plans.map((plan) => (
                    <div key={plan.id} className="bg-white border border-[#E4E7EB] rounded-xl p-5 flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-semibold text-[#111315]">{plan.name}</h3>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${plan.is_active ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#F3F4F6] text-[#8B9096]'}`}>
                                {plan.is_active ? 'Active' : 'Hidden'}
                            </span>
                        </div>
                        <p className="text-[11px] text-[#8B9096] mb-3">
                            <code className="text-[#5F656D]">{plan.key}</code> · {plan.monthly_price || '—'}
                            {plan.is_paid && plan.trial_days > 0 && <> · {plan.trial_days}-day trial</>}
                        </p>

                        <ul className="space-y-1.5 mb-4 flex-1">
                            {Object.entries(featureCatalog).map(([key, label]) => {
                                const on = plan.features.includes(key);
                                return (
                                    <li key={key} className="flex items-center gap-2 text-xs">
                                        <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${on ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#F3F4F6] text-[#C8CCD1]'}`}>
                                            {on ? '✓' : '–'}
                                        </span>
                                        <span className={on ? 'text-[#111315]' : 'text-[#C8CCD1]'}>{label}</span>
                                    </li>
                                );
                            })}
                        </ul>

                        <button
                            onClick={() => setEditing(plan)}
                            className="h-9 text-xs font-medium border border-[#E4E7EB] text-[#5F656D] hover:bg-[#F3F4F6] rounded-lg transition-colors"
                        >
                            Edit plan
                        </button>
                    </div>
                ))}
            </div>

            {editing && (
                <EditPlanModal
                    plan={editing}
                    featureCatalog={featureCatalog}
                    onClose={() => setEditing(null)}
                />
            )}
        </AdminLayout>
    );
}

function EditPlanModal({ plan, featureCatalog, onClose }: { plan: Plan; featureCatalog: Record<string, string>; onClose: () => void }) {
    const { data, setData, patch, processing, errors } = useForm({
        key: plan.key,
        name: plan.name,
        description: plan.description ?? '',
        monthly_price: plan.monthly_price ?? '',
        is_paid: plan.is_paid,
        trial_days: plan.trial_days,
        features: [...plan.features],
        stripe_price_id: plan.stripe_price_id ?? '',
        sort_order: plan.sort_order,
        is_active: plan.is_active,
        included_credits_cents: plan.included_credits_cents ?? 0,
        phone_number_limit: plan.phone_number_limit,
        website_limit: plan.website_limit,
        email_quota_monthly: plan.email_quota_monthly,
        included_seats: plan.included_seats ?? 1,
        extra_seat_price_cents: plan.extra_seat_price_cents ?? 0,
        per_member_website_price_cents: plan.per_member_website_price_cents,
        extra_seat_stripe_price_id: plan.extra_seat_stripe_price_id ?? '',
    });

    // Cents <-> dollars helpers for the money inputs (stored as cents, edited as $).
    const dollars = (cents: number | null | undefined) =>
        cents === null || cents === undefined ? '' : (cents / 100).toString();
    const toCents = (val: string) => Math.round((parseFloat(val) || 0) * 100);
    // Nullable integer "limit" inputs: empty string => null (unlimited).
    const limitVal = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));
    const toLimit = (val: string) => (val.trim() === '' ? null : Math.max(0, Math.floor(Number(val) || 0)));

    function toggleFeature(key: string) {
        setData('features', data.features.includes(key) ? data.features.filter((f) => f !== key) : [...data.features, key]);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        patch(route('admin.plans.update', plan.id), { preserveScroll: true, onSuccess: onClose });
    }

    function destroy() {
        if (!confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
        router.delete(route('admin.plans.destroy', plan.id), { onSuccess: onClose });
    }

    const builtIn = ['free', 'pro', 'enterprise'].includes(plan.key);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <form onSubmit={submit} className="p-5 space-y-4">
                    <h2 className="text-sm font-semibold text-[#111315]">Edit {plan.name}</h2>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Name</label>
                            <input value={data.name} onChange={(e) => setData('name', e.target.value)} className={inputClass} />
                            {errors.name && <p className="text-[11px] text-[#DC2626] mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Key</label>
                            <input value={data.key} onChange={(e) => setData('key', e.target.value)} disabled={builtIn} className={`${inputClass} ${builtIn ? 'bg-[#F3F4F6] text-[#8B9096]' : ''}`} />
                            {errors.key && <p className="text-[11px] text-[#DC2626] mt-1">{errors.key}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Description</label>
                        <input value={data.description} onChange={(e) => setData('description', e.target.value)} className={inputClass} />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Price</label>
                            <input value={data.monthly_price} onChange={(e) => setData('monthly_price', e.target.value)} placeholder="$29" className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Trial days</label>
                            <input type="number" min={0} value={data.trial_days} onChange={(e) => setData('trial_days', Number(e.target.value))} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Sort</label>
                            <input type="number" min={0} value={data.sort_order} onChange={(e) => setData('sort_order', Number(e.target.value))} className={inputClass} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Stripe price ID (optional)</label>
                        <input value={data.stripe_price_id} onChange={(e) => setData('stripe_price_id', e.target.value)} placeholder="price_…" className={inputClass} />
                    </div>

                    <div className="border-t border-[#E4E7EB] pt-4">
                        <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-3">LIMITS &amp; CREDITS</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Included phone credit ($/mo)</label>
                                <input type="number" min={0} step="0.01" value={dollars(data.included_credits_cents)} onChange={(e) => setData('included_credits_cents', toCents(e.target.value))} className={inputClass} />
                                {errors.included_credits_cents && <p className="text-[11px] text-[#DC2626] mt-1">{errors.included_credits_cents}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Phone numbers (blank = ∞)</label>
                                <input type="number" min={0} value={limitVal(data.phone_number_limit)} onChange={(e) => setData('phone_number_limit', toLimit(e.target.value))} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Websites (blank = ∞)</label>
                                <input type="number" min={0} value={limitVal(data.website_limit)} onChange={(e) => setData('website_limit', toLimit(e.target.value))} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Emails / user / mo (blank = ∞)</label>
                                <input type="number" min={0} value={limitVal(data.email_quota_monthly)} onChange={(e) => setData('email_quota_monthly', toLimit(e.target.value))} className={inputClass} />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[#E4E7EB] pt-4">
                        <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-3">TEAM SEATS &amp; MEMBER PRICING</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Included seats</label>
                                <input type="number" min={1} value={data.included_seats} onChange={(e) => setData('included_seats', Math.max(1, Number(e.target.value) || 1))} className={inputClass} />
                                {errors.included_seats && <p className="text-[11px] text-[#DC2626] mt-1">{errors.included_seats}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Price / extra member ($/mo)</label>
                                <input type="number" min={0} step="0.01" value={dollars(data.extra_seat_price_cents)} onChange={(e) => setData('extra_seat_price_cents', toCents(e.target.value))} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Price / member website ($/mo)</label>
                                <input type="number" min={0} step="0.01" value={dollars(data.per_member_website_price_cents)} onChange={(e) => setData('per_member_website_price_cents', e.target.value.trim() === '' ? null : toCents(e.target.value))} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Seat Stripe price ID</label>
                                <input value={data.extra_seat_stripe_price_id} onChange={(e) => setData('extra_seat_stripe_price_id', e.target.value)} placeholder="price_…" className={inputClass} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-2">Included features</label>
                        <div className="space-y-2">
                            {Object.entries(featureCatalog).map(([key, label]) => (
                                <label key={key} className="flex items-center gap-2 text-[13px] text-[#5F656D] cursor-pointer">
                                    <input type="checkbox" checked={data.features.includes(key)} onChange={() => toggleFeature(key)} className="h-4 w-4 rounded border-[#C8CCD1] text-[#1693C9] focus:ring-0" />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <label className="flex items-center gap-2 text-[13px] text-[#5F656D] cursor-pointer">
                            <input type="checkbox" checked={data.is_paid} onChange={(e) => setData('is_paid', e.target.checked)} className="h-4 w-4 rounded border-[#C8CCD1] text-[#1693C9] focus:ring-0" />
                            Paid plan
                        </label>
                        <label className="flex items-center gap-2 text-[13px] text-[#5F656D] cursor-pointer">
                            <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} className="h-4 w-4 rounded border-[#C8CCD1] text-[#1693C9] focus:ring-0" />
                            Active (shown to users)
                        </label>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        {!builtIn ? (
                            <button type="button" onClick={destroy} className="text-[12px] font-medium text-[#DC2626] hover:text-[#B91C1C]">Delete plan</button>
                        ) : <span />}
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="h-9 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315]">Cancel</button>
                            <button type="submit" disabled={processing} className="h-9 px-4 text-xs font-medium text-white bg-[#1693C9] rounded-lg hover:bg-[#1380AF] disabled:opacity-40">Save plan</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
