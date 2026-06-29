import { Head, Link } from '@inertiajs/react';

const plans = [
    {
        name: 'Free',
        price: '$0',
        period: '/month',
        description: 'Get started with essential CRM tools.',
        features: [
            'Up to 100 contacts',
            'Basic CRM features',
            'Team chat',
            'Task management',
            'Calendar & meetings',
        ],
        cta: 'Get Started',
        highlighted: false,
    },
    {
        name: 'Pro',
        price: '$29',
        period: '/month',
        description: 'For growing teams that need AI and advanced features.',
        features: [
            'Unlimited contacts',
            'AI-powered lead scoring',
            'AI contact insights & suggestions',
            'Advanced reporting',
            'Email notifications',
            'Priority support',
        ],
        cta: 'Start Pro Trial',
        highlighted: true,
    },
    {
        name: 'Enterprise',
        price: '$79',
        period: '/month',
        description: 'For large teams and brokerages.',
        features: [
            'Everything in Pro',
            'Custom integrations',
            'Dedicated account manager',
            'SSO & advanced security',
            'API access',
            'Custom branding',
            'Unlimited team members',
        ],
        cta: 'Contact Sales',
        highlighted: false,
    },
];

export default function Pricing() {
    return (
        <>
            <Head title="Pricing" />
            <div className="min-h-screen bg-[#F7F8FB]">
                {/* Header */}
                <header className="bg-[#111315] text-white">
                    <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                        <Link href="/" className="text-lg font-bold">BunnyIDX</Link>
                        <div className="flex items-center gap-4">
                            <Link href={route('login')} className="text-sm text-white/70 hover:text-white">Log In</Link>
                            <Link href={route('register')} className="text-sm bg-white text-[#111315] px-4 py-1.5 font-medium hover:bg-white/90 transition-colors">
                                Sign Up
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Hero */}
                <div className="text-center py-16 px-6">
                    <h1 className="text-3xl sm:text-4xl font-bold text-[#111315] mb-3">Simple, Transparent Pricing</h1>
                    <p className="text-[#5F656D] max-w-lg mx-auto">Choose the plan that fits your team. Upgrade or downgrade anytime.</p>
                </div>

                {/* Plan cards */}
                <div className="max-w-5xl mx-auto px-6 pb-20">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {plans.map((plan) => (
                            <div
                                key={plan.name}
                                className={`bg-white border flex flex-col p-6 ${
                                    plan.highlighted
                                        ? 'border-[#7C3AED] ring-2 ring-[#7C3AED] relative'
                                        : 'border-[#E4E7EB]'
                                }`}
                            >
                                {plan.highlighted && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#7C3AED] text-white text-[10px] font-semibold px-3 py-1 tracking-wider">
                                        Most Popular
                                    </div>
                                )}

                                <h3 className="text-lg font-semibold text-[#111315] mb-1">{plan.name}</h3>
                                <p className="text-xs text-[#5F656D] mb-4">{plan.description}</p>

                                <div className="mb-6">
                                    <span className="text-3xl font-bold text-[#111315]">{plan.price}</span>
                                    <span className="text-sm text-[#5F656D]">{plan.period}</span>
                                </div>

                                <ul className="space-y-2.5 mb-8 flex-1">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-2 text-sm text-[#5F656D]">
                                            <svg className="h-4 w-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    href={route('register')}
                                    className={`h-10 flex items-center justify-center text-sm font-medium transition-colors ${
                                        plan.highlighted
                                            ? 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]'
                                            : 'bg-[#111315] text-white hover:bg-[#1A1A1A]'
                                    }`}
                                >
                                    {plan.cta}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
