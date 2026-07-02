// Admin Panel → Leads. The CRM view: every public form submission is a lead.
// Filter by form type and pipeline status, then open a lead to see the full
// contact, move it through the pipeline, jot internal notes, and mark read.
import { Head, Link, router } from '@inertiajs/react';
import { Inbox, Mail, MailOpen, MapPin, Phone, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

type Lead = {
    id: number;
    type: string;
    type_label: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    message: string | null;
    data: Record<string, unknown> | null;
    source_url: string | null;
    status: string;
    status_label: string;
    notes: string | null;
    is_read: boolean;
    created_at: string | null;
    created_human: string | null;
};

type PageProps = {
    leads: Lead[];
    filterType: string | null;
    filterStatus: string | null;
    types: Record<string, string>;
    statuses: Record<string, string>;
    counts: {
        all: number;
        unread: number;
        by_type: Record<string, number>;
        by_status: Record<string, number>;
    };
};

const TYPE_PILL: Record<string, string> = {
    contact: 'bg-blue-50 text-blue-700',
    valuation: 'bg-emerald-50 text-emerald-700',
    showing: 'bg-violet-50 text-violet-700',
    buyer: 'bg-sky-50 text-sky-700',
    seller: 'bg-amber-50 text-amber-700',
    newsletter: 'bg-gray-100 text-gray-600',
};

const STATUS_PILL: Record<string, string> = {
    new: 'bg-gold/15 text-golddk',
    contacted: 'bg-blue-50 text-blue-700',
    qualified: 'bg-violet-50 text-violet-700',
    won: 'bg-emerald-50 text-emerald-700',
    lost: 'bg-rose-50 text-rose-700',
};

function typePill(type: string): string {
    return TYPE_PILL[type] ?? 'bg-gray-100 text-gray-600';
}

function statusPill(status: string): string {
    return STATUS_PILL[status] ?? 'bg-gray-100 text-gray-600';
}

/** Extra `data` fields worth showing in the detail dialog (skip internal flags). */
function extraFields(data: Record<string, unknown> | null): [string, string][] {
    if (!data) {
        return [];
    }

    return Object.entries(data)
        .filter(([key]) => key !== 'address' && key !== 'consent')
        .map(([key, value]): [string, string] => [key, String(value)]);
}

/**
 * Body of the detail dialog. Rendered with `key={lead.id}` so it remounts per
 * lead — that resets the notes draft without a syncing effect.
 */
function LeadDetail({
    lead,
    statuses,
    onStatus,
    onSaveNotes,
    onToggleRead,
    onDelete,
}: {
    lead: Lead;
    statuses: Record<string, string>;
    onStatus: (status: string) => void;
    onSaveNotes: (notes: string) => void;
    onToggleRead: () => void;
    onDelete: () => void;
}) {
    const [notesDraft, setNotesDraft] = useState(lead.notes ?? '');
    const fields = extraFields(lead.data);

    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className={typePill(lead.type)}>
                        {lead.type_label}
                    </Badge>
                    {lead.name || 'Anonymous'}
                </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm">
                {/* Contact */}
                <div className="space-y-2">
                    {lead.email && (
                        <div className="flex items-center gap-2 text-gray-700">
                            <Mail className="size-4 text-gray-400" />
                            <a
                                href={`mailto:${lead.email}`}
                                className="text-navy hover:underline"
                            >
                                {lead.email}
                            </a>
                        </div>
                    )}
                    {lead.phone && (
                        <div className="flex items-center gap-2 text-gray-700">
                            <Phone className="size-4 text-gray-400" />
                            <a
                                href={`tel:${lead.phone}`}
                                className="text-navy hover:underline"
                            >
                                {lead.phone}
                            </a>
                        </div>
                    )}
                    {typeof lead.data?.address === 'string' && (
                        <div className="flex items-center gap-2 text-gray-700">
                            <MapPin className="size-4 text-gray-400" />
                            {lead.data.address}
                        </div>
                    )}
                </div>

                {lead.message && (
                    <div className="rounded-lg bg-gray-50 p-3 whitespace-pre-wrap text-gray-700">
                        {lead.message}
                    </div>
                )}

                {fields.length > 0 && (
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                        {fields.map(([key, value]) => (
                            <div
                                key={key}
                                className="col-span-2 grid grid-cols-subgrid"
                            >
                                <dt className="text-gray-400 capitalize">
                                    {key.replace(/_/g, ' ')}
                                </dt>
                                <dd className="text-gray-700">{value}</dd>
                            </div>
                        ))}
                    </dl>
                )}

                {/* Pipeline status */}
                <div className="space-y-1.5">
                    <span className="block text-xs font-semibold text-gray-500 uppercase">
                        Pipeline status
                    </span>
                    <Select value={lead.status} onValueChange={onStatus}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(statuses).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Internal notes */}
                <div className="space-y-1.5">
                    <label
                        htmlFor="lead-notes"
                        className="block text-xs font-semibold text-gray-500 uppercase"
                    >
                        Internal notes
                    </label>
                    <Textarea
                        id="lead-notes"
                        rows={4}
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="Add a private note about this lead…"
                    />
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => onSaveNotes(notesDraft)}
                            disabled={notesDraft === (lead.notes ?? '')}
                        >
                            Save notes
                        </Button>
                    </div>
                </div>

                <p className="text-xs text-gray-400">
                    Received {lead.created_human}
                    {lead.source_url ? ` · from ${lead.source_url}` : ''}
                </p>
            </div>

            <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                    <Trash2 className="size-4" />
                    Delete
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onToggleRead}
                >
                    {lead.is_read ? (
                        <>
                            <Mail className="size-4" />
                            Mark unread
                        </>
                    ) : (
                        <>
                            <MailOpen className="size-4" />
                            Mark read
                        </>
                    )}
                </Button>
            </DialogFooter>
        </>
    );
}

export default function AdminLeads({
    leads,
    filterType,
    filterStatus,
    types,
    statuses,
    counts,
}: PageProps) {
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const selected = leads.find((l) => l.id === selectedId) ?? null;

    function buildUrl(next: {
        type?: string | null;
        status?: string | null;
    }): string {
        const params = new URLSearchParams();
        const type = next.type !== undefined ? next.type : filterType;
        const status = next.status !== undefined ? next.status : filterStatus;

        if (type) {
            params.set('type', type);
        }

        if (status) {
            params.set('status', status);
        }

        const qs = params.toString();

        return qs ? `/admin/leads?${qs}` : '/admin/leads';
    }

    function open(lead: Lead) {
        setSelectedId(lead.id);

        if (!lead.is_read) {
            patchRead(lead.id);
        }
    }

    function patchRead(id: number) {
        router.patch(
            `/admin/leads/${id}/read`,
            {},
            { preserveScroll: true, preserveState: true },
        );
    }

    function changeStatus(id: number, status: string) {
        router.patch(
            `/admin/leads/${id}/status`,
            { status },
            { preserveScroll: true, preserveState: true },
        );
    }

    function saveNotes(id: number, notes: string) {
        router.patch(
            `/admin/leads/${id}/notes`,
            { notes },
            { preserveScroll: true, preserveState: true },
        );
    }

    function remove(id: number) {
        router.delete(`/admin/leads/${id}`, {
            preserveScroll: true,
            preserveState: false,
        });
        setSelectedId(null);
    }

    const typeTabs: { key: string | null; label: string; count: number }[] = [
        { key: null, label: 'All', count: counts.all },
        ...Object.entries(types)
            .filter(([key]) => (counts.by_type[key] ?? 0) > 0)
            .map(([key, label]) => ({
                key,
                label,
                count: counts.by_type[key] ?? 0,
            })),
    ];

    const statusTabs: { key: string | null; label: string; count: number }[] = [
        { key: null, label: 'Any status', count: counts.all },
        ...Object.entries(statuses).map(([key, label]) => ({
            key,
            label,
            count: counts.by_status[key] ?? 0,
        })),
    ];

    return (
        <>
            <Head title="Leads" />

            <div className="space-y-6">
                {/* Header + unread summary */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-gray-500">
                        Every enquiry submitted through the public site becomes a
                        lead here — track it through your pipeline.
                    </p>
                    <span
                        className={cn(
                            'rounded-full px-3 py-1 text-xs font-semibold',
                            counts.unread > 0
                                ? 'bg-gold/15 text-golddk'
                                : 'bg-gray-100 text-gray-500',
                        )}
                    >
                        {counts.unread} unread
                    </span>
                </div>

                {/* Filter: by form type */}
                <div className="flex flex-wrap gap-2">
                    {typeTabs.map((tab) => {
                        const active = (filterType ?? null) === tab.key;

                        return (
                            <Link
                                key={tab.key ?? 'all'}
                                href={buildUrl({ type: tab.key })}
                                preserveScroll
                                className={cn(
                                    'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                                    active
                                        ? 'border-navy bg-navy text-white'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400',
                                )}
                            >
                                {tab.label}
                                <span
                                    className={cn(
                                        'rounded-full px-1.5 py-0.5 text-xs tabular-nums',
                                        active
                                            ? 'bg-white/20'
                                            : 'bg-gray-100 text-gray-500',
                                    )}
                                >
                                    {tab.count}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* Filter: by pipeline status */}
                <div className="flex flex-wrap gap-2">
                    {statusTabs.map((tab) => {
                        const active = (filterStatus ?? null) === tab.key;

                        return (
                            <Link
                                key={tab.key ?? 'any'}
                                href={buildUrl({ status: tab.key })}
                                preserveScroll
                                className={cn(
                                    'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                                    active
                                        ? 'ring-2 ring-navy ring-offset-1'
                                        : 'opacity-80 hover:opacity-100',
                                    tab.key
                                        ? statusPill(tab.key)
                                        : 'bg-gray-100 text-gray-600',
                                )}
                            >
                                {tab.label}
                                <span className="tabular-nums opacity-70">
                                    {tab.count}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* List */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                    {leads.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-20 text-center">
                            <span className="flex size-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                                <Inbox className="size-6" />
                            </span>
                            <p className="text-sm text-gray-400">
                                No leads match this filter.
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {leads.map((lead) => (
                                <li key={lead.id}>
                                    <button
                                        type="button"
                                        onClick={() => open(lead)}
                                        className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50"
                                    >
                                        <span
                                            className={cn(
                                                'mt-1.5 size-2 shrink-0 rounded-full',
                                                lead.is_read
                                                    ? 'bg-transparent'
                                                    : 'bg-gold',
                                            )}
                                            aria-hidden
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge
                                                    variant="secondary"
                                                    className={typePill(
                                                        lead.type,
                                                    )}
                                                >
                                                    {lead.type_label}
                                                </Badge>
                                                <Badge
                                                    variant="secondary"
                                                    className={statusPill(
                                                        lead.status,
                                                    )}
                                                >
                                                    {lead.status_label}
                                                </Badge>
                                                <span
                                                    className={cn(
                                                        'truncate text-sm text-gray-900',
                                                        !lead.is_read &&
                                                            'font-semibold',
                                                    )}
                                                >
                                                    {lead.name || 'Anonymous'}
                                                </span>
                                            </div>
                                            <p className="mt-1 truncate text-sm text-gray-500">
                                                {lead.message ||
                                                    lead.email ||
                                                    '—'}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-xs whitespace-nowrap text-gray-400">
                                            {lead.created_human}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Detail dialog */}
            <Dialog
                open={selected !== null}
                onOpenChange={(o) => !o && setSelectedId(null)}
            >
                <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                    {selected && (
                        <LeadDetail
                            key={selected.id}
                            lead={selected}
                            statuses={statuses}
                            onStatus={(status) =>
                                changeStatus(selected.id, status)
                            }
                            onSaveNotes={(notes) =>
                                saveNotes(selected.id, notes)
                            }
                            onToggleRead={() => patchRead(selected.id)}
                            onDelete={() => remove(selected.id)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Leads', href: '/admin/leads' }];

AdminLeads.layout = { breadcrumbs };
