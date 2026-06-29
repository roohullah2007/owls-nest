import { PsDetailBlock } from '../lib/merge';

/**
 * One owner-authored content block on the listing detail page. Body is plain
 * text rendered with line breaks (merge fields already substituted) — never
 * raw HTML. `compact` = sidebar variant.
 */
export default function CustomBlock({ block, accent, compact = false, onCta }: { block: PsDetailBlock & { title: string; body: string }; accent: string; compact?: boolean; onCta?: (url: string) => void }) {
    const isAction = !!block.cta_url && block.cta_url.startsWith('#');
    return (
        <div className={`ps-custom-block rounded-2xl border border-gray-200 bg-white shadow-sm ${compact ? 'p-5' : 'mt-4 p-5 sm:p-6'}`}>
            {block.title && <h3 style={{ fontSize: compact ? 15 : 20, fontWeight: 700, color: accent }}>{block.title}</h3>}
            {block.body && (
                <p className={block.title ? 'mt-2' : ''} style={{ fontSize: compact ? 13 : 15, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                    {block.body}
                </p>
            )}
            {block.cta_text && block.cta_url && (
                isAction ? (
                    <button
                        type="button"
                        onClick={() => onCta?.(block.cta_url!)}
                        className="mt-4 inline-flex items-center justify-center rounded-xl px-5 text-white transition-opacity hover:opacity-90"
                        style={{ height: compact ? 40 : 44, backgroundColor: accent, fontSize: 13.5, fontWeight: 700 }}
                    >
                        {block.cta_text}
                    </button>
                ) : (
                    <a
                        href={block.cta_url}
                        className="mt-4 inline-flex items-center justify-center rounded-xl px-5 text-white transition-opacity hover:opacity-90"
                        style={{ height: compact ? 40 : 44, backgroundColor: accent, fontSize: 13.5, fontWeight: 700 }}
                    >
                        {block.cta_text}
                    </a>
                )
            )}
        </div>
    );
}
