/** Shared types for the calling-script feature. */

export interface CallingScriptDto {
    id: number;
    name: string;
    intro: string | null;
    body: string | null;
    questions: ScriptQuestion[];
    is_team_shared: boolean;
    is_mine: boolean;
    is_editable: boolean;
    usage_count: number;
    last_used_at: string | null;
    owner_id: number | null;
}

export interface ScriptQuestion {
    id: string;
    text: string;
    type: 'text' | 'yes_no' | 'multi';
    options?: string[];
}
