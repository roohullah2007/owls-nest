import CrmCard from '@/Components/Crm/CrmCard';
import { useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { inputClass, btnPrimary } from '../../constants';

export default function CreateTeamCard() {
    const form = useForm({ name: '' });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('crm.team.store'), { preserveScroll: true });
    };
    return (
        <div className="max-w-lg mx-auto mt-20">
            <CrmCard>
                <div className="p-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F3F4F6]">
                        <svg className="h-7 w-7 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-[#111315] mb-1">Create a Team</h3>
                    <p className="text-sm text-[#5F656D] mb-6 max-w-sm mx-auto">
                        Create a team to collaborate with other agents. Share contacts, deals, and listings with your team members.
                    </p>
                    <form onSubmit={submit} className="flex items-center gap-2 max-w-md mx-auto">
                        <input
                            type="text"
                            value={form.data.name}
                            onChange={e => form.setData('name', e.target.value)}
                            placeholder="Team name"
                            className={`${inputClass} flex-1`}
                        />
                        <button
                            type="submit"
                            disabled={form.processing || !form.data.name.trim()}
                            className={btnPrimary}
                        >
                            Create Team
                        </button>
                    </form>
                    {form.errors.name && <p className="mt-2 text-[13px] text-red-500">{form.errors.name}</p>}
                </div>
            </CrmCard>
        </div>
    );
}
