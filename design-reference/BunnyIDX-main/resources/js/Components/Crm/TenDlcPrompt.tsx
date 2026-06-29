import { Link } from '@inertiajs/react';

/**
 * Warning shown when the user tries to SMS a US/Canadian number but their
 * 10DLC registration isn't approved yet. Used by the MessageComposer and the
 * Power Dialer's SMS panel — one prompt, one place to update copy.
 */

interface Props {
    status: 'pending' | 'not_started';
    /** Compact variant for tight UI like the floating call modal panel. */
    compact?: boolean;
}

export default function TenDlcPrompt({ status, compact = false }: Props) {
    const isPending = status === 'pending';
    return (
        <div className={`flex items-start gap-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
            <svg className={`text-[#D97706] shrink-0 ${compact ? 'h-4 w-4 mt-0.5' : 'h-5 w-5 mt-0.5'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div className="flex-1 min-w-0">
                <p className={`font-semibold text-[#111315] ${compact ? 'text-[12px]' : 'text-[13px]'}`}>
                    {isPending ? '10DLC registration pending' : '10DLC registration required'}
                </p>
                <p className={`text-[#5F656D] mt-0.5 ${compact ? 'text-[11px] leading-snug' : 'text-xs'}`}>
                    {isPending
                        ? "Your 10DLC registration is being reviewed by the carriers. You'll be able to send SMS once it's approved (typically 1–3 business days)."
                        : "SMS to US/Canadian numbers requires 10DLC brand + campaign registration. International numbers are unaffected."}
                </p>
                <Link
                    href={route('crm.settings.tab', '10dlc')}
                    target={compact ? '_blank' : undefined}
                    rel={compact ? 'noopener noreferrer' : undefined}
                    className={`inline-flex items-center mt-2 ${compact ? 'h-7 px-3 text-[11px]' : 'h-8 px-4 text-xs'} font-semibold text-white bg-[#1693C9] rounded-lg hover:bg-[#1380AF] transition-colors`}
                >
                    {isPending ? 'View status' : 'Register 10DLC'}
                </Link>
            </div>
        </div>
    );
}
