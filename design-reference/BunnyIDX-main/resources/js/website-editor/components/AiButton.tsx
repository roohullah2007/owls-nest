import React, { useState } from 'react';
import { api } from '../api';

interface AiButtonProps {
    siteId: number;
    field: string;
    currentValue: string;
    onGenerated: (value: string) => void;
}

export default function AiButton({ siteId, field, currentValue, onGenerated }: AiButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            const res = await api.aiGenerate(siteId, field, currentValue);
            if (res.value) {
                onGenerated(res.value);
            }
        } catch {
            // Silently fail — field stays unchanged
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            className="we-ai-btn"
            onClick={handleClick}
            disabled={loading}
            title="Generate with AI"
        >
            {loading ? (
                <svg className="we-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4m0 12v4m-7.07-3.93 2.83-2.83m8.48-8.48 2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83" />
                </svg>
            ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
            )}
            <span>{loading ? 'Generating...' : 'AI'}</span>
        </button>
    );
}
