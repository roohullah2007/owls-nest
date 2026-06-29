import BulkPillButton from './BulkPillButton';
import type { SavedContactView } from './types';

/**
 * Bulk action row in the main Contacts toolbar — Call / Email / Text /
 * (Save list | Edit list) / Delete.
 *
 * Faded when no contacts are selected. The primary CTA swaps:
 *   - Viewing a smart list → "Edit list" (opens that list in the modal)
 *   - Otherwise + selection → "Save list" (save current filters as a new list)
 */

interface Props {
    selectedCount: number;
    activeSmartList: SavedContactView | null | undefined;
    onCall: () => void;
    onEmail: () => void;
    onText: () => void;
    onDelete: () => void;
    onEditActiveSmartList: () => void;
    onSaveAsSmartList: () => void;
}

export default function BulkActionsRow({
    selectedCount, activeSmartList,
    onCall, onEmail, onText, onDelete,
    onEditActiveSmartList, onSaveAsSmartList,
}: Props) {
    const disabled = selectedCount === 0;
    return (
        <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-[#E4E7EB]">
            <BulkPillButton
                label="Call"
                title={disabled ? 'Select contacts first' : `Call ${selectedCount === 1 ? 'selected' : 'selected (one at a time)'}`}
                disabled={disabled}
                onClick={onCall}
                path="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
            />
            <BulkPillButton
                label="Email"
                title={disabled ? 'Select contacts first' : `Email ${selectedCount} selected`}
                disabled={disabled}
                onClick={onEmail}
                path="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
            />
            <BulkPillButton
                label="Text"
                title={disabled ? 'Select contacts first' : 'Bulk SMS (coming soon)'}
                disabled={disabled}
                onClick={onText}
                path="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
            />
            {/* Primary CTA: edit the active list, or save as new list if not viewing one. */}
            {activeSmartList ? (
                <button
                    type="button"
                    onClick={onEditActiveSmartList}
                    title={`Edit "${activeSmartList.name}"`}
                    aria-label={`Edit ${activeSmartList.name}`}
                    className="inline-flex items-center justify-center h-9 w-9 text-white bg-[#1693C9] hover:bg-[#1380AF] rounded-[4px] transition-colors shrink-0"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                </button>
            ) : selectedCount > 0 && (
                <button
                    type="button"
                    onClick={onSaveAsSmartList}
                    title="Save the current filter set as a Smart List"
                    aria-label="Save as Smart List"
                    className="inline-flex items-center justify-center h-9 w-9 text-white bg-[#1693C9] hover:bg-[#1380AF] rounded-[4px] transition-colors shrink-0"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                    </svg>
                </button>
            )}
            <BulkPillButton
                label="Delete"
                title={disabled ? 'Select contacts first' : `Delete ${selectedCount} selected`}
                disabled={disabled}
                danger
                onClick={onDelete}
                path="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
        </div>
    );
}
