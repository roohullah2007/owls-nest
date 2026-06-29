import { useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import { inputClass, selectClass, labelClass } from '../../constants';
import { getRoleLabel } from '../utils';

interface Props {
    availableRoles: string[];
}

export default function InviteMemberForm({ availableRoles }: Props) {
    const form = useForm({ email: '', role: 'agent' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('crm.team.invitations.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <form onSubmit={submit} className="flex items-end gap-2">
            <div className="flex-1">
                <label className={labelClass}>Email</label>
                <input
                    type="email"
                    value={form.data.email}
                    onChange={(e) => form.setData('email', e.target.value)}
                    placeholder="colleague@example.com"
                    className={inputClass}
                />
                {form.errors.email && <p className="text-xs text-red-500 mt-1">{form.errors.email}</p>}
            </div>
            <div className="w-40">
                <label className={labelClass}>Role</label>
                <select
                    value={form.data.role}
                    onChange={(e) => form.setData('role', e.target.value)}
                    className={selectClass}
                >
                    {availableRoles.map((r) => (
                        <option key={r} value={r}>{getRoleLabel(r)}</option>
                    ))}
                </select>
            </div>
            <PrimaryButton
                type="submit"
                label="Send Invite"
                disabled={form.processing || !form.data.email.trim()}
                icon={null}
            />
        </form>
    );
}
