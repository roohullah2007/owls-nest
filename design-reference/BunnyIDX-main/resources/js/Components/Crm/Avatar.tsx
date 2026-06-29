import { getAvatarColor, getInitials } from '@/utils/avatarColors';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface Props {
    id: number;
    name: string | null | undefined;
    size?: Size;
    className?: string;
    title?: string;
    ring?: boolean;
}

const SIZE_CLASSES: Record<Size, string> = {
    xs: 'h-6 w-6 text-[9px]',
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-8 w-8 text-[11px]',
    lg: 'h-9 w-9 text-xs',
    xl: 'h-12 w-12 text-base',
    '2xl': 'h-16 w-16 text-lg',
};

export default function Avatar({ id, name, size = 'md', className = '', title, ring = false }: Props) {
    return (
        <span
            title={title ?? name ?? undefined}
            className={`shrink-0 inline-flex items-center justify-center rounded-full font-semibold text-white ${SIZE_CLASSES[size]} ${
                ring ? 'ring-2 ring-white' : ''
            } ${className}`}
            style={{ backgroundColor: getAvatarColor(id) }}
        >
            {getInitials(name)}
        </span>
    );
}
