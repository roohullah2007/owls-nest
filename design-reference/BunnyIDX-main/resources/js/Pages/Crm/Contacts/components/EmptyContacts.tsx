/**
 * Empty-state for the contacts list. Distinguishes "this account has no contacts
 * yet" (offers the add-first CTA) from "no contacts match the active search /
 * filters / view" (offers a clear-filters action) so the message is never
 * misleading.
 */
export default function EmptyContacts({
    filtered,
    onAddFirstContact,
    onClearFilters,
}: {
    filtered: boolean;
    onAddFirstContact: () => void;
    onClearFilters: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-24">
            <svg className="h-14 w-14 text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={0.75} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            {filtered ? (
                <>
                    <p className="mt-4 text-[15px] text-[#8B9096]">No contacts match your current filters</p>
                    <button onClick={onClearFilters} className="mt-1 text-xs font-medium text-[#1693C9] hover:text-[#1380AF] underline">
                        Clear filters
                    </button>
                </>
            ) : (
                <>
                    <p className="mt-4 text-[15px] text-[#8B9096]">No people found</p>
                    <button onClick={onAddFirstContact} className="mt-1 text-xs font-medium text-[#111315] underline">
                        Add your first contact
                    </button>
                </>
            )}
        </div>
    );
}
