/*
 | Full-screen lead flow — multi-step buyer/seller questionnaire + contact capture.
 | React port of resources/views/landing-pages/flow.blade.php. Each answer is
 | collected client-side and folded into the hidden `message` field; the final
 | step POSTs to the existing landing.submit controller (from=flow), so the CRM
 | contact + attribution are created exactly as before.
 */
import { useMemo, useState } from 'react';
import type { LpPageData } from './types';
import { HiddenAttribution } from './helpers';
import './Flow.css';

const DEFAULT_CONSENT =
    'By checking this box, I agree to receive marketing and informational text messages at the phone number provided, including messages sent via automated technology. Consent is not a condition of purchase. Message and data rates may apply. Message frequency varies. Reply STOP to unsubscribe or HELP for help.';

const BUYER_QUESTIONS = [
    { key: 'Buying timeline', title: 'When are you looking to buy?', options: ['ASAP', 'In 1–3 months', 'In 3–6 months', 'Just browsing'] },
    { key: 'Budget', title: "What's your budget?", options: ['Under $300k', '$300k–$500k', '$500k–$750k', '$750k+'] },
    { key: 'Bedrooms', title: 'How many bedrooms do you need?', options: ['1+', '2+', '3+', '4+'] },
    { key: 'Property type', title: 'What are you looking for?', options: ['Single Family', 'Condo', 'Townhouse', 'Multi-family', 'Any'] },
    { key: 'Financing', title: 'How will you finance your purchase?', options: ['Pre-approved', 'Need a lender', 'Paying cash', 'Not sure yet'] },
];

const SELLER_QUESTIONS = [
    { key: 'Timeline', title: 'When are you looking to sell?', options: ['ASAP', 'In 1–3 months', 'In 3–6 months', 'Just curious'] },
    { key: 'Condition', title: "What's the condition of your home?", options: ['Excellent', 'Good', 'Fair', 'Needs work'] },
    { key: 'Property type', title: 'What type of home is it?', options: ['Single Family', 'Condo', 'Townhouse', 'Multi-family', 'Other'] },
];

const ChevR = () => (
    <span className="chev"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></span>
);
const ChevL = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
);

export default function Flow({ page }: { page: LpPageData }) {
    const flow = page.flow!;
    const hero = flow.hero || {};
    const cfg = page.config || {};
    const brand = (cfg.header_brand || '') || (page.agent.name || 'Home Value');
    const flowType = hero.flow || 'sell';
    const leadType = hero.lead_type || 'seller';
    const consent = hero.consent_text || DEFAULT_CONSENT;
    const questions = flowType === 'buyer' ? BUYER_QUESTIONS : SELLER_QUESTIONS;

    // Steps = the questions + the final contact form step.
    const totalSteps = questions.length + 1;
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        if (flow.owner) init.Owner = flow.owner;
        return init;
    });

    const message = useMemo(
        () => Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join('\n'),
        [answers],
    );

    const show = (i: number) => {
        setCurrent(Math.max(0, Math.min(i, totalSteps - 1)));
        if (typeof window !== 'undefined') window.scrollTo(0, 0);
    };

    const answer = (key: string, value: string) => {
        setAnswers((a) => ({ ...a, [key]: value }));
        show(current + 1);
    };

    if (page.submitted) {
        return (
            <div className="fl-scope" style={{ ['--accent' as any]: page.accent }}>
                <div className="fl-header">
                    <span className="fl-brand">{brand}</span>
                    <a className="fl-exit" href={page.showUrl}>Exit</a>
                </div>
                <div className="fl-main">
                    <div className="fl-card fl-thanks">
                        <div className="check"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></div>
                        <h1>Thank you!</h1>
                        <p>Your details were received. {brand} will reach out to you shortly.</p>
                        <a href={page.showUrl} className="fl-btn">Back to site</a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fl-scope" style={{ ['--accent' as any]: page.accent }}>
            <div className="fl-header">
                <span className="fl-brand">{brand}</span>
                <a className="fl-exit" href={page.showUrl}>Exit</a>
            </div>

            <div className="fl-progress"><span style={{ width: `${Math.round(((current + 1) / totalSteps) * 100)}%` }} /></div>

            <div className="fl-main">
                <div className="fl-card">
                    {flow.address && (
                        <div className="fl-addr">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                            {flowType === 'buyer' ? 'Searching: ' : ''}{flow.address}
                        </div>
                    )}

                    {questions.map((q, qi) => (
                        <div key={q.key} className={`fl-step${qi === current ? ' active' : ''}`}>
                            <h1>{q.title}</h1>
                            <div className="fl-opts">
                                {q.options.map((opt) => (
                                    <button key={opt} type="button" className="fl-opt" onClick={() => answer(q.key, opt)}>
                                        <span>{opt}</span>
                                        <ChevR />
                                    </button>
                                ))}
                            </div>
                            {qi > 0 && (
                                <button type="button" className="fl-back" onClick={() => show(current - 1)}><ChevL /> Back</button>
                            )}
                        </div>
                    ))}

                    <div className={`fl-step${current === totalSteps - 1 ? ' active' : ''}`}>
                        <h1>{hero.form_title || 'Almost done!'}</h1>
                        {hero.form_subtitle && <p className="sub">{hero.form_subtitle}</p>}
                        <form method="POST" action={page.submitUrl} style={{ marginTop: 24 }}>
                            <HiddenAttribution page={page} extra={{ from: 'flow', address: flow.address, lead_type: leadType, message }} />
                            <div className="fl-field"><label>Full Name</label><input type="text" name="name" required placeholder="Jane Doe" /></div>
                            <div className="fl-field"><label>Email</label><input type="email" name="email" required placeholder="you@email.com" /></div>
                            <div className="fl-field"><label>Phone</label><input type="tel" name="phone" required placeholder="(555) 555-5555" /></div>
                            <label className="fl-consent"><input type="checkbox" name="consent" value="1" required /><span>{consent}</span></label>
                            <button type="submit" className="fl-btn">{hero.submit_label || 'See My Results'}</button>
                        </form>
                        <button type="button" className="fl-back" onClick={() => show(current - 1)}><ChevL /> Back</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
