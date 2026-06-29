import { useMemo, useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import Select from '@/Components/Crm/Select';

export interface NewPagePayload {
    title: string;
    parent: string | null;
    show_in_nav: boolean;
    /** 'standard' = a custom content page; 'communities' = the dynamic communities page. */
    type: 'standard' | 'communities';
}

interface ParentOption {
    slug: string;
    label: string;
}

interface Props {
    onClose: () => void;
    onCreate: (payload: NewPagePayload) => void;
    /** Existing pages that can be chosen as a parent. */
    parentOptions: ParentOption[];
    /** Slugs already taken — used to flag duplicates. */
    existingSlugs: string[];
}

function slugify(title: string): string {
    return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AddPageModal({ onClose, onCreate, parentOptions, existingSlugs }: Props) {
    const [type, setType] = useState<'standard' | 'communities'>('standard');
    const [title, setTitle] = useState('');
    const [parent, setParent] = useState('');
    const [showInNav, setShowInNav] = useState(true);

    const slug = slugify(title);
    const duplicate = type === 'standard' && slug.length > 0 && existingSlugs.includes(slug);
    const canCreate = type === 'communities' ? title.trim().length > 0 : slug.length > 0 && !duplicate;

    const options = useMemo(
        () => [{ value: '', label: 'Top level (no parent)' }, ...parentOptions.map((p) => ({ value: p.slug, label: p.label }))],
        [parentOptions],
    );

    function submit() {
        if (!canCreate) return;
        onCreate({ title: title.trim(), parent: parent || null, show_in_nav: showInNav, type });
    }

    const footer = (
        <>
            <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={submit}
                disabled={!canCreate}
                className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
            >
                Create Page
            </button>
        </>
    );

    return (
        <SlideOverModal title="Add Page" onClose={onClose} footer={footer} width={440}>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                <div>
                    <FieldLabel>Page Type</FieldLabel>
                    <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                        {([['standard', 'Standard'], ['communities', 'Communities']] as const).map(([val, label]) => (
                            <button key={val} type="button" onClick={() => setType(val)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${type === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                        ))}
                    </div>
                    {type === 'communities' && (
                        <p className="text-[11px] text-[#8B9096] mt-1.5">
                            One dynamic page (like the Blog) with a grid of all your communities, powered by your connected MLS.
                            Each community automatically gets its own page, and the navigation shows a dropdown of communities.
                        </p>
                    )}
                </div>

                <div>
                    <FieldLabel>{type === 'communities' ? 'Page Name' : 'Page Title'}</FieldLabel>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={formInputClass}
                        placeholder={type === 'communities' ? 'e.g. Communities, Neighborhoods, Areas' : 'e.g. Testimonials, Gallery, Financing'}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                    />
                    {type === 'communities' ? (
                        <p className="text-[11px] mt-1 font-mono text-[#8B9096]">/areas — used as the page heading and the navigation label</p>
                    ) : slug ? (
                        <p className={`text-[11px] mt-1 font-mono ${duplicate ? 'text-[#DC2626]' : 'text-[#8B9096]'}`}>
                            /{slug}{duplicate ? ' — already exists' : ''}
                        </p>
                    ) : null}
                </div>

                {type === 'standard' && (
                    <>
                        <div>
                            <FieldLabel help="Nest this page under another in the navigation menu.">Parent Page</FieldLabel>
                            <Select value={parent} onChange={setParent} options={options} fullWidth />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <FieldLabel help="Show this page as a link in the site navigation.">Show in navigation</FieldLabel>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={showInNav}
                                onClick={() => setShowInNav((v) => !v)}
                                className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full transition-colors ${showInNav ? 'bg-[#1693C9]' : 'bg-[#C8CCD1]'}`}
                            >
                                <span className={`inline-block h-[14px] w-[14px] rounded-full bg-white shadow transition-transform ${showInNav ? 'translate-x-[19px]' : 'translate-x-[2px]'}`} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </SlideOverModal>
    );
}
