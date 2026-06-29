import { capitalize, formatStatusLabel, getStatusColors, getTypeColors } from '../utils';

interface Props {
    value: string;
    variant?: 'status' | 'type';
    size?: 'sm' | 'xs';
    className?: string;
}

/**
 * Pill badge used everywhere status/type values render.
 * Centralizes the inline-flex span style so callers don't repeat it.
 */
export default function StatusBadge({ value, variant = 'status', size = 'sm', className = '' }: Props) {
    const colors = variant === 'type' ? getTypeColors(value) : getStatusColors(value);
    const sizeClasses = size === 'xs'
        ? 'px-2 py-0.5 text-[9px]'
        : 'px-2.5 py-0.5 text-[10px]';
    const label = variant === 'status' ? formatStatusLabel(value) : capitalize(value || '—');

    return (
        <span
            className={`inline-flex shrink-0 ${sizeClasses} font-semibold tracking-wide whitespace-nowrap rounded-full ${className}`}
            style={{ backgroundColor: colors.bg, color: colors.text }}
        >
            {label}
        </span>
    );
}
