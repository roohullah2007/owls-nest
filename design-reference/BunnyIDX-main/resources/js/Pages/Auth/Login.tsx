import InputError from '@/Components/ui/InputError';
import TextInput from '@/Components/ui/TextInput';
import PasswordInput from '@/Components/ui/PasswordInput';
import GoogleButton from '@/Components/ui/GoogleButton';
import Divider from '@/Components/ui/Divider';
import AuthButton from '@/Components/ui/AuthButton';
import AuthSplitLayout from '@/Layouts/AuthSplitLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthSplitLayout
            title="Welcome back"
            subtitle="Sign in to your BunnyChamp workspace to manage leads, listings, and your websites."
            footer={
                <>
                    <p className="mt-8 text-center text-sm text-[#5F656D]">
                        Don't have an account?{' '}
                        <Link
                            href={route('register')}
                            className="font-semibold text-[#1693C9] transition-colors hover:text-[#1380AF]"
                        >
                            Create one
                        </Link>
                    </p>

                    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#8B9096]">
                        <Link href={route('privacy')} className="transition-colors hover:text-[#5F656D]">Privacy Policy</Link>
                        <span>·</span>
                        <Link href={route('terms')} className="transition-colors hover:text-[#5F656D]">Terms of Service</Link>
                    </div>
                </>
            }
        >
            <Head title="Log in" />

            {status && (
                <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {status}
                </div>
            )}

            <GoogleButton />

            <Divider text="or sign in with email" />

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

                <div>
                    <div className="mb-1.5 flex items-center justify-between">
                        <label htmlFor="password" className="block text-sm font-medium text-[#111315]">
                            Password
                        </label>
                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-xs font-medium text-[#1693C9] transition-colors hover:text-[#1380AF]"
                            >
                                Forgot password?
                            </Link>
                        )}
                    </div>
                    <PasswordInput
                        id="password"
                        name="password"
                        value={data.password}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        className="pr-11"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    <InputError message={errors.password} />
                </div>

                <div className="flex items-center">
                    <input
                        id="remember"
                        type="checkbox"
                        checked={data.remember}
                        onChange={(e) => setData('remember', e.target.checked)}
                        className="h-4 w-4 cursor-pointer rounded border-[#E4E7EB] text-[#1693C9] transition-colors focus:ring-[#1693C9]"
                    />
                    <label htmlFor="remember" className="ml-2.5 cursor-pointer select-none text-sm text-[#5F656D]">
                        Keep me signed in
                    </label>
                </div>

                <AuthButton type="submit" disabled={processing}>
                    {processing ? 'Signing in...' : 'Sign in'}
                </AuthButton>
            </form>
        </AuthSplitLayout>
    );
}
