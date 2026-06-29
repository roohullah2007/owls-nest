export interface Tag {
    id: number;
    name: string;
    color: string;
}

export interface CustomField {
    key: string;
    label: string;
    type: string;
    section?: string;
    required?: boolean;
    searchable?: boolean;
    api?: boolean;
}

export interface Relative {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    pivot: { id: number; type: string; custom_label: string | null };
}

export interface Contact {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    type: string;
    source: string;
    address: string | null;
    city: string | null;
    state_province: string | null;
    postal_code: string | null;
    country: string;
    description: string | null;
    lead_score: number | null;
    ai_summary: string | null;
    ai_summary_at: string | null;
    ai_next_action: string | null;
    ai_next_action_at: string | null;
    date_of_birth: string | null;
    last_contacted_at: string | null;
    created_at: string;
    company?: { id: number; name: string } | null;
    tags: Tag[];
    deals: any[];
    notes: any[];
    tasks: any[];
    call_logs: any[];
    email_logs: any[];
    sms_logs: any[];
    meetings: any[];
    timeline_events: any[];
    status: string;
    custom_fields: Record<string, string> | null;
    assigned_users?: { id: number; name: string; email: string }[];
    relatives?: Relative[];
    sms_consent: boolean;
    sms_opted_out: boolean;
}

export interface Pager {
    position: number;
    total: number;
    prev: { uuid: string; first_name: string; last_name: string } | null;
    next: { uuid: string; first_name: string; last_name: string } | null;
}

export interface FollowUpSuggestion {
    priority: 'urgent' | 'high' | 'medium' | 'low';
    message: string;
}

export const sourceLabels: Record<string, string> = {
    manual: 'Manual', website: 'Website', referral: 'Referral', open_house: 'Open House',
    social_media: 'Social Media', cold_call: 'Cold Call', idx: 'IDX', other: 'Other',
};
