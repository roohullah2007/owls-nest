/**
 * Small inline SVG icons used by the Contacts Index page. Kept together so the
 * cell components can pull from one place.
 */

export function SortIcon({ column, currentSort, currentDirection }: { column: string; currentSort?: string; currentDirection?: string }) {
    const isActive = currentSort === column;
    return (
        <svg className="h-3 w-3 ml-1 shrink-0" viewBox="0 0 10 14" fill="none">
            <path d="M5 0L9.33 5.25H0.67L5 0Z" fill={isActive && currentDirection === 'asc' ? '#111315' : '#D1D5DB'} />
            <path d="M5 14L0.67 8.75H9.33L5 14Z" fill={isActive && currentDirection === 'desc' ? '#111315' : '#D1D5DB'} />
        </svg>
    );
}

export function EmailIcon({ className }: { className?: string }) {
    return (
        <svg className={className || 'h-3.5 w-3.5'} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
    );
}

export function PhoneIcon({ className }: { className?: string }) {
    return (
        <svg className={className || 'h-3.5 w-3.5'} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
        </svg>
    );
}
