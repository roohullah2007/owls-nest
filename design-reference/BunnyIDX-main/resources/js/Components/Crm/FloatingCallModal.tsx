import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import { formatPhone } from '@/utils/phone';
import { apiSubmit, apiPost, apiFetch } from '@/utils/api';
import type { CallApi, CallState } from '@/hooks/useTelnyxDialer';

import CallControlGrid from './FloatingCallModal/CallControlGrid';
import DispositionPicker, { Disposition } from './FloatingCallModal/DispositionPicker';
import MinimizedDock from './FloatingCallModal/MinimizedDock';
import TenDlcPrompt from './TenDlcPrompt';
import { requires10Dlc } from '@/utils/smsGate';

/**
 * Bottom-right floating call surface for the Power Dialer.
 *
 * Orchestrates: header (drag handle + state badge + minimize), caller-ID
 * strip, avatar + identity, call controls, quick-action panels (Note / Task /
 * Transfer), and bottom CTA (Call / End) or disposition picker (call ended).
 *
 * Draggable by its header; minimizable to a compact dock.
 */

export type { Disposition };

type Panel = 'main' | 'note' | 'task' | 'transfer' | 'sms';
type Mode = 'idle' | 'in_call' | 'disposition' | 'countdown';

interface Contact {
    id: number;
    uuid?: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    mobile?: string | null;
    dnd_mode?: string | null;
}

interface Props {
    contact: Contact | null;
    dialer: CallApi;
    sessionStatus: 'active' | 'paused' | 'completed' | 'abandoned';
    toNumber: string | null;
    /** User's 10DLC registration status — gates SMS to US/Canadian numbers. */
    tenDlcStatus?: 'approved' | 'pending' | 'not_started';
    onDisposition: (disposition: Disposition, opts: { notes: string; callbackAt: string | null }) => Promise<void>;
    onSkip: () => void;
    onClose?: () => void;
    autoAdvanceTimer: number | null;
    onCancelAutoAdvance?: () => void;
    /** Called after agent makes a change to the lead (DNC / new task) so parent can refresh. */
    onLeadChanged?: () => void;
}

function modeFor(callState: CallState, autoAdvanceTimer: number | null, savingDisposition: boolean): Mode {
    if (autoAdvanceTimer !== null) return 'countdown';
    if (savingDisposition) return 'disposition';
    if (callState === 'idle') return 'idle';
    if (callState === 'ended') return 'disposition';
    return 'in_call';
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function FloatingCallModal({
    contact, dialer, sessionStatus, toNumber, tenDlcStatus = 'not_started',
    onDisposition, onSkip, onClose,
    autoAdvanceTimer, onCancelAutoAdvance, onLeadChanged,
}: Props) {
    const [showKeypad, setShowKeypad] = useState(false);
    const [notes, setNotes] = useState('');
    const [callbackAt, setCallbackAt] = useState('');
    const [saving, setSaving] = useState(false);

    const [panel, setPanel] = useState<Panel>('main');
    const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
    const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

    const [minimized, setMinimized] = useState(false);

    // Available voicemail clips (for VM Drop). Loaded lazily once.
    const [voicemails, setVoicemails] = useState<Array<{ id: number; name: string; is_default: boolean }>>([]);
    useEffect(() => {
        apiFetch(route('crm.voicemails.index'))
            .then((data) => setVoicemails(data.voicemails ?? []))
            .catch(() => {});
    }, []);

    const mode = modeFor(dialer.callState, autoAdvanceTimer, saving);
    const contactName = contact ? `${contact.first_name} ${contact.last_name}`.trim() : 'No contact';
    const phone = toNumber ?? contact?.phone ?? contact?.mobile ?? null;
    const callerIdNumber = dialer.callRecord?.from_number ?? null;

    // Auto-restore from minimized when the call ends — agent needs the disposition picker.
    useEffect(() => {
        if (dialer.callState === 'ended') setMinimized(false);
    }, [dialer.callState]);

    // Reset disposition form whenever a new call begins.
    useEffect(() => {
        if (dialer.callState === 'connecting' || dialer.callState === 'ringing') {
            setNotes('');
            setCallbackAt('');
            setShowKeypad(false);
        }
    }, [dialer.callState]);

    // Force back to main panel when the call ends.
    useEffect(() => {
        if (mode === 'disposition' || mode === 'countdown') setPanel('main');
    }, [mode]);

    // Toast auto-dismiss.
    useEffect(() => {
        if (!actionMessage) return;
        const t = setTimeout(() => setActionMessage(null), 2500);
        return () => clearTimeout(t);
    }, [actionMessage]);

    // ── Drag handlers ───────────────────────────────────────────────────
    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos?.x ?? 0, origY: pos?.y ?? 0 };
    };
    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragState.current) return;
        const dx = e.clientX - dragState.current.startX;
        const dy = e.clientY - dragState.current.startY;
        const next = { x: dragState.current.origX + dx, y: dragState.current.origY + dy };
        const modalW = 340, margin = 16;
        const maxX = window.innerWidth - modalW - margin;
        const maxY = window.innerHeight - 60;
        next.x = Math.max(-(maxX + modalW - margin), Math.min(maxX, next.x));
        next.y = Math.max(-(maxY - 40), Math.min(maxY, next.y));
        setPos(next);
    };
    const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
        dragState.current = null;
    };

    if (!contact) return null;

    const style = pos ? { transform: `translate(${pos.x}px, ${pos.y}px)` } : undefined;

    if (minimized) {
        return <MinimizedDock contactName={contactName} dialer={dialer} onExpand={() => setMinimized(false)} style={style} />;
    }

    const startCall = async () => {
        if (!phone) return;
        await dialer.startCall({ toNumber: phone, contactId: contact.id });
    };

    const handlePickDisposition = async (d: Disposition) => {
        setSaving(true);
        try {
            await onDisposition(d, { notes, callbackAt: d === 'callback_scheduled' ? callbackAt : null });
            setNotes('');
            setCallbackAt('');
        } finally {
            setSaving(false);
        }
    };

    /** Drop the default voicemail clip onto the live call (then Telnyx auto-hangs). */
    const handleVmDrop = async () => {
        if (!dialer.callRecord?.id) return;
        const vm = voicemails.find((v) => v.is_default) ?? voicemails[0];
        if (!vm) {
            setActionMessage({ tone: 'error', text: 'Upload a voicemail clip in Settings > Voicemails first.' });
            return;
        }
        try {
            await apiPost(route('crm.voice.control', { callRecord: dialer.callRecord.id }), {
                action: 'voicemail_drop',
                voicemail_id: vm.id,
            });
            setActionMessage({ tone: 'success', text: `Playing "${vm.name}"…` });
        } catch (e: any) {
            setActionMessage({ tone: 'error', text: e?.message ?? 'VM Drop failed' });
        }
    };

    const handleMarkDnc = async () => {
        if (!confirm(`Mark ${contactName} as Do Not Call? They'll be skipped on future sessions.`)) return;
        try {
            await apiSubmit(route('crm.contacts.dnd', { contact: contact.id }), { dnd_mode: 'all' });
            setActionMessage({ tone: 'success', text: 'Marked as Do Not Call' });
            onLeadChanged?.();
        } catch (e: any) {
            setActionMessage({ tone: 'error', text: e?.message ?? 'Failed to mark DNC' });
        }
    };

    return (
        <div
            className="fixed bottom-6 right-6 z-50 w-[340px] bg-white border border-[#E4E7EB] rounded-2xl shadow-2xl overflow-hidden select-none"
            style={style}
        >
            {/* Header (drag handle) */}
            <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="flex items-center justify-between px-4 py-2.5 bg-[#282B36] text-white cursor-move touch-none"
                title="Drag to move"
            >
                <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                        <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                        <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                    </svg>
                    {panel !== 'main' ? (
                        <>
                            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setPanel('main')} className="text-white/60 hover:text-white" title="Back" type="button">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5 8.25 12l7.5-7.5" />
                                </svg>
                            </button>
                            <span className="text-[12px] font-semibold capitalize">{panel}</span>
                        </>
                    ) : (
                        <HeaderStatus mode={mode} />
                    )}
                </div>
                <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
                    {pos && (
                        <button onClick={() => setPos(null)} className="text-white/60 hover:text-white p-0.5" title="Reset position" type="button">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    )}
                    <button onClick={() => setMinimized(true)} className="text-white/60 hover:text-white p-0.5" title="Minimize" type="button">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                        </svg>
                    </button>
                    {onClose && mode === 'idle' && (
                        <button onClick={onClose} className="text-white/60 hover:text-white" title="Close" type="button">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {dialer.sdkError && (
                <div className="px-3 py-1.5 bg-[#FEF2F2] border-b border-[#FECACA] text-[11px] text-[#DC2626]">{dialer.sdkError}</div>
            )}

            <CallerIdStrip number={callerIdNumber} callState={dialer.callState} />

            {/* SLIDE-IN PANELS */}
            {panel === 'note' && (
                <NotePanel contactId={contact.id} contactName={contactName} onDone={(msg) => { setActionMessage(msg); if (msg.tone === 'success') setPanel('main'); }} />
            )}
            {panel === 'task' && (
                <TaskPanel contactId={contact.id} contactName={contactName} onDone={(msg) => { setActionMessage(msg); if (msg.tone === 'success') { setPanel('main'); onLeadChanged?.(); } }} />
            )}
            {panel === 'transfer' && (
                <TransferPanel
                    callRecordId={dialer.callRecord?.id ?? null}
                    canTransfer={!!dialer.callRecord?.telnyx_call_control_id}
                    onDone={(msg) => { setActionMessage(msg); if (msg.tone === 'success') setPanel('main'); }}
                />
            )}
            {panel === 'sms' && (
                <SmsPanel
                    contactId={contact.id}
                    contactName={contactName}
                    toNumber={phone}
                    tenDlcStatus={tenDlcStatus}
                    onDone={(msg) => { setActionMessage(msg); if (msg.tone === 'success') setPanel('main'); }}
                />
            )}

            {panel === 'main' && (
                <>
                    {/* Identity */}
                    <div className="px-4 pt-4 pb-3 flex flex-col items-center">
                        <Avatar id={contact.id} name={contactName} size="xl" />
                        <p className="mt-2 text-[14px] font-semibold text-[#111315]">{contactName}</p>
                        {phone && <p className="text-[12px] text-[#5F656D] tabular-nums">{formatPhone(phone)}</p>}
                        {mode === 'in_call' && (
                            <p className="mt-1 text-[18px] font-semibold text-[#DC2626] tabular-nums">{formatDuration(dialer.duration)}</p>
                        )}
                        {mode === 'in_call' && dialer.statusText && (
                            <p className="text-[10px] text-[#8B9096]">{dialer.statusText}</p>
                        )}
                        {mode === 'countdown' && (
                            <p className="mt-1 text-[28px] font-bold text-[#1693C9] tabular-nums">{autoAdvanceTimer}s</p>
                        )}
                        {contact.dnd_mode === 'all' && (
                            <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#B91C1C] text-[10px] font-medium">DNC</span>
                        )}
                    </div>

                    <CallControlGrid
                        dialer={dialer}
                        inCall={mode === 'in_call'}
                        showKeypad={showKeypad}
                        onToggleKeypad={() => setShowKeypad((v) => !v)}
                        onVmDrop={handleVmDrop}
                        onTransfer={() => setPanel('transfer')}
                        vmDropAvailable={voicemails.length > 0}
                    />

                    {/* Quick actions — 2×2 grid */}
                    <div className="mt-3 px-4">
                        <p className="text-[11px] font-medium text-[#111315] mb-1.5">Quick actions</p>
                        <div className="grid grid-cols-2 gap-1.5">
                            <QuickActionButton icon="note" label="Note" onClick={() => setPanel('note')} />
                            <QuickActionButton icon="task" label="Task" onClick={() => setPanel('task')} />
                            <QuickActionButton icon="sms" label="Text" onClick={() => setPanel('sms')} />
                            {contact.dnd_mode === 'all' ? (
                                <QuickActionButton icon="dnc" label="DNC ✓" disabled onClick={() => {}} />
                            ) : (
                                <QuickActionButton icon="dnc" label="Mark DNC" danger onClick={handleMarkDnc} />
                            )}
                        </div>
                    </div>

                    {/* Bottom CTA */}
                    {mode === 'in_call' && (
                        <div className="px-4 py-3 mt-2">
                            <button
                                onClick={() => dialer.endCall()}
                                className="w-full h-11 rounded-lg bg-[#DC2626] text-white text-[13px] font-semibold hover:bg-[#B91C1C] inline-flex items-center justify-center gap-2"
                            >
                                <PhoneIcon rotate /> End
                            </button>
                        </div>
                    )}

                    {mode === 'idle' && (
                        <div className="px-4 py-3 mt-2 space-y-2">
                            <button
                                onClick={startCall}
                                disabled={!dialer.sdkReady || !phone || sessionStatus !== 'active'}
                                title={!dialer.sdkReady ? 'WebRTC connecting — controls light up once the call goes live' : !phone ? 'No phone number' : sessionStatus !== 'active' ? `Session ${sessionStatus}` : 'Call'}
                                className="w-full h-11 rounded-lg bg-[#059669] text-white text-[13px] font-semibold hover:bg-[#047857] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                            >
                                <PhoneIcon /> Call
                            </button>
                            <button onClick={onSkip} disabled={sessionStatus !== 'active'} className="w-full h-9 rounded-lg bg-white border border-[#E4E7EB] text-[#111315] text-[12px] font-semibold hover:bg-[#F3F4F6] disabled:opacity-50 shadow-sm">
                                Skip this contact
                            </button>
                        </div>
                    )}

                    {mode === 'countdown' && (
                        <div className="px-4 py-3 mt-2 space-y-2">
                            <button onClick={startCall} className="w-full h-11 rounded-lg bg-[#059669] text-white text-[13px] font-semibold hover:bg-[#047857] inline-flex items-center justify-center gap-2">
                                <PhoneIcon /> Call now ({autoAdvanceTimer}s)
                            </button>
                            <button onClick={onCancelAutoAdvance} className="w-full h-8 rounded-lg bg-[#F3F4F6] text-[#5F656D] text-[11px] hover:bg-[#E4E7EB]">
                                Cancel auto-dial
                            </button>
                        </div>
                    )}

                    {mode === 'disposition' && (
                        <DispositionPicker
                            saving={saving}
                            notes={notes}
                            callbackAt={callbackAt}
                            onNotesChange={setNotes}
                            onCallbackAtChange={setCallbackAt}
                            onPick={handlePickDisposition}
                        />
                    )}
                </>
            )}

            {actionMessage && (
                <div className={`absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-md text-[11px] font-medium text-center shadow ${
                    actionMessage.tone === 'success' ? 'bg-[#059669] text-white' : 'bg-[#DC2626] text-white'
                }`}>
                    {actionMessage.text}
                </div>
            )}
        </div>
    );
}

// ── Small subcomponents kept inline (tightly coupled to the modal) ──────

function HeaderStatus({ mode }: { mode: Mode }) {
    if (mode === 'in_call') return (
        <>
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-[12px] font-semibold">On call</span>
        </>
    );
    if (mode === 'disposition') return <span className="text-[12px] font-semibold">Call ended</span>;
    if (mode === 'countdown') return <span className="text-[12px] font-semibold">Next up</span>;
    return <span className="text-[12px] font-semibold">Ready</span>;
}

function CallerIdStrip({ number, callState }: { number: string | null; callState: CallState }) {
    return (
        <div className="px-4 py-2 bg-[#F9FAFB] border-b border-[#E4E7EB] flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
                <svg className="w-3.5 h-3.5 text-[#5F656D] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75M3.75 18h.75c.621 0 1.125-.504 1.125-1.125v-2.25c0-.621-.504-1.125-1.125-1.125h-.75A1.125 1.125 0 002.625 14.625v2.25C2.625 17.496 3.129 18 3.75 18zm16.5 0a1.125 1.125 0 001.125-1.125v-2.25c0-.621-.504-1.125-1.125-1.125h-.75a1.125 1.125 0 00-1.125 1.125v2.25c0 .621.504 1.125 1.125 1.125h.75z" />
                </svg>
                <span className="text-[10px] text-[#8B9096] font-medium tracking-wider shrink-0">Caller ID</span>
                {number ? (
                    <>
                        <span className="text-[11px] shrink-0" title={countryFromE164(number)}>{flagFromE164(number)}</span>
                        <span className="text-[11px] text-[#111315] font-medium tabular-nums truncate">{formatPhone(number)}</span>
                    </>
                ) : (
                    <span className="text-[11px] text-[#8B9096] italic truncate">Pending — will show on connect</span>
                )}
            </div>
            <SignalBars callState={callState} />
        </div>
    );
}

function NotePanel({ contactId, contactName, onDone }: { contactId: number; contactName: string; onDone: (m: { tone: 'success' | 'error'; text: string }) => void }) {
    const [body, setBody] = useState('');
    const [saving, setSaving] = useState(false);
    async function save() {
        if (!body.trim()) return;
        setSaving(true);
        try {
            await apiSubmit(route('crm.notes.store'), { notable_type: 'contact', notable_id: contactId, body });
            setBody('');
            onDone({ tone: 'success', text: 'Note saved' });
        } catch (e: any) {
            onDone({ tone: 'error', text: e?.message ?? 'Failed to save note' });
        } finally {
            setSaving(false);
        }
    }
    return (
        <div className="p-4 space-y-2">
            <p className="text-[11px] text-[#5F656D]">Add a note to <strong className="text-[#111315]">{contactName}</strong>'s timeline.</p>
            <textarea
                autoFocus
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What did you learn? Use @ to mention a teammate."
                rows={5}
                className="w-full px-3 py-2 text-[13px] border border-[#E4E7EB] rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#1693C9]"
            />
            <button
                onClick={save}
                disabled={saving || !body.trim()}
                className="w-full h-9 rounded-md bg-[#1693C9] text-white text-[12px] font-semibold hover:bg-[#1380AF] disabled:opacity-50"
            >
                {saving ? 'Saving…' : 'Save note'}
            </button>
        </div>
    );
}

function TaskPanel({ contactId, contactName, onDone }: { contactId: number; contactName: string; onDone: (m: { tone: 'success' | 'error'; text: string }) => void }) {
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
    const [saving, setSaving] = useState(false);
    async function save() {
        if (!title.trim()) return;
        setSaving(true);
        try {
            await apiSubmit(route('crm.tasks.store'), {
                title, priority, due_date: dueDate || null,
                taskable_type: 'contact', taskable_id: contactId,
            });
            setTitle(''); setDueDate(''); setPriority('normal');
            onDone({ tone: 'success', text: 'Task created' });
        } catch (e: any) {
            onDone({ tone: 'error', text: e?.message ?? 'Failed to create task' });
        } finally {
            setSaving(false);
        }
    }
    return (
        <div className="p-4 space-y-2">
            <p className="text-[11px] text-[#5F656D]">Create a task for <strong className="text-[#111315]">{contactName}</strong>.</p>
            <input
                autoFocus
                type="text" value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full py-2 px-3 text-[13px] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1693C9]"
            />
            <div className="grid grid-cols-2 gap-2">
                <input
                    type="date" value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="py-2 px-2 text-[12px] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1693C9]"
                />
                <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as typeof priority)}
                    className="appearance-none py-2 px-2 text-[12px] font-medium text-[#111315] bg-white border border-[#E4E7EB] rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1693C9]"
                >
                    <option value="low">Low priority</option>
                    <option value="normal">Normal priority</option>
                    <option value="high">High priority</option>
                    <option value="urgent">Urgent</option>
                </select>
            </div>
            <button
                onClick={save}
                disabled={saving || !title.trim()}
                className="w-full h-9 rounded-md bg-[#1693C9] text-white text-[12px] font-semibold hover:bg-[#1380AF] disabled:opacity-50"
            >
                {saving ? 'Creating…' : 'Create task'}
            </button>
        </div>
    );
}

/**
 * Send-SMS panel. If the destination is a US/Canadian (NANP) number and the
 * user's 10DLC registration isn't approved, swap the compose form for a
 * TenDlcPrompt. International numbers go through unblocked.
 */
function SmsPanel({ contactId, contactName, toNumber, tenDlcStatus, onDone }: {
    contactId: number;
    contactName: string;
    toNumber: string | null;
    tenDlcStatus: 'approved' | 'pending' | 'not_started';
    onDone: (m: { tone: 'success' | 'error'; text: string }) => void;
}) {
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);

    if (!toNumber) {
        return (
            <div className="p-4">
                <p className="text-[12px] text-[#5F656D]">No phone number on file for this contact — can't send SMS.</p>
            </div>
        );
    }

    // Only US/Canadian destinations need the 10DLC gate.
    const needsTenDlc = requires10Dlc(toNumber);
    const blocked = needsTenDlc && tenDlcStatus !== 'approved';

    if (blocked) {
        return (
            <div className="p-4">
                <TenDlcPrompt status={tenDlcStatus === 'pending' ? 'pending' : 'not_started'} compact />
            </div>
        );
    }

    async function send() {
        if (!body.trim()) return;
        setSending(true);
        try {
            await apiPost(route('crm.sms.send'), {
                contact_id: contactId,
                to_number: toNumber,
                body,
            });
            setBody('');
            onDone({ tone: 'success', text: 'Text sent' });
        } catch (e: any) {
            onDone({ tone: 'error', text: e?.message ?? 'Failed to send text' });
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="p-4 space-y-2">
            <p className="text-[11px] text-[#5F656D]">Text <strong className="text-[#111315]">{contactName}</strong> at {toNumber}.</p>
            <textarea
                autoFocus
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What do you want to send?"
                rows={4}
                maxLength={1600}
                className="w-full px-3 py-2 text-[13px] border border-[#E4E7EB] rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#1693C9]"
            />
            <div className="flex items-center justify-between text-[10px] text-[#8B9096]">
                <span>{body.length} / 1600</span>
                {!needsTenDlc && <span>International — no 10DLC required</span>}
            </div>
            <button
                onClick={send}
                disabled={sending || !body.trim()}
                className="w-full h-9 rounded-md bg-[#1693C9] text-white text-[12px] font-semibold hover:bg-[#1380AF] disabled:opacity-50"
            >
                {sending ? 'Sending…' : 'Send text'}
            </button>
        </div>
    );
}

function TransferPanel({ callRecordId, canTransfer, onDone }: { callRecordId: number | null; canTransfer: boolean; onDone: (m: { tone: 'success' | 'error'; text: string }) => void }) {
    const [number, setNumber] = useState('');
    const [transferring, setTransferring] = useState(false);

    async function transfer() {
        if (!callRecordId) return;
        const normalized = number.trim().startsWith('+') ? number.trim() : `+1${number.replace(/\D/g, '')}`;
        if (normalized.length < 8) {
            onDone({ tone: 'error', text: 'Enter a valid E.164 number (e.g. +15551234567)' });
            return;
        }
        setTransferring(true);
        try {
            await apiPost(route('crm.voice.control', { callRecord: callRecordId }), {
                action: 'transfer',
                to_number: normalized,
            });
            onDone({ tone: 'success', text: 'Transferring…' });
        } catch (e: any) {
            onDone({ tone: 'error', text: e?.message ?? 'Transfer failed' });
        } finally {
            setTransferring(false);
        }
    }

    return (
        <div className="p-4 space-y-2">
            <p className="text-[11px] text-[#5F656D]">Transfer the call to another phone number.</p>
            <input
                autoFocus
                type="tel"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="+1 555 000 0000"
                className="w-full py-2 px-3 text-[13px] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1693C9]"
            />
            <button
                onClick={transfer}
                disabled={transferring || !canTransfer || !number.trim()}
                title={!canTransfer ? 'Call must be connected first' : 'Transfer the call'}
                className="w-full h-9 rounded-md bg-[#1693C9] text-white text-[12px] font-semibold hover:bg-[#1380AF] disabled:opacity-50"
            >
                {transferring ? 'Transferring…' : 'Transfer call'}
            </button>
            {!canTransfer && (
                <p className="text-[10px] text-[#8B9096] italic">Transfer is available once the call is connected.</p>
            )}
        </div>
    );
}

function QuickActionButton({ icon, label, danger, disabled, onClick }: { icon: 'note' | 'task' | 'dnc' | 'sms'; label: string; danger?: boolean; disabled?: boolean; onClick: () => void }) {
    const path = {
        note: 'M5.625 1.5H9a3.75 3.75 0 0 1 3.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 0 1 3.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 0 1-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875Zm6.905 9.97a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 1 0 1.06 1.06l1.72-1.72V18a.75.75 0 0 0 1.5 0v-4.19l1.72 1.72a.75.75 0 1 0 1.06-1.06l-3-3Z',
        task: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
        sms:  'M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z',
        dnc:  'M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636',
    }[icon];
    const cls = disabled
        ? 'bg-[#ECFDF5] text-[#047857] cursor-not-allowed border border-[#A7F3D0]'
        : danger
            ? 'bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2] border border-[#FECACA]'
            : 'bg-white text-[#111315] hover:bg-[#F3F4F6] border border-[#E4E7EB] shadow-sm';
    return (
        <button onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-1.5 h-8 rounded-md text-[11px] font-medium transition-colors ${cls}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={path} />
            </svg>
            {label}
        </button>
    );
}

function PhoneIcon({ rotate = false }: { rotate?: boolean }) {
    return (
        <svg className={`w-4 h-4 ${rotate ? 'rotate-[135deg]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
    );
}

function flagFromE164(phone: string): string {
    if (!phone.startsWith('+')) return '🌐';
    const num = phone.slice(1);
    if (num.startsWith('1'))   return '🇺🇸';
    if (num.startsWith('44'))  return '🇬🇧';
    if (num.startsWith('91'))  return '🇮🇳';
    if (num.startsWith('61'))  return '🇦🇺';
    if (num.startsWith('64'))  return '🇳🇿';
    if (num.startsWith('353')) return '🇮🇪';
    if (num.startsWith('33'))  return '🇫🇷';
    if (num.startsWith('49'))  return '🇩🇪';
    return '🌐';
}

function countryFromE164(phone: string): string {
    const flag = flagFromE164(phone);
    return ({ '🇺🇸': 'United States', '🇬🇧': 'United Kingdom', '🇮🇳': 'India', '🇦🇺': 'Australia', '🇳🇿': 'New Zealand', '🇮🇪': 'Ireland', '🇫🇷': 'France', '🇩🇪': 'Germany' } as Record<string, string>)[flag] ?? 'International';
}

function SignalBars({ callState }: { callState: CallState }) {
    const active = callState === 'active';
    const connecting = callState === 'connecting' || callState === 'ringing';
    const color = active ? 'bg-[#22c55e]' : connecting ? 'bg-[#F97316]' : 'bg-[#D1D5DB]';
    return (
        <div className="flex items-end gap-0.5 h-3.5">
            <span className={`w-1 h-1.5 rounded-sm ${color} ${connecting ? 'animate-pulse' : ''}`} />
            <span className={`w-1 h-2.5 rounded-sm ${color} ${connecting ? 'animate-pulse [animation-delay:100ms]' : ''}`} />
            <span className={`w-1 h-3.5 rounded-sm ${active ? color : 'bg-[#D1D5DB]'}`} />
        </div>
    );
}
