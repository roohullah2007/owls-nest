import AdminLayout from '@/Layouts/AdminLayout';

interface Stats {
    total_users: number;
    admin_users: number;
    active_connections: number;
    mls_providers_visible: number;
    mls_requests_pending: number;
}

interface Props {
    stats: Stats;
}

interface TileProps {
    label: string;
    value: number | string;
    hint?: string;
    accent?: string;
}

function Tile({ label, value, hint, accent = '#1693C9' }: TileProps) {
    return (
        <div className="bg-white border border-[#E4E7EB] rounded-xl p-5">
            <p className="text-[11px] font-semibold text-[#8B9096] tracking-wider">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-[#111315]" style={{ color: accent }}>{value}</p>
            {hint && <p className="text-[11px] text-[#8B9096] mt-1">{hint}</p>}
        </div>
    );
}

export default function AdminDashboard({ stats }: Props) {
    return (
        <AdminLayout active="dashboard" title="Admin Dashboard"
            header={<h1 className="text-lg font-normal text-[#111315]">Dashboard</h1>}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Tile label="Total users" value={stats.total_users} accent="#111315" />
                <Tile label="Admin users" value={stats.admin_users} accent="#7C36EE" hint="Including superadmin" />
                <Tile label="Active IDX connections" value={stats.active_connections} accent="#059669" />
                <Tile label="Visible MLS providers" value={stats.mls_providers_visible} hint="Ships in Phase 2" />
                <Tile label="Pending requests" value={stats.mls_requests_pending} hint="Ships in Phase 3" accent="#D97706" />
            </div>

            <div className="bg-white border border-[#E4E7EB] rounded-xl p-5">
                <p className="text-sm font-semibold text-[#111315] mb-2">Build status</p>
                <ul className="text-xs text-[#5F656D] space-y-1.5">
                    <li>✅ Phase 1 — Admin foundation (you're here)</li>
                    <li>⏳ Phase 2 — MLS Provider catalog</li>
                    <li>⏳ Phase 3 — Connection request workflow</li>
                    <li>⏳ Phase 4 — Hide data source from end users</li>
                    <li>⏳ Phase 5 — Per-MLS implementation (Miami Realtors first)</li>
                    <li>⏳ Phase 6 — Admin user management</li>
                    <li>⏳ Phase 7 — Reorder IDX tabs (Licenses 2nd)</li>
                </ul>
            </div>
        </AdminLayout>
    );
}
