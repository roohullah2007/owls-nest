import AdminLayout from '@/Layouts/AdminLayout';
import { DataTable, DataTableCell, DataTableHead, DataTableHeadCell, DataTableRow } from '@/Components/ui/DataTable';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface UserRow {
    id: number;
    name: string;
    email: string;
    role: string;
    subscription_tier: string | null;
    team_id: number | null;
    created_at: string;
    idx_connections_count: number;
    licenses_count: number;
    is_lifetime: boolean;
    subscription_expires_at: string | null;
    trial_plan: string | null;
    trial_ends_at: string | null;
    feature_overrides: Record<string, boolean> | null;
}

interface RoleOption { value: string; label: string }
interface PlanOption { key: string; name: string; is_paid: boolean }

interface Props {
    users: UserRow[];
    filters: { q: string | null; role: string | null };
    roleOptions: RoleOption[];
    plans: PlanOption[];
    featureCatalog: Record<string, string>;
}

const roleColors: Record<string, { bg: string; text: string }> = {
    superadmin: { bg: '#F5F3FF', text: '#7C36EE' },
    admin: { bg: '#EBF5FF', text: '#1693C9' },
    agent: { bg: '#F3F4F6', text: '#5F656D' },
};

export default function AdminUsersIndex({ users, filters, roleOptions, plans, featureCatalog }: Props) {
    const [q, setQ] = useState(filters.q || '');
    const [role, setRole] = useState(filters.role || '');
    const [managing, setManaging] = useState<UserRow | null>(null);

    function applyFilters() {
        router.get(route('admin.users'), { q: q || undefined, role: role || undefined }, { preserveState: true });
    }

    function changeRole(user: UserRow, nextRole: string) {
        if (nextRole === user.role) return;
        if (!confirm(`Change ${user.name}'s role from ${user.role} to ${nextRole}?`)) return;
        router.patch(route('admin.users.update-role', user.id), { role: nextRole }, { preserveScroll: true });
    }

    return (
        <AdminLayout active="users" title="Admin · Users"
            header={
                <>
                    <h1 className="text-lg font-normal text-[#111315]">Users</h1>
                    <div className="flex-1" />
                    <p className="text-xs text-[#8B9096]">{users.length} shown</p>
                </>
            }
        >
            {/* Filters */}
            <div className="bg-white border border-[#E4E7EB] rounded-xl p-4 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Search</label>
                    <input
                        type="text"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                        placeholder="Name or email"
                        className="block w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-lg focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9]"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Role</label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="block h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-lg focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9]"
                    >
                        {roleOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                <button onClick={applyFilters} className="h-9 px-4 text-xs font-semibold text-white bg-[#1693C9] rounded-lg hover:bg-[#1380AF]">Apply</button>
            </div>

            {/* Table */}
            {users.length === 0 ? (
                <div className="bg-white border border-dashed border-[#E4E7EB] rounded-xl px-6 py-12 text-center">
                    <p className="text-sm text-[#8B9096]">No users match.</p>
                </div>
            ) : (
                <DataTable>
                    <DataTableHead>
                        <DataTableHeadCell>User</DataTableHeadCell>
                        <DataTableHeadCell>Role</DataTableHeadCell>
                        <DataTableHeadCell>Subscription</DataTableHeadCell>
                        <DataTableHeadCell>Connections</DataTableHeadCell>
                        <DataTableHeadCell>Licenses</DataTableHeadCell>
                        <DataTableHeadCell>Joined</DataTableHeadCell>
                        <DataTableHeadCell align="right" last>Change role</DataTableHeadCell>
                    </DataTableHead>
                    <tbody>
                        {users.map((u) => {
                            const color = roleColors[u.role] || roleColors.agent;
                            return (
                                <DataTableRow key={u.id}>
                                    <DataTableCell>
                                        <p className="text-[13px] font-medium text-[#111315]">{u.name}</p>
                                        <p className="text-[10px] text-[#8B9096]">{u.email}</p>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize" style={{ backgroundColor: color.bg, color: color.text }}>
                                            {u.role}
                                        </span>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs text-[#5F656D] capitalize">{u.subscription_tier || 'free'}</span>
                                            {u.is_lifetime && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F5F3FF] text-[#7C36EE]">Lifetime</span>}
                                            {u.trial_plan && u.trial_ends_at && new Date(u.trial_ends_at) > new Date() && (
                                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#B45309]">Trial</span>
                                            )}
                                            <button onClick={() => setManaging(u)} className="text-[10px] font-medium text-[#1693C9] hover:underline">Manage</button>
                                        </div>
                                    </DataTableCell>
                                    <DataTableCell className="text-xs text-[#111315]">{u.idx_connections_count}</DataTableCell>
                                    <DataTableCell className="text-xs text-[#111315]">{u.licenses_count}</DataTableCell>
                                    <DataTableCell className="text-xs text-[#5F656D]">{new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</DataTableCell>
                                    <DataTableCell align="right" last>
                                        <select
                                            value={u.role}
                                            onChange={(e) => changeRole(u, e.target.value)}
                                            className="min-w-[110px] py-1.5 pl-2.5 pr-7 text-[11px] leading-tight border border-[#E4E7EB] rounded-md bg-white focus:outline-none focus:border-[#1693C9]"
                                        >
                                            {['agent', 'admin', 'superadmin'].map((r) => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </DataTableCell>
                                </DataTableRow>
                            );
                        })}
                    </tbody>
                </DataTable>
            )}

            {managing && (
                <SubscriptionModal
                    user={managing}
                    plans={plans}
                    featureCatalog={featureCatalog}
                    onClose={() => setManaging(null)}
                />
            )}
        </AdminLayout>
    );
}

const fieldClass =
    'block w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-lg focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9]';

function SubscriptionModal({ user, plans, featureCatalog, onClose }: { user: UserRow; plans: PlanOption[]; featureCatalog: Record<string, string>; onClose: () => void }) {
    // Per-feature override tri-state: 'default' | 'on' | 'off'.
    const initialOverrides: Record<string, 'default' | 'on' | 'off'> = {};
    Object.keys(featureCatalog).forEach((k) => {
        const ov = user.feature_overrides?.[k];
        initialOverrides[k] = ov === undefined ? 'default' : ov ? 'on' : 'off';
    });

    const { data, setData, processing } = useForm({
        subscription_tier: user.subscription_tier || 'free',
        is_lifetime: user.is_lifetime,
        subscription_expires_at: user.subscription_expires_at ? user.subscription_expires_at.slice(0, 10) : '',
        clear_trial: false,
        overrides: initialOverrides,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const feature_overrides: Record<string, boolean> = {};
        Object.entries(data.overrides).forEach(([k, v]) => {
            if (v === 'on') feature_overrides[k] = true;
            if (v === 'off') feature_overrides[k] = false;
        });
        router.patch(route('admin.users.update-subscription', user.id), {
            subscription_tier: data.subscription_tier,
            is_lifetime: data.is_lifetime,
            subscription_expires_at: data.subscription_expires_at || null,
            clear_trial: data.clear_trial,
            feature_overrides,
        }, { preserveScroll: true, onSuccess: onClose });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <form onSubmit={submit} className="p-5 space-y-4">
                    <div>
                        <h2 className="text-sm font-semibold text-[#111315]">Subscription</h2>
                        <p className="text-[11px] text-[#8B9096]">{user.name} · {user.email}</p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Plan</label>
                        <select value={data.subscription_tier} onChange={(e) => setData('subscription_tier', e.target.value)} className={fieldClass}>
                            {plans.map((p) => <option key={p.key} value={p.key}>{p.name} ({p.key})</option>)}
                        </select>
                    </div>

                    <label className="flex items-center gap-2 text-[13px] text-[#5F656D] cursor-pointer">
                        <input type="checkbox" checked={data.is_lifetime} onChange={(e) => setData('is_lifetime', e.target.checked)} className="h-4 w-4 rounded border-[#C8CCD1] text-[#1693C9] focus:ring-0" />
                        Lifetime access (never expires)
                    </label>

                    {!data.is_lifetime && (
                        <div>
                            <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Access expires (optional)</label>
                            <input type="date" value={data.subscription_expires_at} onChange={(e) => setData('subscription_expires_at', e.target.value)} className={fieldClass} />
                            <p className="text-[10px] text-[#8B9096] mt-1">Blank = no expiry. After this date the user reverts to Free.</p>
                        </div>
                    )}

                    {user.trial_plan && (
                        <label className="flex items-center gap-2 text-[13px] text-[#5F656D] cursor-pointer">
                            <input type="checkbox" checked={data.clear_trial} onChange={(e) => setData('clear_trial', e.target.checked)} className="h-4 w-4 rounded border-[#C8CCD1] text-[#1693C9] focus:ring-0" />
                            Clear active trial
                        </label>
                    )}

                    <div>
                        <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-2">Feature overrides</label>
                        <div className="space-y-2">
                            {Object.entries(featureCatalog).map(([key, label]) => (
                                <div key={key} className="flex items-center justify-between gap-2">
                                    <span className="text-[13px] text-[#5F656D]">{label}</span>
                                    <select
                                        value={data.overrides[key]}
                                        onChange={(e) => setData('overrides', { ...data.overrides, [key]: e.target.value as 'default' | 'on' | 'off' })}
                                        className="shrink-0 min-w-[124px] py-1.5 pl-2.5 pr-7 text-[11px] leading-tight border border-[#E4E7EB] rounded-md bg-white focus:outline-none focus:border-[#1693C9]"
                                    >
                                        <option value="default">Plan default</option>
                                        <option value="on">Force on</option>
                                        <option value="off">Force off</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="h-9 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315]">Cancel</button>
                        <button type="submit" disabled={processing} className="h-9 px-4 text-xs font-medium text-white bg-[#1693C9] rounded-lg hover:bg-[#1380AF] disabled:opacity-40">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
