import { Head, Link } from '@inertiajs/react';

interface Props {
    status: number;
}

const messages: Record<number, { title: string; description: string }> = {
    403: { title: 'Forbidden', description: "You don't have permission to view this page." },
    404: { title: 'Page not found', description: "The page you're looking for doesn't exist or may have been moved." },
    500: { title: 'Something went wrong', description: 'An unexpected error occurred on our end. Please try again in a moment.' },
    503: { title: 'Be right back', description: "We're down for a quick spot of maintenance. Please check back shortly." },
};

export default function ErrorPage({ status }: Props) {
    const { title, description } = messages[status] ?? {
        title: 'Something went wrong',
        description: 'An unexpected error occurred. Please try again.',
    };

    return (
        <>
            <Head title={`${status} — ${title}`} />
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F3F7] px-6 text-center">
                <div className="w-full max-w-md">
                    <p className="text-[64px] leading-none font-bold text-[#1693C9]">{status}</p>
                    <h1 className="mt-4 text-[22px] font-semibold text-[#111315]">{title}</h1>
                    <p className="mt-2 text-[14px] text-[#5F656D] leading-relaxed">{description}</p>

                    <div className="mt-8 flex items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="h-9 px-4 text-xs font-medium text-[#5F656D] border border-[#C8CCD1] bg-white hover:bg-[#F3F4F6] rounded-[4px] transition-colors"
                        >
                            Go back
                        </button>
                        <Link
                            href="/"
                            className="inline-flex items-center h-9 px-4 text-xs font-semibold text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors"
                        >
                            Back to dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
