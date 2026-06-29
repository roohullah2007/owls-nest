import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { AgentWebsite } from '../../../types';
import { inputClass, labelClass, textareaClass, sectionLabel } from '../../../constants';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import PillTabs from '@/Components/Crm/PillTabs';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import RichTextField from '@/Components/Crm/RichTextField';
import MediaField, { mediaUrl } from '../../MediaField';
import MediaPickerModal from '../../MediaPickerModal';

type Source = 'platform' | 'own' | 'both';
type Tab = 'platform' | 'own';

interface PlatformDev {
    id: number;
    name: string;
    slug: string;
    area: string;
    city: string | null;
    status: string;
    completion_year: string | null;
    price_label: string | null;
    developer: string | null;
    image_url: string | null;
}

interface KeyDetail { label: string; value: string }
interface FloorPlan { label: string; image: string }

interface DeveloperOption {
    id: number;
    name: string;
    logo: string | null;
    info: string | null;
    logo_url: string | null;
}

interface OwnDev {
    id: number;
    name: string;
    slug: string;
    area: string;
    city: string | null;
    zip: string | null;
    address: string | null;
    image: string | null;
    logo: string | null;
    description: string | null;
    developer: string | null;
    developer_id: number | null;
    developer_info: string | null;
    architect: string | null;
    interior_design: string | null;
    status: string;
    completion_year: string | null;
    price_label: string | null;
    highlights: string[] | null;
    key_details: KeyDetail[] | null;
    deposit_schedule: string[] | null;
    gallery: string[] | null;
    floor_plans: FloorPlan[] | null;
    brochure: string | null;
    video_url: string | null;
    lat: number | null;
    lng: number | null;
    is_active: boolean;
}

/** Per-directory wiring: endpoints, public paths and copy. */
export interface DirectoryCfg {
    /** CRUD base segment, e.g. "new-developments" → GET {base}/new-developments/manage. */
    endpointBase: string;
    /** Config PATCH segment, e.g. "new-developments-config" | "condo-directory-config". */
    configEndpoint: string;
    /** AI About-writer segment, e.g. "new-developments/ai-description". */
    aiEndpoint: string;
    /** Public site path, e.g. "new-developments" | "condos". */
    publicPath: string;
    /** Public item path prefix shown in the row meta, e.g. "/new-developments". */
    publicItemPrefix: string;
    pageTitle: string;      // "New Developments" | "Condo Directory"
    noun: string;           // "Project" | "Building"
    nounPlural: string;     // "Projects" | "Buildings"
    settingsIntro: string;
    platformEmptyTitle: string;
    ownIntro: string;
}

interface Props {
    website: AgentWebsite;
    onActionChange: (action: { label: string; onClick: () => void; secondary?: { label: string; onClick: () => void } } | null) => void;
    cfg: DirectoryCfg;
}

const EMPTY_FORM = {
    name: '', area: '', address: '', city: '', zip: '', status: 'pre-construction',
    completion_year: '', price_label: '',
    developer_id: '' as number | '', developer: '', developer_logo: '', developer_info: '',
    architect: '', interior_design: '', description: '', highlightsText: '',
    depositText: '', video_url: '', image: '', logo: '',
    brochure: '', is_active: true,
    lat: null as number | null, lng: null as number | null,
    key_details: [] as KeyDetail[],
    gallery: [] as string[],
    floor_plans: [] as FloorPlan[],
};

const sourceOptions = (cfg: DirectoryCfg): { value: Source; label: string; help: string }[] => [
    { value: 'platform', label: 'Platform catalog', help: 'Our team curates and updates it for you.' },
    { value: 'own', label: `My own ${cfg.nounPlural.toLowerCase()}`, help: `Only the ${cfg.nounPlural.toLowerCase()} you add yourself.` },
    { value: 'both', label: 'Both', help: `Your ${cfg.nounPlural.toLowerCase()} alongside the platform catalog.` },
];

const statusLabel = (s: string) => s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const STATUS_BADGE: Record<string, string> = {
    'pre-construction': 'bg-[#E0F2FE] text-[#0369A1]',
    'under-construction': 'bg-[#FEF3C7] text-[#D97706]',
    'completed': 'bg-[#E8F5E0] text-[#63A205]',
};

const GOOGLE_SCRIPT_ID = 'nd-google-maps';

/** Load the Google Maps JS API with the Places library (idempotent). */
function loadGooglePlaces(apiKey: string): Promise<void> {
    const w = window as any;
    if (w.google?.maps?.places?.Autocomplete) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
        const finish = () => {
            if (typeof w.google?.maps?.importLibrary === 'function') {
                w.google.maps.importLibrary('places').then(() => resolve()).catch(reject);
            } else {
                resolve();
            }
        };
        const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
        if (existing) {
            if (w.google?.maps) { finish(); return; }
            existing.addEventListener('load', finish, { once: true });
            existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')), { once: true });
            return;
        }
        const script = document.createElement('script');
        script.id = GOOGLE_SCRIPT_ID;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = finish;
        script.onerror = () => reject(new Error('Failed to load Google Maps'));
        document.head.appendChild(script);
    });
}

/** Blog-card style leading chip: project photo or a two-tone building icon. */
function DevChip({ src }: { src: string | null }) {
    return src ? (
        <span className="block h-10 w-10 rounded-[4px] bg-[#F3F4F6] bg-cover bg-center" style={{ backgroundImage: `url(${src})` }} />
    ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-[#E0F2FE]">
            <BuildingIcon className="h-5 w-5 text-[#1693C9]" />
        </span>
    );
}

function BuildingIcon({ className }: { className: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
    );
}

/**
 * Shared directory manager — New Developments and the Condo Directory are
 * deliberate duplicates wired through DirectoryCfg. Pages/Blog-tab
 * architecture: tabbed card lists; page settings and the item form live in
 * slide-overs; the top bar carries Settings + Add. Items support the
 * developer taxonomy (pick an existing developer or create one with a logo),
 * Google Places street-address autocomplete, rich About copy with an AI
 * writer, media (logo, gallery, brochure, floor plans), key details and a
 * deposit schedule.
 */
export default function DirectoryManagerSection({ website, onActionChange, cfg }: Props) {
    const base = `/api/website-editor/${website.id}`;

    const [loading, setLoading] = useState(true);
    const [enabled, setEnabled] = useState(false);
    const [source, setSource] = useState<Source>('both');
    const [hidden, setHidden] = useState<number[]>([]);
    const [platform, setPlatform] = useState<PlatformDev[]>([]);
    const [own, setOwn] = useState<OwnDev[]>([]);
    const [developers, setDevelopers] = useState<DeveloperOption[]>([]);
    const [statuses, setStatuses] = useState<string[]>(['pre-construction', 'under-construction', 'completed']);
    const [mapsKey, setMapsKey] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>('platform');
    const [settingsOpen, setSettingsOpen] = useState(false);

    const [savingConfig, setSavingConfig] = useState(false);
    const [configError, setConfigError] = useState<string | null>(null);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<OwnDev | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [newDeveloper, setNewDeveloper] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [aiBusy, setAiBusy] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [pickingGallery, setPickingGallery] = useState(false);
    const [pickingFloorPlan, setPickingFloorPlan] = useState(false);
    const [uploadingBrochure, setUploadingBrochure] = useState(false);
    const brochureRef = useRef<HTMLInputElement>(null);
    const streetRef = useRef<HTMLInputElement>(null);
    const formRef = useRef(form);
    formRef.current = form;

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${base}/${cfg.endpointBase}/manage`);
            setEnabled(!!data.enabled);
            setSource((data.source as Source) || 'both');
            setHidden(data.hidden || []);
            setPlatform(data.platform || []);
            setOwn(data.own || []);
            setDevelopers(data.developers || []);
            setMapsKey(data.google_maps_key || null);
            if (data.statuses?.length) setStatuses(data.statuses);
            if ((data.source as Source) === 'own') setTab('own');
        } finally {
            setLoading(false);
        }
    }, [base]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Top-bar actions: Settings (page toggle + source) left of Add Project.
    useEffect(() => {
        onActionChange({
            label: `Add ${cfg.noun}`,
            onClick: () => startCreate(),
            secondary: { label: 'Settings', onClick: () => setSettingsOpen(true) },
        });
        return () => onActionChange(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Google Places autocomplete on the Street Address input (when the form is open).
    useEffect(() => {
        if (!formOpen || !mapsKey) return;
        let listener: any = null;
        let cancelled = false;
        loadGooglePlaces(mapsKey).then(() => {
            const w = window as any;
            if (cancelled || !streetRef.current || !w.google?.maps?.places?.Autocomplete) return;
            const ac = new w.google.maps.places.Autocomplete(streetRef.current, {
                types: ['address'],
                fields: ['address_components', 'geometry'],
            });
            listener = ac.addListener('place_changed', () => {
                const place = ac.getPlace();
                if (!place?.address_components) return;
                const get = (type: string, short = false) => {
                    const c = place.address_components.find((x: any) => x.types.includes(type));
                    return c ? (short ? c.short_name : c.long_name) : '';
                };
                const street = [get('street_number'), get('route')].filter(Boolean).join(' ');
                setForm((f) => ({
                    ...f,
                    address: street || f.address,
                    city: get('locality') || get('sublocality') || f.city,
                    zip: get('postal_code') || f.zip,
                    lat: place.geometry?.location ? place.geometry.location.lat() : f.lat,
                    lng: place.geometry?.location ? place.geometry.location.lng() : f.lng,
                }));
            });
        }).catch(() => { /* autocomplete is progressive enhancement */ });
        return () => {
            cancelled = true;
            if (listener?.remove) listener.remove();
        };
    }, [formOpen, mapsKey]);

    const saveConfig = async () => {
        setSavingConfig(true);
        setConfigError(null);
        try {
            await axios.patch(`${base}/${cfg.configEndpoint}`, { enabled, source });
            setSettingsOpen(false);
        } catch {
            setConfigError('Could not save the settings. Please try again.');
        } finally {
            setSavingConfig(false);
        }
    };

    /** Hide/Show a platform project — optimistic, persisted immediately. */
    const toggleHidden = async (id: number) => {
        const prev = hidden;
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        setHidden(next);
        try {
            await axios.patch(`${base}/${cfg.configEndpoint}`, { hidden: next });
        } catch {
            setHidden(prev);
        }
    };

    /* ── Own-project slide-over ── */

    function startCreate() {
        setForm({ ...EMPTY_FORM });
        setNewDeveloper(false);
        setEditing(null);
        setFormError(null);
        setAiError(null);
        setFormOpen(true);
        setTab('own');
    }

    function startEdit(d: OwnDev) {
        setForm({
            name: d.name, area: d.area, address: d.address || '', city: d.city || '', zip: d.zip || '',
            status: d.status, completion_year: d.completion_year || '', price_label: d.price_label || '',
            developer_id: d.developer_id ?? '', developer: d.developer || '',
            developer_logo: '', developer_info: d.developer_info || '',
            architect: d.architect || '', interior_design: d.interior_design || '',
            description: d.description || '', highlightsText: (d.highlights || []).join('\n'),
            depositText: (d.deposit_schedule || []).join('\n'),
            video_url: d.video_url || '',
            image: d.image || '', logo: d.logo || '', brochure: d.brochure || '',
            is_active: d.is_active,
            lat: d.lat, lng: d.lng,
            key_details: (d.key_details || []).map((k) => ({ ...k })),
            gallery: [...(d.gallery || [])],
            floor_plans: (d.floor_plans || []).map((f) => ({ ...f })),
        });
        setNewDeveloper(!d.developer_id && !!d.developer);
        setEditing(d);
        setFormError(null);
        setAiError(null);
        setFormOpen(true);
    }

    function closeForm() {
        setFormOpen(false);
        setEditing(null);
        setForm({ ...EMPTY_FORM });
    }

    async function handleSave() {
        if (!form.name.trim() || !form.area.trim()) {
            setFormError(`${cfg.noun} name and area are required.`);
            return;
        }
        setSaving(true);
        setFormError(null);
        try {
            const payload = {
                name: form.name, area: form.area,
                address: form.address || null, city: form.city || null, zip: form.zip || null,
                status: form.status, completion_year: form.completion_year || null,
                price_label: form.price_label || null,
                developer_id: newDeveloper ? null : (form.developer_id || null),
                developer: newDeveloper ? (form.developer || null) : null,
                developer_logo: newDeveloper ? (form.developer_logo || null) : null,
                developer_info: newDeveloper ? (form.developer_info || null) : null,
                architect: form.architect || null, interior_design: form.interior_design || null,
                description: form.description || null, video_url: form.video_url || null,
                image: form.image || null, logo: form.logo || null, brochure: form.brochure || null,
                highlights: form.highlightsText.split('\n').map((s) => s.trim()).filter(Boolean),
                deposit_schedule: form.depositText.split('\n').map((s) => s.trim()).filter(Boolean),
                key_details: form.key_details.filter((k) => k.label.trim() && k.value.trim()),
                gallery: form.gallery,
                floor_plans: form.floor_plans.filter((f) => f.image),
                lat: form.lat, lng: form.lng,
                is_active: form.is_active,
            };
            if (editing) {
                await axios.patch(`${base}/${cfg.endpointBase}/${editing.id}`, payload);
            } else {
                await axios.post(`${base}/${cfg.endpointBase}`, payload);
            }
            closeForm();
            fetchAll();
        } catch (err: any) {
            const errors = err.response?.data?.errors;
            setFormError(errors ? (Object.values(errors)[0] as string[])[0] : 'Could not save. Please check the fields.');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(d: OwnDev) {
        if (!confirm(`Delete ${d.name}? Its uploaded photos and files are removed too.`)) return;
        await axios.delete(`${base}/${cfg.endpointBase}/${d.id}`);
        if (editing?.id === d.id) closeForm();
        fetchAll();
    }

    async function writeAboutWithAi() {
        const f = formRef.current;
        if (!f.name.trim()) {
            setAiError(`Add the ${cfg.noun.toLowerCase()} name first.`);
            return;
        }
        setAiBusy(true);
        setAiError(null);
        try {
            const selectedDev = developers.find((d) => d.id === f.developer_id);
            const { data } = await axios.post(`${base}/${cfg.aiEndpoint}`, {
                name: f.name,
                area: f.area || null,
                city: f.city || null,
                developer: newDeveloper ? (f.developer || null) : (selectedDev?.name || null),
                architect: f.architect || null,
                interior_design: f.interior_design || null,
                status: f.status,
                completion_year: f.completion_year || null,
                price_label: f.price_label || null,
                highlights: f.highlightsText.split('\n').map((s) => s.trim()).filter(Boolean),
                key_details: f.key_details.filter((k) => k.label.trim() && k.value.trim()),
                current_value: f.description || null,
            });
            if (data.value) setForm((prev) => ({ ...prev, description: data.value }));
        } catch (err: any) {
            setAiError(err.response?.data?.error || 'Could not generate the copy.');
        } finally {
            setAiBusy(false);
        }
    }

    async function onBrochurePick(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setUploadingBrochure(true);
        try {
            const fd = new FormData();
            fd.append('kind', 'brochure');
            fd.append('file', file);
            const { data } = await axios.post(`${base}/${cfg.endpointBase}-upload`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setForm((f) => ({ ...f, brochure: data.path }));
        } catch {
            setFormError('Brochure upload failed — PDFs up to 20 MB.');
        } finally {
            setUploadingBrochure(false);
        }
    }

    const ghostButtonClass = 'rounded-[4px] border border-[#C8CCD1] bg-white px-3 py-[6px] text-[12px] font-medium text-[#111315] hover:bg-[#F7F8F9] disabled:opacity-50 transition-colors';
    const selectedDeveloper = developers.find((d) => d.id === form.developer_id);

    const formFooter = (
        <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={closeForm} className={ghostButtonClass}>Cancel</button>
            <PrimaryButton
                type="button"
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.area.trim()}
                icon={null}
                label={saving ? 'Saving…' : editing ? `Update ${cfg.noun}` : `Create ${cfg.noun}`}
            />
        </div>
    );

    const settingsFooter = (
        <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => setSettingsOpen(false)} className={ghostButtonClass}>Cancel</button>
            <PrimaryButton type="button" onClick={saveConfig} disabled={savingConfig} icon={null} label={savingConfig ? 'Saving…' : 'Save Settings'} />
        </div>
    );

    return (
        <div className="space-y-3">
            {/* ── Catalog tabs ── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <PillTabs<Tab>
                    tabs={[
                        { key: 'platform', label: 'Platform Catalog', count: platform.length },
                        { key: 'own', label: `Your ${cfg.nounPlural}`, count: own.length },
                    ]}
                    active={tab}
                    onChange={setTab}
                    size="md"
                />
                <a href={`/site/${website.slug}/${cfg.publicPath}`} target="_blank" rel="noopener" className="text-[12px] font-medium text-[#1693C9] hover:underline">
                    View page ↗
                </a>
            </div>

            {!enabled && !loading && (
                <div className="rounded-[4px] border border-[#F5D9A8] bg-[#FFF9EE] px-4 py-3 text-[12px] text-[#92600A]">
                    The {cfg.pageTitle} page is currently <b>off</b> — visitors get a 404. Switch it on in <button type="button" onClick={() => setSettingsOpen(true)} className="font-semibold underline">Settings</button>.
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <svg className="h-5 w-5 animate-spin text-[#8B9096]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            ) : tab === 'platform' ? (
                <>
                    <p className="text-[12px] text-[#5F656D]">
                        Curated and kept up to date by our team — hide anything you don&rsquo;t want on your site.
                        {source === 'own' && <span className="text-[#B45309]"> The catalog is off for your site while &ldquo;My own {cfg.nounPlural.toLowerCase()}&rdquo; is selected in Settings.</span>}
                    </p>
                    {platform.length === 0 ? (
                        <div className="rounded-[4px] border border-[#E4E7EB] bg-white p-12 text-center shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)]">
                            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#E0F2FE]">
                                <BuildingIcon className="h-5 w-5 text-[#1693C9]" />
                            </div>
                            <h4 className="mb-1 text-sm font-semibold text-[#111315]">{cfg.platformEmptyTitle}</h4>
                            <p className="text-[12px] text-[#5F656D]">Our team is adding to the catalog — check back soon.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {platform.map((d) => {
                                const isHidden = hidden.includes(d.id);
                                return (
                                    <div key={d.id} className={`group flex items-center border border-[#E4E7EB] bg-white rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] transition-all hover:border-[#D1D5DB] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)] ${isHidden ? 'opacity-60' : ''}`}>
                                        <div className="flex shrink-0 items-center pl-3">
                                            <DevChip src={d.image_url} />
                                        </div>
                                        <div className="flex min-w-0 flex-1 items-center gap-4 px-4 py-4">
                                            <div className="min-w-0 flex-1">
                                                <span className="inline-flex max-w-full items-center gap-2">
                                                    <span className="truncate text-[15px] font-semibold text-[#111315]">{d.name}</span>
                                                    <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_BADGE[d.status] || 'bg-[#F3F4F6] text-[#5F656D]'}`}>
                                                        {statusLabel(d.status)}
                                                    </span>
                                                    {isHidden && (
                                                        <span className="inline-flex shrink-0 items-center rounded bg-[#F3F4F6] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#5F656D]">Hidden</span>
                                                    )}
                                                </span>
                                                <p className="mt-0.5 truncate text-[11px] text-[#8B9096]">
                                                    {[d.area, d.developer, d.completion_year && `Est. ${d.completion_year}`, d.price_label].filter(Boolean).join(' · ')}
                                                </p>
                                            </div>
                                            <a href={`/site/${website.slug}/${cfg.publicPath}/${d.slug}`} target="_blank" rel="noopener" className="flex h-8 shrink-0 items-center rounded-[4px] px-3 text-[12px] font-medium text-[#1693C9] hover:bg-[#EAF6FB] transition-colors">
                                                View
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => toggleHidden(d.id)}
                                                className={`flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border px-3 text-[12px] font-medium transition-colors ${
                                                    isHidden
                                                        ? 'border-[#1693C9] text-[#1693C9] hover:bg-[#EAF6FB]'
                                                        : 'border-[#C8CCD1] text-[#5F656D] hover:bg-[#F7F8F9] hover:text-[#111315]'
                                                }`}
                                            >
                                                {isHidden ? (
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                                                ) : (
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                                )}
                                                {isHidden ? 'Show' : 'Hide'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                <>
                    <p className="text-[12px] text-[#5F656D]">
{cfg.ownIntro}
                        {source === 'platform' && <span className="text-[#B45309]"> Your {cfg.nounPlural.toLowerCase()} stay off the site until you pick &ldquo;My own {cfg.nounPlural.toLowerCase()}&rdquo; or &ldquo;Both&rdquo; in Settings.</span>}
                    </p>
                    {own.length === 0 ? (
                        <div className="rounded-[4px] border border-[#E4E7EB] bg-white p-12 text-center shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)]">
                            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#E0F2FE]">
                                <BuildingIcon className="h-5 w-5 text-[#1693C9]" />
                            </div>
                            <h4 className="mb-1 text-sm font-semibold text-[#111315]">No {cfg.nounPlural.toLowerCase()} of your own yet</h4>
                            <p className="mb-4 text-[12px] text-[#5F656D]">Add one you represent to feature it on your site.</p>
                            <button type="button" onClick={startCreate} className="h-8 rounded-[4px] bg-[#1693C9] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#1380AF]">
                                Add First {cfg.noun}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {own.map((d) => (
                                <div key={d.id} className={`group flex items-center border border-[#E4E7EB] bg-white rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] transition-all hover:border-[#D1D5DB] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)] ${d.is_active ? '' : 'opacity-60'}`}>
                                    <button type="button" onClick={() => startEdit(d)} className="flex shrink-0 items-center pl-3" aria-label={`Edit ${d.name}`}>
                                        <DevChip src={d.image ? mediaUrl(d.image) : null} />
                                    </button>
                                    <div className="flex min-w-0 flex-1 items-center gap-4 px-4 py-4">
                                        <div className="min-w-0 flex-1">
                                            <button type="button" onClick={() => startEdit(d)} className="block max-w-full text-left">
                                                <span className="inline-flex max-w-full items-center gap-2">
                                                    <span className="truncate text-[15px] font-semibold text-[#111315] transition-colors hover:text-[#1693C9]">{d.name}</span>
                                                    <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_BADGE[d.status] || 'bg-[#F3F4F6] text-[#5F656D]'}`}>
                                                        {statusLabel(d.status)}
                                                    </span>
                                                    {!d.is_active && (
                                                        <span className="inline-flex shrink-0 items-center rounded bg-[#F3F4F6] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#5F656D]">Hidden</span>
                                                    )}
                                                </span>
                                            </button>
                                            <p className="mt-0.5 truncate text-[11px] text-[#8B9096]">
                                                <span className="font-mono">{cfg.publicItemPrefix}/{d.slug}</span>
                                                {' · '}
                                                {[d.area, d.developer, d.price_label].filter(Boolean).join(' · ') || '—'}
                                            </p>
                                        </div>
                                        <a href={`/site/${website.slug}/${cfg.publicPath}/${d.slug}`} target="_blank" rel="noopener" className="flex h-8 shrink-0 items-center rounded-[4px] px-3 text-[12px] font-medium text-[#1693C9] hover:bg-[#EAF6FB] transition-colors">
                                            View
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => startEdit(d)}
                                            className="flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] bg-[#1693C9] px-3.5 text-[12px] font-medium text-white transition-colors hover:bg-[#1380AF]"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(d)}
                                            className="flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border border-[#F0C2C2] px-3 text-[12px] font-medium text-[#DC2626] transition-colors hover:bg-[#FEF2F2]"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ── Page Settings slide-over ── */}
            {settingsOpen && (
                <SlideOverModal title="Page Settings" onClose={() => setSettingsOpen(false)} footer={settingsFooter} width={460}>
                    <div className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden p-6">
                        <p className="text-[13px] text-[#5F656D]">
                            {cfg.settingsIntro}
                        </p>

                        <label className="flex items-center gap-2 text-[13px] text-[#111315]">
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => setEnabled(e.target.checked)}
                                className="rounded border-[#C8CCD1]"
                            />
                            Show {cfg.pageTitle} on my website
                        </label>

                        <div>
                            <p className={labelClass}>Which {cfg.nounPlural.toLowerCase()} should the page show?</p>
                            <div className="space-y-2">
                                {sourceOptions(cfg).map((opt) => (
                                    <label
                                        key={opt.value}
                                        className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors ${
                                            source === opt.value ? 'border-[#1693C9] bg-[#F4FAFD]' : 'border-[#E4E7EB] bg-white hover:border-[#C8CCD1]'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="nd-source"
                                                checked={source === opt.value}
                                                onChange={() => setSource(opt.value)}
                                                className="border-[#C8CCD1]"
                                            />
                                            <span className="text-[13px] font-medium text-[#111315]">{opt.label}</span>
                                        </span>
                                        <span className="pl-6 text-[12px] leading-snug text-[#8B9096]">{opt.help}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {configError && <p className="text-[12px] text-red-600">{configError}</p>}
                    </div>
                </SlideOverModal>
            )}

            {/* ── Add / Edit project slide-over ── */}
            {formOpen && (
                <SlideOverModal title={editing ? `Edit ${editing.name}` : `Add ${cfg.noun}`} onClose={closeForm} footer={formFooter} width={640}>
                    <div className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden p-6">
                        {/* Project */}
                        <div className="space-y-4">
                            <p className={sectionLabel}>{cfg.noun}</p>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className={labelClass}>{cfg.noun} Name *</label>
                                    <input type="text" className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Marina Tower Residences" autoFocus />
                                </div>
                                <div>
                                    <label className={labelClass}>Area *</label>
                                    <input type="text" className={inputClass} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. Brickell" />
                                    <p className="mt-1 text-[11px] text-[#5F656D]">Groups {cfg.nounPlural.toLowerCase()} on the public page.</p>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelClass}>Street Address</label>
                                    <input ref={streetRef} type="text" className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Start typing the address…" />
                                </div>
                                <div>
                                    <label className={labelClass}>City</label>
                                    <input type="text" className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                                </div>
                                <div>
                                    <label className={labelClass}>Zip Code</label>
                                    <input type="text" className={inputClass} value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                                </div>
                                <div>
                                    <label className={labelClass}>Status</label>
                                    <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                        {statuses.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass}>Est. Completion</label>
                                        <input type="text" className={inputClass} value={form.completion_year} onChange={(e) => setForm({ ...form, completion_year: e.target.value })} placeholder="2028" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Pricing</label>
                                        <input type="text" className={inputClass} value={form.price_label} onChange={(e) => setForm({ ...form, price_label: e.target.value })} placeholder="From $1.5M" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Architect</label>
                                    <input type="text" className={inputClass} value={form.architect} onChange={(e) => setForm({ ...form, architect: e.target.value })} />
                                </div>
                                <div>
                                    <label className={labelClass}>Interior Design</label>
                                    <input type="text" className={inputClass} value={form.interior_design} onChange={(e) => setForm({ ...form, interior_design: e.target.value })} />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelClass}>Video URL</label>
                                    <input type="url" className={inputClass} value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/…" />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-[13px] text-[#111315]">
                                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-[#C8CCD1]" />
                                Visible on the website
                            </label>
                        </div>

                        {/* Developer (taxonomy: pick existing or create new) */}
                        <div className="space-y-4 border-t border-[#E4E7EB] pt-5">
                            <p className={sectionLabel}>Developer</p>
                            {!newDeveloper ? (
                                <>
                                    <div>
                                        <label className={labelClass}>Developer</label>
                                        <select
                                            className={inputClass}
                                            value={form.developer_id === '' ? '' : String(form.developer_id)}
                                            onChange={(e) => setForm({ ...form, developer_id: e.target.value ? Number(e.target.value) : '' })}
                                        >
                                            <option value="">— No developer —</option>
                                            {developers.map((d) => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {selectedDeveloper && (
                                        <div className="flex items-center gap-3 rounded-lg border border-[#E4E7EB] bg-[#F9FAFB] p-3">
                                            {selectedDeveloper.logo_url
                                                ? <img src={selectedDeveloper.logo_url} alt="" className="h-10 w-16 rounded bg-[#111315] object-contain p-1" />
                                                : <span className="flex h-10 w-16 items-center justify-center rounded bg-[#F2F3F5]"><BuildingIcon className="h-4 w-4 text-[#C2C7CD]" /></span>}
                                            <p className="line-clamp-2 flex-1 text-[12px] text-[#5F656D]">{selectedDeveloper.info || 'No developer profile yet.'}</p>
                                        </div>
                                    )}
                                    <button type="button" onClick={() => { setNewDeveloper(true); setForm({ ...form, developer_id: '' }); }} className={ghostButtonClass}>
                                        New Developer
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className={labelClass}>Developer Name</label>
                                            <input type="text" className={inputClass} value={form.developer} onChange={(e) => setForm({ ...form, developer: e.target.value })} placeholder="e.g. Related Group" />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Developer Logo</label>
                                            <MediaField websiteId={website.id} value={form.developer_logo} onChange={(p) => setForm({ ...form, developer_logo: p })} size="sm" />
                                            <p className="mt-1 text-[11px] text-[#5F656D]">Use a white / transparent version — it sits on dark backgrounds.</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>About the Developer</label>
                                        <textarea className={textareaClass} rows={4} value={form.developer_info} onChange={(e) => setForm({ ...form, developer_info: e.target.value })} placeholder="A short profile of the developer — track record, signature projects…" />
                                    </div>
                                    <button type="button" onClick={() => setNewDeveloper(false)} className={ghostButtonClass}>
                                        Choose Existing Developer
                                    </button>
                                </>
                            )}
                        </div>

                        {/* About & details */}
                        <div className="space-y-4 border-t border-[#E4E7EB] pt-5">
                            <p className={sectionLabel}>About &amp; Details</p>
                            <div>
                                <div className="flex items-center justify-between">
                                    <label className={labelClass}>About the {cfg.noun}</label>
                                    <button type="button" onClick={writeAboutWithAi} disabled={aiBusy || !form.name.trim()} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7C3AED] transition-colors hover:text-[#6D28D9] disabled:opacity-50">
                                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.6 4.8L18 8l-4.4 1.2L12 14l-1.6-4.8L6 8l4.4-1.2L12 2zm6 9l.9 2.6L21 14l-2.1.7L18 17l-.9-2.3L15 14l2.1-.4L18 11zM6 13l.9 2.6L9 16l-2.1.7L6 19l-.9-2.3L3 16l2.1-.4L6 13z" /></svg>
                                        {aiBusy ? 'Writing…' : form.description.trim() ? 'Improve with AI' : 'Write with AI'}
                                    </button>
                                </div>
                                <RichTextField
                                    value={form.description}
                                    onChange={(description) => setForm((f) => ({ ...f, description }))}
                                    minHeight={220}
                                    placeholder="Tell its story — a few paragraphs work best, or click Write with AI."
                                />
                                {aiError && <p className="mt-1 text-[12px] text-red-600">{aiError}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Highlights <span className="text-[#9AA1A9]">(one per line)</span></label>
                                <textarea className={textareaClass} rows={4} value={form.highlightsText} onChange={(e) => setForm({ ...form, highlightsText: e.target.value })} placeholder={'Private elevator entry\nResort-style pool deck'} />
                            </div>
                            <div>
                                <label className={labelClass}>Key Building Details</label>
                                <div className="space-y-2">
                                    {form.key_details.map((k, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <input type="text" className={inputClass} value={k.label} placeholder="Label — e.g. Units" onChange={(e) => setForm({ ...form, key_details: form.key_details.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
                                            <input type="text" className={inputClass} value={k.value} placeholder="Value — e.g. 232" onChange={(e) => setForm({ ...form, key_details: form.key_details.map((x, j) => j === i ? { ...x, value: e.target.value } : x) })} />
                                            <button type="button" onClick={() => setForm({ ...form, key_details: form.key_details.filter((_, j) => j !== i) })} className="shrink-0 rounded px-2 py-1 text-[12px] text-red-600 hover:bg-red-50">✕</button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => setForm({ ...form, key_details: [...form.key_details, { label: '', value: '' }] })} className={ghostButtonClass}>Add Detail</button>
                                </div>
                                <p className="mt-1 text-[11px] text-[#5F656D]">e.g. Price Range, HOA, Sq Ft Area, Units, Stories, Year Built.</p>
                            </div>
                            <div>
                                <label className={labelClass}>Deposit Schedule <span className="text-[#9AA1A9]">(one step per line, in order)</span></label>
                                <textarea className={textareaClass} rows={4} value={form.depositText} onChange={(e) => setForm({ ...form, depositText: e.target.value })} placeholder={'20% at Contract\n10% at Groundbreaking\n10% at Top Off\n60% at Closing'} />
                            </div>
                        </div>

                        {/* Media */}
                        <div className="space-y-4 border-t border-[#E4E7EB] pt-5">
                            <p className={sectionLabel}>Media</p>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className={labelClass}>Main Photo</label>
                                    <MediaField websiteId={website.id} value={form.image} onChange={(p) => setForm({ ...form, image: p })} size="md" />
                                </div>
                                <div>
                                    <label className={labelClass}>Project Logo</label>
                                    <MediaField websiteId={website.id} value={form.logo} onChange={(p) => setForm({ ...form, logo: p })} size="md" />
                                    <p className="mt-1 text-[11px] text-[#5F656D]">Use a white / transparent version — it shows over the hero photo.</p>
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Gallery <span className="text-[#9AA1A9]">(up to 30 photos)</span></label>
                                <div className="flex flex-wrap items-center gap-2">
                                    {form.gallery.map((g, i) => (
                                        <div key={i} className="group relative">
                                            <img src={mediaUrl(g)} alt="" className="h-16 w-24 rounded-[4px] border border-[#E4E7EB] object-cover" />
                                            <button type="button" onClick={() => setForm({ ...form, gallery: form.gallery.filter((_, j) => j !== i) })} aria-label="Remove photo" className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[#E4E7EB] bg-white text-[11px] text-red-600 shadow-sm hover:bg-red-50">✕</button>
                                        </div>
                                    ))}
                                    {form.gallery.length < 30 && (
                                        <button type="button" onClick={() => setPickingGallery(true)} className="flex h-16 w-24 flex-col items-center justify-center gap-1 rounded-[4px] border-2 border-dashed border-[#C8CCD1] bg-[#F9FAFB] text-[#5F656D] transition-colors hover:border-[#1693C9] hover:text-[#1693C9]">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                            <span className="text-[10px] font-medium">Add</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Floor Plans</label>
                                <div className="space-y-2">
                                    {form.floor_plans.map((fp, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <img src={mediaUrl(fp.image)} alt="" className="h-12 w-[76px] shrink-0 rounded-[4px] border border-[#E4E7EB] bg-[#F8F9FA] object-contain" />
                                            <input type="text" className={inputClass} value={fp.label} placeholder="Label — e.g. Residence A · 2 Bed" onChange={(e) => setForm({ ...form, floor_plans: form.floor_plans.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
                                            <button type="button" onClick={() => setForm({ ...form, floor_plans: form.floor_plans.filter((_, j) => j !== i) })} className="shrink-0 rounded px-2 py-1 text-[12px] text-red-600 hover:bg-red-50">✕</button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => setPickingFloorPlan(true)} className={ghostButtonClass}>Add Floor Plan</button>
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Brochure <span className="text-[#9AA1A9]">(PDF, up to 20 MB)</span></label>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => brochureRef.current?.click()} disabled={uploadingBrochure} className={ghostButtonClass}>
                                        {uploadingBrochure ? 'Uploading…' : form.brochure ? 'Replace Brochure' : 'Upload Brochure'}
                                    </button>
                                    {form.brochure && (
                                        <>
                                            <a href={mediaUrl(form.brochure)} target="_blank" rel="noopener" className="text-[12px] font-medium text-[#1693C9] hover:underline">Preview</a>
                                            <button type="button" onClick={() => setForm({ ...form, brochure: '' })} className="text-[12px] text-red-600 hover:underline">Remove</button>
                                        </>
                                    )}
                                    <input ref={brochureRef} type="file" accept="application/pdf" hidden onChange={onBrochurePick} />
                                </div>
                            </div>
                        </div>

                        {formError && <p className="text-[12px] font-medium text-red-600">{formError}</p>}
                    </div>
                </SlideOverModal>
            )}

            {pickingGallery && (
                <MediaPickerModal websiteId={website.id} onClose={() => setPickingGallery(false)} onSelect={(p) => setForm((f) => ({ ...f, gallery: [...f.gallery, p] }))} />
            )}
            {pickingFloorPlan && (
                <MediaPickerModal websiteId={website.id} onClose={() => setPickingFloorPlan(false)} onSelect={(p) => setForm((f) => ({ ...f, floor_plans: [...f.floor_plans, { label: '', image: p }] }))} />
            )}
        </div>
    );
}
