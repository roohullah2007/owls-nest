import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

interface CampaignStatus {
    id: number;
    status: string;
    total_recipients: number;
    sent_count: number;
    failed_count: number;
    skipped_count: number;
    started_at: string | null;
    completed_at: string | null;
}

interface Props {
    campaignId: number;
    onDone: () => void;
}

export default function BulkEmailProgress({ campaignId, onDone }: Props) {
    const [campaign, setCampaign] = useState<CampaignStatus | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const poll = async () => {
        try {
            const res = await axios.get(route('crm.contacts.bulk-email.status', { campaign: campaignId }));
            const c = res.data.campaign;
            setCampaign(c);

            if (c.status === 'completed' || c.status === 'cancelled' || c.status === 'failed') {
                if (intervalRef.current) clearInterval(intervalRef.current);
            }
        } catch {
            // Silently handle polling errors
        }
    };

    useEffect(() => {
        poll();
        intervalRef.current = setInterval(poll, 3000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [campaignId]);

    const handlePause = async () => {
        try {
            await axios.post(route('crm.contacts.bulk-email.pause', { campaign: campaignId }));
            poll();
        } catch {}
    };

    const handleResume = async () => {
        try {
            await axios.post(route('crm.contacts.bulk-email.resume', { campaign: campaignId }));
            poll();
        } catch {}
    };

    const handleCancel = async () => {
        try {
            await axios.post(route('crm.contacts.bulk-email.cancel', { campaign: campaignId }));
            poll();
        } catch {}
    };

    if (!campaign) return null;

    const total = campaign.total_recipients;
    const processed = campaign.sent_count + campaign.failed_count + campaign.skipped_count;
    const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
    const isActive = campaign.status === 'sending' || campaign.status === 'pending';
    const isPaused = campaign.status === 'paused';
    const isDone = campaign.status === 'completed' || campaign.status === 'cancelled' || campaign.status === 'failed';

    return (
        <div className="fixed bottom-16 right-4 z-50 w-80 bg-white border border-[#E4E7EB] rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#E4E7EB] bg-[#F9FAFB]">
                <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-[#7C36EE]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                    <span className="text-xs font-semibold text-[#111315]">Bulk Email</span>
                </div>
                {isDone && (
                    <button
                        onClick={onDone}
                        className="text-[#8B9096] hover:text-[#111315] transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Progress */}
            <div className="px-3 py-3">
                {/* Bar */}
                <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden mb-2">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${pct}%`,
                            backgroundColor: campaign.status === 'failed' ? '#DC2626' : campaign.status === 'cancelled' ? '#8B9096' : '#7C36EE',
                        }}
                    />
                </div>

                {/* Status text */}
                <div className="flex items-center justify-between">
                    <p className="text-[11px] text-[#5F656D]">
                        {isActive && (
                            <>
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7C36EE] mr-1 animate-pulse" />
                                Sending... {campaign.sent_count}/{total}
                            </>
                        )}
                        {isPaused && (
                            <>
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 mr-1" />
                                Paused — {campaign.sent_count}/{total} sent
                            </>
                        )}
                        {campaign.status === 'completed' && (
                            <>
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1" />
                                Completed: {campaign.sent_count} sent
                                {campaign.failed_count > 0 && `, ${campaign.failed_count} failed`}
                            </>
                        )}
                        {campaign.status === 'cancelled' && (
                            <>
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#8B9096] mr-1" />
                                Cancelled — {campaign.sent_count} sent
                            </>
                        )}
                        {campaign.status === 'failed' && (
                            <>
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 mr-1" />
                                Failed
                            </>
                        )}
                    </p>
                    <span className="text-[10px] text-[#8B9096]">{pct}%</span>
                </div>

                {/* Actions */}
                {(isActive || isPaused) && (
                    <div className="flex items-center gap-1.5 mt-2">
                        {isActive && (
                            <button
                                onClick={handlePause}
                                className="flex items-center gap-1 h-6 px-2 text-[10px] font-medium text-[#5F656D] bg-[#F3F4F6] border border-[#E4E7EB] rounded-md hover:bg-[#E4E7EB] transition-colors"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                                </svg>
                                Pause
                            </button>
                        )}
                        {isPaused && (
                            <button
                                onClick={handleResume}
                                className="flex items-center gap-1 h-6 px-2 text-[10px] font-medium text-[#7C36EE] bg-[#F5F3FF] border border-[#E8E0FF] rounded-md hover:bg-[#EDE9FE] transition-colors"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                                </svg>
                                Resume
                            </button>
                        )}
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-1 h-6 px-2 text-[10px] font-medium text-red-500 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
