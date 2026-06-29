import { useCallback, useEffect, useRef, useState } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';

/**
 * Headless WebRTC dialer state machine — shared by the floating PhoneDialer and
 * the full-page Power Dialer session UI.
 *
 * Responsibilities:
 *   1. Lazy-init a TelnyxRTC client when `enabled` flips true (token fetch + WSS handshake).
 *   2. Mirror the SDK's call.state events onto a simple local CallState enum.
 *   3. Wrap server endpoints (initiate / attach / control / end) behind action methods.
 *   4. Auto-reconnect once on socket close; surface errors via sdkError.
 *
 * Audio playback: the SDK's `remoteElement` looks up the DOM element by id. Whichever
 * component uses this hook is responsible for rendering an <audio id={remoteElementId} />
 * tag in the tree — the default id is "telnyx-remote-audio" but can be overridden.
 */

export type CallState = 'idle' | 'connecting' | 'ringing' | 'active' | 'ended';

export interface CallRecordData {
    id: number;
    contact_id: number | null;
    from_number: string;
    to_number: string;
    telnyx_call_control_id?: string | null;
}

export interface DialerOptions {
    /** Whether to keep the SDK connected. Toggle this when the dialer mounts/unmounts visibly. */
    enabled: boolean;
    /** DOM id of the <audio> element the SDK pipes remote audio into. */
    remoteElementId?: string;
}

export interface StartCallParams {
    /** E.164 destination (will be normalized if you skip this). */
    toNumber: string;
    contactId?: number | null;
    dealId?: number | null;
    /** Optional: link this call to a DialerSessionCall row for power-dialer flows. */
    sessionCallId?: number | null;
}

export interface CallApi {
    sdkReady: boolean;
    sdkError: string | null;
    callState: CallState;
    callRecord: CallRecordData | null;
    duration: number;
    statusText: string | null;
    muted: boolean;
    held: boolean;
    recording: boolean;

    startCall: (params: StartCallParams) => Promise<CallRecordData | null>;
    endCall: (notes?: string, status?: 'completed' | 'failed' | 'missed') => Promise<void>;
    toggleMute: () => void;
    toggleHold: () => Promise<void>;
    toggleRecord: () => Promise<void>;
    sendDtmf: (digit: string) => void;
    resetCall: () => void;
}

function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

async function api(path: string, init: RequestInit = {}) {
    return fetch(path, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
            ...(init.headers ?? {}),
        },
    });
}

/**
 * Normalize free-form phone input to E.164. Returns null if it can't be parsed.
 * Defaults to US (+1) for 10/11-digit inputs.
 */
export function normalizeToE164(input: string): string | null {
    if (!input) return null;
    const trimmed = input.trim();
    if (trimmed.startsWith('+')) {
        const digits = trimmed.slice(1).replace(/\D/g, '');
        return digits.length >= 8 ? `+${digits}` : null;
    }
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (digits.length >= 8) return `+${digits}`;
    return null;
}

export function useTelnyxDialer({ enabled, remoteElementId = 'telnyx-remote-audio' }: DialerOptions): CallApi {
    const [sdkReady, setSdkReady] = useState(false);
    const [sdkError, setSdkError] = useState<string | null>(null);
    const [callState, setCallState] = useState<CallState>('idle');
    const [callRecord, setCallRecord] = useState<CallRecordData | null>(null);
    const [duration, setDuration] = useState(0);
    const [statusText, setStatusText] = useState<string | null>(null);
    const [muted, setMuted] = useState(false);
    const [held, setHeld] = useState(false);
    const [recording, setRecording] = useState(false);

    const clientRef = useRef<TelnyxRTC | null>(null);
    const activeCallRef = useRef<any>(null);
    const callRecordRef = useRef<CallRecordData | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => { callRecordRef.current = callRecord; }, [callRecord]);

    // Duration timer ticks only while the WebRTC leg is active.
    useEffect(() => {
        if (callState === 'active') {
            timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [callState]);

    /**
     * Drive local CallState from the SDK's call.state machine. Also PATCHes telnyx_call_control_id
     * back to the server the first time we see it — server-side mute/hold/record use that ID.
     */
    const handleCallUpdate = useCallback(async (call: any) => {
        activeCallRef.current = call;
        const ccId: string | undefined = call.options?.telnyxCallControlId ?? call.telnyxCallControlId;

        const rec = callRecordRef.current;
        if (ccId && rec && !rec.telnyx_call_control_id) {
            try {
                await api(route('crm.voice.attach', { callRecord: rec.id }), {
                    method: 'PATCH',
                    body: JSON.stringify({ telnyx_call_control_id: ccId, status: 'ringing' }),
                });
                setCallRecord({ ...rec, telnyx_call_control_id: ccId });
            } catch { /* non-fatal */ }
        }

        switch (call.state) {
            case 'requesting':
            case 'trying':
            case 'recovering':
            case 'answering':
                setCallState('connecting');
                setStatusText('Connecting…');
                break;
            case 'ringing':
            case 'early':
                setCallState('ringing');
                setStatusText('Ringing…');
                break;
            case 'active':
                setCallState('active');
                setStatusText(null);
                setHeld(false);
                break;
            case 'held':
                setHeld(true);
                break;
            case 'hangup':
            case 'destroy':
            case 'purge':
                setCallState((prev) => prev === 'ended' ? prev : 'ended');
                setStatusText(null);
                activeCallRef.current = null;
                break;
        }
    }, []);

    // Lazy-init the TelnyxRTC client when `enabled` flips true.
    useEffect(() => {
        if (!enabled || clientRef.current) return;
        let cancelled = false;

        (async () => {
            try {
                const res = await api(route('crm.voice.token'));
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error ?? `Token request failed (${res.status})`);
                }
                const { token } = await res.json();
                if (!token) throw new Error('No token returned.');
                if (cancelled) return;

                const client = new TelnyxRTC({ login_token: token });
                client.remoteElement = remoteElementId;

                client.on('telnyx.ready', () => {
                    if (cancelled) return;
                    setSdkReady(true);
                    setSdkError(null);
                });
                client.on('telnyx.error', (err: any) => {
                    if (cancelled) return;
                    setSdkError(err?.error ?? err?.message ?? 'Telnyx connection error');
                });
                client.on('telnyx.socket.close', () => {
                    if (cancelled) return;
                    setSdkReady(false);
                    setTimeout(() => {
                        if (cancelled || !clientRef.current) return;
                        Promise.resolve(clientRef.current.connect()).catch((e: any) => {
                            setSdkError(e?.message ?? 'Reconnect failed.');
                        });
                    }, 1500);
                });
                client.on('telnyx.notification', (notification: any) => {
                    if (cancelled) return;
                    if (notification.type !== 'callUpdate' || !notification.call) return;
                    handleCallUpdate(notification.call);
                });

                await Promise.resolve(client.connect());
                clientRef.current = client;
            } catch (e: any) {
                if (!cancelled) setSdkError(e?.message ?? 'Failed to initialize Telnyx WebRTC.');
            }
        })();

        return () => { cancelled = true; };
    }, [enabled, remoteElementId, handleCallUpdate]);

    // Tear down on unmount.
    useEffect(() => () => {
        if (clientRef.current) {
            try { Promise.resolve(clientRef.current.disconnect()).catch(() => {}); } catch { /* ignore */ }
            clientRef.current = null;
        }
    }, []);

    const startCall = useCallback(async ({ toNumber, contactId, dealId }: StartCallParams): Promise<CallRecordData | null> => {
        if (!clientRef.current || !sdkReady) {
            setSdkError(sdkError ?? 'Telnyx WebRTC is still connecting — try again in a moment.');
            return null;
        }
        if (callState !== 'idle') return null;

        const e164 = normalizeToE164(toNumber);
        if (!e164) {
            setSdkError('Enter a valid phone number.');
            return null;
        }

        setCallState('connecting');
        setStatusText('Connecting…');
        setDuration(0);

        let createdRecord: CallRecordData | null = null;
        try {
            const res = await api(route('crm.voice.call'), {
                method: 'POST',
                body: JSON.stringify({
                    to_number: e164,
                    contact_id: contactId ?? null,
                    deal_id: dealId ?? null,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.call_record) {
                throw new Error(data.error ?? 'Failed to initiate call.');
            }
            createdRecord = data.call_record as CallRecordData;
            setCallRecord(createdRecord);
            callRecordRef.current = createdRecord;

            activeCallRef.current = clientRef.current.newCall({
                destinationNumber: e164,
                callerNumber: createdRecord.from_number,
                callerName: 'BunnyIDX',
                audio: true,
                video: false,
            });
            return createdRecord;
        } catch (e: any) {
            setSdkError(e?.message ?? 'Failed to initiate call.');
            setCallState('idle');
            setStatusText(null);
            if (createdRecord) {
                api(route('crm.voice.end', { callRecord: createdRecord.id }), {
                    method: 'POST',
                    body: JSON.stringify({ status: 'failed', duration_seconds: 0 }),
                }).catch(() => {});
            }
            return null;
        }
    }, [sdkReady, sdkError, callState]);

    const endCall = useCallback(async (notes?: string, status: 'completed' | 'failed' | 'missed' = 'completed') => {
        if (activeCallRef.current) {
            try { activeCallRef.current.hangup(); } catch { /* ignore */ }
            activeCallRef.current = null;
        }
        setCallState('ended');

        const rec = callRecordRef.current;
        if (rec) {
            try {
                await api(route('crm.voice.end', { callRecord: rec.id }), {
                    method: 'POST',
                    body: JSON.stringify({
                        notes: notes ?? null,
                        status,
                        duration_seconds: duration,
                    }),
                });
            } catch { /* ignore */ }
        }
    }, [duration]);

    const sendControl = useCallback(async (action: 'hold' | 'unhold' | 'record_start' | 'record_stop'): Promise<boolean> => {
        const rec = callRecordRef.current;
        if (!rec) return false;
        try {
            const res = await api(route('crm.voice.control', { callRecord: rec.id }), {
                method: 'POST',
                body: JSON.stringify({ action }),
            });
            return res.ok;
        } catch {
            return false;
        }
    }, []);

    const toggleMute = useCallback(() => {
        const call = activeCallRef.current;
        if (!call) return;
        if (muted) {
            try { call.unmuteAudio(); } catch { /* ignore */ }
            setMuted(false);
        } else {
            try { call.muteAudio(); } catch { /* ignore */ }
            setMuted(true);
        }
    }, [muted]);

    const toggleHold = useCallback(async () => {
        const next = !held;
        const ok = await sendControl(next ? 'hold' : 'unhold');
        if (ok) setHeld(next);
    }, [held, sendControl]);

    const toggleRecord = useCallback(async () => {
        const next = !recording;
        const ok = await sendControl(next ? 'record_start' : 'record_stop');
        if (ok) setRecording(next);
    }, [recording, sendControl]);

    const sendDtmf = useCallback((digit: string) => {
        const call = activeCallRef.current;
        if (call && digit) {
            try { call.dtmf(digit); } catch { /* ignore */ }
        }
    }, []);

    /**
     * Reset between calls in a power-dialer session — clears local state but keeps
     * the SDK connection alive for the next dial.
     */
    const resetCall = useCallback(() => {
        setCallState('idle');
        setCallRecord(null);
        callRecordRef.current = null;
        setMuted(false);
        setHeld(false);
        setRecording(false);
        setDuration(0);
        setStatusText(null);
        activeCallRef.current = null;
    }, []);

    return {
        sdkReady,
        sdkError,
        callState,
        callRecord,
        duration,
        statusText,
        muted,
        held,
        recording,
        startCall,
        endCall,
        toggleMute,
        toggleHold,
        toggleRecord,
        sendDtmf,
        resetCall,
    };
}
