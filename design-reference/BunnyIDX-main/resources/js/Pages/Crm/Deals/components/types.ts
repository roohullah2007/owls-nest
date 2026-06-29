export interface PipelineStage {
    id: number;
    name: string;
    type: string;
    color: string | null;
    position: number;
}

export interface Pipeline {
    id: number;
    name: string;
    lead_type: string | null;
    is_default: boolean;
    stages: PipelineStage[];
}

export interface Contact {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
}

export interface Deal {
    id: number;
    title: string;
    value: string;
    type: string;
    position: number;
    expected_close_date: string | null;
    won_at: string | null;
    lost_at: string | null;
    last_activity_at: string | null;
    pipeline_stage_id: number;
    contacts?: Contact[];
    company?: { id: number; name: string } | null;
    pipeline_stage?: PipelineStage | null;
    user?: { id: number; name: string } | null;
}
