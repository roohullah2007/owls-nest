import CrmLayout from '@/Layouts/CrmLayout';
import { Head, useForm } from '@inertiajs/react';

interface Config {
    design?: string;
    font?: string;
    logo?: string;
    header_brand?: string;
    brand_eyebrow?: string;
    gate?: boolean;
    eyebrow?: string;
    headline?: string;
    tagline?: string;
    cta_button?: string;
    agent_role?: string;
    office?: string;
    pricing_note?: string;
    video_url?: string;
    why_buy_title?: string;
    why_buy?: string;
    [k: string]: unknown;
}

interface Design { id: string; name: string; description: string; preview?: string | null }

interface PageData {
    uuid: string;
    slug: string;
    name: string;
    type: string;
    accent_color: string;
    agent_name: string | null;
    agent_email: string | null;
    agent_phone: string | null;
    agent_photo: string | null;
    meta_title: string | null;
    meta_description: string | null;
    is_published: boolean;
    config: Config;
    listing: Record<string, any>;
    submissions_count: number;
}

interface Props {
    page: PageData;
    publicUrl: string;
    fonts: string[];
    designs: Design[];
}

const inputCls = 'block w-full px-2 py-[5px] text-[13px] leading-[1.42857143] border border-[#C8CCD1] rounded text-[#111315] bg-white placeholder-[#C4C9D1] focus:outline-none focus:border-[#1693C9] focus:ring-0';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
    return (
        <label className="block">
            <span className="mb-1 block text-[13px] font-normal text-[#5F656D]">{label}</span>
            {children}
            {hint && <span className="mt-1 block text-[11px] text-[#8B9096]">{hint}</span>}
        </label>
    );
}

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-[#E4E7EB] bg-white p-5">
            <h2 className="text-[13px] font-semibold text-[#111315]">{title}</h2>
            {desc && <p className="mt-0.5 text-[12px] text-[#8B9096]">{desc}</p>}
            <div className="mt-4 space-y-4">{children}</div>
        </div>
    );
}

export default function ListingPagesEdit({ page, publicUrl, fonts, designs }: Props) {
    const form = useForm({
        name: page.name || '',
        accent_color: page.accent_color || '#2a5d8f',
        // Agent is auto-filled from the user at create and preserved here (not edited).
        agent_name: page.agent_name || '',
        agent_email: page.agent_email || '',
        agent_phone: page.agent_phone || '',
        agent_photo: page.agent_photo || '',
        meta_title: page.meta_title || '',
        meta_description: page.meta_description || '',
        is_published: page.is_published,
        config: {
            design: page.config.design || (designs[0]?.id ?? 'villa-serena'),
            font: page.config.font || 'Open Sans',
            logo: page.config.logo || '',
            header_brand: page.config.header_brand || '',
            brand_eyebrow: page.config.brand_eyebrow || '',
            gate: page.config.gate ?? true,
            eyebrow: page.config.eyebrow || '',
            headline: page.config.headline || '',
            tagline: page.config.tagline || '',
            cta_button: page.config.cta_button || '',
            agent_role: page.config.agent_role || '',
            office: page.config.office || '',
            pricing_note: page.config.pricing_note || '',
            video_url: page.config.video_url || '',
            why_buy_title: page.config.why_buy_title || '',
            why_buy: page.config.why_buy || '',
        },
    });

    const data = form.data;
    const setCfg = (key: keyof Config, value: any) => form.setData('config', { ...data.config, [key]: value });
    const save = () => form.patch(route('crm.listing-pages.update', page.uuid), { preserveScroll: true });

    const addr = page.listing?.address;
    const hasProperty = page.listing && Object.keys(page.listing).length > 0;

    return (
        <CrmLayout>
            <Head title={`Edit · ${page.name}`} />

            <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[#E4E7EB] bg-white px-4 sm:px-6">
                <a href={route('crm.listing-pages.index')} className="text-[13px] font-medium text-[#5F656D] hover:text-[#111315]">← Listing Pages</a>
                <span className="truncate text-[14px] font-semibold text-[#111315]">{data.name || 'Untitled'}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${data.is_published ? 'bg-[#E8F5E0] text-[#3F7E0C]' : 'bg-[#F3F4F6] text-[#8B9096]'}`}>
                    {data.is_published ? 'Published' : 'Draft'}
                </span>
                <div className="flex-1" />
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold text-[#1693C9] hover:text-[#1380AF]">Preview</a>
                <button type="button" onClick={() => form.setData('is_published', !data.is_published)} className="rounded-lg border border-[#E4E7EB] px-3 py-1.5 text-[13px] font-medium text-[#111315] hover:bg-[#F9FAFB]">
                    {data.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <button type="button" onClick={save} disabled={form.processing} className="rounded-lg bg-[#1693C9] px-5 py-1.5 text-[13px] font-bold text-white transition-all hover:bg-[#1380AF] disabled:opacity-50">
                    {form.processing ? 'Saving…' : 'Save'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="mx-auto grid max-w-[1000px] gap-5 lg:grid-cols-2">
                    <Card title="Template" desc="The look of your public listing page.">
                        <div className="grid gap-2">
                            {designs.map((d) => {
                                const active = data.config.design === d.id;
                                return (
                                    <button key={d.id} type="button" onClick={() => setCfg('design', d.id)} className={`flex items-center gap-3 rounded-lg border p-2.5 text-left transition-all ${active ? 'border-[#1693C9] bg-[#F0F9FF]' : 'border-[#E4E7EB] hover:border-[#D1D5DB]'}`}>
                                        <span className="h-12 w-16 shrink-0 overflow-hidden rounded bg-[#EEF0F3]">
                                            {d.preview && <img src={d.preview} alt={d.name} className="h-full w-full object-cover" />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className={`block text-[13px] font-semibold ${active ? 'text-[#1693C9]' : 'text-[#111315]'}`}>{d.name}</span>
                                            <span className="mt-0.5 block text-[12px] leading-relaxed text-[#5F656D]">{d.description}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Accent color">
                                <div className="flex items-center gap-2">
                                    <input type="color" value={data.accent_color} onChange={(e) => form.setData('accent_color', e.target.value)} className="h-8 w-10 rounded border border-[#C8CCD1]" />
                                    <input className={inputCls} value={data.accent_color} onChange={(e) => form.setData('accent_color', e.target.value)} />
                                </div>
                            </Field>
                            <Field label="Font">
                                <select className={inputCls} value={data.config.font} onChange={(e) => setCfg('font', e.target.value)}>
                                    {fonts.map((f) => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </Field>
                        </div>
                    </Card>

                    <Card title="Listing details" desc="From the attached property. Lock to gate photos & description behind the form.">
                        {hasProperty ? (
                            <div className="rounded-lg bg-[#F7F8FA] p-3 text-[13px]">
                                <p className="font-semibold text-[#111315]">{addr?.full || addr?.street || 'Property'}</p>
                                <p className="mt-0.5 text-[#5F656D]">
                                    {page.listing.price ? '$' + Number(page.listing.price).toLocaleString() : ''}
                                    {page.listing.beds ? ` · ${page.listing.beds} bd` : ''}
                                    {page.listing.baths ? ` · ${page.listing.baths} ba` : ''}
                                    {page.listing.sqft ? ` · ${Number(page.listing.sqft).toLocaleString()} sqft` : ''}
                                </p>
                                <p className="mt-1 text-[11px] uppercase tracking-wide text-[#8B9096]">{page.listing.source === 'mls' ? 'From MLS' : 'Your listing'} · {(page.listing.photos || []).length} photos</p>
                            </div>
                        ) : (
                            <p className="rounded-lg bg-[#FFF7ED] p-3 text-[12px] text-[#9A6B2F]">No property attached yet.</p>
                        )}
                        <label className="flex items-start gap-2.5 rounded-lg border border-[#E4E7EB] p-3">
                            <input type="checkbox" checked={data.config.gate} onChange={(e) => setCfg('gate', e.target.checked)} className="mt-0.5 rounded border-[#C8CCD1] text-[#1693C9] focus:ring-0" />
                            <span>
                                <span className="block text-[13px] font-semibold text-[#111315]">{data.config.gate ? 'Listing locked' : 'Listing unlocked'}</span>
                                <span className="mt-0.5 block text-[12px] text-[#8B9096]">When locked, extra photos blur and the description truncates until a visitor submits the form.</span>
                            </span>
                        </label>
                    </Card>

                    <Card title="Hero & copy" desc="Defaults pull from the listing — override anything you like.">
                        <Field label="Page name (internal)"><input className={inputCls} value={data.name} onChange={(e) => form.setData('name', e.target.value)} /></Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Eyebrow" hint="Defaults to status."><input className={inputCls} value={data.config.eyebrow} onChange={(e) => setCfg('eyebrow', e.target.value)} /></Field>
                            <Field label="CTA button"><input className={inputCls} value={data.config.cta_button} onChange={(e) => setCfg('cta_button', e.target.value)} placeholder="Schedule a Private Showing" /></Field>
                        </div>
                        <Field label="Headline" hint="Defaults to the street address."><input className={inputCls} value={data.config.headline} onChange={(e) => setCfg('headline', e.target.value)} /></Field>
                        <Field label="Tagline / intro"><textarea rows={2} className={inputCls} value={data.config.tagline} onChange={(e) => setCfg('tagline', e.target.value)} /></Field>
                        <Field label="Video URL (YouTube / Vimeo)"><input className={inputCls} value={data.config.video_url} onChange={(e) => setCfg('video_url', e.target.value)} placeholder="https://youtube.com/watch?v=…" /></Field>
                        <Field label="Pricing note"><textarea rows={2} className={inputCls} value={data.config.pricing_note} onChange={(e) => setCfg('pricing_note', e.target.value)} /></Field>
                    </Card>

                    <Card title="Why buy this listing" desc="Shown as a highlights grid. One reason per line.">
                        <Field label="Section title"><input className={inputCls} value={data.config.why_buy_title} onChange={(e) => setCfg('why_buy_title', e.target.value)} placeholder="Why buy this home" /></Field>
                        <Field label="Reasons (one per line)"><textarea rows={5} className={inputCls} value={data.config.why_buy} onChange={(e) => setCfg('why_buy', e.target.value)} /></Field>
                    </Card>
                </div>
            </div>
        </CrmLayout>
    );
}
