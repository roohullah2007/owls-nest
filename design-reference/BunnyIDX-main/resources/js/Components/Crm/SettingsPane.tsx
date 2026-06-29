import { ReactNode } from 'react';

/**
 * Building blocks for settings panes (any tab/sub-tab in /settings).
 *
 *   <SettingsPane>
 *     <SettingsPaneHeader title="General Settings" actions={<UpdateButton />} />
 *     <SettingsCard>
 *       …inputs (use FieldLabel + formInputClass from FormField.tsx)…
 *     </SettingsCard>
 *   </SettingsPane>
 *
 * Tokens are pinned to the spec:
 * - Heading: 20px / 30px line-height / weight 500 / rgb(7,9,15)
 * - Divider directly under the heading row
 * - Card: white, #E4E7EB border, rounded-[4px], generous padding
 */

const PANE_HEADING_STYLE = {
    fontSize: '20px',
    lineHeight: '30px',
    fontWeight: 500,
    color: 'rgb(7, 9, 15)',
} as const;

interface PaneProps {
    children: ReactNode;
    className?: string;
}

/** Outer wrapper — applies the page padding. Spans the full content area. */
export function SettingsPane({ children, className = '' }: PaneProps) {
    return (
        <div className={`p-6 sm:p-8 w-full ${className}`}>
            {children}
        </div>
    );
}

interface HeaderProps {
    title: string;
    /** Slot pinned to the right of the heading (typically the Update button). */
    actions?: ReactNode;
    /** Whether to render the bottom divider line (default: true). */
    divider?: boolean;
}

/** Page-section heading row with optional right-side actions and divider. */
export function SettingsPaneHeader({ title, actions, divider = true }: HeaderProps) {
    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-normal" style={PANE_HEADING_STYLE}>{title}</h2>
                {actions && <div className="flex items-center gap-3">{actions}</div>}
            </div>
            {divider && <div className="border-t border-[#E4E7EB] mb-5" />}
        </>
    );
}

interface CardProps {
    children: ReactNode;
    className?: string;
}

/** White bordered card with the spec's 3px corners — group inputs inside. */
export function SettingsCard({ children, className = '' }: CardProps) {
    return (
        <div className={`bg-white border border-[#E4E7EB] rounded-[4px] p-6 space-y-5 ${className}`}>
            {children}
        </div>
    );
}

interface SavedIndicatorProps {
    visible: boolean;
    label?: string;
}

/** Small green check + label, shown after a successful save. */
export function SettingsSavedIndicator({ visible, label = 'Saved' }: SavedIndicatorProps) {
    if (!visible) return null;
    return (
        <span className="text-[12px] text-green-600 inline-flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            {label}
        </span>
    );
}

interface UpdateButtonProps {
    processing?: boolean;
    disabled?: boolean;
    label?: string;
    onClick?: () => void;
    type?: 'submit' | 'button';
}

/** Primary action button matching the spec's Update style. */
export function SettingsUpdateButton({
    processing = false,
    disabled = false,
    label = 'Update',
    onClick,
    type = 'submit',
}: UpdateButtonProps) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || processing}
            className="h-9 px-5 bg-[#1693C9] text-white text-[13px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-50 transition-colors"
        >
            {processing ? `${label.replace(/\.\.\.$|…$/, '')}…` : label}
        </button>
    );
}
