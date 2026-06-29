import InputError from '@/Components/ui/InputError';
import TextInput from '@/Components/ui/TextInput';
import AuthButton from '@/Components/ui/AuthButton';
import AuthSplitLayout from '@/Layouts/AuthSplitLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <AuthSplitLayout
            title="Reset your password"
            subtitle="Enter your email address and we'll send you a password reset link."
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
            <Head title="Forgot Password" />

            {status && (
                <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {status}
                </div>
            )}

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
                        isFocused={true}
                        placeholder="you@agency.com"
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />
                    <InputError message={errors.email} />
                </div>

                <AuthButton type="submit" disabled={processing}>
                    {processing ? 'Sending...' : 'Send reset link'}
                </AuthButton>
            </form>
        </AuthSplitLayout>
    );
}
