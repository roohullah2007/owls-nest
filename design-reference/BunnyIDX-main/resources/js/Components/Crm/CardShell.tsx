import { ReactNode } from 'react';

/**
 * Shared sidebar/card pattern used across the CRM:
 *   - white background, gray border, rounded-xl
 *   - light-gray header strip with icon + title + optional count
 *   - body fills the rest with no padding by default (children supply their own)
 *
 * Match the contact RightSidebar's CardShell exactly so the Power Dialer
 * surface feels native.
 */

interface Props {
    iconPath: string;
    title: string;
    count?: number;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}

export default function CardShell({ iconPath, title, count, actions, children, className = '' }: Props) {
    return (
        <div className={`bg-white border border-[#E4E7EB] rounded-xl overflow-hidden ${className}`}>
            <div className="flex items-center justify-between w-full px-4 py-3 bg-[#F3F4F6] border-b border-[#E4E7EB]">
                <div className="flex items-center gap-2 min-w-0">
                    <svg className="h-3.5 w-3.5 text-[#5F656D] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                    </svg>
                    <span className="text-[13px] font-semibold text-[#111315] truncate">{title}</span>
                    {count !== undefined && count > 0 && (
                        <span className="text-[10px] font-medium text-[#8B9096] shrink-0">({count})</span>
                    )}
                </div>
                {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
            </div>
            <div>{children}</div>
        </div>
    );
}

/**
 * Stable icon paths used across the CRM. Keeping them centralized lets us
 * swap iconography in one place instead of hunting down inline SVG paths.
 */
export const CardIcons = {
    user:    'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
    check:   'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    queue:   'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
    history: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    phone:   'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z',
    script:  'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
};
