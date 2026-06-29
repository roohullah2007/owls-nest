import Logo from '@/Components/ui/Logo';
import { Head, Link } from '@inertiajs/react';

export default function Terms() {
    return (
        <>
            <Head title="Terms of Service" />

            <div className="min-h-screen bg-white px-6 py-12">
                <div className="max-w-[600px] mx-auto">
                    <Logo className="mb-10 justify-center" />

                    <h1 className="text-[#303030] text-3xl font-semibold mb-2 text-center">Terms & Conditions</h1>
                    <p className="text-[#8B9096] text-sm mb-10 text-center">Last updated: March 29, 2026</p>

                    <div className="space-y-8">
                        <p className="text-sm leading-relaxed text-[#5F656D]">
                            This is a binding agreement between you and BunnyChamp, LLC ("BunnyChamp", "we", "our", or "us") governing your use of our CRM platform, IDX services, and related tools. By using our services, you agree to be bound by these Terms & Conditions.
                        </p>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">1. Term of Agreement</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                Service begins when you create an account and ends upon termination by either party. BunnyChamp reserves the right to suspend or cancel accounts that have not been used in 60 consecutive days or that violate these terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">2. Description of Service</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                BunnyChamp provides a real estate CRM platform with contact management, deal tracking, activity logging, and optional IDX integration. The CRM is available at no cost with optional paid upgrades for premium features including automations, email campaigns, and analytics.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">3. Fee Structure</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                The core CRM is free to use. Premium features require a paid subscription as described at the time of purchase. The IDX plugin requires a separate one-time license purchase per domain. You authorize us to charge your payment method for recurring subscriptions until cancelled.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">4. Content Ownership & Responsibility</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                You retain ownership of all data you input into the Service. BunnyChamp does not claim ownership of your CRM data, contacts, or business information. You may export or delete your data at any time.
                            </p>
                            <p className="text-sm leading-relaxed text-[#5F656D] mt-2">
                                BunnyChamp disclaims responsibility for all user-generated and client-uploaded content including photographs, videos, drone imagery, virtual tours, graphics, and written content. You are solely responsible for ensuring you have rightful ownership or explicit permission for all content you upload.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">5. User Content Obligations</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D] mb-2">
                                By uploading content to our platform, you represent and warrant that you have:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-[#5F656D]">
                                <li>Rightful ownership or explicit permission for all content</li>
                                <li>Proper licenses for any copyrighted materials</li>
                                <li>Model releases for identifiable individuals</li>
                                <li>Written permission from property owners where applicable</li>
                                <li>FAA compliance for any drone photography</li>
                                <li>Fair Housing Act compliance for all listings and content</li>
                            </ul>
                            <p className="text-sm leading-relaxed text-[#5F656D] mt-2">
                                You agree to indemnify BunnyChamp against any claims arising from copyright infringement, privacy violations, or intellectual property disputes related to your content.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">6. IDX Plugin License</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                The IDX plugin requires a separate license purchase. Each license is valid for one domain. Licenses are non-transferable and subject to activation limits as described at the time of purchase. MLS data access is subject to MLS board rules and regulations.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">7. Acceptable Use</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D] mb-2">
                                You agree not to misuse the Service, including but not limited to:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-[#5F656D]">
                                <li>Sending bulk email, automated scripts, or unsolicited messages</li>
                                <li>Violating the Federal CAN-SPAM Act or similar legislation</li>
                                <li>Attempting to compromise the security of our servers</li>
                                <li>Infringing on intellectual property rights</li>
                                <li>Transmitting malicious code or gaining unauthorized access</li>
                            </ul>
                            <p className="text-sm leading-relaxed text-[#5F656D] mt-2">
                                BunnyChamp reserves the right to limit the number of messages or communications sent through the platform and to prosecute any security breach attempts.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">8. Intellectual Property</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                BunnyChamp shall own and retain all intellectual property rights, copyrights, and patents in all platform tools, scripts, code, and graphics. You may not reassign, redistribute, or reverse-engineer any BunnyChamp materials.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">9. Limitation of Liability</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                BUNNYCHAMP'S SERVICES ARE PROVIDED ON AN "AS IS" BASIS. We make no warranties regarding availability, functionality, or error-free operation. BunnyChamp shall not be liable for any consequential, indirect, incidental, special, or punitive damages arising from your use of the Service. Our total liability is limited to the fees you have paid in the preceding 12 months.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">10. Termination</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                We may suspend or terminate your access to the Service at any time for violation of these Terms. You may cancel your account at any time through your account settings. Upon termination, your right to use the Service ceases immediately.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">11. Amendments</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                BunnyChamp reserves the right to modify these Terms & Conditions at any time. Changes will be posted on our website and will take effect immediately upon posting. Continued use of the Service after changes constitutes acceptance.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-base font-semibold text-[#303030] mb-3">12. Contact Us</h2>
                            <p className="text-sm leading-relaxed text-[#5F656D]">
                                If you have questions about these Terms & Conditions, please contact us at support@bunnychamp.com.
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
