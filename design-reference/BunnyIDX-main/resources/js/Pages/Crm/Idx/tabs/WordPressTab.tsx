import { router } from '@inertiajs/react';
import type { IdxConnection, License } from '../Index';

const labelClass = 'block text-[12px] font-medium text-[#374151] mb-1.5';

interface Props {
    connections: IdxConnection[];
    licenses: License[];
}

export default function WordPressTab({ connections, licenses }: Props) {
    return (
        <div className="max-w-3xl space-y-4">
            <div className="bg-white border border-[#E4E7EB] rounded-xl">
                <div className="px-5 py-6 border-b border-[#E4E7EB]">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-[#111315] flex items-center justify-center shrink-0">
                            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-base font-semibold text-[#111315]">BunnyChamp IDX for WordPress</h2>
                            <p className="text-xs text-[#5F656D] mt-0.5">Display MLS listings on your WordPress website with shortcodes and widgets</p>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                            <span className="px-2 py-1 text-[11px] font-medium bg-[#F3F4F6] text-[#5F656D] rounded-md">WordPress 6.0+</span>
                            <span className="px-2 py-1 text-[11px] font-medium bg-[#F3F4F6] text-[#5F656D] rounded-md">PHP 8.1+</span>
                        </div>
                    </div>
                </div>
                <div className="px-5 py-4 grid grid-cols-3 gap-4">
                    <div>
                        <p className={labelClass + ' mb-1.5'}>License</p>
                        {licenses.length > 0 ? (
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className={`h-2 w-2 rounded-full ${licenses[0].status === 'active' ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
                                    <span className="text-xs font-medium text-[#111315] capitalize">{licenses[0].status}</span>
                                </div>
                                <code className="text-[11px] font-mono text-[#5F656D] mt-0.5 block truncate">{licenses[0].key}</code>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[#D1D5DB]" />
                                <span className="text-xs text-[#8B9096]">None</span>
                                <button onClick={() => router.post(route('crm.idx.licenses.purchase'))} className="text-[11px] font-medium text-[#1693C9] hover:underline">
                                    Purchase $299
                                </button>
                            </div>
                        )}
                    </div>
                    <div>
                        <p className={labelClass + ' mb-1.5'}>Active Domain</p>
                        {licenses[0]?.active_domain ? (
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                                <span className="text-xs font-medium text-[#111315]">{licenses[0].active_domain.domain}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-[#D1D5DB]" />
                                <span className="text-xs text-[#8B9096]">{licenses.length > 0 ? 'Not activated' : 'N/A'}</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <p className={labelClass + ' mb-1.5'}>MLS Connections</p>
                        {(() => {
                            const active = connections.filter(c => c.is_active && c.test_status === 'passed');
                            return active.length > 0 ? (
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                                        <span className="text-xs font-medium text-[#111315]">{active.length} active</span>
                                    </div>
                                    <p className="text-[11px] text-[#5F656D] mt-0.5 truncate">{active.map(c => c.display_name).join(', ')}</p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                                    <span className="text-xs text-[#8B9096]">None connected</span>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-[#E4E7EB] rounded-xl">
                <div className="px-5 py-3 border-b border-[#E4E7EB]">
                    <p className="text-xs font-semibold text-[#111315]">Setup Guide</p>
                </div>
                <div className="px-5 py-4">
                    <div className="space-y-3">
                        {[
                            { step: 1, title: 'Install the plugin', desc: 'Upload the plugin zip in WordPress → Plugins → Add New → Upload', done: false },
                            { step: 2, title: 'Activate the plugin', desc: 'Click "Activate" after upload completes', done: false },
                            { step: 3, title: 'Enter your license key', desc: licenses.length > 0 ? `Use key: ${licenses[0].key}` : 'Purchase a license first ($299 one-time)', done: licenses.length > 0 },
                            { step: 4, title: 'Connect your MLS', desc: connections.filter(c => c.is_active).length > 0 ? `${connections.filter(c => c.is_active).length} MLS already connected` : 'Go to MLS Connections tab to connect', done: connections.filter(c => c.is_active).length > 0 },
                            { step: 5, title: 'Add listings to pages', desc: 'Use shortcodes or Gutenberg/Elementor widgets', done: false },
                        ].map((item) => (
                            <div key={item.step} className="flex items-start gap-3">
                                <span className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${item.done ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#F3F4F6] text-[#5F656D]'}`}>
                                    {item.done ? (
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                        </svg>
                                    ) : item.step}
                                </span>
                                <div>
                                    <p className="text-xs font-medium text-[#111315]">{item.title}</p>
                                    <p className="text-[11px] text-[#8B9096] mt-0.5">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-[#E4E7EB] rounded-xl px-5 py-4 flex flex-wrap items-center gap-3">
                <button disabled className="h-9 px-6 bg-[#111315] text-white text-xs font-medium rounded-lg opacity-30 cursor-not-allowed">
                    Download Plugin
                </button>
                <span className="text-[11px] text-[#8B9096]">Coming soon</span>
                <div className="flex-1" />
                <a href={route('crm.support.consultation')} className="text-xs font-medium text-[#1693C9] hover:underline">
                    Schedule a Consultation
                </a>
            </div>
        </div>
    );
}
