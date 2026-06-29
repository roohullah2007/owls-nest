import InputError from '@/Components/ui/InputError';
import TextInput from '@/Components/ui/TextInput';
import AuthButton from '@/Components/ui/AuthButton';
import AuthSplitLayout from '@/Layouts/AuthSplitLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

export default function TwoFactorChallenge() {
    const [mode, setMode] = useState<'code' | 'recovery'>('code');
    const { data, setData, post, processing, errors, reset } = useForm({
        code: '',
        recovery_code: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('two-factor.login'), {
            onFinish: () => reset('code', 'recovery_code'),
        });
    };

    return (
        <AuthSplitLayout
            title="Two-factor verification"
            subtitle={
                mode === 'code'
                    ? 'Enter the 6-digit code from your authenticator app.'
                    : 'Enter one of your unused recovery codes.'
            }
            footer={
                <div className="mt-6 flex flex-col items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setMode(mode === 'code' ? 'recovery' : 'code')}
                        className="text-xs font-medium text-[#1693C9] transition-colors hover:text-[#1380AF]"
                    >
                        {mode === 'code' ? 'Use a recovery code instead' : 'Use authenticator code instead'}
                    </button>
                    <Link
                        href={route('two-factor.cancel')}
                        method="post"
                        as="button"
                        className="text-xs font-medium text-[#5F656D] transition-colors hover:text-[#111315]"
                    >
                        ← Back to login
                    </Link>
                    {mode === 'recovery' && (
                        <p className="max-w-xs text-center text-xs leading-relaxed text-[#8B9096]">
                            Lost your authenticator and recovery codes?{' '}
                            <a
                                href="mailto:support@bunnychamp.com"
                                className="font-medium text-[#1693C9] transition-colors hover:text-[#1380AF]"
                            >
                                Contact support
                            </a>{' '}
                            to regain access.
                        </p>
                    )}
                </div>
            }
        >
            <Head title="Two-Factor Authentication" />

            <form onSubmit={submit} className="space-y-4">
                {mode === 'code' ? (
                    <div>
                        <TextInput
                            autoFocus
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoComplete="one-time-code"
                            aria-label="Authentication code"
                            maxLength={6}
                            placeholder="123456"
                            value={data.code}
                            onChange={(e) => setData('code', e.target.value.replace(/\D/g, ''))}
                            className="block w-full text-center tracking-[0.4em] text-[18px]"
                        />
                        <InputError message={errors.code} className="mt-2" />
                    </div>
                ) : (
                    <div>
                        <TextInput
                            autoFocus
                            autoComplete="one-time-code"
                            aria-label="Recovery code"
                            placeholder="abcde-fghij"
                            value={data.recovery_code}
                            onChange={(e) => setData('recovery_code', e.target.value)}
                            className="block w-full"
                        />
                        <InputError message={errors.recovery_code || errors.code} className="mt-2" />
                    </div>
                )}

                <AuthButton type="submit" disabled={processing}>
                    {processing ? 'Verifying…' : 'Verify'}
                </AuthButton>
            </form>
        </AuthSplitLayout>
    );
}
