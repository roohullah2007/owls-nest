import InputError from '@/Components/ui/InputError';
import TextInput from '@/Components/ui/TextInput';
import PasswordInput from '@/Components/ui/PasswordInput';
import AuthButton from '@/Components/ui/AuthButton';
import AuthSplitLayout from '@/Layouts/AuthSplitLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ResetPassword({
    token,
    email,
}: {
    token: string;
    email: string;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthSplitLayout
            title="Set a new password"
            subtitle="Choose a new password for your account below. This reset link expires 60 minutes after it was requested."
            footer={
                <p className="mt-8 text-center text-sm text-[#5F656D]">
                    <Link
                        href={route('login')}
                        className="font-semibold text-[#1693C9] transition-colors hover:text-[#1380AF]"
                    >
                        Back to login
                    </Link>
                </p>
            }
        >
            <Head title="Reset Password" />

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#111315]">
                        Email
                    </label>
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        autoComplete="username"
                        readOnly
                        className="cursor-not-allowed bg-[#F9FAFB]"
                        onChange={(e) => setData('email', e.target.value)}
                    />
                    <InputError message={errors.email} />
                </div>

                <div>
                    <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#111315]">
                        New password
                    </label>
                    <PasswordInput
                        id="password"
                        name="password"
                        value={data.password}
                        autoComplete="new-password"
                        isFocused={true}
                        placeholder="New password"
                        className="pr-11"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    <InputError message={errors.password} />
                </div>

                <div>
                    <label htmlFor="password_confirmation" className="mb-1.5 block text-sm font-medium text-[#111315]">
                        Confirm password
                    </label>
                    <PasswordInput
                        id="password_confirmation"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        autoComplete="new-password"
                        placeholder="Confirm new password"
                        className="pr-11"
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        required
                    />
                    <InputError message={errors.password_confirmation} />
                </div>

                <AuthButton type="submit" disabled={processing}>
                    {processing ? 'Resetting...' : 'Reset password'}
                </AuthButton>
            </form>
        </AuthSplitLayout>
    );
}
