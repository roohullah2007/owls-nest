import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';

export default function PasswordTab() {
    const passwordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.current_password) {
                    reset('current_password');
                    passwordInput.current?.focus();
                }
            },
        });
    };

    return (
        <div className="max-w-xl mx-auto">
            <div className="bg-white border border-[#E4E7EB] p-6">
                <h3 className="text-sm font-semibold text-[#111315] mb-4">Update Password</h3>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-[#5F656D] mb-1">Current Password</label>
                        <input
                            ref={passwordInput}
                            type="password"
                            value={data.current_password}
                            onChange={(e) => setData('current_password', e.target.value)}
                            className="w-full border border-[#E4E7EB] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                        />
                        {errors.current_password && <p className="mt-1 text-xs text-red-500">{errors.current_password}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[#5F656D] mb-1">New Password</label>
                        <input
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className="w-full border border-[#E4E7EB] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                        />
                        {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[#5F656D] mb-1">Confirm Password</label>
                        <input
                            type="password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            className="w-full border border-[#E4E7EB] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                        />
                        {errors.password_confirmation && <p className="mt-1 text-xs text-red-500">{errors.password_confirmation}</p>}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="h-9 px-5 bg-[#1693C9] text-white text-xs font-medium hover:bg-[#1380AF] disabled:opacity-50 rounded-lg transition-colors"
                        >
                            Update Password
                        </button>
                        {recentlySuccessful && (
                            <span className="text-xs text-green-600">Saved.</span>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
