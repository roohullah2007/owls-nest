import Avatar from '@/Components/Crm/Avatar';
import CardShell, { CardIcons } from '@/Components/Crm/CardShell';
import { formatPhone } from '@/utils/phone';
import type { CompletedCall, UpcomingCall } from './types';
import { DISPOSITION_LABELS, DISPOSITION_TONES } from './types';

/**
 * Right column queue list — Upcoming + Completed cards.
 */

interface Props {
    upcoming: UpcomingCall[];
    completed: CompletedCall[];
    remaining: number;
}

export default function QueueCards({ upcoming, completed, remaining }: Props) {
    return (
        <>
            <CardShell iconPath={CardIcons.queue} title="Upcoming Calls" count={remaining < 0 ? 0 : remaining}>
                {upcoming.length === 0 ? (
                    <p className="text-[11px] text-[#8B9096] italic px-4 py-4 text-center">All done.</p>
                ) : (
                    <ul className="max-h-64 overflow-y-auto">
                        {upcoming.map((c) => c.contact && (
                            <li key={c.id} className="flex items-center gap-2 px-4 py-2 border-b border-[#F3F4F6] last:border-b-0 hover:bg-[#F9FAFB]">
                                <span className="text-[10px] tabular-nums w-5 text-[#8B9096]">{c.position + 1}.</span>
                                <Avatar id={c.contact.id} name={`${c.contact.first_name} ${c.contact.last_name}`} size="xs" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] text-[#111315] truncate">{c.contact.first_name} {c.contact.last_name}</p>
                                    {(c.contact.phone || c.contact.mobile) && (
                                        <p className="text-[10px] text-[#8B9096] truncate tabular-nums">{formatPhone((c.contact.phone || c.contact.mobile)!)}</p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardShell>

            <CardShell iconPath={CardIcons.history} title="Completed Calls" count={completed.length}>
                {completed.length === 0 ? (
                    <p className="text-[11px] text-[#8B9096] italic px-4 py-4 text-center">No calls yet.</p>
                ) : (
                    <ul className="max-h-64 overflow-y-auto">
                        {completed.map((c) => c.contact && (
                            <li key={c.id} className="flex items-center gap-2 px-4 py-2 border-b border-[#F3F4F6] last:border-b-0 hover:bg-[#F9FAFB]">
                                <Avatar id={c.contact.id} name={`${c.contact.first_name} ${c.contact.last_name}`} size="xs" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] text-[#111315] truncate">{c.contact.first_name} {c.contact.last_name}</p>
                                    <p className="text-[10px] text-[#8B9096] flex items-center gap-2">
                                        <span>{c.duration_seconds ? `${Math.floor(c.duration_seconds / 60)}:${(c.duration_seconds % 60).toString().padStart(2, '0')}` : '—'}</span>
                                        {c.recording_url && (
                                            <a
                                                href={c.recording_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[#1693C9] hover:underline inline-flex items-center gap-0.5"
                                                title="Listen to recording"
                                            >
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z"/></svg>
                                                Listen
                                            </a>
                                        )}
                                    </p>
                                </div>
                                {c.disposition && (
                                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${DISPOSITION_TONES[c.disposition] ?? 'bg-[#F3F4F6] text-[#5F656D]'}`}>
                                        {DISPOSITION_LABELS[c.disposition] ?? c.disposition}
                                    </span>
                                )}
                                {!c.disposition && c.status === 'skipped' && (
                                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F3F4F6] text-[#5F656D]">Skipped</span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </CardShell>
        </>
    );
}
