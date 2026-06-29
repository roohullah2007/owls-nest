/**
 * Shared types for the Contacts Index page. The page itself, all cell components,
 * and the channel-setup modal pull their type definitions from here so we don't
 * have multiple drifting copies of the Contact shape.
 */

export interface Contact {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
    email: string | null;
    email_verified_at: string | null;
    phone: string | null;
    phone_verified_at: string | null;
    mobile: string | null;
    type: string;
    status: string;
    source: string;
    city: string | null;
    state_province: string | null;
    last_contacted_at: string | null;
    custom_fields: Record<string, string> | null;
    lead_score: number | null;
    tags: { id: number; name: string; color: string }[];
    created_at: string;
    follow_up_hint: { type: string; priority: string; message: string; icon: string } | null;
    assigned_users?: { id: number; name: string; email: string }[];
    email_logs_count?: number;
    sms_logs_count?: number;
    call_logs_count?: number;
    listings_count?: number;
    listings_total_value?: string | number | null;
    searches_count?: number;
    listings?: ContactListingPreview[];
    searches?: ContactSearchPreview[];
}

export interface ContactListingPreview {
    id: number;
    title: string;
    address: string | null;
    city: string | null;
    state_province: string | null;
    price: string | null;
    photos: string[] | null;
    status?: string | null;
    bedrooms?: number | null;
    bathrooms?: string | null;
    sqft?: number | null;
}

export interface ContactSearchPreview {
    id: number;
    name: string;
    filters: Record<string, any> | null;
}

export interface PaginatedContacts {
    data: Contact[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    total: number;
}

export interface CustomFieldDef {
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select';
    options?: string[];
}

export interface SavedContactView {
    id: number;
    name: string;
    filters: Record<string, unknown>;
    is_default: boolean;
    position: number;
}

export interface TeamMember {
    id: number;
    name: string;
    email: string;
}

export interface AiContactResult {
    id: number;
    uuid: string;
    name: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    type: string;
    status: string;
    source: string;
    city: string | null;
    lead_score: number | null;
    last_contacted_at: string | null;
    tags: { name: string; color: string }[];
    deals_count: number;
    open_deals_value: number;
}

export interface AiDraft {
    type: 'email' | 'sms';
    subject?: string;
    body?: string;
    contact_id?: number;
    contact_uuid?: string;
}

export interface AiResponse {
    filters?: Record<string, string>;
    interpretation?: string;
    answer?: string;
    action?: string;
    matchedIds?: number[];
    matchedCount?: number;
    assign_to_id?: number;
    suggestions?: string[];
    contacts?: AiContactResult[];
    draft?: AiDraft;
    error?: string;
}

export interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    text: string;
    data?: AiResponse;
    timestamp: Date;
}

export interface BuiltInView {
    key: string;
    label: string;
}

export interface Column {
    key: string;
    label: string;
    sortable: boolean;
    defaultVisible: boolean;
    width: number;
    isCustom?: boolean;
}

export interface ContactsIndexProps {
    contacts: PaginatedContacts;
    filters: Record<string, string | undefined>;
    leadTypes: string[];
    contactStatuses: string[];
    customFields: CustomFieldDef[];
    tags: { id: number; name: string; color: string }[];
    savedViews: SavedContactView[];
    activeSmartList: SavedContactView | null;
    builtInViews: BuiltInView[];
    activeBuiltInView: string | null;
    teamEnabled: boolean;
    aiEnabled?: boolean;
    teamMembers?: TeamMember[];
    columnPreferences?: {
        order?: string[];
        visible?: string[];
        widths?: Record<string, number>;
    } | null;
    actionPlans?: { id: number; name: string }[];
}
