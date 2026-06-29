import React, { useState } from 'react';
import axios from 'axios';

export const SparkleIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>
);

export default function AiFieldButton({ field, websiteId, currentValue, onResult }: { field: string; websiteId: number; currentValue: string; onResult: (value: string) => void }) {
    const [loading, setLoading] = useState(false);

    async function handleClick() {
        setLoading(true);
        try {
            const { data } = await axios.post(route('crm.websites.ai.generate-field', websiteId), {
                field,
                current_value: currentValue || null,
            });
            if (data.value) {
                onResult(data.value);
            }
        } catch {
            // silently fail — user can retry
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#7C3AED] bg-[#7C3AED]/5 hover:bg-[#7C3AED]/15 border border-[#7C3AED]/20 rounded-md transition-colors disabled:opacity-40"
            title={currentValue ? 'Rewrite with AI' : 'Generate with AI'}
        >
            {loading ? (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M12 3a9 9 0 1 1-6.364 2.636" /></svg>
            ) : (
                <SparkleIcon className="h-3.5 w-3.5" />
            )}
            {loading ? 'Writing...' : currentValue ? 'Rewrite' : 'Generate'}
        </button>
    );
}
