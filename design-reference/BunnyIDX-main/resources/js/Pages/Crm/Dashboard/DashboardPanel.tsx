import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

interface Props {
    title: string;
    /** Optional header link, e.g. { label: 'View all', href: route('crm.tasks.index') }. */
    action?: { label: string; href: string };
}

/**
 * Compact white card used by the dashboard sidebar widgets (Tasks, Meetings,
 * Resources). Distinct from the shared CrmCard — this uses the tighter
 * px-4/py-3 sidebar padding without a header border.
 */
export default function DashboardPanel({ title, action, children }: PropsWithChildren<Props>) {
    return (
        <div className="border border-[#E4E7EB] bg-white rounded-xl shadow-sm px-4 py-3">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#111315]">{title}</h2>
                {action && (
                    <Link href={action.href} className="text-xs font-medium text-[#1693C9] hover:text-[#1380AF]">
                        {action.label}
                    </Link>
                )}
            </div>
            {children}
        </div>
    );
}
