// The white "Get In Touch" form card from design-reference/contact.html.
// Controlled via Inertia's useForm and submitted to the real POST /contact
// route (ContactController@store) — not a fake JS success message.
import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button } from '@/components/site/button';
import { cn } from '@/lib/utils';
import { store } from '@/routes/contact';

interface ContactFormData {
    name: string;
    email: string;
    phone: string;
    message: string;
    consent: boolean;
    [key: string]: string | boolean;
}

const LABEL =
    'block uppercase mb-2 font-light text-[12px] leading-[16px] text-navy';
const FIELD =
    'w-full bg-gray-100 rounded-full px-6 py-4 outline-none focus:ring-1 focus:ring-navy/40 transition font-normal text-[14px] leading-[20px] text-navy';
const ERROR = 'mt-2 text-[12px] leading-[16px] text-red-600';

export function ContactForm({ className }: { className?: string }) {
    const { data, setData, post, processing, errors, reset, wasSuccessful } =
        useForm<ContactFormData>({
            name: '',
            email: '',
            phone: '',
            message: '',
            consent: false,
        });

    function submit(e: FormEvent) {
        e.preventDefault();
        post(store.url(), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    }

    return (
        <div
            className={cn(
                'relative w-full bg-white p-6 shadow-2xl sm:p-10 md:p-14',
                className,
            )}
        >
            <form onSubmit={submit} className="space-y-6 sm:space-y-7">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="contact-name" className={LABEL}>
                            Name
                        </label>
                        <input
                            id="contact-name"
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Enter your full name"
                            className={FIELD}
                        />
                        {errors.name && <p className={ERROR}>{errors.name}</p>}
                    </div>
                    <div>
                        <label htmlFor="contact-phone" className={LABEL}>
                            Phone
                        </label>
                        <input
                            id="contact-phone"
                            type="tel"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            placeholder="Your phone"
                            className={FIELD}
                        />
                        {errors.phone && (
                            <p className={ERROR}>{errors.phone}</p>
                        )}
                    </div>
                </div>

                <div>
                    <label htmlFor="contact-email" className={LABEL}>
                        Email
                    </label>
                    <input
                        id="contact-email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="@"
                        className={FIELD}
                    />
                    {errors.email && <p className={ERROR}>{errors.email}</p>}
                </div>

                <div>
                    <label htmlFor="contact-message" className={LABEL}>
                        Your Message
                    </label>
                    <textarea
                        id="contact-message"
                        rows={6}
                        value={data.message}
                        onChange={(e) => setData('message', e.target.value)}
                        placeholder="Type your message"
                        className={cn(FIELD, 'resize-none rounded-3xl py-5')}
                    />
                    {errors.message && (
                        <p className={ERROR}>{errors.message}</p>
                    )}
                </div>

                {/* Agreement */}
                <div>
                    <label className="flex cursor-pointer items-start gap-3 pt-2">
                        <input
                            type="checkbox"
                            checked={data.consent}
                            onChange={(e) =>
                                setData('consent', e.target.checked)
                            }
                            className="mt-1 h-4 w-4 flex-shrink-0 accent-navy"
                        />
                        <span className="text-[12px] leading-[18px] font-light text-navy">
                            I agree to be contacted by Owl&rsquo;s Nest Real
                            Estate via call, email, and text for real estate
                            services. To opt out, you can reply
                            &lsquo;stop&rsquo; at any time or reply
                            &lsquo;help&rsquo; for assistance. You can also
                            click the unsubscribe link in the emails. Message
                            and data rates may apply. Message frequency may
                            vary.{' '}
                            <a href="#" className="underline">
                                Privacy Policy
                            </a>
                            .
                        </span>
                    </label>
                    {errors.consent && (
                        <p className={ERROR}>{errors.consent}</p>
                    )}
                </div>

                <div className="pt-4">
                    <Button
                        type="submit"
                        variant="outline-dark"
                        affordance="line"
                        disabled={processing}
                    >
                        {processing ? 'Sending…' : 'Send Message'}
                    </Button>
                </div>

                {wasSuccessful && (
                    <p className="pt-2 text-[14px] text-green-600">
                        Thanks! Your message has been sent. We&rsquo;ll get back
                        to you shortly.
                    </p>
                )}
            </form>
        </div>
    );
}
