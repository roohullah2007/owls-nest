import AuthButton from '@/Components/ui/AuthButton';
import AuthSplitLayout from '@/Layouts/AuthSplitLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <AuthSplitLayout
            title="Verify your email"
            subtitle="Thanks for signing up! Please verify your email address by clicking the link we just sent you."
            footer={
                <p className="mt-8 text-center text-sm text-[#5F656D]">
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="font-semibold text-[#1693C9] transition-colors hover:text-[#1380AF]"
                    >
                        Log out
                    </Link>
                </p>
            }
        >
            <Head title="Email Verification" />

            {status === 'verification-link-sent' && (
                <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    A new verification link has been sent to your email address.
                </div>
            )}

            <form onSubmit={submit}>
                <AuthButton type="submit" disabled={processing}>
                    {processing ? 'Sending...' : 'Resend verification email'}
                </AuthButton>
            </form>
        </AuthSplitLayout>
    );
}
