import { useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { NotificationPreferences, PageProps } from '@/types';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';
import {
    SettingsCard,
    SettingsSavedIndicator,
    SettingsUpdateButton,
} from '@/Components/Crm/SettingsPane';
import { DataTable, DataTableCell, DataTableHead, DataTableHeadCell, DataTableRow } from '@/Components/ui/DataTable';
import type { PropertyAlertsSettings } from '../Index';

interface Props {
    preferences: NotificationPreferences;
    propertyAlerts: PropertyAlertsSettings;
}

const PROPERTY_ALERT_FREQUENCIES: { value: string; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'twice_weekly', label: 'Twice weekly (recommended)' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'off', label: 'Off' },
];

type Channel = 'email' | 'in_app';
const CHANNELS: Channel[] = ['email', 'in_app'];

interface EventDef {
    key: string;
    label: string;
    description: string;
}

interface EventGroup {
    title: string;
    events: EventDef[];
}

const GROUPS: EventGroup[] = [
    {
        title: 'Contacts',
        events: [
            { key: 'new_contact', label: 'New Contact', description: 'When a team member adds a new contact' },
            { key: 'contact_assigned', label: 'Contact Assigned', description: 'When a contact is assigned to you' },
        ],
    },
    {
        title: 'Deals',
        events: [
            { key: 'deal_created', label: 'Deal Created', description: 'When a new deal is created' },
            { key: 'deal_won', label: 'Deal Won', description: 'When a deal is marked as won' },
            { key: 'deal_lost', label: 'Deal Lost', description: 'When a deal is marked as lost' },
            { key: 'deal_stage_changed', label: 'Stage Changed', description: 'When a deal moves to a new pipeline stage' },
        ],
    },
    {
        title: 'Tasks',
        events: [
            { key: 'task_assigned', label: 'Task Assigned', description: 'When a task is assigned to you' },
            { key: 'task_due_soon', label: 'Task Due Soon', description: 'A reminder before a task is due' },
            { key: 'task_overdue', label: 'Task Overdue', description: 'When one of your tasks passes its due date' },
        ],
    },
    {
        title: 'Team',
        events: [
            { key: 'team_mention', label: 'Team @Mention', description: 'When someone @mentions you in chat' },
        ],
    },
    {
        title: 'Calls',
        events: [
            { key: 'missed_call', label: 'Missed Call', description: 'When you miss a call on your CRM phone number' },
        ],
    },
    {
        title: 'Digests',
        events: [
            { key: 'daily_digest', label: 'Daily Digest', description: 'A summary of your day every morning' },
            { key: 'weekly_digest', label: 'Weekly Digest', description: 'A summary of your week every Monday' },
            { key: 'reminders', label: 'Task & Meeting Reminders', description: 'Per-item reminders for upcoming meetings and task due dates' },
        ],
    },
];

function key(channel: Channel, event: string) {
    return `${channel}_${event}` as const;
}

export default function NotificationsTab({ preferences, propertyAlerts }: Props) {
    // Seed every key explicitly so the form always submits the full matrix.
    const seed: Record<string, boolean | string> = {
        quiet_hours_enabled: !!preferences.quiet_hours_enabled,
        quiet_hours_start: (preferences.quiet_hours_start as string) || '22:00',
        quiet_hours_end: (preferences.quiet_hours_end as string) || '07:00',
        property_alert_frequency: propertyAlerts.frequency || propertyAlerts.default_frequency,
    };
    GROUPS.forEach((g) => {
        g.events.forEach((e) => {
            CHANNELS.forEach((ch) => {
                const k = key(ch, e.key);
                seed[k] = !!preferences[k];
            });
        });
    });

    const { data, setData, patch, processing, recentlySuccessful } = useForm(seed);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('crm.settings.notifications'), { preserveScroll: true });
    };

    function toggleColumn(group: EventGroup, channel: Channel, on: boolean) {
        const updates: Record<string, boolean> = {};
        group.events.forEach((e) => {
            updates[key(channel, e.key)] = on;
        });
        setData({ ...data, ...updates });
    }

    function groupAllOn(group: EventGroup, channel: Channel): boolean {
        return group.events.every((e) => !!data[key(channel, e.key)]);
    }

    return (
        <form onSubmit={submit} className="space-y-6">
            <div>
                <h3 className="text-[14px] font-semibold text-[#111315]">Notification Channels</h3>
                <p className="text-[12px] text-[#5F656D] mt-0.5">
                    Choose how you want to be notified about each event.{' '}
                    <span className="text-[#1f2530] font-medium">In-App</span> appears in the bell menu;{' '}
                    <span className="text-[#1f2530] font-medium">Email</span> goes to {usePage<PageProps>().props.auth.user.email}.
                </p>
            </div>

            {GROUPS.map((group) => (
                <section key={group.title} className="space-y-2">
                    <h4 className="text-[12px] font-semibold tracking-wider text-[#5F656D]">{group.title}</h4>
                    <DataTable>
                        <DataTableHead>
                            <DataTableHeadCell>Event</DataTableHeadCell>
                            <DataTableHeadCell align="right">
                                <ColumnHeader
                                    label="Email"
                                    allOn={groupAllOn(group, 'email')}
                                    onToggleAll={(on) => toggleColumn(group, 'email', on)}
                                />
                            </DataTableHeadCell>
                            <DataTableHeadCell align="right" last>
                                <ColumnHeader
                                    label="In-App"
                                    allOn={groupAllOn(group, 'in_app')}
                                    onToggleAll={(on) => toggleColumn(group, 'in_app', on)}
                                />
                            </DataTableHeadCell>
                        </DataTableHead>
                        <tbody>
                            {group.events.map((event) => (
                                <DataTableRow key={event.key}>
                                    <DataTableCell>
                                        <div className="text-[13px] text-[#111315] font-medium">{event.label}</div>
                                        <div className="text-[11px] text-[#5F656D] mt-0.5">{event.description}</div>
                                    </DataTableCell>
                                    <DataTableCell align="right">
                                        <Toggle
                                            checked={!!data[key('email', event.key)]}
                                            onChange={(v) => setData(key('email', event.key), v)}
                                        />
                                    </DataTableCell>
                                    <DataTableCell align="right" last>
                                        <Toggle
                                            checked={!!data[key('in_app', event.key)]}
                                            onChange={(v) => setData(key('in_app', event.key), v)}
                                        />
                                    </DataTableCell>
                                </DataTableRow>
                            ))}
                        </tbody>
                    </DataTable>
                </section>
            ))}

            {/* Quiet Hours */}
            <section className="space-y-2 pt-2">
                <div>
                    <h3 className="text-[14px] font-semibold text-[#111315]">Quiet Hours</h3>
                    <p className="text-[12px] text-[#5F656D] mt-0.5">
                        Pause non-urgent email notifications during these hours. In-app alerts still arrive in the bell menu.
                    </p>
                </div>
                <SettingsCard>
                    <label className="flex items-start justify-between gap-3 py-1 cursor-pointer">
                        <div className="min-w-0">
                            <div className="text-[13px] text-[#1f2530] font-normal">Enable quiet hours</div>
                            <div className="text-[11px] text-[#8B9096] mt-0.5">Times use your account's timezone.</div>
                        </div>
                        <Toggle checked={!!data.quiet_hours_enabled} onChange={(v) => setData('quiet_hours_enabled', v)} />
                    </label>

                    {!!data.quiet_hours_enabled && (
                        <div className="grid grid-cols-2 gap-5 pt-2 border-t border-[#E4E7EB] max-w-md">
                            <div>
                                <FieldLabel htmlFor="quiet_hours_start">Start</FieldLabel>
                                <input
                                    id="quiet_hours_start"
                                    type="time"
                                    value={data.quiet_hours_start as string}
                                    onChange={(e) => setData('quiet_hours_start', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <FieldLabel htmlFor="quiet_hours_end">End</FieldLabel>
                                <input
                                    id="quiet_hours_end"
                                    type="time"
                                    value={data.quiet_hours_end as string}
                                    onChange={(e) => setData('quiet_hours_end', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    )}
                </SettingsCard>
            </section>

            {/* Property Alerts */}
            <section className="space-y-2 pt-2">
                <div>
                    <h3 className="text-[14px] font-semibold text-[#111315]">Property Alerts</h3>
                    <p className="text-[12px] text-[#5F656D] mt-0.5">
                        Email your website leads when new listings match their saved searches, or when a favorited
                        property drops in price or changes status.
                    </p>
                </div>

                {!propertyAlerts.paid && (
                    <div className="rounded-md border border-[#F0D9A8] bg-[#FFF8EC] px-3.5 py-2.5 text-[12px] text-[#8A6D2B]">
                        <span className="font-semibold">Upgrade required.</span> Automated property alerts are a
                        paid-plan feature. Your leads won&apos;t receive alerts on the free plan — upgrade to turn them on.
                    </div>
                )}

                <SettingsCard>
                    <div className="flex items-start justify-between gap-3 py-1">
                        <div className="min-w-0">
                            <div className="text-[13px] text-[#1f2530] font-normal">Sending frequency</div>
                            <div className="text-[11px] text-[#8B9096] mt-0.5">
                                How often, at most, a lead is emailed about their alerts.
                            </div>
                        </div>
                        <select
                            value={data.property_alert_frequency as string}
                            onChange={(e) => setData('property_alert_frequency', e.target.value)}
                            disabled={!propertyAlerts.paid}
                            className={`${inputClass} max-w-[220px] disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                            {PROPERTY_ALERT_FREQUENCIES.map((f) => (
                                <option key={f.value} value={f.value}>
                                    {f.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-2 mt-1 border-t border-[#E4E7EB] grid grid-cols-2 gap-x-5 gap-y-1.5 text-[12px]">
                        <div className="text-[#5F656D]">This month ({propertyAlerts.usage.month})</div>
                        <div className="text-right text-[#1f2530] font-medium">
                            {(propertyAlerts.usage.sent ?? 0).toLocaleString()} / {(propertyAlerts.usage.included_limit ?? 0).toLocaleString()} sent
                        </div>
                        {(propertyAlerts.usage.overage_emails ?? 0) > 0 && (
                            <>
                                <div className="text-[#5F656D]">
                                    Overage ({propertyAlerts.usage.overage_units ?? 0} × {(propertyAlerts.usage.overage_unit ?? 0).toLocaleString()})
                                </div>
                                <div className="text-right text-[#B45309] font-medium">
                                    ${(propertyAlerts.usage.overage_amount ?? 0).toFixed(2)}
                                </div>
                            </>
                        )}
                    </div>
                </SettingsCard>
            </section>

            <div className="flex items-center gap-3 mt-4">
                <SettingsUpdateButton processing={processing} />
                <SettingsSavedIndicator visible={recentlySuccessful} />
            </div>
        </form>
    );
}

/* ---- local primitives ---- */

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-[18px] w-8 items-center rounded-full transition-colors ${
                checked ? 'bg-[#1693C9]' : 'bg-[#E4E7EB]'
            }`}
        >
            <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    checked ? 'translate-x-4' : 'translate-x-0.5'
                }`}
            />
        </button>
    );
}

function ColumnHeader({ label, allOn, onToggleAll }: { label: string; allOn: boolean; onToggleAll: (on: boolean) => void }) {
    return (
        <div className="inline-flex items-center gap-2 justify-end">
            <span>{label}</span>
            <button
                type="button"
                onClick={() => onToggleAll(!allOn)}
                title={allOn ? 'Turn all off in this group' : 'Turn all on in this group'}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded text-[#1693C9] hover:bg-[#EBF5FF] transition-colors"
            >
                {allOn ? 'All off' : 'All on'}
            </button>
        </div>
    );
}
