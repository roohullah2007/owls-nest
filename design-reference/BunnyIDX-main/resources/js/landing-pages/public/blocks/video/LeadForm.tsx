import type { BlockProps } from '../../types';
import { HiddenAttribution } from '../../helpers';

const INPUT_CLASS =
    'w-full rounded-lg border border-[#D7D9E6] bg-white px-4 py-3 text-[15px] text-[var(--navy)] placeholder-[#9AA0B2] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25';
const LABEL_CLASS = 'mb-1.5 block text-sm font-bold text-[var(--navy)]';

export default function LeadForm({ data, page }: BlockProps) {
    const showPhone = data.show_phone ?? true;

    return (
        <section id="apply" className="bg-[var(--navy)] px-5 py-16 sm:px-6">
            <div className="mx-auto max-w-xl">
                <div className="text-center">
                    {data.eyebrow ? <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent)]">{data.eyebrow}</p> : null}
                    <h2 className="mt-2 text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">{data.title ?? 'Apply Now'}</h2>
                    {data.subtitle ? <p className="mt-4 text-[15px] text-white/65">{data.subtitle}</p> : null}
                </div>

                <div className="mt-8 rounded-2xl bg-white p-6 text-[var(--navy)] shadow-2xl sm:p-8">
                    {page.submitted ? (
                        <div className="text-center">
                            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--navy)] text-white">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m4.5 12.75 6 6 9-13.5"/></svg>
                            </span>
                            <h3 className="mt-4 text-xl font-extrabold">Thank you!</h3>
                            <p className="mt-1.5 text-[#5A5F70]">Your application was received. We’ll be in touch shortly.</p>
                        </div>
                    ) : (
                        <form method="post" action={page.submitUrl} className="space-y-4">
                            <HiddenAttribution page={page} extra={{ lead_type: page.page.type === 'buyer' ? 'buyer' : 'seller' }} />
                            <div><label className={LABEL_CLASS}>Full Name</label><input type="text" name="name" required placeholder="Jane Doe" className={INPUT_CLASS} /></div>
                            <div><label className={LABEL_CLASS}>Email</label><input type="email" name="email" required placeholder="you@email.com" className={INPUT_CLASS} /></div>
                            {showPhone ? (
                                <div><label className={LABEL_CLASS}>Phone</label><input type="tel" name="phone" placeholder="(555) 555-5555" className={INPUT_CLASS} /></div>
                            ) : null}
                            <div><label className={LABEL_CLASS}>{data.message_label ?? 'Tell us about your goals'}</label><textarea name="message" rows={3} placeholder="A few details help us prepare…" className={`${INPUT_CLASS} resize-none`} /></div>

                            <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[#6B7180]">
                                <input type="checkbox" name="consent" value="1" required className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]" />
                                <span>{data.consent_text ?? 'By checking this box, I agree to receive marketing and informational text messages at the phone number provided, including messages sent via automated technology. Consent is not a condition of purchase. Message and data rates may apply. Message frequency varies. Reply STOP to unsubscribe or HELP for help.'}</span>
                            </label>

                            <button type="submit" className="w-full rounded-lg px-6 py-4 text-base font-extrabold uppercase tracking-wide text-white transition hover:brightness-[1.04]" style={{ backgroundImage: 'linear-gradient(180deg, color-mix(in srgb, var(--accent) 82%, #ffffff), var(--accent))' }}>{data.button_label ?? 'Submit Application'}</button>
                            {data.disclaimer ? <p className="text-center text-xs text-[#9AA0B2]">{data.disclaimer}</p> : null}
                        </form>
                    )}
                </div>
            </div>
        </section>
    );
}
