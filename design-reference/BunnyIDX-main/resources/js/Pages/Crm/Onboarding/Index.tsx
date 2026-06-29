import { useEffect, useMemo, useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { OnboardingData, OnboardingPageProps } from './types';
import OnboardingHeader from './components/OnboardingHeader';
import LeaveModal from './components/LeaveModal';
import DomainStep from './steps/DomainStep';
import BusinessStep from './steps/BusinessStep';
import TeamStep from './steps/TeamStep';
import ContactStep from './steps/ContactStep';
import FeaturesStep from './steps/FeaturesStep';
import MlsStep from './steps/MlsStep';
import CommunitiesStep from './steps/CommunitiesStep';
import BloggingStep from './steps/BloggingStep';
import FeaturedStep from './steps/FeaturedStep';
import TemplateStep from './steps/TemplateStep';
import BuildingStep from './steps/BuildingStep';

type StepId = 'domain' | 'business' | 'team' | 'contact' | 'features' | 'mls' | 'communities' | 'blogging' | 'featured' | 'template';

const STEP_COMPONENTS = {
    domain: DomainStep,
    business: BusinessStep,
    team: TeamStep,
    contact: ContactStep,
    features: FeaturesStep,
    mls: MlsStep,
    communities: CommunitiesStep,
    blogging: BloggingStep,
    featured: FeaturedStep,
    template: TemplateStep,
} as const;

// Per-step skip link label (footer, primary-colored). null = not skippable.
const SKIP_LABEL: Record<StepId, string | null> = {
    domain: 'Use temporary domain',
    business: null,
    team: 'Skip',
    contact: 'Skip',
    features: null,
    mls: 'Not now',
    communities: 'Skip',
    blogging: 'Skip',
    featured: 'Skip',
    template: null,
};

export default function OnboardingIndex(page: OnboardingPageProps) {
    const templateKeys = Object.keys(page.templates);
    const firstTemplate = templateKeys[0] || 'luxury';

    const [data, setData] = useState<OnboardingData>({
        custom_domain: '',
        template: firstTemplate,
        business_description: '',
        agent_name: page.defaults.agent_name,
        agent_email: page.defaults.agent_email,
        agent_phone: page.defaults.agent_phone,
        agent_country: page.defaults.agent_country || 'US',
        agent_city: page.defaults.agent_city,
        agent_state: page.defaults.agent_state,
        brokerage_name: page.defaults.brokerage_name,
        agent_whatsapp: '',
        office_address: '',
        site_type: page.isTeamContext ? 'team' : 'agent',
        team_members: [],
        features: ['home_search'],
        mls_provider_id: page.defaults.mls_provider_id,
        communities: [],
        blogging: null,
        featured: 'none',
    });

    // The Team step only shows for team sites; the MLS step is skipped when the
    // user already has a feed connected.
    const steps = useMemo<StepId[]>(() => {
        const all: StepId[] = ['domain', 'business', 'team', 'contact', 'features', 'mls', 'communities', 'blogging', 'featured', 'template'];
        return all.filter((s) => {
            if (s === 'team') return data.site_type === 'team';
            if (s === 'mls') return !page.hasMls;
            return true;
        });
    }, [page.hasMls, data.site_type]);

    const [index, setIndex] = useState(0);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [leaveOpen, setLeaveOpen] = useState(false);

    const currentId = steps[index];
    const isLast = index === steps.length - 1;
    const StepComponent = STEP_COMPONENTS[currentId];
    const formRef = useRef<HTMLFormElement>(null);

    /** Focusable text fields in DOM order — used for Enter-to-next-field nav. */
    function fields(): HTMLElement[] {
        const form = formRef.current;
        if (!form) return [];
        return Array.from(form.querySelectorAll<HTMLElement>('input, select, textarea'))
            .filter((f) => !(f as HTMLInputElement).disabled && f.offsetParent !== null);
    }

    // Auto-focus the first field whenever the step changes, so the user can type
    // straight away without reaching for the mouse.
    useEffect(() => {
        if (submitting) return;
        fields()[0]?.focus();
    }, [index, submitting]); // eslint-disable-line react-hooks/exhaustive-deps

    // Enter moves to the next field; on the last field it advances the step.
    // Textareas, buttons (choice cards) and inputs that own their Enter
    // (data-enter-self) are left to behave natively.
    function onFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
        if (e.key !== 'Enter') return;
        const el = e.target as HTMLElement;
        if (el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON') return;
        if (el.dataset.enterSelf !== undefined) return;
        if (el.tagName !== 'INPUT' && el.tagName !== 'SELECT') return;
        e.preventDefault();
        const list = fields();
        const next = list[list.indexOf(el) + 1];
        if (next) {
            next.focus();
        } else if (!nextDisabled) {
            goNext();
        }
    }

    function set<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
        setData((prev) => ({ ...prev, [key]: value }));
    }

    const businessIncomplete =
        data.agent_name.trim() === '' ||
        data.brokerage_name.trim() === '' ||
        data.agent_country.trim() === '' ||
        data.agent_city.trim() === '';
    const nextDisabled = currentId === 'business' && businessIncomplete;

    function goNext() {
        setErrors({});
        if (isLast) {
            submit();
            return;
        }
        setIndex((i) => Math.min(i + 1, steps.length - 1));
    }

    function goBack() {
        setErrors({});
        setIndex((i) => Math.max(i - 1, 0));
    }

    function onSkip() {
        if (currentId === 'domain') set('custom_domain', '');
        if (currentId === 'mls') set('mls_provider_id', null);
        goNext();
    }

    function submit() {
        setSubmitting(true);
        router.post(
            route('crm.onboarding.store'),
            {
                custom_domain: data.custom_domain.trim() || null,
                template: data.template,
                business_description: data.business_description.trim() || null,
                agent_name: data.agent_name.trim(),
                agent_email: data.agent_email.trim() || null,
                agent_phone: data.agent_phone.trim() || null,
                agent_country: data.agent_country || null,
                agent_city: data.agent_city.trim() || null,
                agent_state: data.agent_state || null,
                brokerage_name: data.brokerage_name.trim() || null,
                agent_whatsapp: data.agent_whatsapp.trim() || null,
                office_address: data.office_address.trim() || null,
                site_type: data.site_type,
                team_members: data.site_type === 'team'
                    ? data.team_members.filter((m) => m.first_name.trim() || m.last_name.trim() || m.role.trim() || (m.email ?? '').trim())
                    : [],
                features: data.features,
                mls_provider_id: data.mls_provider_id,
                communities: data.communities,
                blogging: !!data.blogging,
                featured: data.featured,
                // Admin-created sites: the eventual owner (ignored for self-serve).
                target_user_id: page.forUser?.id ?? null,
            },
            {
                onError: (errs) => {
                    setErrors(errs);
                    setSubmitting(false);
                    // Jump back to the setup step if any of its required fields failed.
                    if (errs.agent_name || errs.brokerage_name || errs.agent_city || errs.agent_country) {
                        const businessIdx = steps.indexOf('business');
                        if (businessIdx >= 0) setIndex(businessIdx);
                    }
                },
            },
        );
    }

    function requestClose() {
        setLeaveOpen(true);
    }

    function confirmLeave() {
        router.visit(route('crm.websites.index'));
    }

    const progress = ((index + 1) / steps.length) * 100;

    return (
        <div className="fixed inset-0 z-40 flex flex-col bg-white">
            <Head title="Create your website" />
            <OnboardingHeader onClose={requestClose} />

            {page.forUser && (
                <div className="shrink-0 bg-[#EBF5FF] border-b border-[#CDE9F8] px-5 py-2 text-center text-[12px] font-medium text-[#1380AF]">
                    Creating this website for <span className="font-semibold">{page.forUser.name}</span>
                </div>
            )}

            {submitting ? (
                <main className="flex-1 flex items-center justify-center px-5 py-10">
                    <BuildingStep />
                </main>
            ) : (
                <>
                    {/* Progress bar */}
                    <div className="h-1 w-full bg-[#F3F4F6] shrink-0">
                        <div className="h-full bg-[#1693C9] transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>

                    <main className="flex-1 overflow-y-auto px-5 py-10 sm:py-14">
                        <form ref={formRef} onKeyDown={onFormKeyDown} onSubmit={(e) => e.preventDefault()}>
                            <StepComponent data={data} set={set} page={page} errors={errors} />
                        </form>
                    </main>

                    {/* Footer */}
                    <footer className="shrink-0 border-t border-[#E4E7EB] bg-white px-5 sm:px-8">
                        <div className="flex h-[72px] w-full items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                {index > 0 && (
                                    <button
                                        type="button"
                                        onClick={goBack}
                                        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#5F656D] hover:text-[#111315] transition-colors"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                                        Back
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-5">
                                {SKIP_LABEL[currentId] && (
                                    <button
                                        type="button"
                                        onClick={onSkip}
                                        className="text-[14px] font-bold text-[#1693C9] hover:text-[#1380AF] transition-colors"
                                    >
                                        {SKIP_LABEL[currentId]}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={goNext}
                                    disabled={nextDisabled}
                                    className="h-10 px-6 rounded-lg bg-[#1693C9] text-white text-[14px] font-semibold hover:bg-[#1380AF] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isLast ? 'Create website' : 'Next'}
                                </button>
                            </div>
                        </div>
                    </footer>
                </>
            )}

            <LeaveModal show={leaveOpen} onStay={() => setLeaveOpen(false)} onLeave={confirmLeave} />
        </div>
    );
}
