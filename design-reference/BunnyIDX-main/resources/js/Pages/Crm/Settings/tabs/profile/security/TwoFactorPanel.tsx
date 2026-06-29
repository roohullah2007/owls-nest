import { useEffect, useState } from 'react';
import { apiFetch, apiPost } from '@/utils/api';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';
import { SettingsCard } from '@/Components/Crm/SettingsPane';

export default function TwoFactorPanel() {
    const [status, setStatus] = useState<{ enabled: boolean; pending: boolean } | null>(null);
    const [setup, setSetup] = useState<{ secret: string; qr_svg: string } | null>(null);
    const [confirmCode, setConfirmCode] = useState('');
    const [confirmError, setConfirmError] = useState<string | null>(null);
    const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
    const [disablePassword, setDisablePassword] = useState('');
    const [disableMode, setDisableMode] = useState<'password' | 'code'>('password');
    const [disableCode, setDisableCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function refreshStatus() {
        try {
            const res = await apiFetch(route('crm.security.2fa.status'));
            setStatus(res);
            if (res.enabled) {
                const rc = await apiFetch(route('crm.security.2fa.recovery-codes'));
                setRecoveryCodes(rc.recovery_codes);
            } else {
                setRecoveryCodes(null);
            }
        } catch (e: any) {
            setError(e.message);
        }
    }

    useEffect(() => { refreshStatus(); }, []);

    async function startSetup() {
        setBusy(true);
        setError(null);
        try {
            const res = await apiPost(route('crm.security.2fa.generate'));
            setSetup({ secret: res.secret, qr_svg: res.qr_svg });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function confirm() {
        setConfirmError(null);
        setBusy(true);
        try {
            const res = await apiPost(route('crm.security.2fa.confirm'), { code: confirmCode });
            setRecoveryCodes(res.recovery_codes);
            setSetup(null);
            setConfirmCode('');
            setStatus({ enabled: true, pending: false });
        } catch (e: any) {
            setConfirmError(e.message || 'Invalid code.');
        } finally {
            setBusy(false);
        }
    }

    async function disable() {
        const payload = disableMode === 'password'
            ? { password: disablePassword }
            : { code: disableCode };

        if (disableMode === 'password' && !disablePassword) { setError('Enter your password to disable 2FA.'); return; }
        if (disableMode === 'code' && !disableCode) { setError('Enter a 2FA or recovery code to disable.'); return; }

        setBusy(true);
        setError(null);
        try {
            await apiFetch(route('crm.security.2fa.disable'), {
                method: 'DELETE',
                body: JSON.stringify(payload),
            });
            setDisablePassword('');
            setDisableCode('');
            setRecoveryCodes(null);
            setSetup(null);
            setStatus({ enabled: false, pending: false });
        } catch (e: any) {
            setError(e.message || 'Failed to disable 2FA.');
        } finally {
            setBusy(false);
        }
    }

    async function regenerateRecovery() {
        setBusy(true);
        try {
            const res = await apiPost(route('crm.security.2fa.recovery-codes.regenerate'));
            setRecoveryCodes(res.recovery_codes);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    if (!status) return <SettingsCard><div className="text-[12px] text-[#8B9096]">Loading…</div></SettingsCard>;

    return (
        <SettingsCard>
            <div>
                <h3 className="text-[14px] font-semibold text-[#111315]">Two-Factor Authentication</h3>
                <p className="text-[12px] text-[#5F656D] mt-0.5">
                    Add an extra layer of security by requiring a 6-digit code from your authenticator app at sign-in.
                </p>
            </div>

            {error && <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}

            {!status.enabled && !setup && (
                <button
                    type="button"
                    onClick={startSetup}
                    disabled={busy}
                    className="h-9 px-4 bg-[#1693C9] text-white text-[13px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-50 transition-colors w-fit"
                >
                    {busy ? 'Preparing…' : 'Enable Two-Factor Authentication'}
                </button>
            )}

            {setup && (
                <div className="space-y-4">
                    <div className="text-[13px] text-[#111315]">
                        Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter the 6-digit code it shows.
                    </div>
                    <div className="flex items-start gap-5">
                        <div className="shrink-0 border border-[#E4E7EB] rounded p-2 bg-white" dangerouslySetInnerHTML={{ __html: setup.qr_svg }} />
                        <div className="flex-1 min-w-0 space-y-3">
                            <div>
                                <FieldLabel htmlFor="manual_secret">Manual entry secret</FieldLabel>
                                <input id="manual_secret" readOnly value={setup.secret} className={inputClass + ' font-mono'} onFocus={(e) => e.target.select()} />
                            </div>
                            <div>
                                <FieldLabel htmlFor="confirm_code">6-digit verification code</FieldLabel>
                                <input
                                    id="confirm_code"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={confirmCode}
                                    onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                                    className={inputClass + ' tracking-[0.3em] text-center'}
                                />
                                {confirmError && <p className="mt-1 text-[11px] text-red-500">{confirmError}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={confirm}
                                    disabled={busy || confirmCode.length !== 6}
                                    className="h-9 px-4 bg-[#1693C9] text-white text-[13px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-50 transition-colors"
                                >
                                    {busy ? 'Verifying…' : 'Confirm & Enable'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setSetup(null); setConfirmCode(''); setConfirmError(null); }}
                                    className="h-9 px-3 text-[13px] text-[#5F656D] hover:text-[#111315]"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {status.enabled && (
                <div className="space-y-5">
                    <div className="text-[12px] text-[#0E7C0E] bg-[#E7F6E7] border border-[#0E7C0E33] rounded px-3 py-2 inline-block">
                        Two-factor authentication is enabled on your account.
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h4 className="text-[13px] font-semibold text-[#111315]">Recovery codes</h4>
                                <p className="text-[11px] text-[#5F656D]">Store these somewhere safe. Each can be used once if you lose access to your app.</p>
                            </div>
                            <button
                                type="button"
                                onClick={regenerateRecovery}
                                disabled={busy}
                                className="h-8 px-3 text-[12px] font-medium text-[#5F656D] border border-[#E4E7EB] rounded hover:bg-[#F9FAFB] disabled:opacity-50"
                            >
                                Regenerate
                            </button>
                        </div>
                        {recoveryCodes && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[12px] bg-[#F9FAFB] border border-[#E4E7EB] rounded p-3">
                                {recoveryCodes.map((c) => (<div key={c} className="text-[#111315] select-all">{c}</div>))}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-[#E4E7EB] pt-4">
                        <h4 className="text-[13px] font-semibold text-[#111315] mb-2">Disable Two-Factor</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end max-w-md">
                            {disableMode === 'password' ? (
                                <div>
                                    <FieldLabel htmlFor="disable_password">Current password</FieldLabel>
                                    <input id="disable_password" type="password" autoComplete="current-password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} className={inputClass} />
                                </div>
                            ) : (
                                <div>
                                    <FieldLabel htmlFor="disable_code">2FA or recovery code</FieldLabel>
                                    <input id="disable_code" inputMode="text" autoComplete="one-time-code" placeholder="6-digit code or recovery code" value={disableCode} onChange={(e) => setDisableCode(e.target.value)} className={inputClass} />
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={disable}
                                disabled={busy || (disableMode === 'password' ? !disablePassword : !disableCode)}
                                className="h-9 px-4 text-[13px] font-medium text-[#DC2626] border border-[#DC2626] rounded hover:bg-[#FEF2F2] disabled:opacity-50"
                            >
                                Disable
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setDisableMode(disableMode === 'password' ? 'code' : 'password'); setError(null); }}
                            className="mt-2 text-[12px] text-[#1693C9] hover:underline"
                        >
                            {disableMode === 'password'
                                ? 'Signed up with Google / no password? Use a 2FA code instead'
                                : 'Use my password instead'}
                        </button>
                    </div>
                </div>
            )}
        </SettingsCard>
    );
}
