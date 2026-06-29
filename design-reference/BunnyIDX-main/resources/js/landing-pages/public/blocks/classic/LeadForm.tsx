import type { BlockProps } from '../../types';
import { HiddenAttribution } from '../../helpers';
import { Thanks } from '../../Layout';
import './LeadForm.css';

export default function LeadForm({ data, page }: BlockProps) {
    const showPhone = data.show_phone ?? true;
    const leadType = page.page.type === 'buyer' ? 'buyer' : 'seller';

    return (
        <section className="lp-section lp-leadform" id="lead-form">
            <div className="lp-container">
                {data.eyebrow && (
                    <div style={{ textAlign: 'center' }}>
                        <span className="lp-eyebrow">{data.eyebrow}</span>
                    </div>
                )}
                {data.title && <h2>{data.title}</h2>}
                {data.subtitle && <p className="lp-section-sub">{data.subtitle}</p>}

                <div className="lp-leadform-card">
                    {page.submitted ? (
                        <Thanks page={page} />
                    ) : (
                        <form method="post" action={page.submitUrl}>
                            <HiddenAttribution page={page} extra={{ lead_type: leadType }} />
                            <div className="lp-field"><label>Full Name</label><input type="text" name="name" required placeholder="Jane Doe" /></div>
                            <div className="lp-field"><label>Email</label><input type="email" name="email" required placeholder="you@email.com" /></div>
                            {showPhone && (
                                <div className="lp-field"><label>Phone</label><input type="tel" name="phone" placeholder="(555) 555-5555" /></div>
                            )}
                            <div className="lp-field"><label>{data.message_label ?? 'Message'}</label><textarea name="message" rows={3} placeholder="Tell us a bit more…" /></div>
                            <label className="lp-consent"><input type="checkbox" name="consent" value="1" required /><span>{data.consent_text ?? 'By checking this box, I agree to receive marketing and informational text messages at the phone number provided, including messages sent via automated technology. Consent is not a condition of purchase. Message and data rates may apply. Message frequency varies. Reply STOP to unsubscribe or HELP for help.'}</span></label>
                            <button type="submit" className="lp-btn">{data.button_label ?? 'Submit'}</button>
                            {data.disclaimer && <p className="lp-form-note">{data.disclaimer}</p>}
                        </form>
                    )}
                </div>
            </div>
        </section>
    );
}
