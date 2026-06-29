import { ReactNode } from 'react';
import { SettingsCard, SettingsPane, SettingsPaneHeader } from '@/Components/Crm/SettingsPane';

/** Relative time string used in Active Devices + Email Accounts. */
export function timeAgo(ms: number) {
    const diff = Date.now() - ms;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(ms).toLocaleDateString();
}

/** Absolute date+time used in Access History. */
export function formatDateTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

/** Provider mark used in Connected Accounts and elsewhere. */
export function ProviderIcon({ provider, className = 'h-5 w-5' }: { provider: string; className?: string }) {
    if (provider === 'google') {
        return (
            <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 8-11.3 8a12 12 0 1 1 7.7-21.2l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3A12 12 0 0 1 12.7 28.5l-6.6 5.1A20 20 0 0 0 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.5l6.3 5.3c-.4.4 6.7-4.9 6.7-14.8 0-1.3-.1-2.7-.4-3.5z" />
            </svg>
        );
    }
    if (provider === 'microsoft') {
        return (
            <svg className={className} viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
                <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
                <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
            </svg>
        );
    }
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
        </svg>
    );
}

/** Shell for sub-tabs that wrap an existing tab component (Email/Notifications). */
export function PaneWrapper({ title, children }: { title: string; children: ReactNode }) {
    return (
        <SettingsPane>
            <SettingsPaneHeader title={title} />
            {children}
        </SettingsPane>
    );
}

/** Coming-soon style empty pane. */
export function PlaceholderPane({ title, description }: { title: string; description: string }) {
    return (
        <SettingsPane>
            <SettingsPaneHeader title={title} />
            <SettingsCard className="text-center p-10">
                <p className="text-[13px] text-[#5F656D] mb-1">{description}</p>
                <p className="text-[12px] text-[#8B9096]">Coming soon.</p>
            </SettingsCard>
        </SettingsPane>
    );
}
