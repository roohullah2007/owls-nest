/*
 | Classic landing-page design — header / footer / banners wrapper.
 | React port of resources/views/landing-pages/templates/classic/layout.blade.php.
 | The page content (blocks) is rendered as children.
 */
import type { ReactNode } from 'react';
import type { LpPageData } from './types';
import './Layout.css';

const year = new Date().getFullYear();

export default function Layout({ page, children }: { page: LpPageData; children: ReactNode }) {
    const { agent, config } = page;
    const title = page.page.name;
    const headerBrand = config.header_brand || '';
    const logoSrc = config.logo || '';
    // Header only appears once the owner sets a logo or brand text — never the raw account name.
    const showHeader = !!(logoSrc || headerBrand);
    const footerBrand = headerBrand || agent.name || 'Your Real Estate Expert';
    const telHref = agent.phone ? agent.phone.replace(/[^0-9+]/g, '') : '';

    return (
        <div className="lp-scope" style={{ ['--accent' as any]: page.accent }}>
            {page.isOwnerDraft && (
                <div className="lp-banner preview">Draft preview — this landing page is not published yet.</div>
            )}
            {page.submitted && (
                <div className="lp-banner success">Thanks! Your details were received — we’ll be in touch shortly.</div>
            )}

            {showHeader && (
                <header className="lp-header">
                    <div className="lp-container lp-header-inner">
                        {logoSrc ? (
                            <img className="lp-logo-img" src={logoSrc} alt={headerBrand || title} />
                        ) : (
                            <span className="lp-brand">{headerBrand}</span>
                        )}
                        <div className="lp-header-actions">
                            {agent.phone && <span className="lp-header-phone">{agent.phone}</span>}
                            <a href="#hero" className="lp-btn">Get My Estimate</a>
                        </div>
                    </div>
                </header>
            )}

            <main>{children}</main>

            <footer className="lp-footer">
                <div className="lp-container">
                    <div className="lp-footer-top">
                        <div>
                            <div className="name">{footerBrand}</div>
                            <div className="contact">
                                {agent.phone && <a href={`tel:${telHref}`}>{agent.phone}</a>}
                                {agent.phone && agent.email ? ' · ' : ''}
                                {agent.email && <a href={`mailto:${agent.email}`}>{agent.email}</a>}
                            </div>
                        </div>
                        <nav className="lp-footer-links">
                            <a href={page.privacyUrl} target="_blank" rel="noopener">Privacy Policy</a>
                            <a href={page.termsUrl} target="_blank" rel="noopener">Terms of Service</a>
                        </nav>
                    </div>
                    <div className="lp-footer-rule" />
                    <div className="legal">
                        © {year} {footerBrand}. All rights reserved. This is a marketing page; information you submit is used to contact you about your real estate needs.
                        <br /><strong>SMS:</strong> By providing your phone number you agree to receive marketing &amp; informational text messages. Consent is not a condition of purchase. Msg &amp; data rates may apply. Msg frequency varies. Reply STOP to opt out, HELP for help.
                    </div>
                </div>
            </footer>
        </div>
    );
}

/** Shared "thank you" confirmation — React port of partials/thanks.blade.php. */
export function Thanks({ page }: { page: LpPageData }) {
    return (
        <div className="lp-thanks">
            <div className="lp-check">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            </div>
            <h3>Thank you!</h3>
            <p>Your details were received. {page.agent.name || 'We'} will reach out to you shortly.</p>
        </div>
    );
}
