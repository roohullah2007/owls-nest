import { Column } from './types';

/**
 * Status badge palette — solid colored pills with white text. Used by InlineStatusCell.
 */
export const statusColors: Record<string, { bg: string; text: string }> = {
    new_lead: { bg: '#1693C9', text: '#FFFFFF' },
    active: { bg: '#059669', text: '#FFFFFF' },
    client: { bg: '#4F46E5', text: '#FFFFFF' },
    past_client: { bg: '#5F656D', text: '#FFFFFF' },
    inactive: { bg: '#8B9096', text: '#FFFFFF' },
};
export const defaultStatusColor = { bg: '#5F656D', text: '#FFFFFF' };

/**
 * Source label overrides — shown in the source column / source filter.
 * Keys are stored in DB; values are display labels.
 */
export const sourceLabels: Record<string, string> = {
    manual: 'Manual',
    website: 'Website',
    referral: 'Referral',
    open_house: 'Open House',
    social_media: 'Social',
    cold_call: 'Cold Call',
    idx: 'IDX',
    other: 'Other',
};

/**
 * Type badge palette — same shape as statusColors, used by InlineTypeCell.
 */
export const typeColors: Record<string, { bg: string; text: string }> = {
    buyer: { bg: '#1693C9', text: '#FFFFFF' },
    seller: { bg: '#D97706', text: '#FFFFFF' },
    prospect: { bg: '#4F46E5', text: '#FFFFFF' },
    past_client: { bg: '#5F656D', text: '#FFFFFF' },
    referral: { bg: '#0891B2', text: '#FFFFFF' },
};
export const defaultTypeColor = { bg: '#5F656D', text: '#FFFFFF' };

/**
 * Built-in column registry. Custom fields get spliced in by the page on mount.
 * The `width` is the initial pixel width — users can resize and the new size is
 * persisted to localStorage (COL_WIDTHS_KEY) and the server (column preferences).
 */
export const builtInColumns: Column[] = [
    { key: 'first_name', label: 'Name', sortable: true, defaultVisible: true, width: 200 },
    { key: 'email', label: 'Email', sortable: true, defaultVisible: true, width: 220 },
    { key: 'phone', label: 'Phone', sortable: true, defaultVisible: true, width: 150 },
    { key: 'type', label: 'Type', sortable: true, defaultVisible: true, width: 120 },
    { key: 'status', label: 'Status', sortable: true, defaultVisible: true, width: 140 },
    { key: 'listings', label: 'Listings', sortable: false, defaultVisible: true, width: 180 },
    { key: 'searches', label: 'Saved Searches', sortable: false, defaultVisible: true, width: 180 },
    { key: 'assigned', label: 'Assigned', sortable: false, defaultVisible: true, width: 140 },
    { key: 'source', label: 'Source', sortable: true, defaultVisible: true, width: 100 },
    { key: 'city', label: 'Location', sortable: true, defaultVisible: true, width: 140 },
    { key: 'last_contacted_at', label: 'Last Activity', sortable: true, defaultVisible: true, width: 130 },
    { key: 'tags', label: 'Tags', sortable: false, defaultVisible: true, width: 160 },
    { key: 'lead_score', label: 'Score', sortable: true, defaultVisible: false, width: 80 },
    { key: 'created_at', label: 'Added', sortable: true, defaultVisible: false, width: 110 },
    { key: 'mobile', label: 'Mobile', sortable: false, defaultVisible: false, width: 150 },
];

export const STORAGE_KEY = 'people_visible_columns';
export const COL_WIDTHS_KEY = 'people_column_widths';
