/**
 * Parses a date string, treating date-only strings (YYYY-MM-DD) as local time
 * to avoid the day-shift bug when the user's TZ is behind UTC.
 */
function toDate(d: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return new Date(d + 'T00:00:00');
    }
    return new Date(d);
}

/**
 * Convert a naive `<input type="datetime-local">` value (e.g. "2026-07-05T10:00",
 * which the browser treats as the user's LOCAL time) into a true UTC ISO string
 * for storage. The rest of the app stores datetimes as UTC and renders them back
 * in local time via toLocale*, so inputs must be converted on the way in — otherwise
 * the naive wall-clock value gets stored as if it were UTC and displays shifted.
 * Returns '' for empty input so nullable fields stay null.
 */
export function localDateTimeToIso(value: string | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
}

export function formatShortDate(d: string | null | undefined, fallback = ''): string {
    if (!d) return fallback;
    return toDate(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDate(d: string | null | undefined, fallback = ''): string {
    if (!d) return fallback;
    return toDate(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(d: string | null | undefined, fallback = ''): string {
    if (!d) return fallback;
    return toDate(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export function formatTime(d: string | null | undefined, fallback = ''): string {
    if (!d) return fallback;
    return toDate(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Compact "time ago" string for activity timestamps.
 * Falls back to short date once the value is more than a week old.
 * Examples: "now", "5m", "3h", "2d", "Mar 15".
 */
export function timeAgo(d: string | null | undefined, fallback = ''): string {
    if (!d) return fallback;
    const diff = Date.now() - toDate(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return formatShortDate(d);
}

/**
 * Verbose relative formatter: "Today", "Yesterday", "Tomorrow", "3d ago", "2w ago".
 * Use for task due-dates or activity rows that benefit from words over numbers.
 */
export function formatRelative(d: string | null | undefined, fallback = ''): string {
    if (!d) return fallback;
    const diff = Math.floor((Date.now() - toDate(d).getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff === -1) return 'Tomorrow';
    if (diff < 0) return formatShortDate(d);
    if (diff < 7) return `${diff}d ago`;
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
    return formatShortDate(d);
}
