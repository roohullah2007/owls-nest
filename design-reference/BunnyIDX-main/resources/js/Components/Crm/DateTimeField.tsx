import { useMemo } from 'react';
import { formInputClass } from '@/Components/Crm/FormField';

/**
 * Date + time field that replaces the finicky native `<input type="datetime-local">`.
 *
 * It splits into a reliable native date calendar and a clean time dropdown (15-minute
 * increments) so users never have to type into the overflow-prone datetime field.
 * It reads and emits the SAME `YYYY-MM-DDTHH:mm` local-wall-clock string the native
 * input produced, so existing `localDateTimeToIso()` storage conversion is unchanged.
 */
interface Props {
    /** "YYYY-MM-DDTHH:mm" or "" */
    value: string;
    onChange: (value: string) => void;
    id?: string;
    required?: boolean;
    /** Default time (HH:mm) applied when a date is picked but no time is set yet. */
    defaultTime?: string;
}

function splitValue(value: string): { date: string; time: string } {
    if (!value) return { date: '', time: '' };
    const [date, time = ''] = value.split('T');
    return { date, time: time.slice(0, 5) };
}

function buildTimeOptions(current: string): { value: string; label: string }[] {
    const opts: { value: string; label: string }[] = [];
    for (let mins = 0; mins < 24 * 60; mins += 15) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        opts.push({ value, label: formatTimeLabel(h, m) });
    }
    // Preserve an off-grid existing time (e.g. an appointment saved at 10:07).
    if (current && !opts.some((o) => o.value === current)) {
        const [h, m] = current.split(':').map(Number);
        opts.push({ value: current, label: formatTimeLabel(h, m) });
        opts.sort((a, b) => a.value.localeCompare(b.value));
    }
    return opts;
}

function formatTimeLabel(h: number, m: number): string {
    const period = h < 12 ? 'AM' : 'PM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function DateTimeField({ value, onChange, id, required, defaultTime = '09:00' }: Props) {
    const { date, time } = splitValue(value);
    const timeOptions = useMemo(() => buildTimeOptions(time), [time]);

    function handleDate(nextDate: string) {
        if (!nextDate) {
            onChange('');
            return;
        }
        onChange(`${nextDate}T${time || defaultTime}`);
    }

    function handleTime(nextTime: string) {
        // Picking a time before a date defaults the date to today so the value is valid.
        const baseDate = date || new Date().toISOString().slice(0, 10);
        onChange(`${baseDate}T${nextTime}`);
    }

    return (
        <div className="flex gap-2">
            <input
                id={id}
                type="date"
                value={date}
                onChange={(e) => handleDate(e.target.value)}
                required={required}
                className={formInputClass + ' flex-1 min-w-0'}
            />
            <select
                aria-label="Time"
                value={time}
                onChange={(e) => handleTime(e.target.value)}
                disabled={!date}
                className={formInputClass + ' w-[110px] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed'}
            >
                <option value="" disabled>Time</option>
                {timeOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </div>
    );
}
