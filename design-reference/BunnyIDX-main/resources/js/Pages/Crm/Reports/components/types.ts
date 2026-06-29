export interface Breakdown {
    key: string;
    label: string;
    value: number;
}

export interface SeriesPoint {
    label: string;
    value: number;
}

export interface ActivityTrendRow {
    label: string;
    calls: number;
    emails: number;
    texts: number;
    notes: number;
    meetings: number;
}

export interface PipelineStage {
    id: number;
    name: string;
    color: string | null;
    count: number;
    value: number;
}

export interface PipelineSummary {
    id: number;
    name: string;
    stages: PipelineStage[];
}

export interface LeaderboardRow {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
    leads: number;
    calls: number;
    talk_time_seconds: number;
    connect_rate: number | null;
    emails: number;
    texts: number;
    meetings: number;
    activities: number;
    deals_won: number;
    volume: number;
    gci: number;
}

export interface CallTrendRow {
    label: string;
    inbound: number;
    outbound: number;
}

export interface CallAgentRow {
    id: number;
    name: string;
    calls: number;
    connected: number;
    connect_rate: number | null;
    talk_time_seconds: number;
}

export interface CallReport {
    summary: {
        total: number;
        connected: number;
        connect_rate: number | null;
        talk_time_seconds: number;
        avg_duration_seconds: number;
        outbound: number;
        inbound: number;
        voicemails: number;
        no_answer: number;
    };
    trend: CallTrendRow[];
    by_hour: number[];
    outcomes: Breakdown[];
    direction: Breakdown[];
    by_agent: CallAgentRow[];
}

export interface ReportPayload {
    summary: {
        new_leads: number;
        new_leads_prev: number;
        active_deals: number;
        active_pipeline_value: number;
        deals_won: number;
        won_volume: number;
        won_volume_prev: number;
        gci: number;
        win_rate: number | null;
        deals_lost: number;
        avg_deal_value: number;
        avg_days_to_close: number | null;
        activities: number;
        calls: number;
        emails: number;
        texts: number;
        meetings: number;
    };
    trends: {
        labels: string[];
        leads: SeriesPoint[];
        won_count: SeriesPoint[];
        won_value: SeriesPoint[];
        activity: ActivityTrendRow[];
    };
    leads: {
        by_source: Breakdown[];
        by_status: Breakdown[];
        by_type: Breakdown[];
    };
    pipeline: {
        pipelines: PipelineSummary[];
        projected: SeriesPoint[];
        won_by_type: { key: string; label: string; count: number; value: number }[];
    };
    conversion: Breakdown[];
    calls: CallReport;
    activity: {
        totals: {
            calls: number;
            emails: number;
            texts: number;
            notes: number;
            meetings: number;
            tasks_completed: number;
        };
        call_outcomes: Breakdown[];
        call_direction: Breakdown[];
        connected_rate: number | null;
    };
    leaderboard: LeaderboardRow[];
}

export interface ReportFilters {
    range: string;
    start: string;
    end: string;
    agent: number | null;
    granularity: string;
    context: 'team' | 'personal';
}

export interface AgentOption {
    id: number;
    name: string;
}
