import { useEffect, useState } from 'react';

interface Props {
    contactUuid: string;
    existingSummary?: string | null;
    existingSummaryAt?: string | null;
    onClose: () => void;
}

export default function AiSummaryModal({ contactUuid, existingSummary, existingSummaryAt, onClose }: Props) {
    const [summary, setSummary] = useState(existingSummary || '');
    const [generatedAt, setGeneratedAt] = useState(existingSummaryAt || '');
    const [loading, setLoading] = useState(!existingSummary);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!existingSummary) {
            generate();
        }
    }, []);

    async function generate() {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/crm/contacts/${contactUuid}/ai/summary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                    'Accept': 'application/json',
                },
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                setError(data.error || 'Failed to generate summary.');
            } else {
                setSummary(data.summary);
                setGeneratedAt(data.generated_at);
            }
        } catch {
            setError('Unable to reach AI service. Please try again later.');
        } finally {
            setLoading(false);
        }
    }

    function formatTimestamp(ts: string) {
        if (!ts) return '';
        return new Date(ts).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit',
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative bg-white border border-[#E4E7EB] shadow-xl rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4E7EB] shrink-0">
                    <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                        </svg>
                        <h2 className="text-sm font-semibold text-[#111315]">AI Contact Summary</h2>
                    </div>
                    <button onClick={onClose} className="h-7 w-7 flex items-center justify-center text-[#8B9096] hover:text-[#111315] transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <svg className="animate-spin h-6 w-6 text-[#7C3AED]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <p className="mt-3 text-sm text-[#8B9096]">Generating summary...</p>
                            <p className="text-xs text-[#C4C9D1] mt-1">This may take a few seconds</p>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <svg className="h-4 w-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-medium text-red-800">{error}</p>
                                    {error.includes('not configured') && (
                                        <p className="text-xs text-red-600 mt-1">Add GEMINI_API_KEY to your .env file to enable AI features.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {summary && !loading && (
                        <div className="space-y-4">
                            <div className="text-sm text-[#5F656D] leading-relaxed whitespace-pre-wrap">{summary}</div>
                            {generatedAt && (
                                <p className="text-[11px] text-[#8B9096]">Generated {formatTimestamp(generatedAt)}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#E4E7EB] shrink-0">
                    {summary && !loading && (
                        <button
                            onClick={generate}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5F656D] border border-[#E4E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                            </svg>
                            Regenerate
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-medium bg-[#1693C9] text-white rounded-lg hover:bg-[#1380AF] transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
