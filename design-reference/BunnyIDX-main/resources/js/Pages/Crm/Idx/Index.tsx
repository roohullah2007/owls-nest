import CrmLayout from '@/Layouts/CrmLayout';
import CrmSidebar, { CrmSidebarNav, CrmSidebarSection, SidebarNavItem } from '@/Components/Crm/CrmSidebar';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import ConnectionsTab from './tabs/ConnectionsTab';

// ─── Shared types ───────────────────────────────────────────

export interface ConnectionConstraints {
    property_types?: string[];
    statuses?: string[];
    agent_only?: boolean;
    office_only?: boolean;
    cities?: string[];
    postal_codes?: string[];
    min_price?: number | null;
    max_price?: number | null;
    min_sqft?: number | null;
    max_sqft?: number | null;
    min_year_built?: number | null;
    max_year_built?: number | null;
    max_dom?: number | null;
    keywords?: string[];
    exclude_keywords?: string[];
}

export interface IdxConnection {
    id: number;
    mls_provider_id: number | null;
    mls_slug: string;
    display_name: string;
    logo_url: string | null;
    region: string | null;
    country: string;
    feed_types: string[];
    agent_id: string | null;
    office_id: string | null;
    constraints: ConnectionConstraints | null;
    is_active: boolean;
    last_tested_at: string | null;
    test_status: string;
}

export interface LicenseDomain {
    id: number;
    domain: string;
    is_active: boolean;
    activated_at: string;
}

export interface License {
    id: number;
    key: string;
    status: string;
    email: string;
    purchase_source: string;
    created_at: string;
    active_domain: LicenseDomain | null;
}

export interface IdxSearch {
    id: number;
    name: string;
    mls_slug: string;
    filters: Record<string, any>;
    sort_by: string;
    sort_dir: string;
    per_page: number;
    widgets_count?: number;
}

export interface IdxWidget {
    id: number;
    name: string;
    widget_type: string;
    mls_slug: string;
    license_id: number | null;
    idx_search_id: number | null;
    appearance: WidgetAppearance | null;
    config: Record<string, any> | null;
    custom_css: string | null;
    is_active: boolean;
    search: { id: number; name: string } | null;
}

export interface AvailableMls {
    id: number;
    slug: string;
    name: string;
    region: string | null;
    country: string;
    logo: string | null;
    has_idx_feed: boolean;
    has_vow_feed: boolean;
    monthly_fee_cents: number;
    monthly_fee_label: string;
    setup_notes: string | null;
    property_types?: string[] | null;
    statuses?: string[] | null;
}

export interface MlsRequest {
    id: number;
    status: 'pending' | 'in_process' | 'completed' | 'integrated' | 'denied';
    feed_types_requested: string[];
    created_at: string;
    integrated_at: string | null;
    denied_reason: string | null;
    mls: {
        id: number;
        slug: string;
        name: string;
        logo: string | null;
        region: string | null;
        setup_notes: string | null;
    } | null;
}

export interface IdxSearchData {
    name: string;
    mls_slug: string;
    filters: Record<string, any>;
    sort_by: string;
    sort_dir: string;
    per_page: number;
}

export interface IdxWidgetData {
    name: string;
    widget_type: string;
    mls_slug: string;
    license_id: number | null;
    idx_search_id: number | null;
    config: Record<string, any>;
}

export interface PreviewListing {
    mls_id: string;
    mls_number: string;
    price: number | null;
    price_formatted: string | null;
    address: {
        street: string | null;
        city: string | null;
        state_province: string | null;
        postal_code: string | null;
        full: string | null;
    };
    bedrooms: number | null;
    bathrooms: number | null;
    sqft: number | null;
    lot_sqft: number | null;
    year_built: number | null;
    property_type: string | null;
    status: string | null;
    days_on_market: number | null;
    lat: number | null;
    lng: number | null;
    photos: string[];
    photo_count: number;
    list_agent_name: string | null;
    list_office_name: string | null;
    description: string | null;
}

export interface WidgetAppearance {
    card: {
        borderRadius: number;
        padding: number;
        margin: number;
        shadow: string;
        hoverEffect: string;
        imageAspectRatio: string;
    };
    typography: {
        fontFamily: string;
        priceSize: number;
        addressSize: number;
        detailsSize: number;
    };
    colors: {
        primary: string;
        background: string;
        cardBackground: string;
        text: string;
        textSecondary: string;
        accent: string;
        priceBadge: string;
        priceBadgeText: string;
        statusBadge: string;
        statusBadgeText: string;
    };
    fields: Record<string, boolean>;
    searchForm: {
        borderRadius: number;
        layout: string;
        buttonText: string;
        buttonColor: string;
        buttonTextColor: string;
        visibleFields: string[];
    };
    custom_css?: string;
}

export const defaultAppearance: WidgetAppearance = {
    card: { borderRadius: 8, padding: 12, margin: 16, shadow: 'sm', hoverEffect: 'lift', imageAspectRatio: '16:9' },
    typography: { fontFamily: 'Inter, sans-serif', priceSize: 18, addressSize: 14, detailsSize: 12 },
    colors: {
        primary: '#111315', background: '#FFFFFF', cardBackground: '#FFFFFF',
        text: '#111315', textSecondary: '#5F656D', accent: '#1693C9',
        priceBadge: '#111315', priceBadgeText: '#FFFFFF',
        statusBadge: '#DCFCE7', statusBadgeText: '#166534',
    },
    fields: {
        photo: true, price: true, address: true, cityStateZip: true,
        beds: true, baths: true, sqft: true, lotSize: false,
        yearBuilt: false, mlsNumber: true, statusBadge: true,
        daysOnMarket: false, agent: false, office: true, photoCount: true,
    },
    searchForm: {
        borderRadius: 8, layout: 'horizontal', buttonText: 'Search',
        buttonColor: '#111315', buttonTextColor: '#FFFFFF',
        visibleFields: ['city', 'min_price', 'max_price', 'min_beds', 'min_baths', 'property_type'],
    },
};

// ─── Page Props ─────────────────────────────────────────────

interface Props {
    connections: IdxConnection[];
    availableMlses: AvailableMls[];
    mlsRequests: MlsRequest[];
    initialTab?: string | null;
}

// MLS Connections is the only surface here now — the legacy Licenses /
// Widgets / Search Library / WordPress plugin tabs were retired (agent sites
// + the built-in IDX pages replaced them). Old tab URLs fall back here.
type Tab = 'connections';

const tabIcons: Record<Tab, JSX.Element> = {
    connections: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
        </svg>
    ),
};

export default function IdxIndex({ connections, availableMlses, mlsRequests }: Props) {
    const [showAddConnection, setShowAddConnection] = useState(false);

    const navItems: SidebarNavItem<Tab>[] = [{
        key: 'connections',
        label: 'MLS Connections',
        count: connections.length || undefined,
        icon: tabIcons.connections,
    }];

    return (
        <CrmLayout>
            <Head title="IDX" />

            <div className="flex items-stretch">
                <CrmSidebar>
                    <CrmSidebarSection title="IDX" border={false}>
                        <CrmSidebarNav items={navItems} activeKey="connections" onSelect={() => undefined} />
                    </CrmSidebarSection>
                </CrmSidebar>

                {/* Content */}
                <div className="flex-1 min-w-0 overflow-auto p-4 sm:p-5 md:p-6">
                    <div className="mx-auto max-w-[1350px] space-y-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-lg font-normal text-[#111315]">MLS Connections</h1>
                            <div className="flex-1" />
                        </div>

                        <ConnectionsTab
                            connections={connections}
                            availableMlses={availableMlses}
                            mlsRequests={mlsRequests}
                            showAddConnection={showAddConnection}
                            setShowAddConnection={setShowAddConnection}
                        />
                    </div>
                </div>
            </div>
        </CrmLayout>
    );
}
