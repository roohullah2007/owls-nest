import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import type { PhoneNumber, AvailableNumber } from '@/types';
import { formatPhone } from '@/utils/phone';

interface CreditPackage {
    key: string;
    label: string;
    price_cents: number;
    credit_cents: number;
}

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;
// Telnyx returns monthly cost as a raw decimal string (e.g. "1.00000") — render
// it as a clean 2-decimal price.
const perMonth = (cost: number | string | null | undefined) => `$${Number(cost ?? 0).toFixed(2)}/mo`;

interface VoicemailDrop {
    id: number;
    name: string;
    description: string | null;
    duration_seconds: number | null;
    audio_url: string;
    is_default: boolean;
}

interface Props {
    phoneNumbers: PhoneNumber[];
    telnyxConfigured: boolean;
    creditBalanceCents?: number;
    creditPackages?: CreditPackage[];
    stripeConfigured?: boolean;
}

export default function PhoneTab({
    phoneNumbers: initialNumbers,
    telnyxConfigured,
    creditBalanceCents = 0,
    creditPackages = [],
    stripeConfigured = false,
}: Props) {
    const [buying, setBuying] = useState<string | null>(null);

    const buyCredits = (packageKey: string) => {
        setBuying(packageKey);
        router.post(route('crm.credits.checkout'), { package: packageKey }, {
            onFinish: () => setBuying(null),
        });
    };

    const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>(initialNumbers);
    const [areaCode, setAreaCode] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<AvailableNumber[]>([]);
    const [searchError, setSearchError] = useState('');
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [confirmingPurchase, setConfirmingPurchase] = useState<AvailableNumber | null>(null);
    const [releasing, setReleasing] = useState<number | null>(null);

    const searchNumbers = async () => {
        if (areaCode.length !== 3) return;
        setSearching(true);
        setSearchError('');
        setSearchResults([]);

        try {
            const res = await fetch(route('crm.phone-numbers.search', { area_code: areaCode }));
            const data = await res.json();
            if (data.numbers?.length) {
                setSearchResults(data.numbers);
            } else {
                setSearchError('No numbers found for that area code.');
            }
        } catch {
            setSearchError('Failed to search numbers.');
        } finally {
            setSearching(false);
        }
    };

    const purchaseNumber = async (phoneNumber: string) => {
        setPurchasing(phoneNumber);
        try {
            const res = await fetch(route('crm.phone-numbers.purchase'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '' },
                body: JSON.stringify({ phone_number: phoneNumber }),
            });
            const data = await res.json();
            if (res.ok && data.phone_number) {
                setPhoneNumbers((prev) => [...prev, data.phone_number]);
                setSearchResults((prev) => prev.filter((n) => n.phone_number !== phoneNumber));
            } else {
                alert(data.error || 'Failed to purchase number.');
            }
        } catch {
            alert('Failed to purchase number.');
        } finally {
            setPurchasing(null);
        }
    };

    const releaseNumber = async (id: number) => {
        if (!confirm('Release this number? You will lose it and any associated SMS threads.')) return;
        setReleasing(id);
        try {
            const res = await fetch(route('crm.phone-numbers.release', { phoneNumber: id }), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '' },
            });
            if (res.ok) {
                setPhoneNumbers((prev) => prev.filter((n) => n.id !== id));
            }
        } catch {
            alert('Failed to release number.');
        } finally {
            setReleasing(null);
        }
    };

    const setDefault = async (id: number) => {
        try {
            const res = await fetch(route('crm.phone-numbers.default', { phoneNumber: id }), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '' },
            });
            if (res.ok) {
                setPhoneNumbers((prev) =>
                    prev.map((n) => ({ ...n, is_default: n.id === id })),
                );
            }
        } catch {
            alert('Failed to set default.');
        }
    };

    const activeNumbers = phoneNumbers.filter((n) => n.status === 'active');

    // ── Voicedrop templates ──────────────────────────────────────
    const [drops, setDrops] = useState<VoicemailDrop[]>([]);
    const [loadingDrops, setLoadingDrops] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [newDropName, setNewDropName] = useState('');
    const [newDropDescription, setNewDropDescription] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeNumbers.length === 0) return;
        loadDrops();
    }, []);

    async function loadDrops() {
        setLoadingDrops(true);
        try {
            const res = await axios.get(route('crm.voicemail-drops.index'));
            setDrops(res.data);
        } catch {
            // ignore
        } finally {
            setLoadingDrops(false);
        }
    }

    async function uploadDrop() {
        const file = fileInputRef.current?.files?.[0];
        if (!file || !newDropName.trim()) {
            alert('Pick an audio file and give it a name.');
            return;
        }
        setUploading(true);
        try {
            const form = new FormData();
            form.append('audio', file);
            form.append('name', newDropName);
            if (newDropDescription) form.append('description', newDropDescription);
            await axios.post(route('crm.voicemail-drops.store'), form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setNewDropName('');
            setNewDropDescription('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            loadDrops();
        } catch (e: any) {
            alert(e?.response?.data?.message || 'Upload failed.');
        } finally {
            setUploading(false);
        }
    }

    async function deleteDrop(id: number) {
        if (!confirm('Delete this voicedrop?')) return;
        try {
            await axios.delete(route('crm.voicemail-drops.destroy', id));
            setDrops((prev) => prev.filter((d) => d.id !== id));
        } catch {
            alert('Failed to delete.');
        }
    }

    // Phone-credit balance + top-ups. Shown regardless of Telnyx config so users
    // can see/buy credits before (or independent of) provisioning a number.
    const creditsCard = (
        <div className="bg-white border border-[#E4E7EB] rounded-xl p-6">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-[#111315]">Phone Credits</h3>
                <span className="text-sm font-semibold text-[#111315]">{dollars(creditBalanceCents)}</span>
            </div>
            <p className="text-xs text-[#5F656D] mb-4">
                Credits cover SMS, calls and number rental. Buy a top-up to keep your line active.
            </p>

            {!stripeConfigured ? (
                <p className="text-xs text-[#8B9096]">Top-ups are unavailable until billing is configured.</p>
            ) : creditPackages.length === 0 ? (
                <p className="text-xs text-[#8B9096]">No credit packages are available right now.</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {creditPackages.map((pkg) => {
                        const bonus = pkg.credit_cents - pkg.price_cents;
                        return (
                            <button
                                key={pkg.key}
                                onClick={() => buyCredits(pkg.key)}
                                disabled={buying !== null}
                                className="flex flex-col items-center justify-center p-3 border border-[#E4E7EB] rounded-lg hover:border-[#1693C9] hover:bg-[#F6FBFD] transition-colors disabled:opacity-40"
                            >
                                <span className="text-sm font-semibold text-[#111315]">{dollars(pkg.credit_cents)}</span>
                                <span className="text-[11px] text-[#8B9096]">{buying === pkg.key ? 'Redirecting…' : `Pay ${dollars(pkg.price_cents)}`}</span>
                                {bonus > 0 && <span className="text-[10px] font-medium text-[#047857] mt-0.5">+{dollars(bonus)} bonus</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );

    if (!telnyxConfigured) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                {creditsCard}
                <div className="bg-white border border-[#E4E7EB] rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-[#111315] mb-1">Phone & SMS</h3>
                    <p className="text-xs text-[#5F656D]">
                        Phone and SMS features require a Telnyx account. Please configure your Telnyx API key in the environment settings.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Phone credits */}
            {creditsCard}

            {/* Current Numbers */}
            <div className="bg-white border border-[#E4E7EB] rounded-xl p-6">
                <h3 className="text-sm font-semibold text-[#111315] mb-1">Your Phone Numbers</h3>
                <p className="text-xs text-[#5F656D] mb-4">Manage your provisioned phone numbers for calling and texting leads.</p>

                {activeNumbers.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-[#E4E7EB] rounded-lg">
                        <svg className="w-8 h-8 mx-auto text-[#D1D5DB] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <p className="text-xs text-[#8B9096]">No phone numbers yet. Search for one below.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeNumbers.map((num) => (
                            <div
                                key={num.id}
                                className="flex items-center justify-between p-3 border border-[#E4E7EB] rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#E6F0FF] flex items-center justify-center">
                                        <svg className="w-4 h-4 text-[#1693C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-medium text-[#111315]">{formatPhone(num.phone_number)}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[11px] text-[#5F656D]">{perMonth(num.monthly_cost)}</span>
                                            {num.is_default && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#E6F0FF] text-[#1693C9]">
                                                    Default
                                                </span>
                                            )}
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F0FDF4] text-[#16A34A]">
                                                Active
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!num.is_default && (
                                        <button
                                            onClick={() => setDefault(num.id)}
                                            className="px-2.5 py-1 text-[11px] font-medium text-[#5F656D] border border-[#E4E7EB] rounded-md hover:bg-[#F9FAFB] transition-colors"
                                        >
                                            Set Default
                                        </button>
                                    )}
                                    <button
                                        onClick={() => releaseNumber(num.id)}
                                        disabled={releasing === num.id}
                                        className="px-2.5 py-1 text-[11px] font-medium text-[#DC2626] border border-[#FEE2E2] rounded-md hover:bg-[#FEF2F2] disabled:opacity-50 transition-colors"
                                    >
                                        {releasing === num.id ? 'Releasing...' : 'Release'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Search & Purchase */}
            <div className="bg-white border border-[#E4E7EB] rounded-xl p-6">
                <h3 className="text-sm font-semibold text-[#111315] mb-1">Get a New Number</h3>
                <p className="text-xs text-[#5F656D] mb-4">Search by area code to find and purchase a local phone number.</p>

                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={areaCode}
                        onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        placeholder="Area code (e.g. 512)"
                        className="flex-1 h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]"
                        maxLength={3}
                        onKeyDown={(e) => e.key === 'Enter' && searchNumbers()}
                    />
                    <button
                        onClick={searchNumbers}
                        disabled={searching || areaCode.length !== 3}
                        className="h-9 px-4 bg-[#1693C9] text-white text-xs font-medium rounded-md hover:bg-[#1380AF] disabled:opacity-50 transition-colors"
                    >
                        {searching ? 'Searching...' : 'Search'}
                    </button>
                </div>

                {searchError && <p className="text-xs text-[#DC2626] mb-3">{searchError}</p>}

                {searchResults.length > 0 && (
                    <div className="border border-[#E4E7EB] rounded-lg divide-y divide-[#E4E7EB]">
                        {searchResults.map((num) => (
                            <div key={num.phone_number}>
                                <div className="flex items-center justify-between px-3 py-2.5">
                                    <div>
                                        <p className="text-[13px] font-medium text-[#111315]">{formatPhone(num.phone_number)}</p>
                                        <p className="text-[11px] text-[#5F656D]">
                                            {[num.locality, num.region].filter(Boolean).join(', ')}
                                            {num.monthly_cost && ` · ${perMonth(num.monthly_cost)}`}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setConfirmingPurchase(num)}
                                        disabled={purchasing === num.phone_number}
                                        className="px-3 py-1 text-[11px] font-medium text-white bg-[#1693C9] rounded-md hover:bg-[#1380AF] disabled:opacity-50 transition-colors"
                                    >
                                        {purchasing === num.phone_number ? 'Purchasing...' : 'Purchase'}
                                    </button>
                                </div>
                                {confirmingPurchase?.phone_number === num.phone_number && (
                                    <div className="px-3 pb-2.5">
                                        <div className="flex items-center justify-between p-2.5 bg-[#FEF9C3] border border-[#FDE68A] rounded-lg">
                                            <p className="text-[11px] text-[#92400E]">
                                                Purchase {formatPhone(num.phone_number)} for {perMonth(num.monthly_cost)}?
                                            </p>
                                            <div className="flex items-center gap-1.5 ml-3">
                                                <button
                                                    onClick={() => setConfirmingPurchase(null)}
                                                    className="px-2 py-0.5 text-[10px] font-medium text-[#5F656D] bg-white border border-[#E4E7EB] rounded hover:bg-[#F9FAFB] transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => { setConfirmingPurchase(null); purchaseNumber(num.phone_number); }}
                                                    disabled={purchasing === num.phone_number}
                                                    className="px-2 py-0.5 text-[10px] font-medium text-white bg-[#1693C9] rounded hover:bg-[#1380AF] disabled:opacity-50 transition-colors"
                                                >
                                                    Confirm
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Voicedrop Templates — only meaningful when the user has a number */}
            {activeNumbers.length > 0 && (
                <div className="bg-white border border-[#E4E7EB] rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-[#111315] mb-1">Voicedrop templates</h3>
                    <p className="text-xs text-[#5F656D] mb-4">
                        Pre-record a voicemail and drop it on a lead's voicemail without ringing. Triggered from the Inbox composer.
                    </p>

                    {/* Existing drops */}
                    {loadingDrops ? (
                        <p className="text-xs text-[#8B9096]">Loading…</p>
                    ) : drops.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-[#E4E7EB] rounded-lg mb-4">
                            <p className="text-xs text-[#8B9096]">No voicedrop recordings yet.</p>
                        </div>
                    ) : (
                        <ul className="space-y-2 mb-4">
                            {drops.map((d) => (
                                <li key={d.id} className="flex items-center justify-between gap-3 p-3 border border-[#E4E7EB] rounded-lg">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-[#111315] truncate">{d.name}</p>
                                        {d.description && <p className="text-[11px] text-[#5F656D] truncate">{d.description}</p>}
                                    </div>
                                    <audio controls src={d.audio_url} className="h-8 max-w-[180px]" />
                                    <button
                                        onClick={() => deleteDrop(d.id)}
                                        className="px-2.5 py-1 text-[11px] font-medium text-[#DC2626] border border-[#FEE2E2] rounded-md hover:bg-[#FEF2F2] transition-colors"
                                    >
                                        Delete
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Upload */}
                    <div className="border-t border-[#F3F4F6] pt-4 space-y-3">
                        <p className="text-[11px] font-semibold text-[#5F656D] tracking-wide">Upload new template</p>
                        <input
                            type="text"
                            value={newDropName}
                            onChange={(e) => setNewDropName(e.target.value)}
                            placeholder="Template name (e.g. Friendly intro)"
                            className="w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]"
                        />
                        <textarea
                            value={newDropDescription}
                            onChange={(e) => setNewDropDescription(e.target.value)}
                            placeholder="Optional description"
                            rows={2}
                            className="w-full px-3 py-2 text-[13px] border border-[#E4E7EB] rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]"
                        />
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/mp3,audio/wav,audio/mpeg,audio/m4a,audio/ogg"
                            className="text-xs text-[#5F656D] file:mr-3 file:h-8 file:px-3 file:rounded-md file:border file:border-[#E4E7EB] file:bg-white file:text-[#5F656D] file:cursor-pointer file:text-[11px] file:font-medium hover:file:bg-[#F9FAFB]"
                        />
                        <p className="text-[10px] text-[#8B9096]">MP3, WAV, M4A or OGG up to 5MB. The recipient will hear this when their voicemail picks up.</p>
                        <button
                            onClick={uploadDrop}
                            disabled={uploading || !newDropName.trim()}
                            className="h-9 px-5 bg-[#1693C9] text-white text-xs font-medium rounded-md hover:bg-[#1380AF] disabled:opacity-50 transition-colors"
                        >
                            {uploading ? 'Uploading…' : 'Upload template'}
                        </button>
                    </div>
                </div>
            )}

            {/* Webhook configuration hint */}
            <div className="bg-[#F9FAFB] border border-[#E4E7EB] rounded-xl p-4">
                <p className="text-[11px] font-semibold text-[#5F656D] tracking-wider mb-2">Telnyx webhook URLs</p>
                <p className="text-[11px] text-[#5F656D] mb-2">Point your Telnyx Messaging + Voice apps at these URLs to receive inbound messages and call events:</p>
                <ul className="text-[11px] font-mono text-[#111315] space-y-1">
                    <li>SMS: <code className="px-1.5 py-0.5 bg-white border border-[#E4E7EB] rounded text-[10px]">{`${window.location.origin}/webhooks/telnyx/sms`}</code></li>
                    <li>Voice: <code className="px-1.5 py-0.5 bg-white border border-[#E4E7EB] rounded text-[10px]">{`${window.location.origin}/webhooks/telnyx/voice`}</code></li>
                </ul>
            </div>
        </div>
    );
}
