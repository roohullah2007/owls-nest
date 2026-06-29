export interface Stats {
    total_contacts: number;
    total_listings: number;
    new_contacts_this_month: number;
    active_deals: number;
    deals_value: number;
    won_deals: number;
    won_value: number;
    total_commission: number;
    leads_by_status: Record<string, number>;
}

export interface Task {
    id: number;
    title: string;
    due_at: string | null;
    due_date: string | null;
    priority: string;
}

export interface RecentLead {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    source: string | null;
    type: string | null;
    status: string | null;
    deals_count: number;
    tasks_count: number;
    created_at: string;
    assigned_users: { id: number; name: string }[];
}
