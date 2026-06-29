import type { ScriptQuestion } from '@/Components/Crm/CallingScript/types';

/**
 * DTOs the DialerSessionController returns. Kept in one place so the page
 * components don't redefine them.
 */

export type CampaignStatus = 'active' | 'paused' | 'completed' | 'abandoned';

export interface SessionData {
    id: number;
    name: string | null;
    status: CampaignStatus;
    source_type: string;
    source_id: number | null;
    calling_script_id: number | null;
    total_contacts: number;
    current_position: number;
    stats: {
        attempted: number;
        connected: number;
        voicemail: number;
        no_answer: number;
        wrong_number: number;
        dnc: number;
        callbacks: number;
        skipped: number;
    };
    started_at: string | null;
    paused_at: string | null;
    ended_at: string | null;
}

export interface ContactDto {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    phone: string | null;
    mobile: string | null;
    type?: string;
    status?: string;
    lead_score?: number | null;
    last_contacted_at?: string | null;
    dnd_mode?: string | null;
}

export interface LeadTaskDto {
    id: number;
    title: string;
    description: string | null;
    priority: string | null;
    due_at: string | null;
    due_date: string | null;
}

export interface LeadDealDto {
    id: number;
    title: string;
    value: number | null;
    pipeline_stage?: { id: number; name: string; color: string | null } | null;
}

export interface LeadSearchDto {
    id: number;
    name: string | null;
    filters: Record<string, unknown> | null;
}

export interface LeadListingDto {
    id: number;
    title: string | null;
    address: string | null;
    city: string | null;
    state_province: string | null;
    price: number | null;
    status: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    sqft: number | null;
}

export interface CurrentCall {
    id: number;
    position: number;
    contact: ContactDto | null;
    answers: Record<string, string>;
    lead_tasks: LeadTaskDto[];
    lead_deals: LeadDealDto[];
    lead_searches: LeadSearchDto[];
    lead_listings: LeadListingDto[];
}

export interface UpcomingCall {
    id: number;
    position: number;
    contact: ContactDto | null;
}

export interface CompletedCall {
    id: number;
    position: number;
    contact: ContactDto | null;
    disposition: string | null;
    status: string;
    duration_seconds: number | null;
    attempted_at: string | null;
    callback_at: string | null;
    recording_url: string | null;
}

export interface ScriptDto {
    id: number;
    name: string;
    intro: string | null;
    body: string | null;
    questions: ScriptQuestion[];
}

export interface SessionPagePayload {
    session: SessionData;
    script: ScriptDto | null;
    current: CurrentCall | null;
    upcoming: UpcomingCall[];
    completed: CompletedCall[];
}

export const DISPOSITION_LABELS: Record<string, string> = {
    connected: 'Talked',
    voicemail: 'Voicemail',
    no_answer: 'No Answer',
    wrong_number: 'Bad Number',
    do_not_call: 'DNC',
    callback_scheduled: 'Follow-up',
};

export const DISPOSITION_TONES: Record<string, string> = {
    connected: 'bg-[#ECFDF5] text-[#047857]',
    voicemail: 'bg-[#FFFBEB] text-[#B45309]',
    no_answer: 'bg-[#F3F4F6] text-[#5F656D]',
    wrong_number: 'bg-[#FFFBEB] text-[#B45309]',
    do_not_call: 'bg-[#FEF2F2] text-[#B91C1C]',
    callback_scheduled: 'bg-[#EBF5FF] text-[#1693C9]',
};
