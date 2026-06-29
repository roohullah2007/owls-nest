import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { AreaCodePrice } from '../Index';

interface Props {
    areaCodePrices: AreaCodePrice[];
    defaultPrice: string | null;
}

const inputClass =
    'block w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-lg focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9]';

const money = (value: string) => `$${Number(value || 0).toFixed(2)}/mo`;

export default function PhonePricingPane({ areaCodePrices, defaultPrice }: Props) {
    const [editing, setEditing] = useState<AreaCodePrice | null>(null);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-normal text-[#111315]">Phone Pricing</h1>
                <p className="text-[13px] text-[#5F656D] mt-1 max-w-2xl">
                    Set the monthly price users see and pay when they provision a phone number. The default applies to
                    every area code; add a specific area code to override it. Anything left unset uses the upstream Telnyx cost.
                </p>
            </div>

            {/* Default — applies to ALL area codes */}
            <DefaultPriceCard defaultPrice={defaultPrice} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                {/* Add a per-area-code override */}
                <AddPriceForm />

                {/* Existing per-area-code overrides */}
                <div className="lg:col-span-2 bg-white border border-[#E4E7EB] rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-[#111315] mb-1">Per-area-code prices</h3>
                    <p className="text-xs text-[#5F656D] mb-4">These override the default for the listed area codes only.</p>

                    {areaCodePrices.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-[#E4E7EB] rounded-lg">
                            <p className="text-xs text-[#8B9096]">No per-area-code overrides. The default price above is used everywhere.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {areaCodePrices.map((price) => (
                                <div
                                    key={price.id}
                                    className="flex items-center justify-between gap-3 p-3 border border-[#E4E7EB] rounded-lg"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="inline-flex h-9 w-12 items-center justify-center rounded-md bg-[#E6F0FF] text-[13px] font-semibold text-[#1693C9]">
                                            {price.area_code}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-medium text-[#111315] truncate">
                                                {money(price.monthly_price)}
                                                {!price.is_active && (
                                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F3F4F6] text-[#8B9096]">
                                                        Inactive
                                                    </span>
                                                )}
                                            </p>
                                            {price.label && <p className="text-[11px] text-[#5F656D] truncate">{price.label}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => setEditing(price)}
                                            className="px-2.5 py-1 text-[11px] font-medium text-[#5F656D] border border-[#E4E7EB] rounded-md hover:bg-[#F9FAFB] transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <DeleteButton price={price} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {editing && <EditModal price={editing} onClose={() => setEditing(null)} />}
        </div>
    );
}

function DefaultPriceCard({ defaultPrice }: { defaultPrice: string | null }) {
    const form = useForm({ monthly_price: defaultPrice ?? '' });

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('admin.settings.area-code-pricing.default'), { preserveScroll: true });
    };

    const clear = () => {
        if (!confirm('Clear the default price? Area codes without a specific override will use the Telnyx cost.')) return;
        router.post(route('admin.settings.area-code-pricing.default'), { monthly_price: '' }, {
            preserveScroll: true,
            onSuccess: () => form.setData('monthly_price', ''),
        });
    };

    return (
        <form onSubmit={save} className="bg-white border border-[#E4E7EB] rounded-xl p-6">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-[#111315]">Default price — all area codes</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ECFDF5] text-[#047857]">
                    Applies everywhere
                </span>
            </div>
            <p className="text-xs text-[#5F656D] mb-4">
                One price for every area code. Leave empty (or clear) to fall back to the live Telnyx cost.
            </p>

            <div className="flex items-end gap-2">
                <div className="flex-1 max-w-xs">
                    <label className="block text-[11px] font-medium text-[#5F656D] mb-1">Monthly price (USD)</label>
                    <input
                        value={form.data.monthly_price}
                        onChange={(e) => form.setData('monthly_price', e.target.value.replace(/[^\d.]/g, ''))}
                        placeholder="e.g. 5.00"
                        inputMode="decimal"
                        className={inputClass}
                    />
                </div>
                <button
                    type="submit"
                    disabled={form.processing || !form.data.monthly_price}
                    className="h-9 px-4 bg-[#1693C9] text-white text-xs font-medium rounded-lg hover:bg-[#1380AF] disabled:opacity-50 transition-colors"
                >
                    {form.processing ? 'Saving…' : 'Save default'}
                </button>
                {defaultPrice !== null && (
                    <button
                        type="button"
                        onClick={clear}
                        className="h-9 px-4 text-xs font-medium text-[#DC2626] border border-[#FEE2E2] rounded-lg hover:bg-[#FEF2F2] transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>
            {form.errors.monthly_price && <p className="text-[11px] text-[#DC2626] mt-2">{form.errors.monthly_price}</p>}
        </form>
    );
}

function AddPriceForm() {
    const form = useForm({
        area_code: '',
        label: '',
        monthly_price: '',
        is_active: true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('admin.settings.area-code-pricing.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <form onSubmit={submit} className="bg-white border border-[#E4E7EB] rounded-xl p-6 space-y-3">
            <h3 className="text-sm font-semibold text-[#111315] mb-1">Add area-code override</h3>

            <div>
                <label className="block text-[11px] font-medium text-[#5F656D] mb-1">Area code</label>
                <input
                    value={form.data.area_code}
                    onChange={(e) => form.setData('area_code', e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="e.g. 305"
                    inputMode="numeric"
                    maxLength={3}
                    className={inputClass}
                />
                {form.errors.area_code && <p className="text-[11px] text-[#DC2626] mt-1">{form.errors.area_code}</p>}
            </div>

            <div>
                <label className="block text-[11px] font-medium text-[#5F656D] mb-1">Monthly price (USD)</label>
                <input
                    value={form.data.monthly_price}
                    onChange={(e) => form.setData('monthly_price', e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="e.g. 5.00"
                    inputMode="decimal"
                    className={inputClass}
                />
                {form.errors.monthly_price && <p className="text-[11px] text-[#DC2626] mt-1">{form.errors.monthly_price}</p>}
            </div>

            <div>
                <label className="block text-[11px] font-medium text-[#5F656D] mb-1">Label (optional)</label>
                <input
                    value={form.data.label}
                    onChange={(e) => form.setData('label', e.target.value)}
                    placeholder="e.g. Miami, FL"
                    className={inputClass}
                />
                {form.errors.label && <p className="text-[11px] text-[#DC2626] mt-1">{form.errors.label}</p>}
            </div>

            <label className="flex items-center gap-2 text-[12px] text-[#5F656D]">
                <input
                    type="checkbox"
                    checked={form.data.is_active}
                    onChange={(e) => form.setData('is_active', e.target.checked)}
                    className="h-4 w-4 rounded border-[#E4E7EB] text-[#1693C9] focus:ring-[#1693C9]"
                />
                Active
            </label>

            <button
                type="submit"
                disabled={form.processing || form.data.area_code.length !== 3 || !form.data.monthly_price}
                className="w-full h-9 bg-[#1693C9] text-white text-xs font-medium rounded-lg hover:bg-[#1380AF] disabled:opacity-50 transition-colors"
            >
                {form.processing ? 'Saving…' : 'Add override'}
            </button>
        </form>
    );
}

function DeleteButton({ price }: { price: AreaCodePrice }) {
    const [deleting, setDeleting] = useState(false);

    const remove = () => {
        if (!confirm(`Remove the price for area code ${price.area_code}?`)) return;
        setDeleting(true);
        router.delete(route('admin.settings.area-code-pricing.destroy', price.id), {
            preserveScroll: true,
            onFinish: () => setDeleting(false),
        });
    };

    return (
        <button
            onClick={remove}
            disabled={deleting}
            className="px-2.5 py-1 text-[11px] font-medium text-[#DC2626] border border-[#FEE2E2] rounded-md hover:bg-[#FEF2F2] disabled:opacity-50 transition-colors"
        >
            {deleting ? 'Removing…' : 'Remove'}
        </button>
    );
}

function EditModal({ price, onClose }: { price: AreaCodePrice; onClose: () => void }) {
    const form = useForm({
        area_code: price.area_code,
        label: price.label ?? '',
        monthly_price: price.monthly_price,
        is_active: price.is_active,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.patch(route('admin.settings.area-code-pricing.update', price.id), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <form
                onClick={(e) => e.stopPropagation()}
                onSubmit={submit}
                className="w-full max-w-md bg-white rounded-xl p-6 space-y-3 shadow-xl"
            >
                <h3 className="text-sm font-semibold text-[#111315]">Edit area-code price</h3>

                <div>
                    <label className="block text-[11px] font-medium text-[#5F656D] mb-1">Area code</label>
                    <input
                        value={form.data.area_code}
                        onChange={(e) => form.setData('area_code', e.target.value.replace(/\D/g, '').slice(0, 3))}
                        maxLength={3}
                        inputMode="numeric"
                        className={inputClass}
                    />
                    {form.errors.area_code && <p className="text-[11px] text-[#DC2626] mt-1">{form.errors.area_code}</p>}
                </div>

                <div>
                    <label className="block text-[11px] font-medium text-[#5F656D] mb-1">Monthly price (USD)</label>
                    <input
                        value={form.data.monthly_price}
                        onChange={(e) => form.setData('monthly_price', e.target.value.replace(/[^\d.]/g, ''))}
                        inputMode="decimal"
                        className={inputClass}
                    />
                    {form.errors.monthly_price && <p className="text-[11px] text-[#DC2626] mt-1">{form.errors.monthly_price}</p>}
                </div>

                <div>
                    <label className="block text-[11px] font-medium text-[#5F656D] mb-1">Label (optional)</label>
                    <input
                        value={form.data.label}
                        onChange={(e) => form.setData('label', e.target.value)}
                        className={inputClass}
                    />
                </div>

                <label className="flex items-center gap-2 text-[12px] text-[#5F656D]">
                    <input
                        type="checkbox"
                        checked={form.data.is_active}
                        onChange={(e) => form.setData('is_active', e.target.checked)}
                        className="h-4 w-4 rounded border-[#E4E7EB] text-[#1693C9] focus:ring-[#1693C9]"
                    />
                    Active
                </label>

                <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-9 px-4 text-xs font-medium text-[#5F656D] border border-[#E4E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="h-9 px-4 bg-[#1693C9] text-white text-xs font-medium rounded-lg hover:bg-[#1380AF] disabled:opacity-50 transition-colors"
                    >
                        {form.processing ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}
