import CrmLayout from '@/Layouts/CrmLayout';
import CrmSidebar, { CrmSidebarSection, useSidebarContext } from '@/Components/Crm/CrmSidebar';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { EmailAccount, NotificationPreferences, PhoneNumber } from '@/types';
import ProfileTab from './tabs/ProfileTab';
import SubscriptionTab from './tabs/SubscriptionTab';
import PhoneTab from './tabs/PhoneTab';
import TenDlcTab from './tabs/TenDlcTab';
import EmailTab from './tabs/EmailTab';
import LeadImportsTab from './tabs/LeadImportsTab';
import CallingScriptsTab from './tabs/CallingScriptsTab';
import VoicemailsTab from './tabs/VoicemailsTab';
import ModulesTab, { ModuleKey, ModuleCustomField, ListingTaxonomy } from './tabs/ModulesTab';
import ConnectionsTab from '../Idx/tabs/ConnectionsTab';
import type { IdxConnection, AvailableMls, MlsRequest } from '../Idx/Index';

interface LeadImportRow {
    id: number;
    original_filename: string;
    row_count: number;
    imported_count: number;
    skipped_count: number;
    status: 'pending' | 'mapped' | 'processing' | 'completed' | 'failed';
    error: string | null;
    created_at: string;
    completed_at: string | null;
}

export interface PlanRow {
    key: string;
    name: string;
    description: string | null;
    monthly_price: string | null;
    is_paid: boolean;
    trial_days: number;
    features: string[];
}

export interface PropertyAlertsSettings {
    frequency: string;
    default_frequency: string;
    paid: boolean;
    usage: {
        month: string;
        sent: number;
        included_limit: number;
        overage_emails: number;
        overage_units: number;
        overage_amount: number;
        overage_price_per_unit: number;
        overage_unit: number;
    };
}

export interface ResendStatus {
    configured: boolean;
    last_four: string | null;
    from_email: string | null;
    from_name: string | null;
    test_status: string | null;
    last_tested_at: string | null;
    platform_from: string | null;
    platform_configured: boolean;
}

export interface SenderAliasStatus {
    alias: string | null;
    email: string;
    display_name: string | null;
    default_sender: string;
    default_name: string;
    domain: string;
    suggested: string;
}

interface Props {
    initialTab?: string | null;
    initialModule?: ModuleKey | null;
    moduleFields?: Record<ModuleKey, ModuleCustomField[]>;
    listingTaxonomy?: ListingTaxonomy;
    mustVerifyEmail: boolean;
    status?: string;
    notificationPreferences: NotificationPreferences;
    propertyAlerts: PropertyAlertsSettings;
    subscription: {
        tier: string;
        effective_tier: string;
        is_lifetime: boolean;
        trialing: boolean;
        trial_plan: string | null;
        trial_ends_at: string | null;
        trial_days_remaining: number;
        trial_used: boolean;
        stripe_configured: boolean;
        has_billing_account: boolean;
    };
    plans: PlanRow[];
    featureCatalog: Record<string, string>;
    phoneNumbers: PhoneNumber[];
    telnyxConfigured: boolean;
    emailAccounts: EmailAccount[];
    googleConfigured: boolean;
    resendStatus: ResendStatus;
    senderAlias: SenderAliasStatus;
    leadImports: LeadImportRow[];
    idxConnections: IdxConnection[];
    availableMlses: AvailableMls[];
    mlsRequests: MlsRequest[];
}

type Tab = 'profile' | 'subscription' | 'phone' | 'email' | '10dlc' | 'mls' | 'lead-imports' | 'calling-scripts' | 'voicemails' | 'modules';

const tabIcons: Record<string, JSX.Element> = {
    profile: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>,
    subscription: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>,
    phone: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>,
    email: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>,
    '10dlc': <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>,
    mls: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>,
    'lead-imports': <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
    'calling-scripts': <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>,
    voicemails: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><circle cx="6.75" cy="14.25" r="3.75" /><circle cx="17.25" cy="14.25" r="3.75" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 10.5h10.5" /></svg>,
    modules: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>,
};

const moduleSubmenu: { key: ModuleKey; label: string; icon: JSX.Element }[] = [
    {
        key: 'contact',
        label: 'Contact',
        icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>,
    },
    {
        key: 'deal',
        label: 'Deal',
        icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>,
    },
    {
        key: 'listing',
        label: 'Listing',
        icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12 12 2.25 21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
    },
];

export default function SettingsIndex({ initialTab, initialModule, moduleFields, listingTaxonomy, mustVerifyEmail, status, notificationPreferences, propertyAlerts, subscription, plans, featureCatalog, phoneNumbers, telnyxConfigured, emailAccounts, googleConfigured, resendStatus, senderAlias, leadImports, idxConnections, availableMlses, mlsRequests }: Props) {
    const validTabs: Tab[] = ['profile', 'subscription', 'phone', 'email', '10dlc', 'mls', 'lead-imports', 'calling-scripts', 'voicemails', 'modules'];
    // Resolve initial tab from server-provided segment (preferred) or query-string fallback.
    const queryTab = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search).get('tab') : null;
    const startTab = (initialTab && validTabs.includes(initialTab as Tab))
        ? (initialTab as Tab)
        : (queryTab && validTabs.includes(queryTab as Tab)) ? (queryTab as Tab) : 'profile';
    const [tab, setTab] = useState<Tab>(startTab);
    const [activeModule, setActiveModule] = useState<ModuleKey>(initialModule || 'contact');
    const [showAddConnection, setShowAddConnection] = useState(false);

    function switchTab(next: Tab) {
        setTab(next);
        const url = next === 'profile'
            ? route('crm.settings')
            : next === 'modules'
                ? route('crm.settings.modules', activeModule)
                : route('crm.settings.tab', next);
        if (typeof window !== 'undefined' && window.location.pathname !== url.replace(window.location.origin, '')) {
            window.history.replaceState({}, '', url);
        }
    }

    function switchModule(next: ModuleKey) {
        setActiveModule(next);
        if (tab !== 'modules') setTab('modules');
        const url = route('crm.settings.modules', next);
        if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', url);
        }
    }

    const tabs: { key: Tab; label: string }[] = [
        { key: 'profile', label: 'Profile' },
        { key: 'subscription', label: 'Subscription' },
        { key: 'phone', label: 'Phone & SMS' },
        { key: 'email', label: 'Email' },
        ...(telnyxConfigured ? [{ key: '10dlc' as const, label: '10DLC' }] : []),
        { key: 'mls', label: 'MLS Connections' },
        { key: 'lead-imports', label: 'Lead Imports' },
        { key: 'calling-scripts', label: 'Calling Scripts' },
        { key: 'voicemails', label: 'Voicemails' },
        { key: 'modules', label: 'Custom Fields' },
    ];

    return (
        <CrmLayout>
            <Head title="Settings" />

            <div className="flex items-stretch">
                <CrmSidebar>
                    <CrmSidebarSection title="Settings" onBack={() => window.history.back()} border={false}>
                        <SettingsNav
                            tabs={tabs}
                            activeTab={tab}
                            onSwitchTab={switchTab}
                        />
                    </CrmSidebarSection>
                </CrmSidebar>

                {/* Content */}
                {tab === 'modules' ? (
                    <ModulesTab
                        module={activeModule}
                        fields={(moduleFields && moduleFields[activeModule]) || []}
                        modules={moduleSubmenu}
                        onSwitchModule={switchModule}
                        listingTaxonomy={listingTaxonomy}
                    />
                ) : tab === 'profile' ? (
                    <ProfileTab
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                        notificationPreferences={notificationPreferences}
                        propertyAlerts={propertyAlerts}
                        emailAccounts={emailAccounts}
                        googleConfigured={googleConfigured}
                        resendStatus={resendStatus}
                        senderAlias={senderAlias}
                    />
                ) : (
                    <div className="flex-1 overflow-auto p-5 sm:p-6 lg:p-8">
                        {tab === 'subscription' && <SubscriptionTab subscription={subscription} plans={plans} featureCatalog={featureCatalog} />}
                        {tab === 'phone' && <PhoneTab phoneNumbers={phoneNumbers} telnyxConfigured={telnyxConfigured} />}
                        {tab === 'email' && <EmailTab emailAccounts={emailAccounts} googleConfigured={googleConfigured} resendStatus={resendStatus} senderAlias={senderAlias} />}
                        {tab === '10dlc' && <TenDlcTab />}
                        {tab === 'mls' && (
                            <div className="mx-auto max-w-[1350px] space-y-4">
                                <h1 className="text-lg font-normal text-[#111315]">MLS Connections</h1>
                                <ConnectionsTab
                                    connections={idxConnections}
                                    availableMlses={availableMlses}
                                    mlsRequests={mlsRequests}
                                    showAddConnection={showAddConnection}
                                    setShowAddConnection={setShowAddConnection}
                                />
                            </div>
                        )}
                        {tab === 'lead-imports' && <LeadImportsTab leadImports={leadImports} />}
                        {tab === 'calling-scripts' && <CallingScriptsTab />}
                        {tab === 'voicemails' && <VoicemailsTab />}
                    </div>
                )}
            </div>
        </CrmLayout>
    );
}

interface SettingsNavProps {
    tabs: { key: Tab; label: string }[];
    activeTab: Tab;
    onSwitchTab: (next: Tab) => void;
}

function SettingsNav({ tabs, activeTab, onSwitchTab }: SettingsNavProps) {
    const { collapsed } = useSidebarContext();
    return (
        <nav className={collapsed ? 'space-y-0.5' : '-mx-3'}>
            {tabs.map((t) => {
                const isActive = activeTab === t.key;
                return (
                    <button
                        key={t.key}
                        onClick={() => onSwitchTab(t.key)}
                        title={collapsed ? t.label : undefined}
                        className={`flex items-center gap-2.5 w-full h-9 ${collapsed ? 'justify-center px-0 rounded-md' : 'px-5'} text-[14px] font-normal capitalize transition-colors text-[#1f2530] [&_svg]:h-4 [&_svg]:w-4 ${
                            isActive ? 'bg-[#F3F4F6]' : 'hover:bg-[#F9FAFB]'
                        }`}
                    >
                        <span className="shrink-0 text-[#1f2530]">{tabIcons[t.key]}</span>
                        {!collapsed && <span className="flex-1 text-left truncate">{t.label}</span>}
                    </button>
                );
            })}
        </nav>
    );
}
