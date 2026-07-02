// Public marketing layout: header + page content + footer.
// Pass `showHeader={false}` for pages that render their own header inside a hero
// (the home page), or `bare` for the standalone contact page (no chrome).
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SiteHeader } from '@/components/site/nav/site-header';
import { SiteFooter } from '@/components/site/site-footer';

interface SiteLayoutProps {
    children: ReactNode;
    showHeader?: boolean;
    showFooter?: boolean;
    /** Span the header full-width (no max-w-[1400px]) — used by Property Search. */
    headerFullWidth?: boolean;
    /**
     * Lock the layout to the viewport (no page scroll) so a child can fill the
     * screen — used by Property Search's full-height map. Applies on lg+ only;
     * mobile keeps normal flow.
     */
    fullHeight?: boolean;
}

export function SiteLayout({
    children,
    showHeader = true,
    showFooter = true,
    headerFullWidth = false,
    fullHeight = false,
}: SiteLayoutProps) {
    return (
        <div
            className={cn(
                'overflow-x-hidden bg-navy font-sans',
                fullHeight &&
                    'lg:flex lg:h-screen lg:flex-col lg:overflow-hidden',
            )}
        >
            {showHeader && <SiteHeader fullWidth={headerFullWidth} />}
            <main
                className={cn(
                    fullHeight && 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col',
                )}
            >
                {children}
            </main>
            {showFooter && <SiteFooter />}
        </div>
    );
}
