import InputError from '@/Components/ui/InputError';
import PasswordInput from '@/Components/ui/PasswordInput';
import AuthButton from '@/Components/ui/AuthButton';
import AuthSplitLayout from '@/Layouts/AuthSplitLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthSplitLayout
            title="Confirm your password"
            subtitle="This is a secure area. Please confirm your password before continuing."
        >
            <Head title="Confirm Password" />

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#111315]">
                        Password
                    </label>
                    <PasswordInput
                        id="password"
                        name="password"
                        value={data.password}
                        autoComplete="current-password"
                        isFocused={true}
                        placeholder="Enter your password"
                        className="pr-11"
                        onChange={(e) => setData('password', e.target.value)}
                    />
                    <InputError message={errors.password} />
                </div>

                <AuthButton type="submit" disabled={processing}>
                    {processing ? 'Confirming...' : 'Confirm'}
                </AuthButton>
            </form>
        </AuthSplitLayout>
    );
}
