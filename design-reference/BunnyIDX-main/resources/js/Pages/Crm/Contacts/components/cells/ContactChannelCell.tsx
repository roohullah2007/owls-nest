import { EmailIcon, PhoneIcon } from '../icons';

/**
 * Channel cell — circular icon container with verified/unverified badge + the
 * raw value above a sent/received counter. Used for Email and Phone columns.
 */
export default function ContactChannelCell({
    value,
    count,
    verified,
    kind,
    onClick,
}: {
    value: string;
    count: number;
    verified: boolean;
    kind: 'email' | 'phone';
    onClick?: () => void;
}) {
    const noun = kind === 'email' ? 'emails' : 'calls';
    const verbSuffix = kind === 'email' ? ' sent' : '';
    const title = kind === 'email' ? `Email ${value}` : `Call ${value}`;
    const handleClick = (e: React.MouseEvent) => {
        if (!onClick) return;
        e.stopPropagation();
        e.preventDefault();
        onClick();
    };
    return (
        <div
            className={`flex items-center min-w-0 gap-2.5 rounded-[4px] ${onClick ? 'cursor-pointer hover:bg-[#F9FAFB] -mx-1 px-1 py-0.5 transition-colors' : ''}`}
            onClick={onClick ? handleClick : undefined}
            role={onClick ? 'button' : undefined}
            title={onClick ? title : undefined}
        >
            <span className="relative shrink-0">
                <span className={`h-8 w-8 inline-flex items-center justify-center rounded-full border ${verified ? 'border-[#059669] bg-[#ECFDF5] text-[#059669]' : 'border-[#E4E7EB] bg-white text-[#5F656D]'}`}>
                    {kind === 'email' ? <EmailIcon className="h-4 w-4" /> : <PhoneIcon className="h-4 w-4" />}
                </span>
                {verified ? (
                    <span title={`${kind === 'email' ? 'Email' : 'Phone'} verified`} className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 inline-flex items-center justify-center rounded-full bg-[#059669] text-white ring-2 ring-white">
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                    </span>
                ) : (
                    <span title={`${kind === 'email' ? 'Email' : 'Phone'} not yet verified`} className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 inline-flex items-center justify-center rounded-full bg-[#D97706] text-white text-[8px] font-bold ring-2 ring-white">
                        ?
                    </span>
                )}
            </span>
            <div className="min-w-0 flex-1">
                <p className={`text-[13px] truncate leading-tight ${onClick ? 'text-[#1693C9] hover:underline' : 'text-[#111315]'}`}>{value}</p>
                <p className="text-[11px] text-[#5F656D] leading-tight mt-0.5">
                    {count > 0 ? `${count} ${noun}${verbSuffix}` : `No ${noun} yet`}
                </p>
            </div>
        </div>
    );
}
