import CrmLayout from '@/Layouts/CrmLayout';
import FloatingCallModal, { Disposition } from '@/Components/Crm/FloatingCallModal';
import CallingScriptManager from '@/Components/Crm/CallingScriptManager';
import type { CallingScriptDto } from '@/Components/Crm/CallingScript/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTelnyxDialer } from '@/hooks/useTelnyxDialer';
import { apiFetch, apiPost, apiPatch } from '@/utils/api';
import type { PageProps } from '@/types';

import CampaignTopRow from './components/CampaignTopRow';
import ScriptPanel from './components/ScriptPanel';
import LeadContextCard from './components/LeadContextCard';
import QueueCards from './components/QueueCards';
import type { SessionPagePayload } from './components/types';

/**
 * Power Dialer campaign page (orchestrator).
 *
 * Owns session lifecycle state, the WebRTC dialer hook, and the script /
 * lead / queue panels. Each panel is its own component under ./components.
 *
 * Layout:
 *   <CampaignTopRow>                — stats + ongoing call + Pause / End / DNC
 *   <ScriptPanel>                   — left column (script + questionnaire tabs)
 *   <LeadContextCard>               — right column (teal lead card + quick views)
 *   <QueueCards>                    — right column (Upcoming + Completed lists)
 *   <FloatingCallModal>             — bottom-right call surface
 */

export default function DialerSessionPage({
    session: initialSession,
    script: initialScript,
    current: initialCurrent,
    upcoming: initialUpcoming,
    completed: initialCompleted,
}: SessionPagePayload) {
    const [session, setSession] = useState(initialSession);
    const [script, setScript] = useState(initialScript);
    const [current, setCurrent] = useState(initialCurrent);
    const [upcoming, setUpcoming] = useState(initialUpcoming);
    const [completed, setCompleted] = useState(initialCompleted);
    const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'script' | 'questionnaire'>('script');
    const [leadTab, setLeadTab] = useState<'searches' | 'properties' | 'deals'>('searches');
    const [showScriptManager, setShowScriptManager] = useState(false);
    const [allScripts, setAllScripts] = useState<CallingScriptDto[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>(initialCurrent?.answers ?? {});

    const dialer = useTelnyxDialer({ enabled: true });
    const { tenDlcStatus } = usePage<PageProps>().props;

    const isFinished = session.status === 'completed' || session.status === 'abandoned';
    const contact = current?.contact ?? null;
    const phone = contact?.phone || contact?.mobile || null;

    // Load scripts once on mount for the picker.
    useEffect(() => {
        apiFetch(route('crm.calling-scripts.index'))
            .then((data) => setAllScripts(data.scripts ?? []))
            .catch(() => {});
    }, []);

    // Reset per-call answers when the current call rotates.
    useEffect(() => {
        setAnswers(current?.answers ?? {});
    }, [current?.id]);

    const refreshFromPayload = useCallback((payload: SessionPagePayload & { finished?: boolean }) => {
        setSession(payload.session);
        if (payload.script !== undefined) setScript(payload.script);
        setCurrent(payload.current);
        setUpcoming(payload.upcoming);
        if (payload.completed) setCompleted(payload.completed);
    }, []);

    /** Persist questionnaire answers in the background — no UI blocking. */
    const persistAnswers = useCallback((next: Record<string, string>) => {
        if (!current) return;
        apiPost(route('crm.dialer.sessions.answers', { dialerSession: session.id }), {
            call_id: current.id,
            answers: next,
        }).catch(() => {});
    }, [current, session.id]);

    const recordDisposition = useCallback(async (disposition: Disposition, { notes, callbackAt }: { notes: string; callbackAt: string | null }) => {
        const payload = await apiPost(route('crm.dialer.sessions.disposition', { dialerSession: session.id }), {
            disposition,
            notes: notes || null,
            call_record_id: dialer.callRecord?.id ?? null,
            callback_at: callbackAt ? new Date(callbackAt).toISOString() : null,
            answers,
        });
        refreshFromPayload(payload);
        dialer.resetCall();
        if (!payload.finished && payload.current) {
            setAutoAdvanceTimer(3);
        }
    }, [session.id, dialer, answers, refreshFromPayload]);

    // 3-second auto-advance countdown.
    useEffect(() => {
        if (autoAdvanceTimer === null) return;
        if (autoAdvanceTimer <= 0) {
            setAutoAdvanceTimer(null);
            if (phone && contact && dialer.callState === 'idle' && session.status === 'active') {
                dialer.startCall({ toNumber: phone, contactId: contact.id });
            }
            return;
        }
        const t = setTimeout(() => setAutoAdvanceTimer((v) => (v === null ? null : v - 1)), 1000);
        return () => clearTimeout(t);
    }, [autoAdvanceTimer, phone, contact, dialer, session.status]);

    const handleSkip = useCallback(async () => {
        if (dialer.callState !== 'idle') return;
        try {
            const payload = await apiPost(route('crm.dialer.sessions.skip', { dialerSession: session.id }));
            refreshFromPayload(payload);
        } catch (e: any) {
            alert(e?.message ?? 'Failed to skip.');
        }
    }, [dialer.callState, session.id, refreshFromPayload]);

    const handlePauseResume = useCallback(async () => {
        const next = session.status === 'active' ? 'pause' : 'resume';
        try {
            const payload = await apiPost(route(`crm.dialer.sessions.${next}`, { dialerSession: session.id }));
            refreshFromPayload(payload);
        } catch (e: any) {
            alert(e?.message ?? 'Failed.');
        }
    }, [session.id, session.status, refreshFromPayload]);

    const handleEndSession = useCallback(async () => {
        if (!confirm('End this dialing session?')) return;
        try {
            const payload = await apiPost(route('crm.dialer.sessions.end', { dialerSession: session.id }));
            refreshFromPayload(payload);
        } catch (e: any) {
            alert(e?.message ?? 'Failed.');
        }
    }, [session.id, refreshFromPayload]);

    /** Quick-action: flip the current contact's DND mode without ending the call. */
    const handleQuickDnd = useCallback(async (mode: 'all' | 'off') => {
        if (!contact) return;
        try {
            await apiPatch(route('crm.contacts.dnd', { contact: contact.id }), { dnd_mode: mode });
            setCurrent((c) => c && c.contact ? { ...c, contact: { ...c.contact, dnd_mode: mode } } : c);
        } catch (e: any) {
            alert(e?.message ?? 'Failed to update DND.');
        }
    }, [contact]);

    /** Swap the calling script on the active session. */
    const handleScriptSelect = useCallback(async (id: number | null) => {
        try {
            const payload = await apiPatch(route('crm.dialer.sessions.script', { dialerSession: session.id }), {
                calling_script_id: id,
            });
            refreshFromPayload(payload);
        } catch (e: any) {
            alert(e?.message ?? 'Failed to update script.');
        }
    }, [session.id, refreshFromPayload]);

    // Keyboard shortcuts: Space = skip, Esc = pause/resume.
    useEffect(() => {
        if (isFinished) return;
        const handler = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement;
            if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable) return;
            if (e.key === ' ' && dialer.callState === 'idle' && session.status === 'active') {
                e.preventDefault();
                handleSkip();
                return;
            }
            if (e.key === 'Escape' && dialer.callState === 'idle') {
                e.preventDefault();
                handlePauseResume();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isFinished, dialer.callState, session.status, handleSkip, handlePauseResume]);

    const progressPct = useMemo(() => {
        if (!session.total_contacts) return 0;
        const done = session.stats.attempted + session.stats.skipped;
        return Math.min(100, Math.round((done / session.total_contacts) * 100));
    }, [session]);
    const remaining = session.total_contacts - session.stats.attempted - session.stats.skipped;

    return (
        <CrmLayout>
            <Head title={`Power Dialer — ${session.name ?? `Session #${session.id}`}`} />
            <audio id="telnyx-remote-audio" autoPlay playsInline />

            <div className="flex flex-col min-h-[calc(100vh-56px)] bg-[#F2F3F7]">
                {/* Breadcrumb */}
                <div className="shrink-0 bg-white border-b border-[#E4E7EB] px-4 sm:px-5 md:px-6 py-2.5">
                    <div className="mx-auto max-w-[1350px] flex items-center gap-3 text-[13px]">
                        <Link href={route('crm.dialer.sessions.index')} className="text-[#1693C9] hover:underline font-medium">
                            Power Dialer
                        </Link>
                        <svg className="w-3 h-3 text-[#8B9096]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <h1 className="font-semibold text-[#111315]">{session.name ?? `Session #${session.id}`}</h1>
                        <StatusBadge status={session.status} />
                    </div>
                </div>

                <CampaignTopRow
                    session={session}
                    contact={contact}
                    phone={phone}
                    dialer={dialer}
                    isFinished={isFinished}
                    progressPct={progressPct}
                    remaining={remaining}
                    onPauseResume={handlePauseResume}
                    onEndSession={handleEndSession}
                    onMarkDnc={handleQuickDnd}
                />

                {/* BODY */}
                <div className="flex-1 px-4 sm:px-5 md:px-6 py-4">
                    <div className="mx-auto max-w-[1350px] grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
                        <ScriptPanel
                            script={script}
                            contact={contact}
                            allScripts={allScripts}
                            selectedScriptId={session.calling_script_id}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            onScriptSelect={handleScriptSelect}
                            onManageScripts={() => setShowScriptManager(true)}
                            answers={answers}
                            onAnswersChange={(next) => { setAnswers(next); persistAnswers(next); }}
                        />

                        <div className="flex flex-col gap-3 min-w-0">
                            <LeadContextCard
                                contact={contact}
                                current={current}
                                activeTab={leadTab}
                                onTabChange={setLeadTab}
                            />
                            <QueueCards upcoming={upcoming} completed={completed} remaining={remaining} />
                        </div>
                    </div>
                </div>

                {isFinished && (
                    <div className="px-6 py-6 text-center bg-white border-t border-[#E4E7EB]">
                        <p className="text-[14px] font-semibold text-[#111315]">Session complete</p>
                        <p className="text-[12px] text-[#5F656D] mt-1">
                            {session.stats.attempted} attempted · {session.stats.connected} talked · {session.stats.voicemail} voicemail · {session.stats.no_answer} no answer
                        </p>
                        <Link
                            href={route('crm.contacts.index')}
                            className="mt-4 inline-block h-9 px-4 text-xs font-medium text-white bg-[#1693C9] rounded-md hover:bg-[#1380AF] leading-9"
                        >
                            Back to contacts
                        </Link>
                    </div>
                )}
            </div>

            {!isFinished && contact && (
                <FloatingCallModal
                    contact={contact}
                    dialer={dialer}
                    sessionStatus={session.status}
                    toNumber={phone}
                    tenDlcStatus={tenDlcStatus}
                    autoAdvanceTimer={autoAdvanceTimer}
                    onCancelAutoAdvance={() => setAutoAdvanceTimer(null)}
                    onDisposition={recordDisposition}
                    onSkip={handleSkip}
                    onLeadChanged={async () => {
                        try {
                            const payload = await apiFetch(route('crm.dialer.sessions.show', { dialerSession: session.id }));
                            refreshFromPayload(payload);
                        } catch { /* non-fatal */ }
                    }}
                />
            )}

            {showScriptManager && (
                <CallingScriptManager
                    onClose={() => setShowScriptManager(false)}
                    onChange={(s) => setAllScripts(s)}
                />
            )}
        </CrmLayout>
    );
}

function StatusBadge({ status }: { status: SessionPagePayload['session']['status'] }) {
    const map = {
        active:    { label: 'Active',    cls: 'bg-[#ECFDF5] text-[#047857]' },
        paused:    { label: 'Paused',    cls: 'bg-[#FFFBEB] text-[#B45309]' },
        completed: { label: 'Completed', cls: 'bg-[#EBF5FF] text-[#1693C9]' },
        abandoned: { label: 'Abandoned', cls: 'bg-[#F3F4F6] text-[#5F656D]' },
    } as const;
    const m = map[status];
    return <span className={`inline-flex items-center h-5 px-2 rounded text-[10px] font-medium tracking-wider ${m.cls}`}>{m.label}</span>;
}
