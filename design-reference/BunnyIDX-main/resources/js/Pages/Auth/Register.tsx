import InputError from '@/Components/ui/InputError';
import TextInput from '@/Components/ui/TextInput';
import PasswordInput from '@/Components/ui/PasswordInput';
import GoogleButton from '@/Components/ui/GoogleButton';
import Divider from '@/Components/ui/Divider';
import AuthButton from '@/Components/ui/AuthButton';
import AuthSplitLayout from '@/Layouts/AuthSplitLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        country: '',
        password: '',
        password_confirmation: '',
        terms: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthSplitLayout
            title="Create your account"
            subtitle="Sign up for your BunnyChamp workspace to manage leads, listings, and your websites."
            footer={
                <>
                    <p className="mt-8 text-center text-sm text-[#5F656D]">
                        Already have an account?{' '}
                        <Link
                            href={route('login')}
                            className="font-semibold text-[#1693C9] transition-colors hover:text-[#1380AF]"
                        >
                            Sign in
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
            <Head title="Create Account" />

            <GoogleButton label="Sign up with Google" />

            <Divider text="or sign up with email" />

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-[#111315]">
                        Full name
                    </label>
                    <TextInput
                        id="name"
                        name="name"
                        value={data.name}
                        autoComplete="name"
                        isFocused={true}
                        placeholder="Jane Agent"
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />
                    <InputError message={errors.name} />
                </div>

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
                        placeholder="you@agency.com"
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />
                    <InputError message={errors.email} />
                </div>

                <div>
                    <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-[#111315]">
                        Country
                    </label>
                    <select
                        id="country"
                        name="country"
                        value={data.country}
                        onChange={(e) => setData('country', e.target.value)}
                        required
                        className="block w-full rounded-lg border border-[#E4E7EB] bg-white px-3 py-2.5 text-sm text-[#111315] transition-colors focus:border-[#1693C9] focus:outline-none focus:ring-1 focus:ring-[#1693C9]"
                    >
                        <option value="" disabled>Select your country</option>
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                    </select>
                    <p className="mt-1.5 text-xs text-[#8B9096]">
                        BunnyChamp currently supports agents in the United States and Canada.
                    </p>
                    <InputError message={errors.country} />
                </div>

                <div>
                    <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#111315]">
                        Password
                    </label>
                    <PasswordInput
                        id="password"
                        name="password"
                        value={data.password}
                        autoComplete="new-password"
                        placeholder="Create a password"
                        className="pr-11"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    <p className="mt-1.5 text-xs text-[#8B9096]">
                        At least 8 characters, with uppercase &amp; lowercase letters, a number, and a symbol.
                    </p>
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
                        placeholder="Re-enter your password"
                        className="pr-11"
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        required
                    />
                    <InputError message={errors.password_confirmation} />
                </div>

                <div className="flex items-start gap-2.5">
                    <input
                        id="terms"
                        type="checkbox"
                        checked={data.terms}
                        onChange={(e) => setData('terms', e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[#E4E7EB] text-[#1693C9] transition-colors focus:ring-[#1693C9]"
                        required
                    />
                    <label htmlFor="terms" className="cursor-pointer select-none text-xs leading-relaxed text-[#5F656D]">
                        By continuing, you confirm you agree to our{' '}
                        <Link href={route('terms')} className="font-medium text-[#1693C9] transition-colors hover:text-[#1380AF]">Terms &amp; Conditions</Link>
                        {' '}and{' '}
                        <Link href={route('privacy')} className="font-medium text-[#1693C9] transition-colors hover:text-[#1380AF]">Privacy Policy</Link>.
                    </label>
                </div>

                <AuthButton type="submit" disabled={processing}>
                    {processing ? 'Creating account...' : 'Create account'}
                </AuthButton>
            </form>
        </AuthSplitLayout>
    );
}
