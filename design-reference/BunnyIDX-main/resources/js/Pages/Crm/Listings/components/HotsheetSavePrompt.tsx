import { FormEvent, useState } from 'react';
import PrimaryButton from '@/Components/Crm/PrimaryButton';

interface Props {
    onSave: (name: string) => void;
    onCancel: () => void;
    saving: boolean;
    hasFilters: boolean;
}

/**
 * Banner shown at the top of MLS Listings when the user clicked "Add a Sheet".
 * Asks them to apply filters first, then names + saves the search as a hotsheet.
 *
 * Owns its own `name` state so keystrokes don't re-render the entire Listings
 * page (which is what caused the input to feel laggy when the map view + 1000+
 * cards re-rendered on every character).
 */
export default function HotsheetSavePrompt({ onSave, onCancel, saving, hasFilters }: Props) {
    const [name, setName] = useState('');

    function submit(e: FormEvent) {
        e.preventDefault();
        if (!name.trim() || !hasFilters || saving) return;
        onSave(name.trim());
    }

    return (
        <div className="bg-[#EFF6FF] border border-[#1693C9]/30 rounded-[4px] p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-start gap-2 flex-1">
                <svg className="h-4 w-4 shrink-0 mt-0.5 text-[#1693C9]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                </svg>
                <div>
                    <p className="text-sm font-semibold text-[#111315]">Save this search as a hotsheet</p>
                    <p className="text-xs text-[#5F656D] mt-0.5">
                        {hasFilters
                            ? 'Looks good — give it a name to save the current filters.'
                            : 'Apply search filters first (price, beds, city, etc.), then name and save.'}
                    </p>
                </div>
            </div>

            <form onSubmit={submit} className="flex items-center gap-2 shrink-0">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Hotsheet name"
                    autoFocus
                    className="h-9 w-44 px-3 text-xs bg-white text-[#111315] placeholder-[#8B9096] border border-[#C8CCD1] rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9] transition-colors"
                />
                <PrimaryButton
                    type="submit"
                    label={saving ? 'Saving…' : 'Save'}
                    disabled={!name.trim() || !hasFilters || saving}
                    icon={null}
                    labelClassName=""
                />
                <button
                    type="button"
                    onClick={onCancel}
                    className="h-9 px-3 text-xs font-medium text-[#5F656D] hover:text-[#111315] transition-colors"
                >
                    Cancel
                </button>
            </form>
        </div>
    );
}
