import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Database,
    LayoutGrid,
    ListChecks,
    Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

type Featured = {
    is_active: boolean;
    result_limit: number;
    search_query: string | null;
    agent_id: string | null;
    office_id: string | null;
    mls_numbers_count: number;
};

type Connection = {
    id: number;
    display_name: string;
    mls_slug: string;
    provider: string;
    is_active: boolean;
    test_status: string | null;
};

type Mls = {
    connected: number;
    total_connections: number;
    owner_email: string | null;
    connections: Connection[];
};

type PageProps = {
    featured: Featured;
    mls: Mls;
};

const FEATURED_EDIT_URL = '/admin/idx-settings/featured-listings';

const STATUS_META: Record<
    string,
    { label: string; pill: string; dot: string }
> = {
    passed: {
        label: 'Connected',
        pill: 'bg-emerald-50 text-emerald-700',
        dot: 'bg-emerald-500',
    },
    failed: {
        label: 'Failed',
        pill: 'bg-red-50 text-red-700',
        dot: 'bg-red-500',
    },
    untested: {
        label: 'Untested',
        pill: 'bg-amber-50 text-amber-700',
        dot: 'bg-amber-500',
    },
};

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    color,
}: {
    icon: LucideIcon;
    label: string;
    value: React.ReactNode;
    sub?: string;
    color: string;
}) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500">{label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 tabular-nums">
                        {value}
                    </p>
                </div>
                <span
                    className={cn(
                        'flex size-12 shrink-0 items-center justify-center rounded-xl text-white',
                        color,
                    )}
                >
                    <Icon className="size-6" />
                </span>
            </div>
            {sub && <p className="mt-3 text-xs text-gray-400">{sub}</p>}
        </div>
    );
}

function ConfigRow({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="truncate text-sm font-medium text-gray-900">
                {children}
            </span>
        </div>
    );
}

export default function AdminDashboard({ featured, mls }: PageProps) {
    const primeOnline = mls.connected > 0;

    return (
        <>
            <Head title="Admin Dashboard" />

            <div className="space-y-6">
                {/* Stat tiles */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        icon={Star}
                        label="Featured"
                        color="bg-violet-500"
                        value={
                            <span
                                className={
                                    featured.is_active
                                        ? 'text-emerald-600'
                                        : 'text-gray-400'
                                }
                            >
                                {featured.is_active ? 'Active' : 'Inactive'}
                            </span>
                        }
                        sub={`Up to ${featured.result_limit} listings`}
                    />
                    <StatCard
                        icon={LayoutGrid}
                        label="Display Limit"
                        color="bg-blue-500"
                        value={featured.result_limit}
                        sub="Cards on public page"
                    />
                    <StatCard
                        icon={ListChecks}
                        label="Pinned MLS IDs"
                        color="bg-amber-500"
                        value={featured.mls_numbers_count}
                        sub={
                            featured.mls_numbers_count > 0
                                ? 'Hand-picked'
                                : 'Using filters'
                        }
                    />
                    <StatCard
                        icon={Database}
                        label="PrimeMLS"
                        color="bg-teal-500"
                        value={
                            <span
                                className={
                                    primeOnline
                                        ? 'text-emerald-600'
                                        : 'text-gray-400'
                                }
                            >
                                {primeOnline ? 'Connected' : 'Offline'}
                            </span>
                        }
                        sub="New Hampshire & Vermont"
                    />
                </div>

                {/* Panels */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Featured configuration */}
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                            <h2 className="text-lg font-semibold text-navy">
                                Featured Listings
                            </h2>
                            <Link
                                href={FEATURED_EDIT_URL}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-navy transition-colors hover:text-gold"
                            >
                                Manage
                                <ArrowRight className="size-4" />
                            </Link>
                        </div>
                        <div className="divide-y divide-gray-100 px-6">
                            <ConfigRow label="Status">
                                <span
                                    className={cn(
                                        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                        featured.is_active
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-gray-100 text-gray-500',
                                    )}
                                >
                                    {featured.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </ConfigRow>
                            <ConfigRow label="Search query">
                                {featured.search_query || '—'}
                            </ConfigRow>
                            <ConfigRow label="Pinned MLS IDs">
                                {featured.mls_numbers_count || '—'}
                            </ConfigRow>
                            <ConfigRow label="Agent ID">
                                {featured.agent_id || '—'}
                            </ConfigRow>
                            <ConfigRow label="Office ID">
                                {featured.office_id || '—'}
                            </ConfigRow>
                            <ConfigRow label="Result limit">
                                {featured.result_limit}
                            </ConfigRow>
                        </div>
                    </div>

                    {/* MLS connection */}
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                            <h2 className="text-lg font-semibold text-navy">
                                MLS Connection
                            </h2>
                            <span className="rounded-full bg-navy/5 px-2.5 py-0.5 text-xs font-semibold text-navy">
                                {mls.connected}/{mls.total_connections}
                            </span>
                        </div>
                        <div className="px-6 py-2">
                            {mls.connections.length === 0 ? (
                                <p className="py-8 text-center text-sm text-gray-400">
                                    No PrimeMLS connection yet.
                                </p>
                            ) : (
                                <ul className="divide-y divide-gray-100">
                                    {mls.connections.map((c) => {
                                        const meta =
                                            STATUS_META[c.test_status ?? ''] ??
                                            STATUS_META.untested;

                                        return (
                                            <li
                                                key={c.id}
                                                className="flex items-center justify-between gap-3 py-3"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span
                                                        className={cn(
                                                            'size-2 shrink-0 rounded-full',
                                                            meta.dot,
                                                        )}
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-gray-900">
                                                            {c.display_name}
                                                        </p>
                                                        <p className="truncate text-xs text-gray-400">
                                                            {c.mls_slug} ·{' '}
                                                            {c.provider}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span
                                                    className={cn(
                                                        'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                                        meta.pill,
                                                    )}
                                                >
                                                    {meta.label}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            {mls.owner_email && (
                                <p className="border-t border-gray-100 py-3 text-xs text-gray-400">
                                    Broker account: {mls.owner_email}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/admin',
    },
];

AdminDashboard.layout = { breadcrumbs };
