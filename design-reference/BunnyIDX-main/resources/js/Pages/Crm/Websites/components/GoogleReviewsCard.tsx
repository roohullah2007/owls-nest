import React, { useState } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { AgentWebsite, GoogleReviewsConfig } from '../types';
import { TestimonialItem } from '../hooks/useTestimonials';
import { inputClass } from '../constants';

interface Candidate {
    place_id: string;
    name: string;
    formatted_address: string | null;
    rating: number | null;
    user_ratings_total: number | null;
}

/**
 * "Google Reviews" card shown above the testimonials list — connect a Google
 * Business Profile, import its reviews as testimonials, and re-sync on demand.
 */
export default function GoogleReviewsCard({ website, items, onImported }: {
    website: AgentWebsite;
    items: TestimonialItem[];
    onImported: (testimonials: TestimonialItem[]) => void;
}) {
    const [config, setConfig] = useState<GoogleReviewsConfig | null>(
        website.page_data?._config?.google_reviews ?? null,
    );
    const [query, setQuery] = useState('');
    const [candidates, setCandidates] = useState<Candidate[] | null>(null);
    const [busy, setBusy] = useState<string | null>(null); // 'search' | 'sync' | place_id being connected
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);

    const importedCount = items.filter((t) => t.source === 'google').length;

    function refreshWebsiteProp() {
        router.reload({ only: ['websites', 'editing'] });
    }

    async function search() {
        if (!query.trim() || busy) return;
        setBusy('search');
        setError(null);
        setCandidates(null);
        try {
            const res = await axios.post(`/api/website-editor/${website.id}/google-reviews/search`, { query: query.trim() });
            setCandidates(res.data.candidates ?? []);
        } catch {
            setError('Search failed. Please try again.');
        } finally {
            setBusy(null);
        }
    }

    async function connect(candidate: Candidate) {
        if (busy) return;
        setBusy(candidate.place_id);
        setError(null);
        try {
            const res = await axios.post(`/api/website-editor/${website.id}/google-reviews/connect`, {
                place_id: candidate.place_id,
                name: candidate.name,
                address: candidate.formatted_address,
            });
            setConfig({
                place_id: candidate.place_id,
                name: candidate.name,
                address: candidate.formatted_address,
                connected_at: new Date().toISOString(),
            });
            setCandidates(null);
            setQuery('');
            onImported(res.data.testimonials ?? []);
            setFeedback(`Imported ${res.data.imported ?? 0} review${res.data.imported === 1 ? '' : 's'}`);
            refreshWebsiteProp();
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Could not connect this business. Please try again.');
        } finally {
            setBusy(null);
        }
    }

    async function sync() {
        if (busy) return;
        setBusy('sync');
        setError(null);
        setFeedback(null);
        try {
            const res = await axios.post(`/api/website-editor/${website.id}/google-reviews/sync`);
            onImported(res.data.testimonials ?? []);
            setFeedback(`Imported ${res.data.imported ?? 0} review${res.data.imported === 1 ? '' : 's'}`);
            refreshWebsiteProp();
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Could not update reviews. Please try again.');
        } finally {
            setBusy(null);
        }
    }

    async function disconnect() {
        if (busy || !confirm('Disconnect this Google Business Profile? Already-imported testimonials are kept.')) return;
        setError(null);
        setFeedback(null);
        try {
            await axios.delete(`/api/website-editor/${website.id}/google-reviews`);
            setConfig(null);
            refreshWebsiteProp();
        } catch {
            setError('Could not disconnect. Please try again.');
        }
    }

    return (
        <div className="bg-white border border-[#E4E7EB] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
                <span className="h-8 w-8 rounded-[4px] bg-[#E0F2FE] flex items-center justify-center shrink-0">
                    <svg className="h-4 w-4 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>
                </span>
                <h4 className="text-sm font-semibold text-[#111315]">Google Reviews</h4>
            </div>

            {config ? (
                <div className="mt-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[#111315] truncate">{config.name}</p>
                            {config.address && <p className="text-[11px] text-[#8B9096] truncate">{config.address}</p>}
                            <p className="text-[11px] text-[#5F656D] mt-0.5">
                                {importedCount} review{importedCount === 1 ? '' : 's'} imported
                                {feedback && <span className="ml-2 font-medium text-[#1693C9]">{feedback}</span>}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={sync}
                                disabled={busy !== null}
                                className="h-8 px-4 bg-[#1693C9] text-white text-[12px] font-medium rounded-md hover:bg-[#1380AF] disabled:opacity-50 transition-colors"
                            >
                                {busy === 'sync' ? 'Updating…' : 'Update reviews'}
                            </button>
                            <button type="button" onClick={disconnect} className="text-[12px] font-medium text-[#5F656D] hover:text-[#DC2626] transition-colors">
                                Disconnect
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mt-3">
                    <p className="text-[12px] text-[#5F656D] mb-2">Connect your Google Business Profile to import its reviews as testimonials.</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }}
                            className={inputClass}
                            placeholder="Search your business (name + city or address)"
                        />
                        <button
                            type="button"
                            onClick={search}
                            disabled={busy !== null || !query.trim()}
                            className="h-9 px-4 bg-[#1693C9] text-white text-[12px] font-medium rounded-md hover:bg-[#1380AF] disabled:opacity-50 transition-colors shrink-0"
                        >
                            {busy === 'search' ? 'Searching…' : 'Search'}
                        </button>
                    </div>

                    {candidates !== null && (
                        candidates.length === 0 ? (
                            <p className="text-[12px] text-[#8B9096] mt-3">No businesses found. Try adding the city or full address.</p>
                        ) : (
                            <div className="mt-3 border border-[#E4E7EB] rounded-lg divide-y divide-[#E4E7EB] overflow-hidden">
                                {candidates.map((c) => (
                                    <div key={c.place_id} className="flex items-center gap-3 px-3 py-2.5 bg-white">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] font-medium text-[#111315] truncate">{c.name}</p>
                                            <p className="text-[11px] text-[#8B9096] truncate">
                                                {c.formatted_address}
                                                {c.rating != null && (
                                                    <span className="ml-2 text-[#D97706]">★ {c.rating}{c.user_ratings_total != null && ` (${c.user_ratings_total})`}</span>
                                                )}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => connect(c)}
                                            disabled={busy !== null}
                                            className="h-7 px-3 text-[12px] font-medium text-[#1693C9] border border-[#1693C9] rounded-md hover:bg-[#E0F2FE] disabled:opacity-50 transition-colors shrink-0"
                                        >
                                            {busy === c.place_id ? 'Connecting…' : 'Connect'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            )}

            {error && <p className="text-[12px] text-[#DC2626] mt-2">{error}</p>}
            <p className="text-[11px] text-[#8B9096] mt-3">Google provides up to 5 of your most relevant reviews.</p>
        </div>
    );
}
