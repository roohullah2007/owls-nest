import { useEffect, useState } from 'react';
import EmailComposeModal from '@/Components/Crm/EmailComposeModal';
import type { EmailAccount } from '@/types';

interface Props {
    contactId: number;
    prefillTo?: string;
    onClose: () => void;
}

export default function LazyEmailCompose({ contactId, prefillTo, onClose }: Props) {
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        import('axios').then(({ default: axios }) => {
            axios.get(route('crm.email.accounts')).then((res) => {
                setAccounts(res.data);
                setLoading(false);
            }).catch(() => setLoading(false));
        });
    }, []);

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="animate-spin h-6 w-6 border-2 border-[#1693C9] border-t-transparent rounded-full" />
            </div>
        );
    }

    if (accounts.length === 0) return null;

    const defaultAccount = accounts.find((a) => a.is_default) ?? accounts[0];

    return (
        <EmailComposeModal
            accounts={accounts}
            defaultAccountId={defaultAccount.id}
            contactId={contactId}
            prefillTo={prefillTo}
            onClose={onClose}
        />
    );
}
