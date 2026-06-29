import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { BlockData } from '@/website-editor/types';
import MediaField from './MediaField';

interface Member { image: string; first_name: string; last_name: string; role: string }

interface Props {
    onClose: () => void;
    onSaved: () => void;
    websiteId: number;
    page: string;
    block: BlockData;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full transition-colors shrink-0 ${on ? 'bg-[#1693C9]' : 'bg-[#C8CCD1]'}`}>
            <span className={`inline-block h-[14px] w-[14px] rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[19px]' : 'translate-x-[2px]'}`} />
        </button>
    );
}

export function ColorRow({ label, value, onChange, fallback }: { label: string; value: string; onChange: (v: string) => void; fallback: string }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] font-medium text-[#111315]">{label}</p>
            <div className="flex items-center gap-2 shrink-0">
                <input type="color" value={value || fallback} onChange={(e) => onChange(e.target.value)} className="h-8 w-9 rounded cursor-pointer border-0 p-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-[#E4E7EB]" />
                <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={`${formInputClass} w-[96px]`} placeholder={fallback} />
                {value && <button type="button" onClick={() => onChange('')} className="text-[11px] font-medium text-[#8B9096] hover:text-[#111315]">Reset</button>}
            </div>
        </div>
    );
}

/**
 * Dedicated editor for the Team block — heading, "View All" link, grid/slider
 * layout, optional social row, and a repeater of members (photo, first/last
 * name, role). Members are stored as a JSON string in block.data.members.
 */
export default function TeamEditorModal({ onClose, onSaved, websiteId, page, block }: Props) {
    const [title, setTitle] = useState<string>(block.data.title ?? 'Meet Our Team');
    const [viewLabel, setViewLabel] = useState<string>(block.data.view_all_label || '');
    const [viewLink, setViewLink] = useState<string>(block.data.view_all_link || '');
    const [layout, setLayout] = useState<'grid' | 'slider'>(block.data.layout === 'grid' ? 'grid' : 'slider');
    const [align, setAlign] = useState<'left' | 'center' | 'right'>(
        (['left', 'center', 'right'] as const).includes(block.data.align as never) ? (block.data.align as 'left' | 'center' | 'right') : 'left',
    );
    const [showSocial, setShowSocial] = useState<boolean>(!!block.data.show_social);
    const [bgColor, setBgColor] = useState<string>(block.data.bg_color || '');
    const [textColor, setTextColor] = useState<string>(block.data.text_color || '');
    const [members, setMembers] = useState<Member[]>(() => {
        try {
            const parsed = JSON.parse(block.data.members || '[]');
            return Array.isArray(parsed) ? parsed.map((m) => ({ image: m.image || '', first_name: m.first_name || '', last_name: m.last_name || '', role: m.role || '' })) : [];
        } catch {
            return [];
        }
    });
    // Legacy blocks (no source saved) behaved as: manual members if any, else the
    // site's Team tab — mirror that as the initial toggle state.
    const [source, setSource] = useState<'team' | 'manual'>(() => {
        if (block.data.source === 'team' || block.data.source === 'manual') return block.data.source;
        try {
            return JSON.parse(block.data.members || '[]')?.length ? 'manual' : 'team';
        } catch {
            return 'team';
        }
    });
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'content' | 'layout' | 'styles'>('content');
    const TABS = ['content', 'layout', 'styles'] as const;

    function update(idx: number, key: keyof Member, value: string) {
        setMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, [key]: value } : m)));
    }
    function add() { setMembers((prev) => [...prev, { image: '', first_name: '', last_name: '', role: '' }]); }
    function remove(idx: number) { setMembers((prev) => prev.filter((_, i) => i !== idx)); }

    async function handleSave() {
        setSaving(true);
        try {
            const clean = members.filter((m) => m.image || m.first_name.trim() || m.last_name.trim() || m.role.trim());
            await api.updateBlock(websiteId, page, block.id, {
                source,
                title,
                view_all_label: viewLabel,
                view_all_link: viewLink,
                layout,
                align,
                show_social: showSocial ? '1' : '',
                bg_color: bgColor,
                text_color: textColor,
                members: JSON.stringify(clean),
            });
            onSaved();
        } finally {
            setSaving(false);
        }
    }

    const footer = (
        <>
            <button type="button" onClick={onClose} className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors">
                {saving ? 'Saving…' : 'Save'}
            </button>
        </>
    );

    return (
        <SlideOverModal title="Edit Team" onClose={onClose} footer={footer} width={460}>
            {/* Tabs */}
            <div className="flex shrink-0 border-b border-[#E4E7EB] px-4 bg-white">
                {TABS.map((t) => (
                    <button key={t} type="button" onClick={() => setTab(t)}
                        className={`relative px-3 py-2.5 text-[13px] font-medium capitalize transition-colors ${tab === t ? 'text-[#1693C9]' : 'text-[#5F656D] hover:text-[#111315]'}`}>
                        {t}
                        {tab === t && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-[#1693C9] rounded-full" />}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                {/* ── CONTENT ── */}
                {tab === 'content' && (
                    <>
                        <div>
                            <FieldLabel>Heading</FieldLabel>
                            <input type="text" className={formInputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meet Our Team" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <FieldLabel>&ldquo;View All&rdquo; Label</FieldLabel>
                                <input type="text" className={formInputClass} value={viewLabel} onChange={(e) => setViewLabel(e.target.value)} placeholder="View All" />
                            </div>
                            <div>
                                <FieldLabel>&ldquo;View All&rdquo; Link</FieldLabel>
                                <input type="text" className={formInputClass} value={viewLink} onChange={(e) => setViewLink(e.target.value)} placeholder="/about (optional)" />
                            </div>
                        </div>

                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel>Members Source</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {([['team', 'From Team Tab'], ['manual', 'Add Manually']] as const).map(([val, label]) => (
                                    <button key={val} type="button" onClick={() => setSource(val)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${source === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                                ))}
                            </div>

                            {source === 'team' && (
                                <div className="mt-3 rounded-lg border border-[#E4E7EB] bg-[#FAFBFC] p-3">
                                    <p className="text-[12px] text-[#111315] font-medium">Pulled from your Team tab</p>
                                    <p className="text-[11px] text-[#8B9096] mt-1">This block shows the active members you manage under Website Settings → Team, with cards linking to each member&rsquo;s page. Edit them there and this section updates automatically.</p>
                                </div>
                            )}
                        </div>

                        {source === 'manual' && (
                        <div>
                            <FieldLabel>Team Members</FieldLabel>
                            <div className="space-y-3">
                                {members.map((m, idx) => (
                                    <div key={idx} className="border border-[#E4E7EB] rounded-[6px] p-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-semibold text-[#111315]">Member {idx + 1}</span>
                                            <button type="button" onClick={() => remove(idx)} className="text-[#8B9096] hover:text-[#DC2626] transition-colors p-1 rounded hover:bg-[#FEF2F2]" aria-label="Remove member">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                        <MediaField websiteId={websiteId} value={m.image} onChange={(p) => update(idx, 'image', p)} />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="text" className={formInputClass} value={m.first_name} onChange={(e) => update(idx, 'first_name', e.target.value)} placeholder="First name" />
                                            <input type="text" className={formInputClass} value={m.last_name} onChange={(e) => update(idx, 'last_name', e.target.value)} placeholder="Last name" />
                                        </div>
                                        <input type="text" className={formInputClass} value={m.role} onChange={(e) => update(idx, 'role', e.target.value)} placeholder="Role (e.g. Realtor®)" />
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={add}
                                    className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#C8CCD1] text-[13px] font-semibold text-[#1693C9] hover:border-[#1693C9] hover:bg-[#F0F9FE] transition-colors"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                    Add Team Member
                                </button>
                            </div>
                        </div>
                        )}
                    </>
                )}

                {/* ── LAYOUT ── */}
                {tab === 'layout' && (
                    <>
                        <div>
                            <FieldLabel>Layout</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {(['slider', 'grid'] as const).map((opt) => (
                                    <button key={opt} type="button" onClick={() => setLayout(opt)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] capitalize transition-colors ${layout === opt ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{opt}</button>
                                ))}
                            </div>
                        </div>

                        {layout === 'grid' && (
                            <div>
                                <FieldLabel>Heading Alignment</FieldLabel>
                                <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                    {(['left', 'center', 'right'] as const).map((opt) => (
                                        <button key={opt} type="button" onClick={() => setAlign(opt)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] capitalize transition-colors ${align === opt ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{opt}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-4 py-1">
                            <div>
                                <p className="text-[13px] font-medium text-[#111315]">Social Icons Row</p>
                                <p className="text-[11px] text-[#8B9096] mt-0.5">Shows your site&rsquo;s social links above the team.</p>
                            </div>
                            <Toggle on={showSocial} onChange={setShowSocial} />
                        </div>
                    </>
                )}

                {/* ── STYLES ── */}
                {tab === 'styles' && (
                    <div className="space-y-3">
                        <ColorRow label="Background Color" value={bgColor} onChange={setBgColor} fallback="#FFFFFF" />
                        <ColorRow label="Text Color" value={textColor} onChange={setTextColor} fallback="#111315" />
                    </div>
                )}
            </div>
        </SlideOverModal>
    );
}
