import CrmLayout from '@/Layouts/CrmLayout';
import MeetingForm, { EditableMeeting } from '@/Components/Crm/MeetingForm';
import PillTabs from '@/Components/Crm/PillTabs';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

interface Meeting {
    id: number;
    title: string;
    description: string | null;
    location: string | null;
    meeting_type: string;
    starts_at: string;
    ends_at: string | null;
    is_completed: boolean;
    outcome: string | null;
    contact?: { id: number; uuid: string; first_name: string; last_name: string } | null;
    deal?: { id: number; title: string } | null;
}

interface CalendarTask {
    id: number;
    title: string;
    priority: string;
    due_at: string | null;
    due_date: string | null;
    is_completed: boolean;
    taskable_type: string | null;
    taskable_label: string | null;
}

interface FeedEvent {
    title: string;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    description: string | null;
}

interface CalendarFeed {
    id: number;
    name: string;
    url: string;
    color: string;
    cached_events: FeedEvent[] | null;
    last_synced_at: string | null;
    is_active: boolean;
}

interface Props {
    meetings: Meeting[];
    tasks: CalendarTask[];
    upcomingMeetings: Meeting[];
    contacts: { id: number; uuid: string; first_name: string; last_name: string }[];
    deals: { id: number; title: string }[];
    calendarFeeds: CalendarFeed[];
    month: string; // YYYY-MM
    scope?: string;
    canSeeAllCalendar?: boolean;
}

const typeLabels: Record<string, string> = {
    in_person: 'In Person', phone: 'Phone', video: 'Video', showing: 'Showing', open_house: 'Open House',
};

const typeColors: Record<string, { bg: string; text: string; dot: string }> = {
    in_person: { bg: '#DBEAFE', text: '#1E40AF', dot: '#1693C9' },
    phone: { bg: '#DCFCE7', text: '#166534', dot: '#22C55E' },
    video: { bg: '#F3E8FF', text: '#6B21A8', dot: '#A855F7' },
    showing: { bg: '#FFF7ED', text: '#9A3412', dot: '#F97316' },
    open_house: { bg: '#FEF9C3', text: '#854D0E', dot: '#EAB308' },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
}

function formatMonthYear(monthStr: string): string {
    const [y, m] = monthStr.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function dateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

export default function CalendarIndex({ meetings, tasks, upcomingMeetings, contacts, deals, calendarFeeds, month, scope = 'all', canSeeAllCalendar = false }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState<EditableMeeting | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const today = dateKey(new Date());
    const [year, mon] = month.split('-').map(Number);

    // Build calendar grid
    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, mon - 1, 1);
        const lastDay = new Date(year, mon, 0);
        const startOffset = firstDay.getDay(); // 0=Sun

        const days: { date: Date; key: string; inMonth: boolean }[] = [];

        for (let i = startOffset - 1; i >= 0; i--) {
            const d = new Date(year, mon - 1, -i);
            days.push({ date: d, key: dateKey(d), inMonth: false });
        }

        for (let i = 1; i <= lastDay.getDate(); i++) {
            const d = new Date(year, mon - 1, i);
            days.push({ date: d, key: dateKey(d), inMonth: true });
        }

        while (days.length < 42) {
            const d = new Date(year, mon, days.length - startOffset - lastDay.getDate() + 1);
            days.push({ date: d, key: dateKey(d), inMonth: false });
        }

        return days;
    }, [year, mon]);

    // Group meetings by date
    const meetingsByDate = useMemo(() => {
        const map: Record<string, Meeting[]> = {};
        meetings.forEach((m) => {
            const key = dateKey(new Date(m.starts_at));
            (map[key] ??= []).push(m);
        });
        return map;
    }, [meetings]);

    // Group tasks by date
    const tasksByDate = useMemo(() => {
        const map: Record<string, CalendarTask[]> = {};
        tasks.forEach((t) => {
            const dStr = t.due_at || t.due_date;
            if (!dStr) return;
            const key = dateKey(new Date(dStr));
            (map[key] ??= []).push(t);
        });
        return map;
    }, [tasks]);

    // Group feed events by date
    const feedEventsByDate = useMemo(() => {
        const map: Record<string, { event: FeedEvent; feed: CalendarFeed }[]> = {};
        calendarFeeds.forEach((feed) => {
            (feed.cached_events || []).forEach((evt) => {
                if (!evt.starts_at) return;
                const key = dateKey(new Date(evt.starts_at));
                (map[key] ??= []).push({ event: evt, feed });
            });
        });
        return map;
    }, [calendarFeeds]);

    function navigateMonth(delta: number) {
        const d = new Date(year, mon - 1 + delta, 1);
        const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        router.get(route('crm.calendar.index'), { month: newMonth }, { preserveState: true });
    }

    function goToday() {
        const now = new Date();
        const newMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        router.get(route('crm.calendar.index'), { month: newMonth }, { preserveState: true });
        setSelectedDate(dateKey(now));
    }

    const selectedMeetings = selectedDate ? (meetingsByDate[selectedDate] || []) : [];
    const selectedTasks = selectedDate ? (tasksByDate[selectedDate] || []) : [];
    const selectedFeedEvents = selectedDate ? (feedEventsByDate[selectedDate] || []) : [];

    return (
        <CrmLayout>
            <Head title="Calendar" />

            {/* Main content */}
            <div className="flex-1 overflow-auto p-4 sm:p-5 md:p-6">
            <div className="space-y-4">

                {/* Page header */}
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-lg font-normal text-[#111315]">Calendar</h1>

                    {/* Month navigation */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => navigateMonth(-1)}
                            className="h-8 w-8 flex items-center justify-center text-[#5F656D] hover:text-[#111315] hover:bg-[#F3F4F6] rounded-[4px] transition-colors"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                        </button>
                        <span className="text-xs font-medium text-[#111315] w-28 sm:w-36 text-center">{formatMonthYear(month)}</span>
                        <button
                            onClick={() => navigateMonth(1)}
                            className="h-8 w-8 flex items-center justify-center text-[#5F656D] hover:text-[#111315] hover:bg-[#F3F4F6] rounded-[4px] transition-colors"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>
                        </button>
                    </div>

                    <button
                        onClick={goToday}
                        className="hidden sm:flex items-center h-9 px-3 text-xs font-medium text-[#5F656D] hover:text-[#111315] bg-white border border-[#C8CCD1] rounded-[4px] hover:bg-[#F9FAFB] transition-colors"
                    >
                        Today
                    </button>

                    {/* Scope toggle */}
                    {canSeeAllCalendar && (
                        <PillTabs
                            className="hidden sm:inline-flex"
                            active={scope as 'own' | 'all'}
                            onChange={(key) => router.get(route('crm.calendar.index'), { month, scope: key }, { preserveState: true })}
                            tabs={[
                                { key: 'own', label: 'My Calendar' },
                                { key: 'all', label: 'Team Calendar' },
                            ]}
                        />
                    )}

                    <div className="flex-1" />


                    {/* Calendar Sync — settings link */}
                    <Link
                        href={route('crm.settings.tab', 'profile')}
                        className="hidden md:flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#5F656D] hover:text-[#111315] bg-white border border-[#C8CCD1] rounded-[4px] hover:bg-[#F9FAFB] transition-colors"
                        title="Calendar Sync settings"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                        Calendar Sync
                        {calendarFeeds.length > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-[#F3F4F6] text-[#5F656D]">{calendarFeeds.length}</span>
                        )}
                    </Link>

                    {/* Sync button — mobile */}
                    <Link
                        href={route('crm.settings.tab', 'profile')}
                        className="flex md:hidden items-center h-9 w-9 justify-center text-[#5F656D] hover:text-[#111315] bg-white border border-[#C8CCD1] rounded-[4px] hover:bg-[#F9FAFB] transition-colors"
                        title="Calendar Sync settings"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                    </Link>

                    <PrimaryButton onClick={() => setShowForm(true)} label="Schedule" />
                </div>

                <div className="flex flex-col lg:grid lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-4 lg:gap-6">
                {/* Calendar grid */}
                <div className="min-w-0 flex flex-col">
                    <div className="bg-white border border-[#E4E7EB] rounded-[4px] flex-1 flex flex-col">
                        {/* Day headers */}
                        <div className="grid grid-cols-7 border-b border-[#E4E7EB]">
                            {DAY_NAMES.map((d) => (
                                <div key={d} className="py-2 text-center text-[11px] font-medium text-[#5F656D] tracking-wide">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Calendar grid */}
                        <div className="grid grid-cols-7 flex-1">
                            {calendarDays.map((day, i) => {
                                const dayMeetings = meetingsByDate[day.key] || [];
                                const dayTasks = tasksByDate[day.key] || [];
                                const dayFeedEvents = feedEventsByDate[day.key] || [];
                                const isToday = day.key === today;
                                const isSelected = day.key === selectedDate;
                                const hasItems = dayMeetings.length > 0 || dayTasks.length > 0 || dayFeedEvents.length > 0;
                                const row = Math.floor(i / 7);

                                // Combine all items for display count
                                const allItems = [
                                    ...dayMeetings.map((m) => ({ type: 'meeting' as const, item: m })),
                                    ...dayFeedEvents.map((fe) => ({ type: 'feed' as const, item: fe })),
                                    ...dayTasks.map((t) => ({ type: 'task' as const, item: t })),
                                ];

                                return (
                                    <button
                                        key={day.key}
                                        onClick={() => setSelectedDate(day.key === selectedDate ? null : day.key)}
                                        className={`relative flex flex-col min-h-[60px] sm:min-h-[80px] md:min-h-[100px] p-1 sm:p-1.5 text-left transition-colors border-[#E4E7EB] ${row < 5 ? 'border-b' : ''} ${i % 7 !== 6 ? 'border-r' : ''} ${
                                            isSelected ? 'bg-[#E6F0FF] ring-1 ring-inset ring-[#1693C9]' :
                                            isToday ? 'bg-[#FFFBEB]' :
                                            day.inMonth ? 'hover:bg-[#F9FAFB]' : 'bg-[#FAFAFA] hover:bg-[#F3F4F6]'
                                        }`}
                                    >
                                        <span className={`text-[11px] sm:text-xs font-medium tabular-nums ${
                                            isToday ? 'inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-[#111315] text-white' :
                                            day.inMonth ? 'text-[#111315]' : 'text-[#D1D5DB]'
                                        }`}>
                                            {day.date.getDate()}
                                        </span>

                                        {/* Event indicators */}
                                        <div className="mt-0.5 space-y-0.5 overflow-hidden flex-1">
                                            {/* Desktop: show event labels */}
                                            {dayMeetings.slice(0, 2).map((m) => {
                                                const tc = typeColors[m.meeting_type] || typeColors.in_person;
                                                return (
                                                    <div key={`m-${m.id}`} className="hidden sm:flex items-center gap-1 px-1 py-0.5 rounded text-[9px] font-medium truncate" style={{ backgroundColor: tc.bg, color: tc.text }}>
                                                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: tc.dot }} />
                                                        <span className="truncate">{m.title}</span>
                                                    </div>
                                                );
                                            })}
                                            {dayFeedEvents.slice(0, Math.max(0, 2 - dayMeetings.length)).map((fe, idx) => (
                                                <div key={`fe-${idx}`} className="hidden sm:flex items-center gap-1 px-1 py-0.5 rounded text-[9px] font-medium truncate" style={{ backgroundColor: hexToRgba(fe.feed.color, 0.15), color: fe.feed.color }}>
                                                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: fe.feed.color }} />
                                                    <span className="truncate">{fe.event.title}</span>
                                                </div>
                                            ))}
                                            {dayTasks.slice(0, Math.max(0, 2 - dayMeetings.length - dayFeedEvents.length)).map((t) => (
                                                <div key={`t-${t.id}`} className={`hidden sm:flex items-center gap-1 px-1 py-0.5 rounded text-[9px] font-medium truncate ${t.is_completed ? 'bg-[#F3F4F6] text-[#8B9096] line-through' : 'bg-[#FEF3C7] text-[#92400E]'}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${t.is_completed ? 'bg-[#D1D5DB]' : 'bg-[#F59E0B]'}`} />
                                                    <span className="truncate">{t.title}</span>
                                                </div>
                                            ))}
                                            {allItems.length > 2 && (
                                                <span className="hidden sm:block text-[9px] text-[#8B9096] pl-1">+{allItems.length - 2} more</span>
                                            )}

                                            {/* Mobile: just dots */}
                                            {hasItems && (
                                                <div className="flex sm:hidden gap-0.5 mt-0.5 flex-wrap">
                                                    {dayMeetings.slice(0, 3).map((m) => {
                                                        const tc = typeColors[m.meeting_type] || typeColors.in_person;
                                                        return <span key={`md-${m.id}`} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tc.dot }} />;
                                                    })}
                                                    {dayFeedEvents.slice(0, 2).map((fe, idx) => (
                                                        <span key={`fd-${idx}`} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: fe.feed.color }} />
                                                    ))}
                                                    {dayTasks.slice(0, 2).map((t) => (
                                                        <span key={`td-${t.id}`} className={`h-1.5 w-1.5 rounded-full ${t.is_completed ? 'bg-[#D1D5DB]' : 'bg-[#F59E0B]'}`} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right sidebar — day detail or upcoming */}
                <div className={`${selectedDate ? 'block' : 'hidden lg:block'} min-w-0 bg-white border border-[#E4E7EB] overflow-y-auto rounded-[4px]`}>
                    {selectedDate ? (
                        <div>
                            {/* Selected date header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E7EB]">
                                <div>
                                    <p className="text-xs font-semibold text-[#111315]">
                                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </p>
                                    <p className="text-[10px] text-[#8B9096]">
                                        {selectedMeetings.length + selectedFeedEvents.length} event{selectedMeetings.length + selectedFeedEvents.length !== 1 ? 's' : ''}, {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedDate(null)}
                                    className="h-6 w-6 flex items-center justify-center text-[#8B9096] hover:text-[#111315] transition-colors lg:hidden"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Meetings for selected date */}
                            {selectedMeetings.length > 0 && (
                                <div className="border-b border-[#E4E7EB]">
                                    <div className="px-4 pt-3 pb-1">
                                        <p className="text-[11px] font-medium text-[#5F656D] tracking-wide">Meetings</p>
                                    </div>
                                    {selectedMeetings.map((m, i) => {
                                        const tc = typeColors[m.meeting_type] || typeColors.in_person;
                                        return (
                                            <div
                                                key={m.id}
                                                onClick={() => setEditingMeeting(m)}
                                                className={`px-4 py-3 cursor-pointer ${i > 0 ? 'border-t border-[#E4E7EB]' : ''} hover:bg-[#F9FAFB] transition-colors`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tc.dot }} />
                                                    <span className={`text-[13px] font-medium truncate ${m.is_completed ? 'line-through text-[#8B9096]' : 'text-[#111315]'}`}>{m.title}</span>
                                                </div>
                                                <p className="text-[11px] text-[#5F656D] mt-0.5 ml-4">
                                                    {formatTime(m.starts_at)}{m.ends_at ? ` - ${formatTime(m.ends_at)}` : ''}
                                                    {m.location ? ` · ${m.location}` : ''}
                                                </p>
                                                {m.contact && (
                                                    <Link
                                                        href={route('crm.contacts.show', m.contact.uuid)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-[11px] text-[#1693C9] hover:underline mt-0.5 ml-4 block"
                                                    >
                                                        {m.contact.first_name} {m.contact.last_name}
                                                    </Link>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Feed events for selected date */}
                            {selectedFeedEvents.length > 0 && (
                                <div className="border-b border-[#E4E7EB]">
                                    <div className="px-4 pt-3 pb-1">
                                        <p className="text-[11px] font-medium text-[#5F656D] tracking-wide">Imported</p>
                                    </div>
                                    {selectedFeedEvents.map((fe, idx) => (
                                        <div key={idx} className={`px-4 py-3 ${idx > 0 ? 'border-t border-[#E4E7EB]' : ''} hover:bg-[#F9FAFB] transition-colors`}>
                                            <div className="flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: fe.feed.color }} />
                                                <span className="text-[13px] font-medium text-[#111315] truncate">{fe.event.title}</span>
                                            </div>
                                            <p className="text-[11px] text-[#5F656D] mt-0.5 ml-4">
                                                {formatTime(fe.event.starts_at)}
                                                {fe.event.ends_at ? ` - ${formatTime(fe.event.ends_at)}` : ''}
                                                {fe.event.location ? ` · ${fe.event.location}` : ''}
                                            </p>
                                            <p className="text-[11px] text-[#8B9096] mt-0.5 ml-4">{fe.feed.name}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Tasks for selected date */}
                            {selectedTasks.length > 0 && (
                                <div className="border-b border-[#E4E7EB]">
                                    <div className="px-4 pt-3 pb-1">
                                        <p className="text-[11px] font-medium text-[#5F656D] tracking-wide">Tasks</p>
                                    </div>
                                    {selectedTasks.map((t, i) => (
                                        <div key={t.id} className={`px-4 py-3 ${i > 0 ? 'border-t border-[#E4E7EB]' : ''} hover:bg-[#F9FAFB] transition-colors`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`h-2 w-2 rounded-full shrink-0 ${t.is_completed ? 'bg-[#D1D5DB]' : 'bg-[#F59E0B]'}`} />
                                                <span className={`text-[13px] font-medium truncate ${t.is_completed ? 'line-through text-[#8B9096]' : 'text-[#111315]'}`}>
                                                    {t.title}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[#5F656D] mt-0.5 ml-4">
                                                {t.due_at ? formatTime(t.due_at) : 'All day'}
                                            </p>
                                            {t.taskable_label && (
                                                <p className="text-[11px] text-[#8B9096] mt-0.5 ml-4">{t.taskable_label}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedMeetings.length === 0 && selectedTasks.length === 0 && selectedFeedEvents.length === 0 && (
                                <div className="px-4 py-8 text-center">
                                    <p className="text-xs text-[#8B9096]">Nothing scheduled</p>
                                    <button
                                        onClick={() => setShowForm(true)}
                                        className="mt-2 text-xs font-medium text-[#111315] underline"
                                    >
                                        Schedule a meeting
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            {/* Upcoming meetings */}
                            <div className="px-4 py-3 border-b border-[#E4E7EB]">
                                <p className="text-[11px] font-medium text-[#5F656D] tracking-wide">Upcoming</p>
                            </div>
                            {upcomingMeetings.length === 0 ? (
                                <div className="px-4 py-8 text-center">
                                    <p className="text-xs text-[#8B9096]">No upcoming meetings</p>
                                    <button
                                        onClick={() => setShowForm(true)}
                                        className="mt-2 text-xs font-medium text-[#111315] underline"
                                    >
                                        Schedule one
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    {upcomingMeetings.map((m, i) => {
                                        const tc = typeColors[m.meeting_type] || typeColors.in_person;
                                        return (
                                            <div
                                                key={m.id}
                                                onClick={() => setEditingMeeting(m)}
                                                className={`px-4 py-3 cursor-pointer ${i > 0 ? 'border-t border-[#E4E7EB]' : ''} hover:bg-[#F9FAFB] transition-colors`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tc.dot }} />
                                                    <span className="text-[13px] font-medium text-[#111315] truncate">{m.title}</span>
                                                </div>
                                                <p className="text-[11px] text-[#5F656D] mt-0.5 ml-4">{formatDateTime(m.starts_at)}</p>
                                                {m.contact && (
                                                    <Link
                                                        href={route('crm.contacts.show', m.contact.uuid)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-[11px] text-[#1693C9] hover:underline mt-0.5 ml-4 block"
                                                    >
                                                        {m.contact.first_name} {m.contact.last_name}
                                                    </Link>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                        </div>
                    )}
                </div>
                </div>
            </div>
            </div>

            {/* Meeting form modal — create */}
            {showForm && (
                <MeetingForm
                    contacts={contacts}
                    deals={deals}
                    onClose={() => setShowForm(false)}
                />
            )}

            {/* Meeting form modal — edit */}
            {editingMeeting && (
                <MeetingForm
                    contacts={contacts}
                    deals={deals}
                    meeting={editingMeeting}
                    onClose={() => setEditingMeeting(null)}
                />
            )}
        </CrmLayout>
    );
}
