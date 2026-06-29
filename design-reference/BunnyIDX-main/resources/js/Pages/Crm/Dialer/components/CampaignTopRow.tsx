import Avatar from '@/Components/Crm/Avatar';
import { formatPhone } from '@/utils/phone';
import type { CallApi } from '@/hooks/useTelnyxDialer';
import type { ContactDto, SessionData } from './types';

/**
 * Zoho-style top row of the campaign page:
 *
 *   ┌─ stats + thin progress bar (left half) ─│─ avatar + ongoing call + timer + Pause / End / DNC (right half) ─┐
 *
 * Pure presentational — the parent owns all state transitions and just hands
 * down the data + handlers.
 */

interface Props {
    session: SessionData;
    contact: ContactDto | null;
    phone: string | null;
    dialer: CallApi;
    isFinished: boolean;
    progressPct: number;
    remaining: number;
    onPauseResume: () => void;
    onEndSession: () => void;
    onMarkDnc: (mode: 'all' | 'off') => void;
}

export default function CampaignTopRow({
    session, contact, phone, dialer, isFinished,
    progressPct, remaining,
    onPauseResume, onEndSession, onMarkDnc,
}: Props) {
    return (
        <div className="shrink-0 px-4 sm:px-5 md:px-6 pt-4">
            <div className="mx-auto max-w-[1350px] bg-white border border-[#E4E7EB] rounded-xl px-5 py-4">
                <div className="flex items-center gap-5 flex-wrap">
                    {/* LEFT — stats + progress */}
                    <div className="shrink-0 w-[460px]">
                        <div className="flex items-start gap-8">
                            <BigStat label="TOTAL CALLS" value={session.total_contacts} />
                            <BigStat label="COMPLETED CALLS" value={session.stats.attempted} />
                            <BigStat label="REMAINING CALLS" value={remaining < 0 ? 0 : remaining} />
                        </div>
                        <div className="mt-3 h-1 bg-[#E4E7EB] rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#1693C9] via-[#22c55e] to-[#22c55e] transition-all" style={{ width: `${progressPct}%` }} />
                        </div>
                    </div>

                    {/* Middle spacer with centered divider */}
                    <div className="flex-1 flex justify-center self-stretch">
                        <div className="w-px h-full bg-[#E4E7EB]" />
                    </div>

                    {/* RIGHT — ongoing call + timer + actions */}
                    <div className="flex items-center gap-4 shrink-0">
                        {contact ? (
                            <Avatar id={contact.id} name={`${contact.first_name} ${contact.last_name}`} size="lg" />
                        ) : (
                            <div className="h-9 w-9 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#8B9096] shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
                                </svg>
                            </div>
                        )}

                        <div className="min-w-0">
                            <p className="text-[11px] text-[#8B9096] font-medium">
                                {dialer.callState === 'active' ? 'Ongoing Call'
                                    : dialer.callState === 'connecting' || dialer.callState === 'ringing' ? 'Connecting…'
                                    : contact ? 'Next Call' : 'Queue Empty'}
                            </p>
                            <p className="text-[14px] font-semibold text-[#111315] truncate">
                                {contact ? `${contact.first_name} ${contact.last_name}` : '—'}
                            </p>
                            {phone && (
                                <p className="text-[11px] text-[#5F656D] tabular-nums">{formatPhone(phone)}</p>
                            )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pl-3 border-l border-[#E4E7EB]">
                            <CircularTimer
                                seconds={dialer.callState === 'active' ? dialer.duration : 0}
                                active={dialer.callState === 'active'}
                            />
                            <div>
                                <p className="text-[9px] font-medium text-[#8B9096] tracking-wider">MM:SS</p>
                                <p className="text-[11px] text-[#5F656D]">Duration</p>
                            </div>
                        </div>

                        {!isFinished && (
                            <div className="flex items-start gap-2 shrink-0 pl-3 border-l border-[#E4E7EB]">
                                <PauseResumeButton status={session.status} onClick={onPauseResume} />
                                <EndButton onClick={onEndSession} />
                                {contact && (
                                    <DncButton dndMode={contact.dnd_mode ?? null} firstName={contact.first_name} onChange={onMarkDnc} />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function BigStat({ label, value }: { label: string; value: number }) {
    return (
        <div>
            <p className="text-[9px] font-medium text-[#111315] tracking-wider whitespace-nowrap">{label}</p>
            <p className="text-[22px] leading-none font-bold tabular-nums text-[#111315] mt-1">{value}</p>
        </div>
    );
}

/**
 * Circular ring timer for the in-call duration. Fills over a 10-minute
 * reference window — purely cosmetic.
 */
function CircularTimer({ seconds, active }: { seconds: number; active: boolean }) {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const pct = Math.min(1, seconds / 600);
    const offset = circumference * (1 - pct);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const label = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return (
        <div className="relative h-16 w-16 shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r={radius} fill="none" stroke="#E4E7EB" strokeWidth="4" />
                <circle
                    cx="32" cy="32" r={radius} fill="none"
                    stroke={active ? '#F97316' : '#1693C9'} strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-[12px] font-semibold tabular-nums ${active ? 'text-[#F97316]' : 'text-[#111315]'}`}>
                    {label}
                </span>
            </div>
        </div>
    );
}

function PauseResumeButton({ status, onClick }: { status: SessionData['status']; onClick: () => void }) {
    const active = status === 'active';
    return (
        <div className="flex flex-col items-center gap-1">
            <button
                onClick={onClick}
                className={`h-10 min-w-[110px] px-4 text-[12px] font-semibold rounded-md inline-flex items-center justify-center gap-2 shadow-sm ${
                    active ? 'bg-[#F97316] text-white hover:bg-[#EA580C]' : 'bg-[#059669] text-white hover:bg-[#047857]'
                }`}
            >
                {active ? (
                    <>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                        Pause
                    </>
                ) : (
                    <>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z"/></svg>
                        Resume
                    </>
                )}
            </button>
            <p className="text-[9px] text-[#8B9096] leading-tight max-w-[110px] text-center">
                {active ? 'Pause after current call' : 'Continue dialing'}
            </p>
        </div>
    );
}

function EndButton({ onClick }: { onClick: () => void }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <button
                onClick={onClick}
                className="h-10 min-w-[90px] px-4 text-[12px] font-semibold rounded-md inline-flex items-center justify-center gap-2 bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-sm"
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                End
            </button>
            <p className="text-[9px] text-[#8B9096] leading-tight max-w-[110px] text-center">End session now</p>
        </div>
    );
}

function DncButton({ dndMode, firstName, onChange }: { dndMode: string | null; firstName: string; onChange: (mode: 'all' | 'off') => void }) {
    const isDnc = dndMode === 'all';
    return (
        <div className="flex flex-col items-center gap-1">
            {isDnc ? (
                <button
                    onClick={() => onChange('off')}
                    className="h-10 min-w-[110px] px-4 text-[12px] font-semibold rounded-md inline-flex items-center justify-center gap-2 bg-[#F3F4F6] text-[#5F656D] hover:bg-[#E4E7EB] border border-[#E4E7EB]"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    DNC ✓
                </button>
            ) : (
                <button
                    onClick={() => { if (confirm(`Mark ${firstName} as Do Not Call?`)) onChange('all'); }}
                    className="h-10 min-w-[110px] px-4 text-[12px] font-semibold rounded-md inline-flex items-center justify-center gap-2 bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2] border border-[#FECACA]"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    Mark DNC
                </button>
            )}
            <p className="text-[9px] text-[#8B9096] leading-tight max-w-[110px] text-center">
                {isDnc ? 'Currently on DNC list' : 'Block future calls'}
            </p>
        </div>
    );
}
