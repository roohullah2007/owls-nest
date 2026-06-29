import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { apiDelete, apiFetch, apiPost } from '@/utils/api';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';
import { SettingsCard, SettingsPane, SettingsPaneHeader } from '@/Components/Crm/SettingsPane';
import { DataTable, DataTableCell, DataTableHead, DataTableHeadCell, DataTableRow } from '@/Components/ui/DataTable';
import { ProviderIcon, timeAgo } from './helpers';

/** Unified row — covers both iCal feeds and OAuth-connected calendars. */
interface CalendarRow {
    id: number;
    kind: 'ical' | 'oauth';
    name: string;
    subtitle: string;   // iCal URL or account email
    color: string | null;
    last_synced_at: string | null;
    is_active: boolean;
    provider: 'ical' | 'google' | 'microsoft' | string;
}

interface ApiResponse {
    feeds: CalendarRow[];
    providers: { google: boolean; microsoft: boolean };
}

const FEED_COLORS = ['#6366F1', '#EC4899', '#14B8A6', '#F97316', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16'];

export default function CalendarSyncPane() {
    const [feeds, setFeeds] = useState<CalendarRow[] | null>(null);
    const [providers, setProviders] = useState<{ google: boolean; microsoft: boolean }>({ google: false, microsoft: false });
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [showIcal, setShowIcal] = useState(false);
    const [form, setForm] = useState({ name: '', url: '', color: FEED_COLORS[0] });
    const [copied, setCopied] = useState(false);

    // Public iCal export URL for the CRM's own meetings (same one Meetings → Sync exposes).
    const icalUrl = route('crm.calendar.export-ical');
    const webcalUrl = icalUrl.replace(/^https?:/, 'webcal:');

    async function load() {
        try {
            const res: ApiResponse = await apiFetch(route('crm.calendar-feeds.index'));
            setFeeds(res.feeds);
            setProviders(res.providers);
        } catch (e: any) {
            setError(e.message || 'Failed to load calendar feeds.');
        }
    }

    useEffect(() => { load(); }, []);

    function connectGoogle() {
        if (!providers.google) {
            setError('Google OAuth is not configured. Admins can set it up in Connected Accounts.');
            return;
        }
        window.location.href = route('crm.calendar.oauth.google.redirect');
    }

    function addIcalFeed(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name.trim() || !form.url.trim()) return;
        setBusy('ical-add');
        router.post(route('crm.calendar-feeds.store'), form, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setForm({ name: '', url: '', color: FEED_COLORS[(feeds?.length ?? 0) % FEED_COLORS.length] });
                setShowIcal(false);
                load();
            },
            onError: () => setError('Could not add feed. Check the URL.'),
            onFinish: () => setBusy(null),
        });
    }

    async function syncNow(row: CalendarRow) {
        if (row.kind !== 'ical') return; // OAuth sync is on the server schedule
        const id = `sync-${row.id}`;
        setBusy(id);
        try {
            await apiPost(route('crm.calendar-feeds.sync', row.id));
            await load();
        } catch (e: any) {
            setError(e.message || 'Sync failed.');
        } finally {
            setBusy(null);
        }
    }

    async function removeRow(row: CalendarRow) {
        const id = `rm-${row.kind}-${row.id}`;
        if (!confirm(`Disconnect "${row.name}"? Events from this calendar will stop appearing.`)) return;
        setBusy(id);
        try {
            if (row.kind === 'oauth') {
                await apiDelete(route('crm.calendar-accounts.disconnect', row.id));
            } else {
                await new Promise<void>((resolve, reject) => {
                    router.delete(route('crm.calendar-feeds.destroy', row.id), {
                        preserveScroll: true,
                        preserveState: true,
                        onSuccess: () => resolve(),
                        onError: () => reject(new Error('Delete failed.')),
                    });
                });
            }
            await load();
        } catch (e: any) {
            setError(e.message || 'Remove failed.');
        } finally {
            setBusy(null);
        }
    }

    function copyIcalUrl() {
        navigator.clipboard.writeText(icalUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }

    return (
        <SettingsPane>
            <SettingsPaneHeader title="Calendar Sync" />

            <div className="space-y-6">
                {error && (
                    <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 flex items-start justify-between gap-3">
                        <span>{error}</span>
                        <button type="button" onClick={() => setError(null)} className="text-red-600 hover:text-red-800">×</button>
                    </div>
                )}

                {/* CONNECT — OAuth-first add calendar */}
                <section className="space-y-3">
                    <div>
                        <h3 className="text-[14px] font-semibold text-[#111315]">Add a Calendar</h3>
                        <p className="text-[12px] text-[#5F656D] mt-0.5">
                            Sign in with your calendar provider to pull events into the CRM. Tokens are stored encrypted and only used for read access.
                        </p>
                    </div>

                    <SettingsCard>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={connectGoogle}
                                className="flex items-center gap-3 px-4 py-3 border border-[#E4E7EB] rounded hover:bg-[#F9FAFB] transition-colors text-left"
                            >
                                <ProviderIcon provider="google" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-medium text-[#111315]">Connect Google Calendar</div>
                                    <div className="text-[11px] text-[#5F656D]">
                                        {providers.google
                                            ? 'Opens the Google sign-in flow'
                                            : 'OAuth not configured yet'}
                                    </div>
                                </div>
                                <span className="shrink-0 text-[#1693C9] text-[12px] font-medium">Connect →</span>
                            </button>

                            <button
                                type="button"
                                disabled
                                title="Coming soon"
                                className="flex items-center gap-3 px-4 py-3 border border-[#E4E7EB] rounded opacity-60 cursor-not-allowed text-left"
                            >
                                <ProviderIcon provider="microsoft" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-medium text-[#111315]">Connect Outlook Calendar</div>
                                    <div className="text-[11px] text-[#5F656D]">Coming soon</div>
                                </div>
                                <span className="shrink-0 text-[#8B9096] text-[11px]">Soon</span>
                            </button>
                        </div>

                        <div className="border-t border-[#E4E7EB] pt-3">
                            <button
                                type="button"
                                onClick={() => setShowIcal((v) => !v)}
                                className="text-[12px] font-medium text-[#1693C9] hover:text-[#1380AF]"
                            >
                                {showIcal ? '↑ Hide iCal URL option' : '↓ Or paste an iCal URL (advanced)'}
                            </button>

                            {showIcal && (
                                <form onSubmit={addIcalFeed} className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto_auto] gap-3 items-end">
                                    <div>
                                        <FieldLabel htmlFor="feed_name">Name</FieldLabel>
                                        <input id="feed_name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Calendar" className={inputClass} />
                                    </div>
                                    <div>
                                        <FieldLabel htmlFor="feed_url">iCal URL</FieldLabel>
                                        <input id="feed_url" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://.../basic.ics" className={inputClass} />
                                    </div>
                                    <div>
                                        <FieldLabel htmlFor="feed_color">Color</FieldLabel>
                                        <div className="flex items-center gap-1 h-8">
                                            {FEED_COLORS.map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, color: c })}
                                                    className={`h-5 w-5 rounded-full border-2 ${form.color === c ? 'border-[#111315]' : 'border-transparent'}`}
                                                    style={{ backgroundColor: c }}
                                                    aria-label={`Pick ${c}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={busy === 'ical-add' || !form.name.trim() || !form.url.trim()}
                                        className="h-8 px-4 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-50"
                                    >
                                        {busy === 'ical-add' ? 'Adding…' : 'Add'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </SettingsCard>
                </section>

                {/* CONNECTED — list of all calendars (OAuth + iCal) */}
                <section className="space-y-3">
                    <div>
                        <h3 className="text-[14px] font-semibold text-[#111315]">Connected Calendars</h3>
                        <p className="text-[12px] text-[#5F656D] mt-0.5">
                            Both OAuth-connected and iCal-subscribed calendars pulled into your CRM view.
                        </p>
                    </div>

                    {feeds === null ? (
                        <div className="text-[12px] text-[#8B9096]">Loading…</div>
                    ) : feeds.length === 0 ? (
                        <SettingsCard>
                            <div className="text-[12px] text-[#8B9096]">
                                No calendars connected yet. Use the Google button above, or expand the iCal URL option for any other source.
                            </div>
                        </SettingsCard>
                    ) : (
                        <DataTable>
                            <DataTableHead>
                                <DataTableHeadCell>Calendar</DataTableHeadCell>
                                <DataTableHeadCell>Source</DataTableHeadCell>
                                <DataTableHeadCell>Last Synced</DataTableHeadCell>
                                <DataTableHeadCell align="right" last>Actions</DataTableHeadCell>
                            </DataTableHead>
                            <tbody>
                                {feeds.map((f) => {
                                    const syncKey = `sync-${f.id}`;
                                    const rmKey = `rm-${f.kind}-${f.id}`;
                                    return (
                                        <DataTableRow key={`${f.kind}-${f.id}`}>
                                            <DataTableCell>
                                                <div className="flex items-center gap-2.5">
                                                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: f.color || '#1693C9' }} />
                                                    {f.kind === 'oauth' && <ProviderIcon provider={f.provider} className="h-4 w-4" />}
                                                    <span className="text-[13px] text-[#111315] font-medium">{f.name}</span>
                                                </div>
                                            </DataTableCell>
                                            <DataTableCell>
                                                <span className={`text-[12px] text-[#5F656D] ${f.kind === 'ical' ? 'font-mono truncate max-w-[420px] inline-block align-middle' : ''}`}>{f.subtitle}</span>
                                            </DataTableCell>
                                            <DataTableCell>
                                                <span className="text-[12px] text-[#5F656D]">
                                                    {f.last_synced_at ? timeAgo(new Date(f.last_synced_at).getTime()) : 'Pending'}
                                                </span>
                                            </DataTableCell>
                                            <DataTableCell align="right" last>
                                                <div className="inline-flex items-center gap-2">
                                                    {f.kind === 'ical' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => syncNow(f)}
                                                            disabled={busy === syncKey}
                                                            className="h-7 px-3 text-[12px] font-medium text-[#1693C9] border border-[#1693C9] rounded hover:bg-[#EBF5FF] disabled:opacity-50 transition-colors"
                                                        >
                                                            {busy === syncKey ? 'Syncing…' : 'Sync now'}
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeRow(f)}
                                                        disabled={busy === rmKey}
                                                        className="h-7 px-3 text-[12px] font-medium text-[#DC2626] border border-[#DC2626] rounded hover:bg-[#FEF2F2] disabled:opacity-50 transition-colors"
                                                    >
                                                        Disconnect
                                                    </button>
                                                </div>
                                            </DataTableCell>
                                        </DataTableRow>
                                    );
                                })}
                            </tbody>
                        </DataTable>
                    )}
                </section>

                {/* PUBLISH — CRM events → external calendar (unchanged) */}
                <section className="space-y-3">
                    <div>
                        <h3 className="text-[14px] font-semibold text-[#111315]">Publish to Your Calendar</h3>
                        <p className="text-[12px] text-[#5F656D] mt-0.5">
                            Subscribe to your CRM meetings from any external calendar. Updates show up automatically within a few hours of changes.
                        </p>
                    </div>

                    <SettingsCard>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <a
                                href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-4 py-3 border border-[#E4E7EB] rounded hover:bg-[#F9FAFB] transition-colors text-left"
                            >
                                <ProviderIcon provider="google" className="h-5 w-5" />
                                <div>
                                    <div className="text-[13px] font-medium text-[#111315]">Add to Google Calendar</div>
                                    <div className="text-[11px] text-[#5F656D]">Opens calendar.google.com</div>
                                </div>
                            </a>
                            <a
                                href={`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(icalUrl)}&name=BunnyIDX%20CRM`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-4 py-3 border border-[#E4E7EB] rounded hover:bg-[#F9FAFB] transition-colors text-left"
                            >
                                <ProviderIcon provider="microsoft" className="h-5 w-5" />
                                <div>
                                    <div className="text-[13px] font-medium text-[#111315]">Add to Outlook</div>
                                    <div className="text-[11px] text-[#5F656D]">Opens outlook.live.com</div>
                                </div>
                            </a>
                            <a
                                href={webcalUrl}
                                className="flex items-center gap-3 px-4 py-3 border border-[#E4E7EB] rounded hover:bg-[#F9FAFB] transition-colors text-left"
                            >
                                <svg className="h-5 w-5 text-[#5F656D]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                </svg>
                                <div>
                                    <div className="text-[13px] font-medium text-[#111315]">Subscribe (webcal)</div>
                                    <div className="text-[11px] text-[#5F656D]">Apple Calendar &amp; friends</div>
                                </div>
                            </a>
                        </div>

                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel htmlFor="ical_url" help="Add this URL to any calendar app that supports iCal/ICS subscriptions.">
                                Public iCal URL
                            </FieldLabel>
                            <div className="flex items-center gap-2">
                                <input id="ical_url" type="text" readOnly value={icalUrl} onFocus={(e) => e.target.select()} className={inputClass + ' font-mono'} />
                                <button type="button" onClick={copyIcalUrl} className="shrink-0 h-8 px-3 text-[12px] font-medium text-[#5F656D] border border-[#E4E7EB] rounded hover:bg-[#F9FAFB]">
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                                <a href={icalUrl + '?download=1'} className="shrink-0 h-8 px-3 inline-flex items-center text-[12px] font-medium text-[#5F656D] border border-[#E4E7EB] rounded hover:bg-[#F9FAFB]">
                                    Download .ics
                                </a>
                            </div>
                        </div>
                    </SettingsCard>
                </section>
            </div>
        </SettingsPane>
    );
}
