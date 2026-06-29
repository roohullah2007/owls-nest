interface Props {
    column: string;
    currentSort?: string;
    currentDirection?: string;
}

export default function SortIcon({ column, currentSort, currentDirection }: Props) {
    const isActive = currentSort === column;
    return (
        <svg className="h-3 w-3 ml-1 shrink-0" viewBox="0 0 10 14" fill="none">
            <path d="M5 0L9.33 5.25H0.67L5 0Z" fill={isActive && currentDirection === 'asc' ? '#111315' : '#D1D5DB'} />
            <path d="M5 14L0.67 8.75H9.33L5 14Z" fill={isActive && currentDirection === 'desc' ? '#111315' : '#D1D5DB'} />
        </svg>
    );
}
