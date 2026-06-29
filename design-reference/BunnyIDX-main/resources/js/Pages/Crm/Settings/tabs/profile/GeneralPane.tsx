import { router, useForm } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';
import { PageProps } from '@/types';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';
import { US_STATES, CA_PROVINCES, COUNTRIES } from '@/Pages/Crm/Websites/constants';
import {
    SettingsPane,
    SettingsPaneHeader,
    SettingsCard,
    SettingsSavedIndicator,
    SettingsUpdateButton,
} from '@/Components/Crm/SettingsPane';
import RichTextEditor, { FormatButton } from '@/Components/Crm/RichTextEditor';

const DATE_FORMATS = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

const TIME_FORMATS = [
    { value: '12h', label: '12-hour (1:30 PM)' },
    { value: '24h', label: '24-hour (13:30)' },
];

// Curated short list – browser supports many more.
const COMMON_TIMEZONES = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Anchorage', 'Pacific/Honolulu', 'America/Phoenix', 'America/Toronto',
    'America/Mexico_City', 'America/Sao_Paulo', 'Europe/London', 'Europe/Paris',
    'Europe/Berlin', 'Europe/Madrid', 'Europe/Moscow', 'Africa/Cairo', 'Africa/Johannesburg',
    'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Hong_Kong',
    'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland', 'UTC',
];

interface Props {
    user: PageProps['auth']['user'];
    fallbackFirst: string;
    fallbackLast: string;
    mustVerifyEmail: boolean;
    status?: string;
}

export default function GeneralPane({ user, fallbackFirst, fallbackLast, mustVerifyEmail, status }: Props) {
    const settings = user.settings || {};
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);

    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        first_name: fallbackFirst,
        last_name: fallbackLast,
        email: user.email,
        mobile: user.phone || '',
        nickname: settings.nickname || '',
        country: (settings.country as string) || 'US',
        state: (settings.state as string) || '',
        city: (settings.city as string) || '',
        time_format: (settings.time_format as '12h' | '24h') || '12h',
        date_format: (settings.date_format as string) || 'MM/DD/YYYY',
        timezone: settings.timezone || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'),
        email_signature: settings.email_signature || '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('crm.settings.profile'));
    };

    function pickAvatar() {
        fileInputRef.current?.click();
    }

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarError(null);
        setUploading(true);

        const form = new FormData();
        form.append('avatar', file);

        try {
            const res = await fetch(route('crm.settings.avatar.upload'), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: form,
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message || `Upload failed (${res.status})`);
            }
            router.reload({ only: ['auth'] });
        } catch (err: any) {
            setAvatarError(err.message || 'Upload failed.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    async function removeAvatar() {
        if (!user.avatar) return;
        if (!confirm('Remove your profile picture?')) return;
        setAvatarError(null);
        setUploading(true);
        try {
            const res = await fetch(route('crm.settings.avatar.remove'), {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            if (!res.ok) throw new Error(`Remove failed (${res.status})`);
            router.reload({ only: ['auth'] });
        } catch (err: any) {
            setAvatarError(err.message || 'Remove failed.');
        } finally {
            setUploading(false);
        }
    }

    return (
        <form onSubmit={submit}>
            <SettingsPane>
                <SettingsPaneHeader
                    title="General Settings"
                    actions={
                        <>
                            <SettingsSavedIndicator visible={recentlySuccessful || status === 'profile-updated'} />
                            <SettingsUpdateButton processing={processing} />
                        </>
                    }
                />
                <SettingsCard>
                    {mustVerifyEmail && !user.email_verified_at && (
                        <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                            Your email address is unverified. Saving with a different email will re-trigger verification.
                        </div>
                    )}

                    {/* Profile picture */}
                    <div className="flex items-start gap-4 pb-1">
                        {user.avatar ? (
                            <img
                                src={user.avatar}
                                alt={user.name}
                                className="h-16 w-16 rounded-[4px] object-cover border border-[#E4E7EB]"
                            />
                        ) : (
                            <div className="h-16 w-16 rounded-[4px] bg-[#E6F0FF] text-[#1693C9] text-2xl font-semibold flex items-center justify-center border border-[#E4E7EB]">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-medium text-[#111315]">Profile Picture</div>
                            <div className="text-[12px] text-[#5F656D] mt-0.5">JPG, PNG, GIF, or WEBP. Max 4&nbsp;MB.</div>
                            <div className="flex items-center gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={pickAvatar}
                                    disabled={uploading}
                                    className="h-8 px-3 text-[12px] font-medium text-[#1693C9] border border-[#1693C9] rounded hover:bg-[#EBF5FF] disabled:opacity-50 transition-colors"
                                >
                                    {uploading ? 'Uploading…' : user.avatar ? 'Change' : 'Upload'}
                                </button>
                                {user.avatar && !uploading && (
                                    <button
                                        type="button"
                                        onClick={removeAvatar}
                                        className="h-8 px-3 text-[12px] font-medium text-[#DC2626] border border-[#DC2626] rounded hover:bg-[#FEF2F2] transition-colors"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            {avatarError && <p className="mt-1 text-[11px] text-red-500">{avatarError}</p>}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/gif,image/webp"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <FieldLabel htmlFor="first_name">First Name</FieldLabel>
                            <input id="first_name" type="text" value={data.first_name} onChange={(e) => setData('first_name', e.target.value)} className={inputClass} />
                            {errors.first_name && <p className="mt-1 text-[11px] text-red-500">{errors.first_name}</p>}
                        </div>
                        <div>
                            <FieldLabel htmlFor="last_name">Last Name</FieldLabel>
                            <input id="last_name" type="text" value={data.last_name} onChange={(e) => setData('last_name', e.target.value)} className={inputClass} />
                            {errors.last_name && <p className="mt-1 text-[11px] text-red-500">{errors.last_name}</p>}
                        </div>
                        <div>
                            <FieldLabel htmlFor="email">Email</FieldLabel>
                            <input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className={inputClass} />
                            {errors.email && <p className="mt-1 text-[11px] text-red-500">{errors.email}</p>}
                        </div>
                        <div>
                            <FieldLabel htmlFor="mobile">Mobile</FieldLabel>
                            <input id="mobile" type="text" value={data.mobile} onChange={(e) => setData('mobile', e.target.value)} placeholder="(555) 123-4567" className={inputClass} />
                            {errors.mobile && <p className="mt-1 text-[11px] text-red-500">{errors.mobile}</p>}
                        </div>
                        <div>
                            <FieldLabel htmlFor="country" help="Used to prefill your website and listing tools.">Country</FieldLabel>
                            <select id="country" value={data.country} onChange={(e) => { setData('country', e.target.value); setData('state', ''); }} className={inputClass}>
                                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <FieldLabel htmlFor="city">City</FieldLabel>
                            <input id="city" type="text" value={data.city} onChange={(e) => setData('city', e.target.value)} placeholder="Miami" className={inputClass} />
                            {errors.city && <p className="mt-1 text-[11px] text-red-500">{errors.city}</p>}
                        </div>
                        <div>
                            <FieldLabel htmlFor="state">{data.country === 'CA' ? 'Province' : 'State'}</FieldLabel>
                            <select id="state" value={data.state} onChange={(e) => setData('state', e.target.value)} className={inputClass}>
                                <option value="">Select a {data.country === 'CA' ? 'province' : 'state'}</option>
                                {(data.country === 'CA' ? CA_PROVINCES : US_STATES).map((s) => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
                            </select>
                            {errors.state && <p className="mt-1 text-[11px] text-red-500">{errors.state}</p>}
                        </div>
                        <div>
                            <FieldLabel htmlFor="time_format" help="How time is shown across the app.">Time Format</FieldLabel>
                            <select id="time_format" value={data.time_format} onChange={(e) => setData('time_format', e.target.value as '12h' | '24h')} className={inputClass}>
                                {TIME_FORMATS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <FieldLabel htmlFor="date_format" help="How dates are displayed in lists, timelines, and exports.">Date Format</FieldLabel>
                            <select id="date_format" value={data.date_format} onChange={(e) => setData('date_format', e.target.value)} className={inputClass}>
                                {DATE_FORMATS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <FieldLabel htmlFor="timezone" help="All times in the app are converted to this zone.">Time Zone</FieldLabel>
                            <select id="timezone" value={data.timezone} onChange={(e) => setData('timezone', e.target.value)} className={inputClass}>
                                {COMMON_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                            </select>
                        </div>
                        <div>
                            <FieldLabel htmlFor="nickname" help="Optional friendly name used in some places instead of your full name.">Nickname</FieldLabel>
                            <input id="nickname" type="text" value={data.nickname} onChange={(e) => setData('nickname', e.target.value)} className={inputClass} />
                        </div>
                    </div>

                    <div>
                        <FieldLabel htmlFor="email_signature" help="Appended to outgoing emails from the CRM.">Email Signature</FieldLabel>
                        <div className="border border-[#E4E7EB] rounded">
                            <div className="flex items-center gap-1 px-2 py-1 border-b border-[#E4E7EB] bg-[#F9FAFB]">
                                <FormatButton command="bold" icon={<span className="font-bold text-[12px]">B</span>} title="Bold" />
                                <FormatButton command="italic" icon={<span className="italic text-[12px]">I</span>} title="Italic" />
                                <FormatButton command="underline" icon={<span className="underline text-[12px]">U</span>} title="Underline" />
                                <div className="mx-1 h-4 w-px bg-[#E4E7EB]" />
                                <FormatButton command="insertUnorderedList" icon={
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                                } title="Bulleted list" />
                                <FormatButton command="insertOrderedList" icon={
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.242 5.992h12M8.242 12h12m-12 5.992h12M3 6h.01M3 12h.01M3 18h.01" /></svg>
                                } title="Numbered list" />
                                <div className="mx-1 h-4 w-px bg-[#E4E7EB]" />
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        const url = window.prompt('Enter URL') || '';
                                        if (url) document.execCommand('createLink', false, url);
                                    }}
                                    title="Insert link"
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-[#5F656D] hover:text-[#111315] hover:bg-[#F3F4F6] transition-colors"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>
                                </button>
                            </div>
                            <div className="p-3">
                                <RichTextEditor
                                    value={data.email_signature}
                                    onChange={(html) => setData('email_signature', html)}
                                    placeholder="Best regards,&#10;Your name"
                                    minHeight={140}
                                />
                            </div>
                        </div>
                        {errors.email_signature && <p className="mt-1 text-[11px] text-red-500">{errors.email_signature}</p>}
                    </div>
                </SettingsCard>
            </SettingsPane>
        </form>
    );
}
