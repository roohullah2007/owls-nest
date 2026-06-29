import CrmLayout from '@/Layouts/CrmLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { apiDelete } from '@/utils/api';

/**
 * Power Dialer sessions index — past + active sessions for the current user.
 * Resume button jumps back into an active/paused session.
 */

interface SessionListItem {
    id: number;
    name: string | null;
    status: 'active' | 'paused' | 'completed' | 'abandoned';
    total_contacts: number;
    stats: {
        attempted: number;
        connected: number;
        voicemail: number;
        no_answer: number;
        dnc: number;
        callbacks: number;
        skipped: number;
    };
    started_at: string | null;
    ended_at: string | null;
    created_at: string;
}

interface Props {
    sessions: SessionListItem[];
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function statusBadge(status: SessionListItem['status']): { label: string; cls: string } {
    const m: Record<SessionListItem['status'], { label: string; cls: string }> = {
        active:    { label: 'Active',    cls: 'bg-[#ECFDF5] text-[#047857]' },
        paused:    { label: 'Paused',    cls: 'bg-[#FFFBEB] text-[#B45309]' },
        completed: { label: 'Completed', cls: 'bg-[#EBF5FF] text-[#1693C9]' },
        abandoned: { label: 'Abandoned', cls: 'bg-[#F3F4F6] text-[#5F656D]' },
    };
    return m[status];
}

export default function DialerSessionsIndex({ sessions }: Props) {
    const [deleting, setDeleting] = useState<number | null>(null);
    const active = sessions.filter((s) => s.status === 'active' || s.status === 'paused');
    const past = sessions.filter((s) => s.status === 'completed' || s.status === 'abandoned');

    async function handleDelete(id: number, name: string | null) {
        if (!confirm(`Delete "${name ?? `Session #${id}`}"? This removes the session and its call history. This can't be undone.`)) return;
        setDeleting(id);
        try {
            await apiDelete(route('crm.dialer.sessions.destroy', { dialerSession: id }));
            // Reload the page data — Inertia partial reload keeps scroll position.
            router.reload({ only: ['sessions'] });
        } catch (e: any) {
            alert(e?.message ?? 'Failed to delete session.');
        } finally {
            setDeleting(null);
        }
    }

    return (
        <CrmLayout>
            <Head title="Power Dialer Sessions" />
            <div className="min-h-[calc(100vh-56px)] bg-[#F2F3F7]">
                <div className="bg-white border-b border-[#E4E7EB] px-4 sm:px-5 md:px-6 py-4">
                    <div className="mx-auto max-w-[1350px] flex items-center justify-between">
                        <div>
                            <h1 className="text-[16px] font-semibold text-[#111315]">Power Dialer</h1>
                            <p className="text-[12px] text-[#5F656D] mt-0.5">Active and past dialing sessions.</p>
                        </div>
                        <Link
                            href={route('crm.contacts.index')}
                            className="h-9 px-4 inline-flex items-center text-[12px] font-medium text-white bg-[#1693C9] rounded-md hover:bg-[#1380AF]"
                        >
                            Start new session
                        </Link>
                    </div>
                </div>

                <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5 md:py-6">
                <div className="mx-auto max-w-[1350px] space-y-6">
                    {active.length > 0 && (
                        <div>
                            <h2 className="text-[12px] font-semibold text-[#8B9096] tracking-wider mb-2">In progress</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {active.map((s) => (
                                    <SessionCard key={s.id} session={s} primary />
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h2 className="text-[12px] font-semibold text-[#8B9096] tracking-wider mb-2">History</h2>
                        {past.length === 0 ? (
                            <p className="text-[13px] text-[#5F656D] bg-white border border-[#E4E7EB] rounded-xl p-6 text-center">No past sessions yet. Pick contacts from the Contacts page to start dialing.</p>
                        ) : (
                            <div className="bg-white border border-[#E4E7EB] rounded-xl overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-[#F3F4F6] border-b border-[#E4E7EB] sticky top-0 z-10">
                                        <tr>
                                            <Th>Session</Th>
                                            <Th>Status</Th>
                                            <Th className="text-right">Done / Total</Th>
                                            <Th className="text-right">Talked</Th>
                                            <Th className="text-right">VM</Th>
                                            <Th className="text-right">DNC</Th>
                                            <Th>Started</Th>
                                            <Th>Ended</Th>
                                            <Th></Th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {past.map((s) => {
                                            const badge = statusBadge(s.status);
                                            return (
                                                <tr key={s.id} className="border-b border-[#E4E7EB] last:border-b-0 hover:bg-[#FAFAFA] transition-colors">
                                                    <Td>
                                                        <Link href={route('crm.dialer.sessions.show', { dialerSession: s.id })} className="text-[#1693C9] font-medium hover:underline">
                                                            {s.name ?? `Session #${s.id}`}
                                                        </Link>
                                                    </Td>
                                                    <Td>
                                                        <span className={`inline-flex items-center h-5 px-2 rounded text-[10px] font-medium tracking-wider ${badge.cls}`}>{badge.label}</span>
                                                    </Td>
                                                    <Td className="text-right tabular-nums">{s.stats.attempted} / {s.total_contacts}</Td>
                                                    <Td className="text-right tabular-nums text-[#047857]">{s.stats.connected}</Td>
                                                    <Td className="text-right tabular-nums text-[#B45309]">{s.stats.voicemail}</Td>
                                                    <Td className="text-right tabular-nums text-[#B91C1C]">{s.stats.dnc}</Td>
                                                    <Td className="text-[#5F656D]">{formatDate(s.started_at)}</Td>
                                                    <Td className="text-[#5F656D]">{formatDate(s.ended_at)}</Td>
                                                    <Td>
                                                        <div className="flex items-center gap-3 justify-end">
                                                            <Link
                                                                href={route('crm.dialer.sessions.show', { dialerSession: s.id })}
                                                                className="text-[11px] font-medium text-[#1693C9] hover:underline"
                                                            >
                                                                View
                                                            </Link>
                                                            <button
                                                                onClick={() => handleDelete(s.id, s.name)}
                                                                disabled={deleting === s.id}
                                                                className="text-[11px] font-medium text-[#DC2626] hover:underline disabled:opacity-50"
                                                            >
                                                                {deleting === s.id ? 'Deleting…' : 'Delete'}
                                                            </button>
                                                        </div>
                                                    </Td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
                </div>
            </div>
        </CrmLayout>
    );
}

function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
    return <th className={`px-4 py-2.5 text-[11px] font-semibold text-[#5F656D] tracking-wider text-left ${className}`}>{children}</th>;
}

function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
    return <td className={`px-4 py-3 text-[13px] text-[#111315] ${className}`}>{children}</td>;
}

function SessionCard({ session, primary }: { session: SessionListItem; primary?: boolean }) {
    const badge = statusBadge(session.status);
    const remaining = session.total_contacts - session.stats.attempted - session.stats.skipped;
    return (
        <Link
            href={route('crm.dialer.sessions.show', { dialerSession: session.id })}
            className={`block p-4 rounded-xl border transition-colors ${primary ? 'bg-white border-[#1693C9] hover:bg-[#F0F9FF]' : 'bg-white border-[#E4E7EB] hover:border-[#1693C9]'}`}
        >
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-[14px] font-semibold text-[#111315] truncate">{session.name ?? `Session #${session.id}`}</h3>
                <span className={`inline-flex items-center h-5 px-2 rounded text-[10px] font-medium tracking-wider ${badge.cls}`}>{badge.label}</span>
            </div>
            <p className="text-[11px] text-[#5F656D]">
                {session.stats.attempted} of {session.total_contacts} done · {remaining < 0 ? 0 : remaining} remaining
            </p>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-[#5F656D]">
                <span><span className="text-[#047857] font-medium tabular-nums">{session.stats.connected}</span> talked</span>
                <span><span className="text-[#B45309] font-medium tabular-nums">{session.stats.voicemail}</span> vm</span>
                <span><span className="text-[#B91C1C] font-medium tabular-nums">{session.stats.dnc}</span> dnc</span>
            </div>
            <p className="text-[10px] text-[#8B9096] mt-2">Started {formatDate(session.started_at)}</p>
            {primary && (
                <p className="mt-3 text-[12px] font-medium text-[#1693C9]">Resume session →</p>
            )}
        </Link>
    );
}
