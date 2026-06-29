import { useEffect, useState } from 'react';
import { apiDelete, apiFetch, apiPatch } from '@/utils/api';
import { DataTable, DataTableCell, DataTableHead, DataTableHeadCell, DataTableRow } from '@/Components/ui/DataTable';
import { SettingsCard, SettingsPane, SettingsPaneHeader } from '@/Components/Crm/SettingsPane';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';
import { ProviderIcon, timeAgo } from './helpers';

interface SsoEntry {
    provider: 'google' | 'microsoft' | string;
    label: string;
    connected: boolean;
    configured: boolean;
    identifier: string | null;
}

interface EmailAccountEntry {
    id: number;
    provider: string;
    email_address: string;
    is_default: boolean;
    is_active: boolean;
    last_synced_at: string | null;
}

interface OauthConfig {
    provider: string;
    client_id: string;
    has_client_secret: boolean;
    redirect_uri: string;
}

export default function ConnectedAccountsPane() {
    const [data, setData] = useState<{ is_admin: boolean; sso: SsoEntry[]; email_accounts: EmailAccountEntry[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [configuring, setConfiguring] = useState<string | null>(null);
    const [oauthConfig, setOauthConfig] = useState<OauthConfig | null>(null);
    const [savingConfig, setSavingConfig] = useState(false);

    async function load() {
        try {
            const res = await apiFetch(route('crm.accounts.connections'));
            setData(res);
        } catch (e: any) {
            setError(e.message || 'Failed to load connections.');
        }
    }

    useEffect(() => { load(); }, []);

    function connectGoogle() {
        // Full-page redirect through Socialite.
        window.location.href = route('crm.accounts.google.link.redirect');
    }

    async function disconnectGoogle() {
        if (!confirm('Disconnect Google? You will no longer be able to sign in with Google.')) return;
        setBusy('google');
        try {
            await apiDelete(route('crm.accounts.google.disconnect'));
            await load();
        } catch (e: any) {
            setError(e.message || 'Failed to disconnect.');
        } finally {
            setBusy(null);
        }
    }

    async function openConfigure(provider: string) {
        setError(null);
        setConfiguring(provider);
        setOauthConfig(null);
        try {
            const res = await apiFetch(route('crm.accounts.oauth-config', provider));
            setOauthConfig(res);
        } catch (e: any) {
            setError(e.message || 'Failed to load configuration.');
            setConfiguring(null);
        }
    }

    function closeConfigure() {
        setConfiguring(null);
        setOauthConfig(null);
    }

    async function saveConfigure(clientId: string, clientSecret: string) {
        if (!configuring) return;
        setSavingConfig(true);
        try {
            await apiPatch(route('crm.accounts.oauth-config.update', configuring), {
                client_id: clientId,
                client_secret: clientSecret || undefined,
            });
            closeConfigure();
            await load();
        } catch (e: any) {
            setError(e.message || 'Failed to save configuration.');
        } finally {
            setSavingConfig(false);
        }
    }

    if (!data) {
        return (
            <SettingsPane>
                <SettingsPaneHeader title="Connected Accounts" />
                <SettingsCard>
                    {error
                        ? <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
                        : <div className="text-[12px] text-[#8B9096]">Loading…</div>}
                </SettingsCard>
            </SettingsPane>
        );
    }

    return (
        <SettingsPane>
            <SettingsPaneHeader title="Connected Accounts" />
            <div className="space-y-6">
            {error && (
                <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
            )}

            {/* Single Sign-On */}
            <section className="space-y-3">
                <div>
                    <h3 className="text-[14px] font-semibold text-[#111315]">Single Sign-On</h3>
                    <p className="text-[12px] text-[#5F656D] mt-0.5">
                        Link an identity provider so you can sign in with one click.
                    </p>
                </div>
                <DataTable>
                    <DataTableHead>
                        <DataTableHeadCell>Provider</DataTableHeadCell>
                        <DataTableHeadCell>Account</DataTableHeadCell>
                        <DataTableHeadCell>Status</DataTableHeadCell>
                        <DataTableHeadCell align="right" last>Action</DataTableHeadCell>
                    </DataTableHead>
                    <tbody>
                        {data.sso.map((p) => (
                            <DataTableRow key={p.provider}>
                                <DataTableCell>
                                    <div className="flex items-center gap-2.5">
                                        <ProviderIcon provider={p.provider} />
                                        <span className="text-[13px] text-[#111315] font-medium">{p.label}</span>
                                    </div>
                                </DataTableCell>
                                <DataTableCell>
                                    <span className="text-[13px] text-[#374151]">{p.identifier || '—'}</span>
                                </DataTableCell>
                                <DataTableCell>
                                    {p.connected ? (
                                        <span className="text-[11px] text-[#0E7C0E] bg-[#E7F6E7] border border-[#0E7C0E33] rounded-full px-2 py-0.5">Connected</span>
                                    ) : p.configured ? (
                                        <span className="text-[11px] text-[#5F656D] bg-[#F3F4F6] border border-[#E4E7EB] rounded-full px-2 py-0.5">Not connected</span>
                                    ) : (
                                        <span className="text-[11px] text-[#8B9096] bg-[#F9FAFB] border border-[#E4E7EB] rounded-full px-2 py-0.5">Not configured</span>
                                    )}
                                </DataTableCell>
                                <DataTableCell align="right" last>
                                    {!p.configured ? (
                                        data.is_admin ? (
                                            <button
                                                type="button"
                                                onClick={() => openConfigure(p.provider)}
                                                className="h-7 px-3 text-[12px] font-medium text-[#1693C9] border border-[#1693C9] rounded hover:bg-[#EBF5FF] transition-colors"
                                            >
                                                Configure
                                            </button>
                                        ) : (
                                            <span className="text-[11px] text-[#8B9096]">Contact your admin</span>
                                        )
                                    ) : p.connected ? (
                                        <div className="inline-flex items-center gap-2">
                                            {data.is_admin && (
                                                <button
                                                    type="button"
                                                    onClick={() => openConfigure(p.provider)}
                                                    className="h-7 px-3 text-[12px] font-medium text-[#5F656D] hover:text-[#111315]"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={p.provider === 'google' ? disconnectGoogle : undefined}
                                                disabled={busy === p.provider}
                                                className="h-7 px-3 text-[12px] font-medium text-[#DC2626] border border-[#DC2626] rounded hover:bg-[#FEF2F2] disabled:opacity-50 transition-colors"
                                            >
                                                {busy === p.provider ? 'Disconnecting…' : 'Disconnect'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-2">
                                            {data.is_admin && (
                                                <button
                                                    type="button"
                                                    onClick={() => openConfigure(p.provider)}
                                                    className="h-7 px-3 text-[12px] font-medium text-[#5F656D] hover:text-[#111315]"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={p.provider === 'google' ? connectGoogle : undefined}
                                                disabled={p.provider !== 'google'}
                                                className="h-7 px-3 text-[12px] font-medium text-[#1693C9] border border-[#1693C9] rounded hover:bg-[#EBF5FF] disabled:opacity-30 transition-colors"
                                                title={p.provider !== 'google' ? 'Connect flow not implemented yet' : undefined}
                                            >
                                                Connect
                                            </button>
                                        </div>
                                    )}
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </tbody>
                </DataTable>

                {configuring && oauthConfig && (
                    <OauthConfigForm
                        provider={configuring}
                        initial={oauthConfig}
                        saving={savingConfig}
                        onCancel={closeConfigure}
                        onSave={saveConfigure}
                    />
                )}
            </section>

            {/* Email accounts */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-[14px] font-semibold text-[#111315]">Email Accounts</h3>
                        <p className="text-[12px] text-[#5F656D] mt-0.5">
                            Mailboxes connected for sending and syncing. Manage in Email Settings.
                        </p>
                    </div>
                    <a
                        href={route('crm.settings.tab', 'email')}
                        className="text-[12px] font-medium text-[#1693C9] hover:text-[#1380AF]"
                    >
                        Open Email Settings →
                    </a>
                </div>
                {data.email_accounts.length === 0 ? (
                    <SettingsCard>
                        <div className="text-[12px] text-[#8B9096]">
                            No email accounts connected. Use <span className="text-[#1693C9] font-medium">Email Settings</span> to connect Gmail or Outlook.
                        </div>
                    </SettingsCard>
                ) : (
                    <DataTable>
                        <DataTableHead>
                            <DataTableHeadCell>Provider</DataTableHeadCell>
                            <DataTableHeadCell>Email</DataTableHeadCell>
                            <DataTableHeadCell>Status</DataTableHeadCell>
                            <DataTableHeadCell align="right" last>Last Synced</DataTableHeadCell>
                        </DataTableHead>
                        <tbody>
                            {data.email_accounts.map((acc) => (
                                <DataTableRow key={acc.id}>
                                    <DataTableCell>
                                        <div className="flex items-center gap-2.5">
                                            <ProviderIcon provider={acc.provider} className="h-4 w-4" />
                                            <span className="text-[13px] text-[#111315] font-medium capitalize">{acc.provider}</span>
                                        </div>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13px] text-[#374151]">{acc.email_address}</span>
                                            {acc.is_default && (
                                                <span className="text-[10px] text-[#1693C9] bg-[#EBF5FF] border border-[#BFDBFE] rounded-full px-2 py-0.5">Default</span>
                                            )}
                                        </div>
                                    </DataTableCell>
                                    <DataTableCell>
                                        {acc.is_active ? (
                                            <span className="text-[11px] text-[#0E7C0E] bg-[#E7F6E7] border border-[#0E7C0E33] rounded-full px-2 py-0.5">Active</span>
                                        ) : (
                                            <span className="text-[11px] text-[#8B9096] bg-[#F9FAFB] border border-[#E4E7EB] rounded-full px-2 py-0.5">Inactive</span>
                                        )}
                                    </DataTableCell>
                                    <DataTableCell align="right" last>
                                        <span className="text-[12px] text-[#5F656D]">
                                            {acc.last_synced_at ? timeAgo(new Date(acc.last_synced_at).getTime()) : 'Never'}
                                        </span>
                                    </DataTableCell>
                                </DataTableRow>
                            ))}
                        </tbody>
                    </DataTable>
                )}
            </section>
            </div>
        </SettingsPane>
    );
}

const SETUP_HINTS: Record<string, { href: string; label: string }> = {
    google: { href: 'https://console.cloud.google.com/apis/credentials', label: 'Google Cloud Console' },
    microsoft: { href: 'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade', label: 'Microsoft Entra portal' },
};

function OauthConfigForm({
    provider,
    initial,
    saving,
    onCancel,
    onSave,
}: {
    provider: string;
    initial: OauthConfig;
    saving: boolean;
    onCancel: () => void;
    onSave: (clientId: string, clientSecret: string) => void;
}) {
    const [clientId, setClientId] = useState(initial.client_id);
    const [clientSecret, setClientSecret] = useState('');
    const hint = SETUP_HINTS[provider];

    return (
        <SettingsCard>
            <div className="flex items-center gap-2.5">
                <ProviderIcon provider={provider} />
                <div>
                    <h4 className="text-[14px] font-semibold text-[#111315] capitalize">{provider} OAuth Credentials</h4>
                    <p className="text-[12px] text-[#5F656D] mt-0.5">
                        Create an OAuth client in the{' '}
                        {hint && (
                            <a href={hint.href} target="_blank" rel="noreferrer" className="text-[#1693C9] hover:underline">
                                {hint.label}
                            </a>
                        )}
                        , then paste the client ID and secret here. Stored encrypted; applies app-wide for all users.
                    </p>
                </div>
            </div>

            <div>
                <FieldLabel htmlFor={`${provider}_redirect`}>Redirect URI</FieldLabel>
                <input
                    id={`${provider}_redirect`}
                    type="text"
                    readOnly
                    value={initial.redirect_uri}
                    onFocus={(e) => e.target.select()}
                    className={inputClass + ' font-mono'}
                />
                <p className="text-[11px] text-[#8B9096] mt-1">Copy this into the provider's "Authorized redirect URIs" list.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                    <FieldLabel htmlFor={`${provider}_client_id`}>Client ID</FieldLabel>
                    <input
                        id={`${provider}_client_id`}
                        type="text"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className={inputClass}
                        autoComplete="off"
                    />
                </div>
                <div>
                    <FieldLabel htmlFor={`${provider}_client_secret`} help={initial.has_client_secret ? 'Leave blank to keep the existing secret.' : undefined}>
                        Client Secret
                    </FieldLabel>
                    <input
                        id={`${provider}_client_secret`}
                        type="password"
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder={initial.has_client_secret ? '••••••••• (unchanged)' : ''}
                        className={inputClass}
                        autoComplete="new-password"
                    />
                </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315]"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={() => onSave(clientId, clientSecret)}
                    disabled={saving || !clientId.trim()}
                    className="h-8 px-4 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-50"
                >
                    {saving ? 'Saving…' : 'Save credentials'}
                </button>
            </div>
        </SettingsCard>
    );
}
