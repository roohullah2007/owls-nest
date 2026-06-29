import { useEffect, useRef, useState } from 'react';
import { apiFetch, apiPatch, apiDelete } from '@/utils/api';

/**
 * Settings tab — upload + manage voicemail clips used by Power Dialer's VM Drop.
 *
 * Clips are stored on the public disk so Telnyx can fetch them by URL when the
 * agent triggers VM Drop during a live call (server plays the audio then the
 * call hangs up automatically on playback.ended).
 */

interface Voicemail {
    id: number;
    name: string;
    audio_url: string;
    duration_seconds: number | null;
    is_default: boolean;
    is_team_shared: boolean;
    is_mine: boolean;
    created_at: string;
}

function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

export default function VoicemailsTab() {
    const [voicemails, setVoicemails] = useState<Voicemail[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [isTeamShared, setIsTeamShared] = useState(false);
    const [makeDefault, setMakeDefault] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const data = await apiFetch(route('crm.voicemails.index'));
            setVoicemails(data.voicemails ?? []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function upload(e: React.FormEvent) {
        e.preventDefault();
        const file = fileRef.current?.files?.[0];
        if (!file || !name.trim()) {
            setError('Pick an audio file and give it a name.');
            return;
        }
        setUploading(true);
        setError(null);
        try {
            // Multipart upload — can't use apiPost since that JSON-encodes.
            const fd = new FormData();
            fd.append('name', name);
            fd.append('audio', file);
            if (isTeamShared) fd.append('is_team_shared', '1');
            if (makeDefault) fd.append('is_default', '1');
            const res = await fetch(route('crm.voicemails.store'), {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: fd,
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message ?? body.error ?? `Upload failed (${res.status})`);
            }
            setName('');
            setIsTeamShared(false);
            setMakeDefault(false);
            if (fileRef.current) fileRef.current.value = '';
            await load();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setUploading(false);
        }
    }

    async function destroy(vm: Voicemail) {
        if (!confirm(`Delete "${vm.name}"?`)) return;
        try {
            await apiDelete(route('crm.voicemails.destroy', { voicemail: vm.id }));
            await load();
        } catch (e: any) { alert(e.message); }
    }

    async function setDefault(vm: Voicemail) {
        try {
            await apiPatch(route('crm.voicemails.default', { voicemail: vm.id }));
            await load();
        } catch (e: any) { alert(e.message); }
    }

    return (
        <div className="max-w-3xl">
            <header className="mb-6">
                <h2 className="text-[18px] font-semibold text-[#111315]">Voicemails</h2>
                <p className="text-[13px] text-[#5F656D] mt-1">Pre-record voicemail clips your agents can drop on a live call with one click. Max 5MB per clip; MP3 / WAV / M4A / OGG.</p>
            </header>

            <form onSubmit={upload} className="bg-white border border-[#E4E7EB] rounded-xl p-5 mb-6 space-y-3">
                <h3 className="text-[14px] font-semibold text-[#111315]">Upload a new clip</h3>
                {error && (
                    <div className="px-3 py-2 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[11px] text-[#DC2626]">{error}</div>
                )}
                <div>
                    <label className="block text-[10px] font-semibold text-[#5F656D] tracking-wider mb-1">Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Standard intro — voicemail"
                        className="w-full py-2 px-3 text-[13px] text-[#111315] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1693C9]"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-semibold text-[#5F656D] tracking-wider mb-1">Audio file</label>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="audio/mpeg,audio/wav,audio/x-m4a,audio/ogg"
                        className="w-full text-[12px] text-[#5F656D] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[12px] file:font-medium file:bg-[#F3F4F6] file:text-[#111315] hover:file:bg-[#E4E7EB]"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-[12px] text-[#5F656D]">
                        <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} className="h-4 w-4 rounded text-[#1693C9]" />
                        Make default
                    </label>
                    <label className="flex items-center gap-2 text-[12px] text-[#5F656D]">
                        <input type="checkbox" checked={isTeamShared} onChange={(e) => setIsTeamShared(e.target.checked)} className="h-4 w-4 rounded text-[#1693C9]" />
                        Share with team
                    </label>
                </div>
                <button
                    type="submit"
                    disabled={uploading}
                    className="h-9 px-4 text-[12px] font-medium text-white bg-[#1693C9] rounded-md hover:bg-[#1380AF] disabled:opacity-50"
                >
                    {uploading ? 'Uploading…' : 'Upload clip'}
                </button>
            </form>

            <h3 className="text-[12px] font-semibold text-[#8B9096] tracking-wider mb-2">Your clips</h3>
            {loading ? (
                <p className="text-[12px] text-[#8B9096]">Loading…</p>
            ) : voicemails.length === 0 ? (
                <p className="text-[12px] text-[#8B9096] italic bg-white border border-[#E4E7EB] rounded-xl p-6 text-center">No clips yet. Upload one above to enable VM Drop.</p>
            ) : (
                <ul className="bg-white border border-[#E4E7EB] rounded-xl overflow-hidden">
                    {voicemails.map((vm) => (
                        <li key={vm.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#F3F4F6] last:border-b-0">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-[13px] font-medium text-[#111315] truncate">{vm.name}</p>
                                    {vm.is_default && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#047857] text-[10px] font-medium">Default</span>}
                                    {vm.is_team_shared && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#EDE5FB] text-[#1693C9] text-[10px] font-medium">Team</span>}
                                </div>
                                <audio src={vm.audio_url} controls preload="none" className="mt-1 h-7 w-full max-w-xs" />
                            </div>
                            {!vm.is_default && vm.is_mine && (
                                <button onClick={() => setDefault(vm)} className="text-[11px] text-[#1693C9] hover:underline shrink-0">Make default</button>
                            )}
                            {vm.is_mine && (
                                <button onClick={() => destroy(vm)} className="text-[11px] text-[#DC2626] hover:underline shrink-0">Delete</button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
