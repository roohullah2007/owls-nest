// Public marketing layout: header + page content + footer.
// Pass `showHeader={false}` for pages that render their own header inside a hero
// (the home page), or `bare` for the standalone contact page (no chrome).
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/site/nav/site-header';
import { SiteFooter } from '@/components/site/site-footer';

interface SiteLayoutProps {
    children: ReactNode;
    showHeader?: boolean;
    showFooter?: boolean;
}

export function SiteLayout({
    children,
    showHeader = true,
    showFooter = true,
}: SiteLayoutProps) {
    return (
        <div className="overflow-x-hidden bg-navy font-sans">
            {showHeader && <SiteHeader />}
            <main>{children}</main>
            {showFooter && <SiteFooter />}
        </div>
    );
}
