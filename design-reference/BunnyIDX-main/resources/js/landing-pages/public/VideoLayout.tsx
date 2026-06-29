/*
 | Video Landing design — header / footer / banners wrapper (Tailwind).
 | React port of resources/views/landing-pages/templates/video-landing/layout.blade.php.
 | The deep-navy + per-page accent theme; page content (blocks) rendered as children.
 */
import type { ReactNode } from 'react';
import type { LpPageData } from './types';

const year = new Date().getFullYear();

export default function VideoLayout({ page, children }: { page: LpPageData; children: ReactNode }) {
    const { agent, config } = page;
    const title = page.page.name;
    const headerBrand = config.header_brand || '';
    const logoSrc = config.logo || '';
    const showHeader = !!(logoSrc || headerBrand);
    const footerBrand = headerBrand || agent.name || 'Your Real Estate Expert';
    const urgency = config.urgency_text ?? 'Spaces are limited — applications are filling fast. Act now.';
    const telHref = agent.phone ? agent.phone.replace(/[^0-9+]/g, '') : '';

    return (
        <div
            className="min-h-screen bg-[var(--navy)] text-white antialiased"
            style={{ ['--accent' as any]: page.accent, ['--navy' as any]: '#181641', fontFamily: "var(--lp-font, 'Roboto Flex', system-ui, sans-serif)" }}
        >
            {urgency && (
                <div className="bg-[#0F0E2E] py-2.5 text-center text-[13px] font-semibold text-white/85">
                    <span className="text-[var(--accent)]">●</span> {urgency}
                </div>
            )}

            {page.isOwnerDraft && (
                <div className="bg-black py-2 text-center text-[13px] font-semibold text-white/90">Draft preview — this landing page is not published yet.</div>
            )}
            {page.submitted && (
                <div className="bg-emerald-600 py-2 text-center text-[13px] font-semibold text-white">Thanks! Your application was received — we’ll be in touch shortly.</div>
            )}

            {showHeader && (
                <header className="bg-[var(--navy)]">
                    <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-6">
                        {logoSrc ? (
                            <img src={logoSrc} alt={headerBrand || title} className="h-8 w-auto object-contain" />
                        ) : (
                            <span className="text-lg font-extrabold tracking-tight">{headerBrand}</span>
                        )}
                        {agent.phone && <a href={`tel:${telHref}`} className="text-sm font-bold text-white/80 hover:text-white">{agent.phone}</a>}
                    </div>
                </header>
            )}

            <main>{children}</main>

            <footer className="bg-[#0F0E2E] py-12 text-center">
                <div className="mx-auto max-w-3xl px-5 sm:px-6">
                    <div className="text-lg font-extrabold">{footerBrand}</div>
                    <div className="mt-2 text-sm text-white/55">
                        {agent.phone && <a href={`tel:${telHref}`} className="hover:text-white">{agent.phone}</a>}
                        {agent.phone && agent.email ? ' · ' : ''}
                        {agent.email && <a href={`mailto:${agent.email}`} className="hover:text-white">{agent.email}</a>}
                    </div>
                    <nav className="mt-4 flex justify-center gap-5 text-sm font-medium text-white/60">
                        <a href={page.privacyUrl} target="_blank" rel="noopener" className="hover:text-white">Privacy Policy</a>
                        <a href={page.termsUrl} target="_blank" rel="noopener" className="hover:text-white">Terms of Service</a>
                    </nav>
                    <p className="mx-auto mt-6 max-w-2xl text-xs leading-relaxed text-white/35">
                        © {year} {footerBrand}. All rights reserved. This is a marketing page; information you submit is used to contact you about your real estate needs. By providing your phone number you agree to receive marketing &amp; informational text messages. Consent is not a condition of purchase. Msg &amp; data rates may apply. Reply STOP to opt out.
                    </p>
                </div>
            </footer>
        </div>
    );
}
