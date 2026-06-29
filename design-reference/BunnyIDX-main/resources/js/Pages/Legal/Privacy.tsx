import Logo from '@/Components/ui/Logo';
import { Head, Link } from '@inertiajs/react';

export default function Privacy() {
    return (
        <>
            <Head title="Privacy Policy" />

            <div className="min-h-screen bg-white px-6 py-12">
                <div className="max-w-[600px] mx-auto">
                    <Logo className="mb-10 justify-center" />

                    <h1 className="text-[#303030] text-3xl font-semibold mb-2 text-center">Privacy Policy</h1>
                    <p className="text-[#8B9096] text-sm mb-10 text-center">Last updated: March 29, 2026</p>

                    <div className="space-y-8">
                        <p className="text-sm leading-relaxed text-[#5F656D]">
                            BunnyChamp, LLC ("BunnyChamp", "we", "our", or "us") respects your privacy and is committed to protecting your personal information. This Privacy Policy applies to all users of our mobile and desktop CRM, IDX, and related services.
                        </p>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">1. Information We Collect</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                We collect information you provide directly during registration and use of our services, including names, addresses, phone numbers, email addresses, and property search details. When you select a service plan, payment information is collected and secured using industry-standard encryption technology.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">2. Cookies and Tracking</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                We use cookies to identify your browser and store user preferences. We track activity to improve service quality and may use web beacons and pixels to count visitors and monitor cross-site activity. Some features may be limited if you refuse cookies.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">3. IP Address and Device Information</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                We work with service providers to track cookies and user activities across websites and devices over time. Your devices communicate cookie existence, IP addresses, and browser information to our servers. You can adjust privacy settings on your mobile devices to control information sharing, including device model and language preferences.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">4. Location Information</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                Our services may use location-based features. Location-based services can be disabled on your mobile device if you wish to opt out of location tracking.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">5. Third Party Websites</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                This Privacy Policy does not extend to external websites and third parties. We encourage you to review the privacy policies of any third-party websites you visit through links on our platform.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">6. User-Generated Content</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                BunnyChamp is NOT responsible for any user-generated content uploaded by our clients to their websites. Clients bear sole responsibility for ensuring they own rights to all uploaded content, including photos, videos, and property descriptions. Clients must secure proper permissions and comply with all applicable copyright and fair housing laws.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">7. Data Security and Storage</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                Personal information is processed and stored in secure databases. We implement reasonable protective measures including AES-256-GCM encryption for sensitive credentials. However, no method of internet transmission can be guaranteed entirely secure.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">8. Data Retention</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                We retain your personal information for as long as your account remains active or as needed to provide services and comply with legal obligations. You may request deletion of your account and associated data at any time.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">9. Your Rights</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                You have the right to access, correct, or delete your personal information. You may also object to or restrict certain processing of your data. To exercise these rights, contact us using the information below.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">10. Changes to This Policy</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                BunnyChamp reserves the right to modify this Privacy Policy at any time. Changes will be posted on our website and will take effect immediately upon posting.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">11. Contact Us</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                If you have questions about this Privacy Policy, please contact us at support@bunnychamp.com.
                            </p>
                        </section>
                    </div>

                    <div className="mt-10 text-center">
                        <Link href={route('login')} className="text-sm text-[#303030] underline hover:text-black transition-colors">
                            Back to login
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
