import { router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import type { EmailAccount, PageProps } from '@/types';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';
import {
    SettingsCard,
    SettingsSavedIndicator,
    SettingsUpdateButton,
} from '@/Components/Crm/SettingsPane';
import { DataTable, DataTableCell, DataTableHead, DataTableHeadCell, DataTableRow } from '@/Components/ui/DataTable';
import { ProviderIcon, timeAgo } from './profile/helpers';
import type { ResendStatus, SenderAliasStatus } from '../Index';

interface Props {
    emailAccounts: EmailAccount[];
    googleConfigured: boolean;
    resendStatus: ResendStatus;
    senderAlias: SenderAliasStatus;
}

function syncStateBadge(state: string) {
    switch (state) {
        case 'active':
            return <span className="text-[11px] text-[#0E7C0E] bg-[#E7F6E7] border border-[#0E7C0E33] rounded-full px-2 py-0.5">Active</span>;
        case 'syncing':
        case 'pending':
            return <span className="text-[11px] text-[#1693C9] bg-[#EBF5FF] border border-[#BFDBFE] rounded-full px-2 py-0.5">Syncing</span>;
        case 'error':
            return <span className="text-[11px] text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-full px-2 py-0.5">Error</span>;
        default:
            return <span className="text-[11px] text-[#5F656D] bg-[#F3F4F6] border border-[#E4E7EB] rounded-full px-2 py-0.5">{state}</span>;
    }
}

export default function EmailTab({ emailAccounts, googleConfigured, resendStatus, senderAlias }: Props) {
    const { auth } = usePage<PageProps>().props;
    const emailSettings = auth.user.settings?.email ?? {};
    const autoReply = emailSettings.auto_reply ?? {};

    function handleConnectGmail() {
        window.location.href = route('crm.email.oauth.google.redirect');
    }
    function handleDisconnect(account: EmailAccount) {
        if (!confirm(`Disconnect ${account.email_address}? All synced emails from this account will be removed.`)) return;
        router.delete(route('crm.email.accounts.disconnect', { emailAccount: account.id }), { preserveScroll: true });
    }
    function handleSetDefault(account: EmailAccount) {
        router.post(route('crm.email.accounts.default', { emailAccount: account.id }), {}, { preserveScroll: true });
    }
    function handleSync(account: EmailAccount) {
        router.post(route('crm.email.accounts.sync', { emailAccount: account.id }), {}, { preserveScroll: true });
    }

    // Sending preferences + auto-reply form
    const prefsForm = useForm({
        default_from_name: emailSettings.default_from_name ?? '',
        bcc_self: emailSettings.bcc_self ?? false,
        track_opens: emailSettings.track_opens ?? false,
        track_clicks: emailSettings.track_clicks ?? false,
        auto_reply_enabled: autoReply.enabled ?? false,
        auto_reply_subject: autoReply.subject ?? '',
        auto_reply_message: autoReply.message ?? '',
        auto_reply_start_at: autoReply.start_at ?? '',
        auto_reply_end_at: autoReply.end_at ?? '',
    });

    const submitPrefs: FormEventHandler = (e) => {
        e.preventDefault();
        prefsForm.patch(route('crm.settings.email'), { preserveScroll: true });
    };

    return (
        <div className="space-y-8">
            {/* Connected accounts */}
            <section className="space-y-3">
                <div>
                    <h3 className="text-[14px] font-semibold text-[#111315]">Connected Email Accounts</h3>
                    <p className="text-[12px] text-[#5F656D] mt-0.5">
                        Mailboxes used to send and sync messages from the CRM.
                    </p>
                </div>

                {emailAccounts.length === 0 ? (
                    <SettingsCard>
                        <div className="text-[12px] text-[#8B9096]">
                            No email accounts connected yet. Use the buttons below to link Gmail or Outlook.
                        </div>
                    </SettingsCard>
                ) : (
                    <DataTable>
                        <DataTableHead>
                            <DataTableHeadCell>Provider</DataTableHeadCell>
                            <DataTableHeadCell>Email</DataTableHeadCell>
                            <DataTableHeadCell>Status</DataTableHeadCell>
                            <DataTableHeadCell>Last Synced</DataTableHeadCell>
                            <DataTableHeadCell align="right" last>Actions</DataTableHeadCell>
                        </DataTableHead>
                        <tbody>
                            {emailAccounts.map((account) => (
                                <DataTableRow key={account.id}>
                                    <DataTableCell>
                                        <div className="flex items-center gap-2.5">
                                            <ProviderIcon provider={account.provider} className="h-4 w-4" />
                                            <span className="text-[13px] text-[#111315] font-medium capitalize">{account.provider}</span>
                                        </div>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13px] text-[#374151]">{account.email_address}</span>
                                            {account.is_default && (
                                                <span className="text-[10px] text-[#1693C9] bg-[#EBF5FF] border border-[#BFDBFE] rounded-full px-2 py-0.5">Default</span>
                                            )}
                                        </div>
                                        {account.sync_error && (
                                            <div className="text-[11px] text-[#DC2626] mt-1 truncate max-w-xs">{account.sync_error}</div>
                                        )}
                                    </DataTableCell>
                                    <DataTableCell>{syncStateBadge(account.sync_state)}</DataTableCell>
                                    <DataTableCell>
                                        <span className="text-[12px] text-[#5F656D]">
                                            {account.last_synced_at ? timeAgo(new Date(account.last_synced_at).getTime()) : 'Never'}
                                        </span>
                                    </DataTableCell>
                                    <DataTableCell align="right" last>
                                        <div className="inline-flex items-center gap-2">
                                            {!account.is_default && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSetDefault(account)}
                                                    className="h-7 px-3 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors"
                                                >
                                                    Set Default
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleSync(account)}
                                                title="Sync now"
                                                className="h-7 px-3 text-[12px] font-medium text-[#1693C9] border border-[#1693C9] rounded hover:bg-[#EBF5FF] transition-colors"
                                            >
                                                Sync
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDisconnect(account)}
                                                className="h-7 px-3 text-[12px] font-medium text-[#DC2626] border border-[#DC2626] rounded hover:bg-[#FEF2F2] transition-colors"
                                            >
                                                Disconnect
                                            </button>
                                        </div>
                                    </DataTableCell>
                                </DataTableRow>
                            ))}
                        </tbody>
                    </DataTable>
                )}
            </section>

            {/* Connect new account */}
            <section className="space-y-3">
                <div>
                    <h3 className="text-[14px] font-semibold text-[#111315]">Connect an Email Account</h3>
                    <p className="text-[12px] text-[#5F656D] mt-0.5">
                        Link your mailbox to send and receive directly from the CRM.
                    </p>
                </div>
                <SettingsCard className="space-y-3">
                    {googleConfigured ? (
                        <button
                            type="button"
                            onClick={handleConnectGmail}
                            className="flex items-center gap-3 w-full px-4 py-3 border border-[#E4E7EB] rounded hover:bg-[#F9FAFB] transition-colors text-left"
                        >
                            <ProviderIcon provider="google" />
                            <div>
                                <p className="text-[13px] font-medium text-[#111315]">Connect Gmail Account</p>
                                <p className="text-[12px] text-[#5F656D]">Send and receive emails via your Google account.</p>
                            </div>
                        </button>
                    ) : (
                        <div className="px-4 py-3 bg-[#FFF7ED] border border-[#FED7AA] rounded">
                            <p className="text-[12px] text-[#9A3412]">
                                Google OAuth is not configured. Add <code className="bg-[#FEEBC8] px-1 rounded text-[11px]">GOOGLE_CLIENT_ID</code> and <code className="bg-[#FEEBC8] px-1 rounded text-[11px]">GOOGLE_CLIENT_SECRET</code> to your .env file.
                            </p>
                        </div>
                    )}

                    <button
                        type="button"
                        disabled
                        className="flex items-center gap-3 w-full px-4 py-3 border border-[#E4E7EB] rounded opacity-50 cursor-not-allowed text-left"
                    >
                        <ProviderIcon provider="microsoft" />
                        <div>
                            <p className="text-[13px] font-medium text-[#111315]">Connect Outlook Account</p>
                            <p className="text-[12px] text-[#5F656D]">Coming soon.</p>
                        </div>
                    </button>
                </SettingsCard>
            </section>

            {/* Platform sending alias */}
            <SenderAliasSection status={senderAlias} />

            {/* Branded email (Resend) */}
            <ResendSection status={resendStatus} />

            {/* Sending preferences + auto-reply */}
            <form onSubmit={submitPrefs} className="space-y-3">
                <div>
                    <h3 className="text-[14px] font-semibold text-[#111315]">Sending Preferences</h3>
                    <p className="text-[12px] text-[#5F656D] mt-0.5">
                        Controls applied to messages sent from the CRM.
                    </p>
                </div>

                <SettingsCard>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                            <FieldLabel htmlFor="default_from_name" help="Overrides your account name as the sender name on outgoing emails.">
                                Default Sender Name
                            </FieldLabel>
                            <input
                                id="default_from_name"
                                type="text"
                                value={prefsForm.data.default_from_name}
                                onChange={(e) => prefsForm.setData('default_from_name', e.target.value)}
                                placeholder={auth.user.name}
                                className={inputClass}
                            />
                            {prefsForm.errors.default_from_name && <p className="mt-1 text-[11px] text-red-500">{prefsForm.errors.default_from_name}</p>}
                        </div>
                    </div>

                    <div className="border-t border-[#E4E7EB] pt-4 space-y-1">
                        <ToggleRow
                            label="BCC myself on outgoing emails"
                            description="Get a copy of every email you send from the CRM in your inbox."
                            checked={prefsForm.data.bcc_self}
                            onChange={(v) => prefsForm.setData('bcc_self', v)}
                        />
                        <ToggleRow
                            label="Track opens"
                            description="Insert a tiny pixel so the CRM can tell when recipients open your email."
                            checked={prefsForm.data.track_opens}
                            onChange={(v) => prefsForm.setData('track_opens', v)}
                        />
                        <ToggleRow
                            label="Track link clicks"
                            description="Rewrite links so the CRM can record when recipients click them."
                            checked={prefsForm.data.track_clicks}
                            onChange={(v) => prefsForm.setData('track_clicks', v)}
                        />
                    </div>

                    <div className="border-t border-[#E4E7EB] pt-2 text-[12px] text-[#5F656D]">
                        Your email signature lives in{' '}
                        <a href={route('crm.settings.tab', 'profile')} className="text-[#1693C9] font-medium hover:underline">
                            General Settings
                        </a>
                        .
                    </div>
                </SettingsCard>

                {/* Auto-Reply */}
                <div className="pt-2">
                    <h3 className="text-[14px] font-semibold text-[#111315]">Out-of-Office Auto-Reply</h3>
                    <p className="text-[12px] text-[#5F656D] mt-0.5">
                        When enabled, the CRM will reply once to each incoming email with the message below.
                    </p>
                </div>

                <SettingsCard>
                    <ToggleRow
                        label="Enable auto-reply"
                        description="Replies are sent only between the start and end dates if set."
                        checked={prefsForm.data.auto_reply_enabled}
                        onChange={(v) => prefsForm.setData('auto_reply_enabled', v)}
                    />

                    {prefsForm.data.auto_reply_enabled && (
                        <div className="space-y-5 pt-4 border-t border-[#E4E7EB]">
                            <div>
                                <FieldLabel htmlFor="auto_reply_subject">Subject</FieldLabel>
                                <input
                                    id="auto_reply_subject"
                                    type="text"
                                    value={prefsForm.data.auto_reply_subject}
                                    onChange={(e) => prefsForm.setData('auto_reply_subject', e.target.value)}
                                    placeholder="Out of office"
                                    className={inputClass}
                                />
                                {prefsForm.errors.auto_reply_subject && <p className="mt-1 text-[11px] text-red-500">{prefsForm.errors.auto_reply_subject}</p>}
                            </div>
                            <div>
                                <FieldLabel htmlFor="auto_reply_message">Message</FieldLabel>
                                <textarea
                                    id="auto_reply_message"
                                    rows={5}
                                    value={prefsForm.data.auto_reply_message}
                                    onChange={(e) => prefsForm.setData('auto_reply_message', e.target.value)}
                                    placeholder="Thanks for your message! I'm away until ..."
                                    className={inputClass + ' resize-none'}
                                />
                                {prefsForm.errors.auto_reply_message && <p className="mt-1 text-[11px] text-red-500">{prefsForm.errors.auto_reply_message}</p>}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <FieldLabel htmlFor="auto_reply_start_at" help="Optional. Leave blank to start immediately.">Start</FieldLabel>
                                    <input
                                        id="auto_reply_start_at"
                                        type="datetime-local"
                                        value={prefsForm.data.auto_reply_start_at?.slice(0, 16) || ''}
                                        onChange={(e) => prefsForm.setData('auto_reply_start_at', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <FieldLabel htmlFor="auto_reply_end_at" help="Optional. Leave blank for no end date.">End</FieldLabel>
                                    <input
                                        id="auto_reply_end_at"
                                        type="datetime-local"
                                        value={prefsForm.data.auto_reply_end_at?.slice(0, 16) || ''}
                                        onChange={(e) => prefsForm.setData('auto_reply_end_at', e.target.value)}
                                        className={inputClass}
                                    />
                                    {prefsForm.errors.auto_reply_end_at && <p className="mt-1 text-[11px] text-red-500">{prefsForm.errors.auto_reply_end_at}</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </SettingsCard>

                <div className="flex items-center gap-3 mt-4">
                    <SettingsUpdateButton processing={prefsForm.processing} />
                    <SettingsSavedIndicator visible={prefsForm.recentlySuccessful} />
                </div>
            </form>
        </div>
    );
}

/* ---- platform sending alias ---- */

function SenderAliasSection({ status }: { status: SenderAliasStatus }) {
    const form = useForm({
        sender_alias: status.alias ?? '',
        sender_alias_display_name: status.display_name ?? '',
    });

    const save: FormEventHandler = (e) => {
        e.preventDefault();
        form.patch(route('crm.settings.sender-alias.update'), { preserveScroll: true });
    };

    // Live preview of the resulting address as the user edits.
    const previewAlias = form.data.sender_alias.trim();
    const previewEmail = previewAlias
        ? `${previewAlias.toLowerCase().replace(/[^a-z0-9.]+/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '')}.updates@${status.domain}`
        : status.default_sender;

    return (
        <section className="space-y-3">
            <div>
                <h3 className="text-[14px] font-semibold text-[#111315]">Sending Alias</h3>
                <p className="text-[12px] text-[#5F656D] mt-0.5">
                    Platform notification and property-alert emails are sent from your own alias on
                    the verified <code className="text-[#111315]">{status.domain}</code> domain.
                    Leave blank to use the default sender <code className="text-[#111315]">{status.default_sender}</code>.
                </p>
            </div>

            <form onSubmit={save}>
                <SettingsCard className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <FieldLabel htmlFor="sender_alias" help={`Letters, numbers and dots only. Suggested: ${status.suggested}`}>
                                Alias username
                            </FieldLabel>
                            <div className="flex items-center">
                                <input
                                    id="sender_alias"
                                    type="text"
                                    value={form.data.sender_alias}
                                    onChange={(e) => form.setData('sender_alias', e.target.value)}
                                    placeholder={status.suggested}
                                    className={inputClass + ' rounded-r-none'}
                                />
                                <span className="h-9 inline-flex items-center px-2.5 text-[12px] text-[#5F656D] bg-[#F3F4F6] border border-l-0 border-[#E4E7EB] rounded-r whitespace-nowrap">
                                    .updates@{status.domain}
                                </span>
                            </div>
                            {form.errors.sender_alias && <p className="mt-1 text-[11px] text-red-500">{form.errors.sender_alias}</p>}
                        </div>
                        <div>
                            <FieldLabel htmlFor="sender_alias_display_name" help={`Default: ${status.default_name}`}>
                                Display name
                            </FieldLabel>
                            <input
                                id="sender_alias_display_name"
                                type="text"
                                value={form.data.sender_alias_display_name}
                                onChange={(e) => form.setData('sender_alias_display_name', e.target.value)}
                                placeholder={status.default_name}
                                className={inputClass}
                            />
                            {form.errors.sender_alias_display_name && <p className="mt-1 text-[11px] text-red-500">{form.errors.sender_alias_display_name}</p>}
                        </div>
                    </div>

                    <div className="text-[12px] text-[#5F656D] border-t border-[#E4E7EB] pt-3">
                        Sends as{' '}
                        <span className="text-[#111315] font-medium">
                            {(form.data.sender_alias_display_name.trim() || status.default_name)} &lt;{previewEmail}&gt;
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <SettingsUpdateButton processing={form.processing} />
                        <SettingsSavedIndicator visible={form.recentlySuccessful} />
                    </div>
                </SettingsCard>
            </form>
        </section>
    );
}

/* ---- branded email (Resend) ---- */

function ResendSection({ status }: { status: ResendStatus }) {
    const form = useForm({
        resend_api_key: '',
        resend_from_email: status.from_email ?? '',
        resend_from_name: status.from_name ?? '',
    });

    const save: FormEventHandler = (e) => {
        e.preventDefault();
        form.patch(route('crm.settings.resend.update'), {
            preserveScroll: true,
            onSuccess: () => form.reset('resend_api_key'),
        });
    };

    function sendTest() {
        router.post(route('crm.settings.resend.test'), {}, { preserveScroll: true });
    }
    function remove() {
        if (!confirm('Remove your Resend API key? Branded notification emails will fall back to the platform sender.')) return;
        router.delete(route('crm.settings.resend.remove'), { preserveScroll: true });
    }

    const testBadge = (() => {
        switch (status.test_status) {
            case 'passed':
                return <span className="text-[11px] text-[#0E7C0E] bg-[#E7F6E7] border border-[#0E7C0E33] rounded-full px-2 py-0.5">Test passed</span>;
            case 'failed':
                return <span className="text-[11px] text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-full px-2 py-0.5">Test failed</span>;
            default:
                return <span className="text-[11px] text-[#5F656D] bg-[#F3F4F6] border border-[#E4E7EB] rounded-full px-2 py-0.5">Untested</span>;
        }
    })();

    return (
        <section className="space-y-3">
            <div>
                <h3 className="text-[14px] font-semibold text-[#111315]">Branded Email (Resend)</h3>
                <p className="text-[12px] text-[#5F656D] mt-0.5">
                    Add your own Resend API key to send your lead-notification emails from your own verified domain.
                    Without a key, the platform sender is used.
                </p>
            </div>

            {status.configured ? (
                <SettingsCard className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-[#0E7C0E] bg-[#E7F6E7] border border-[#0E7C0E33] rounded-full px-2 py-0.5">Connected</span>
                        {status.last_four && (
                            <span className="text-[12px] text-[#5F656D]">Key ending in <code className="text-[#111315]">{status.last_four}</code></span>
                        )}
                        {testBadge}
                        {status.last_tested_at && (
                            <span className="text-[11px] text-[#8B9096]">tested {timeAgo(new Date(status.last_tested_at).getTime())}</span>
                        )}
                    </div>
                    {(status.from_email || status.from_name) && (
                        <div className="text-[12px] text-[#5F656D]">
                            Sends as{' '}
                            <span className="text-[#111315] font-medium">
                                {status.from_name ? `${status.from_name} <${status.from_email}>` : status.from_email}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={sendTest}
                            className="h-8 px-3 text-[12px] font-medium text-[#1693C9] border border-[#1693C9] rounded hover:bg-[#EBF5FF] transition-colors"
                        >
                            Send test email
                        </button>
                        <button
                            type="button"
                            onClick={remove}
                            className="h-8 px-3 text-[12px] font-medium text-[#DC2626] border border-[#DC2626] rounded hover:bg-[#FEF2F2] transition-colors"
                        >
                            Remove key
                        </button>
                    </div>
                </SettingsCard>
            ) : null}

            <form onSubmit={save}>
                <SettingsCard className="space-y-5">
                    <div>
                        <FieldLabel htmlFor="resend_api_key" help="Stored encrypted. We never display it again after saving.">
                            {status.configured ? 'Replace API key' : 'Resend API key'}
                        </FieldLabel>
                        <input
                            id="resend_api_key"
                            type="password"
                            autoComplete="off"
                            value={form.data.resend_api_key}
                            onChange={(e) => form.setData('resend_api_key', e.target.value)}
                            placeholder="re_xxxxxxxxxxxxxxxx"
                            className={inputClass}
                        />
                        {form.errors.resend_api_key && <p className="mt-1 text-[11px] text-red-500">{form.errors.resend_api_key}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <FieldLabel htmlFor="resend_from_email" help="A verified sender on your Resend domain. Optional.">
                                From email
                            </FieldLabel>
                            <input
                                id="resend_from_email"
                                type="email"
                                value={form.data.resend_from_email}
                                onChange={(e) => form.setData('resend_from_email', e.target.value)}
                                placeholder={status.platform_from ?? 'you@yourdomain.com'}
                                className={inputClass}
                            />
                            {form.errors.resend_from_email && <p className="mt-1 text-[11px] text-red-500">{form.errors.resend_from_email}</p>}
                        </div>
                        <div>
                            <FieldLabel htmlFor="resend_from_name">From name</FieldLabel>
                            <input
                                id="resend_from_name"
                                type="text"
                                value={form.data.resend_from_name}
                                onChange={(e) => form.setData('resend_from_name', e.target.value)}
                                placeholder="Your Name / Brand"
                                className={inputClass}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <SettingsUpdateButton processing={form.processing} label={status.configured ? 'Replace key' : 'Save key'} />
                        <SettingsSavedIndicator visible={form.recentlySuccessful} />
                    </div>
                </SettingsCard>
            </form>
        </section>
    );
}

/* ---- local toggle row ---- */

function ToggleRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-start justify-between gap-3 py-2 cursor-pointer">
            <div className="min-w-0">
                <div className="text-[13px] text-[#1f2530] font-normal">{label}</div>
                {description && <div className="text-[11px] text-[#8B9096] mt-0.5">{description}</div>}
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`shrink-0 relative inline-flex h-[18px] w-8 items-center rounded-full transition-colors ${
                    checked ? 'bg-[#1693C9]' : 'bg-[#E4E7EB]'
                }`}
            >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
        </label>
    );
}
