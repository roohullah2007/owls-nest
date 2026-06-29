import { useState } from 'react';
import { router } from '@inertiajs/react';

export interface Reply {
    id: string;
    user_id: number;
    user_name: string;
    body: string;
    created_at: string;
}

interface Props {
    replies?: Reply[] | null;
    /** Inertia route name for posting a reply, e.g. 'crm.contacts.offers.reply'. */
    routeName: string;
    /** Route parameters, e.g. [contactUuid, offerId]. */
    routeParams: (string | number)[];
}

function formatWhen(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name: string): string {
    return name
        .split(' ')
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export default function RepliesThread({ replies, routeName, routeParams }: Props) {
    const list = replies ?? [];
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [open, setOpen] = useState(list.length > 0);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!body.trim()) return;
        setSubmitting(true);
        router.post(
            route(routeName, routeParams as any),
            { body },
            {
                preserveScroll: true,
                onSuccess: () => setBody(''),
                onFinish: () => setSubmitting(false),
            }
        );
    }

    return (
        <div className="mt-3 pt-3 border-t border-[#F3F4F6]">
            {!open ? (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="text-[11px] font-medium text-[#1693C9] hover:underline"
                >
                    {list.length > 0 ? `View ${list.length} ${list.length === 1 ? 'reply' : 'replies'}` : '+ Reply'}
                </button>
            ) : (
                <div className="space-y-2">
                    {list.length > 0 && (
                        <div className="space-y-2">
                            {list.map((r) => (
                                <div key={r.id} className="flex gap-2.5">
                                    <span className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-full bg-[#EDE5FB] text-[#7C36EE] text-[10px] font-semibold">
                                        {initials(r.user_name)}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xs font-semibold text-[#111315]">{r.user_name}</span>
                                            <span className="text-[10px] text-[#8B9096]">{formatWhen(r.created_at)}</span>
                                        </div>
                                        <p className="text-xs text-[#111315] leading-relaxed whitespace-pre-wrap">{r.body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <form onSubmit={submit} className="flex items-start gap-2 pt-1">
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={2}
                            placeholder="Write a reply…"
                            className="flex-1 px-3 py-2 bg-white border border-[#E4E7EB] rounded-[4px] text-xs text-[#111315] resize-none focus:outline-none focus:border-[#1693C9] focus:ring-2 focus:ring-[#1693C9]/15"
                        />
                        <button
                            type="submit"
                            disabled={submitting || !body.trim()}
                            className="shrink-0 h-9 px-3 text-[11px] font-semibold text-white bg-[#1693C9] hover:bg-[#1380AF] disabled:opacity-40 rounded-[4px] transition-colors"
                        >
                            {submitting ? '…' : 'Send'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
