/**
 * Title-cases a snake/kebab token, preserving the rest of each word's casing
 * (no acronym handling, no lower-casing). E.g. "past_client" → "Past Client".
 */
export function titleCase(s: string | null | undefined): string {
    if (!s) return '';
    return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const acronyms = new Set(['IDX', 'SMS', 'MLS', 'CRM', 'API']);

/**
 * Turns a snake/kebab-case token into a human-readable label, upper-casing
 * known acronyms. E.g. "new_lead" → "New Lead", "idx" → "IDX".
 */
export function humanize(str: string): string {
    return str
        .replace(/[_-]/g, ' ')
        .replace(/\b\w+/g, (w) =>
            acronyms.has(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
        );
}
