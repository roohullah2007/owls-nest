import { useEffect, useState } from 'react';
import axios from 'axios';
import { AgentWebsite } from '../../../types';
import { SettingsCard } from '@/Components/Crm/SettingsPane';
import PrimaryButton from '@/Components/Crm/PrimaryButton';

interface Props {
    website: AgentWebsite;
}

interface Language {
    code: string;
    label: string;
    native: string;
    flag: string;
}

/**
 * Website settings → Translations. Adds a language button to the site's top
 * bar that opens a themed "Choose your language" modal; pages are translated
 * in the visitor's browser by Google Translate, limited to the languages
 * picked here. English is always the source language.
 */
export default function TranslationsSection({ website }: Props) {
    const [enabled, setEnabled] = useState(false);
    const [picked, setPicked] = useState<string[]>([]);
    const [catalog, setCatalog] = useState<Language[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        axios.get(`/api/website-editor/${website.id}/translations`)
            .then(({ data }) => {
                setEnabled(!!data.enabled);
                setPicked(data.languages || []);
                setCatalog(data.catalog || []);
            })
            .catch(() => setError('Could not load the translation settings.'))
            .finally(() => setLoading(false));
    }, [website.id]);

    const toggleLanguage = (code: string) => {
        setSaved(false);
        setPicked((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
    };

    const save = async () => {
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            await axios.patch(`/api/website-editor/${website.id}/translations-config`, {
                enabled,
                languages: picked,
            });
            setSaved(true);
        } catch {
            setError('Could not save the settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className="text-[13px] text-[#5F656D]">Loading…</p>;

    return (
        <div className="space-y-4">
            <SettingsCard>
                <h3 className="text-[14px] font-semibold text-[#111315]">Translations</h3>
                <p className="text-[13px] text-[#5F656D]">
                    Let visitors read your website in their own language. A language button appears in
                    your site's top bar and opens a language picker. Pages are translated automatically
                    in the visitor's browser, so everything stays up to date, including listings.
                    Your site content itself stays in English.
                </p>

                <label className="mt-4 flex items-center gap-2 text-[13px] text-[#111315]">
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => { setEnabled(e.target.checked); setSaved(false); }}
                        className="rounded border-[#C8CCD1]"
                    />
                    Offer translations on my website
                </label>

                <div className={`mt-4 ${enabled ? '' : 'pointer-events-none opacity-50'}`}>
                    <p className="text-[13px] font-medium text-[#111315]">Languages to offer</p>
                    <p className="text-[12px] text-[#8B9096]">English is always included as the default.</p>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {catalog.map((lang) => (
                            <label key={lang.code} className="flex cursor-pointer items-center gap-2 rounded border border-[#E4E7EB] bg-white px-2.5 py-2 text-[13px] text-[#111315] hover:bg-[#F7F8F9]">
                                <input
                                    type="checkbox"
                                    checked={picked.includes(lang.code)}
                                    onChange={() => toggleLanguage(lang.code)}
                                    className="rounded border-[#C8CCD1]"
                                />
                                <img src={`https://flagcdn.com/w20/${lang.flag}.png`} alt="" className="h-3.5 w-5 rounded-[2px] object-cover" loading="lazy" />
                                <span className="truncate">{lang.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {enabled && picked.length === 0 && (
                    <p className="mt-2 text-[12px] text-amber-600">Pick at least one language, otherwise the button stays hidden.</p>
                )}
                {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
                {saved && <p className="mt-2 text-[12px] text-emerald-600">Saved.</p>}

                <div className="mt-4">
                    <PrimaryButton type="button" onClick={save} disabled={saving} icon={null} label={saving ? 'Saving…' : 'Save'} />
                </div>
            </SettingsCard>
        </div>
    );
}
