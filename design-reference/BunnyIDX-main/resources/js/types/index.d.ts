export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    role: 'admin' | 'agent';
    phone?: string;
    company?: string;
    avatar?: string;
    subscription_tier: 'free' | 'pro' | 'enterprise';
    google_id?: string;
    team_id?: number | null;
    active_context: 'personal' | 'team';
    notification_preferences?: NotificationPreferences | null;
    settings?: {
        first_name?: string;
        last_name?: string;
        nickname?: string;
        time_format?: '12h' | '24h';
        date_format?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
        timezone?: string;
        email_signature?: string;
        email?: {
            default_from_name?: string | null;
            bcc_self?: boolean;
            track_opens?: boolean;
            track_clicks?: boolean;
            auto_reply?: {
                enabled?: boolean;
                subject?: string | null;
                message?: string | null;
                start_at?: string | null;
                end_at?: string | null;
            };
        };
        [key: string]: unknown;
    } | null;
}

export interface TeamMemberPermissions {
    listings: 'all' | 'own' | 'none';
    contacts: 'all' | 'own' | 'none';
    contact_types: string[];
    tasks: 'all' | 'own';
    calendar: 'all' | 'own';
    deals: 'all' | 'own' | 'none';
    phone: 'all' | 'own' | 'none';
}

export interface TeamMember {
    id: number;
    user_id: number;
    team_id: number;
    role: string;
    permissions: TeamMemberPermissions | null;
    is_active: boolean;
    user: { id: number; name: string; email: string };
}

export interface Team {
    id: number;
    name: string;
    owner_id: number;
    members: TeamMember[];
}

export interface ChatAttachment {
    id: number;
    original_name: string;
    mime_type: string;
    size: number;
    url: string;
    is_image: boolean;
    is_audio: boolean;
}

export interface ChatListing {
    id: number;
    title: string;
    address: string | null;
    city: string | null;
    state_province: string | null;
    price: string | null;
    bedrooms: number | null;
    bathrooms: string | null;
    photos: string[] | null;
    mls_number: string | null;
    status: string;
}

export interface ChatDeal {
    id: number;
    title: string;
}

export interface TeamChatMessage {
    id: number;
    team_id: number;
    user_id: number | null;
    body: string;
    mentions: number[] | null;
    contact_id: number | null;
    reply_to_id: number | null;
    listing_id: number | null;
    deal_id: number | null;
    recipient_id: number | null;
    edited_at: string | null;
    is_ai_response: boolean;
    reactions: Record<string, number[]> | null;
    created_at: string;
    user: { id: number; name: string } | null;
    contact?: { id: number; first_name: string; last_name: string; uuid: string } | null;
    reply_to?: { id: number; user_id: number; body: string; user: { id: number; name: string } } | null;
    listing?: ChatListing | null;
    deal?: ChatDeal | null;
    attachments: ChatAttachment[];
}

/**
 * Flat map: `{channel}_{event}` (booleans) plus the quiet-hours block.
 * Channels: email, in_app, sms. Events: see SettingsController::NOTIFICATION_EVENTS.
 */
export interface NotificationPreferences {
    quiet_hours_enabled?: boolean;
    quiet_hours_start?: string; // "HH:mm"
    quiet_hours_end?: string;   // "HH:mm"
    [key: string]: boolean | string | undefined;
}

export interface AppNotification {
    id: string;
    type: string;
    data: {
        type: string;
        message: string;
        contact_id?: number;
        contact_uuid?: string;
        contact_name?: string;
        deal_id?: number;
        deal_title?: string;
        task_id?: number;
        task_title?: string;
        mentioned_by_id?: number;
        mentioned_by?: string;
        created_by?: string;
        meeting_id?: number;
        meeting_title?: string;
        starts_at?: string;
        count?: number;
    };
    read_at: string | null;
    created_at: string;
}

export interface PhoneNumber {
    id: number;
    phone_number: string;
    friendly_name: string | null;
    status: 'active' | 'pending' | 'released' | 'failed';
    capabilities: string[] | null;
    monthly_cost: string;
    number_type: 'personal' | 'team';
    is_default: boolean;
    provisioned_at: string | null;
    released_at: string | null;
    created_at: string;
}

export interface SmsMessage {
    id: number;
    user_id: number;
    contact_id: number | null;
    phone_number_id: number | null;
    direction: 'inbound' | 'outbound';
    from_number: string;
    to_number: string;
    body: string;
    status: 'queued' | 'sent' | 'delivered' | 'failed' | 'received';
    error_code: string | null;
    segment_count: number;
    read_at: string | null;
    created_at: string;
    contact?: { id: number; first_name: string; last_name: string; uuid: string } | null;
}

export interface SmsConversation {
    contact_id: number;
    contact_uuid: string;
    contact_name: string;
    contact_phone: string | null;
    contact_mobile: string | null;
    sms_consent: boolean;
    sms_opted_out: boolean;
    last_message_body: string;
    last_message_at: string;
    last_message_direction: 'inbound' | 'outbound';
    unread_count: number;
}

export interface AvailableNumber {
    phone_number: string;
    locality: string | null;
    region: string | null;
    monthly_cost: string;
    features: string[];
}

export interface CallRecord {
    id: number;
    user_id: number;
    contact_id: number | null;
    deal_id: number | null;
    phone_number_id: number | null;
    telnyx_call_control_id: string | null;
    direction: 'inbound' | 'outbound';
    from_number: string;
    to_number: string;
    status: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'missed';
    duration_seconds: number | null;
    is_recorded: boolean;
    recording_url: string | null;
    notes: string | null;
    started_at: string | null;
    ended_at: string | null;
    created_at: string;
    contact?: { id: number; first_name: string; last_name: string; uuid: string } | null;
}

export interface EmailAccount {
    id: number;
    email_address: string;
    provider: string;
    sync_state: 'pending' | 'syncing' | 'active' | 'error';
    last_synced_at: string | null;
    is_default: boolean;
    is_active: boolean;
    sync_error: string | null;
}

export interface EmailThread {
    id: number;
    email_account_id: number;
    contact_id: number | null;
    deal_id: number | null;
    gmail_thread_id: string;
    subject: string | null;
    snippet: string | null;
    message_count: number;
    is_read: boolean;
    is_starred: boolean;
    is_archived: boolean;
    last_message_at: string;
    contact?: { id: number; first_name: string; last_name: string; uuid: string; email: string | null } | null;
}

export interface EmailMessageType {
    id: number;
    email_thread_id: number;
    contact_id: number | null;
    gmail_message_id: string;
    direction: 'inbound' | 'outbound';
    from_address: string;
    from_name: string | null;
    to_addresses: string[];
    cc_addresses: string[] | null;
    bcc_addresses: string[] | null;
    subject: string | null;
    body_text: string | null;
    body_html: string | null;
    // Computed at read time by EmailBodyFormatter (raw body_* kept for audit):
    // the latest reply, plus the collapsed quoted history. Optional because the
    // optimistic outbound message appended after sending omits them.
    display_html?: string | null;
    display_quoted_html?: string | null;
    display_text?: string | null;
    display_quoted_text?: string | null;
    has_quoted?: boolean;
    snippet: string | null;
    is_read: boolean;
    is_starred: boolean;
    has_attachments: boolean;
    attachments_metadata: { filename: string; mime_type: string; size: number }[] | null;
    sent_at: string;
    contact?: { id: number; first_name: string; last_name: string; uuid: string } | null;
}

export interface EmailCampaign {
    id: number;
    user_id: number;
    team_id: number | null;
    email_account_id: number;
    subject: string;
    body_html: string;
    status: 'pending' | 'sending' | 'paused' | 'completed' | 'failed' | 'cancelled';
    total_recipients: number;
    sent_count: number;
    failed_count: number;
    skipped_count: number;
    contact_ids: number[];
    sent_contact_ids: number[];
    failed_contact_ids: number[];
    errors: { contact_id?: number; message: string }[] | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
}

export interface DashboardActivity {
    id: number;
    event_type: string;
    subject: string;
    description: string | null;
    contact?: { id: number; uuid: string; first_name: string; last_name: string } | null;
    deal?: { id: number; title: string } | null;
    created_at: string;
}

export interface DashboardPipeline {
    id: number;
    name: string;
    lead_type: string | null;
    stages: {
        id: number;
        name: string;
        color: string | null;
        count: number;
        total_value: number;
    }[];
}

export interface DashboardMeeting {
    id: number;
    title: string;
    meeting_type: string;
    location: string | null;
    starts_at: string;
    ends_at: string;
    contact?: { id: number; uuid: string; first_name: string; last_name: string } | null;
}

export interface LeadSource {
    source: string;
    count: number;
}

export interface DashboardDeal {
    id: number;
    title: string;
    value: number;
    won_at: string | null;
    lost_at: string | null;
    lost_reason: string | null;
    contacts?: { id: number; uuid: string; first_name: string; last_name: string }[];
}

export interface InboxConversation {
    contact_id: number;
    contact_uuid: string;
    contact_name: string;
    contact_email: string | null;
    contact_phone: string | null;
    contact_type: string;
    lead_score: number | null;
    last_message_at: string;
    last_channel: 'email' | 'sms' | 'call';
    last_snippet: string;
    unread_count: number;
    has_email: boolean;
    has_sms: boolean;
    has_calls: boolean;
    assigned_user_ids: number[];
}

export interface InboxMessage {
    id: number;
    channel: 'email' | 'sms' | 'call';
    direction: 'inbound' | 'outbound';
    timestamp: string;
    // Email fields
    subject?: string | null;
    body_html?: string | null;
    body_text?: string | null;
    from_address?: string;
    from_name?: string | null;
    // SMS fields
    body?: string;
    status?: string;
    // Call fields
    duration_seconds?: number | null;
    call_status?: string;
    notes?: string | null;
    recording_url?: string | null;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
        team?: Team | null;
        teamMember?: { id: number; role: string; permissions: TeamMemberPermissions; is_active: boolean } | null;
        active_context: 'personal' | 'team';
        is_admin: boolean;
        subscription?: {
            tier: string;
            effective_tier: string;
            is_lifetime: boolean;
            trialing: boolean;
            trial_plan: string | null;
            trial_ends_at: string | null;
            trial_days_remaining: number;
        } | null;
        features?: Record<string, boolean>;
    };
    unreadNotifications: number;
    hasPhoneNumber: boolean;
    hasEmailAccount: boolean;
    phoneNumber: { id: number; phone_number: string; friendly_name: string | null; status: string } | null;
    tenDlcStatus: 'approved' | 'pending' | 'not_started';
    flash: {
        success?: string | null;
        error?: string | null;
        warning?: string | null;
        info?: string | null;
    };
};
