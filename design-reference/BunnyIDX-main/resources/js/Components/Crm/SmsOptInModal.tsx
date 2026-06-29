import { useState } from 'react';

interface Props {
    contactName: string;
    contactUuid: string;
    onConsent: () => void;
    onClose: () => void;
}

export default function SmsOptInModal({ contactName, contactUuid, onConsent, onClose }: Props) {
    const [confirming, setConfirming] = useState(false);

    const recordConsent = async () => {
        setConfirming(true);
        try {
            const res = await fetch(route('crm.sms.consent', { contact: contactUuid }), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                },
                body: JSON.stringify({ sms_consent: true }),
            });
            if (res.ok) {
                onConsent();
            }
        } catch {
            alert('Failed to record consent.');
        } finally {
            setConfirming(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-sm font-semibold text-[#111315] mb-2">Record SMS Consent</h3>
                <p className="text-xs text-[#5F656D] mb-4">
                    Before sending SMS messages to <span className="font-medium text-[#5F656D]">{contactName}</span>, you must confirm they have opted in to receive text messages from you.
                </p>

                <div className="bg-[#F9FAFB] border border-[#E4E7EB] rounded-lg p-3 mb-4">
                    <p className="text-[11px] text-[#5F656D] leading-relaxed">
                        By clicking "Confirm Consent" below, you certify that this contact has expressly consented to receive SMS messages from you,
                        in compliance with TCPA regulations and your obligations under 10DLC requirements.
                        The contact has been informed they can reply STOP at any time to opt out.
                    </p>
                </div>

                <div className="flex items-center gap-2 justify-end">
                    <button
                        onClick={onClose}
                        className="h-8 px-4 text-xs font-medium text-[#5F656D] bg-[#F3F4F6] rounded-md hover:bg-[#E4E7EB] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={recordConsent}
                        disabled={confirming}
                        className="h-8 px-4 text-xs font-medium text-white bg-[#1693C9] rounded-md hover:bg-[#1380AF] disabled:opacity-50 transition-colors"
                    >
                        {confirming ? 'Confirming...' : 'Confirm Consent'}
                    </button>
                </div>
            </div>
        </div>
    );
}
