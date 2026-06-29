import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';
import { SettingsCard, SettingsSavedIndicator, SettingsUpdateButton } from '@/Components/Crm/SettingsPane';

export default function ChangePasswordPanel() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submitPassword: FormEventHandler = (e) => {
        e.preventDefault();
        passwordForm.put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => passwordForm.reset(),
            onError: (errors) => {
                if (errors.current_password) {
                    passwordForm.reset('current_password');
                    passwordInput.current?.focus();
                }
            },
        });
    };

    return (
        <form onSubmit={submitPassword}>
            <SettingsCard>
                <div>
                    <FieldLabel htmlFor="current_password">Current Password</FieldLabel>
                    <input
                        id="current_password"
                        ref={passwordInput}
                        type="password"
                        autoComplete="current-password"
                        value={passwordForm.data.current_password}
                        onChange={(e) => passwordForm.setData('current_password', e.target.value)}
                        className={inputClass}
                    />
                    {passwordForm.errors.current_password && <p className="mt-1 text-[11px] text-red-500">{passwordForm.errors.current_password}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <FieldLabel htmlFor="new_password">New Password</FieldLabel>
                        <input
                            id="new_password"
                            type="password"
                            autoComplete="new-password"
                            value={passwordForm.data.password}
                            onChange={(e) => passwordForm.setData('password', e.target.value)}
                            className={inputClass}
                        />
                        {passwordForm.errors.password && <p className="mt-1 text-[11px] text-red-500">{passwordForm.errors.password}</p>}
                    </div>
                    <div>
                        <FieldLabel htmlFor="confirm_password">Confirm Password</FieldLabel>
                        <input
                            id="confirm_password"
                            type="password"
                            autoComplete="new-password"
                            value={passwordForm.data.password_confirmation}
                            onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
                            className={inputClass}
                        />
                        {passwordForm.errors.password_confirmation && <p className="mt-1 text-[11px] text-red-500">{passwordForm.errors.password_confirmation}</p>}
                    </div>
                </div>
            </SettingsCard>
            <div className="flex items-center gap-3 mt-4">
                <SettingsUpdateButton processing={passwordForm.processing} />
                <SettingsSavedIndicator visible={passwordForm.recentlySuccessful} label="Updated" />
            </div>
        </form>
    );
}
