import type { DashboardMeeting } from '@/types';
import DashboardPanel from './DashboardPanel';

const meetingTypeLabels: Record<string, string> = {
    showing: 'Showing', video: 'Video', in_person: 'In Person', phone: 'Phone', open_house: 'Open House',
};

const meetingTypeColors: Record<string, string> = {
    showing: 'bg-teal-50 text-teal-700', video: 'bg-purple-50 text-purple-600', in_person: 'bg-amber-50 text-amber-600',
    phone: 'bg-emerald-50 text-emerald-600', open_house: 'bg-rose-50 text-rose-600',
};

// Upcoming-meetings widget shows near-future times, so this intentionally omits
// the year (unlike the shared formatDateTime in utils/dateFormatters).
function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function MeetingsCard({ meetings, limit }: { meetings: DashboardMeeting[]; limit?: number }) {
    const items = limit ? meetings.slice(0, limit) : meetings;

    return (
        <DashboardPanel title="Upcoming Meetings" action={{ label: 'View all', href: route('crm.calendar.index') }}>
            {items.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-[#8B9096]">No upcoming meetings</p>
            ) : (
                <div>
                    {items.map((meeting) => (
                        <div key={meeting.id} className="flex items-start gap-3 py-2">
                            <div className="shrink-0 mt-0.5 h-8 w-8 flex items-center justify-center rounded-lg bg-[#F3F4F6]">
                                <svg className="h-3.5 w-3.5 text-[#5F656D]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] text-[#111315] truncate">{meeting.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[11px] tabular-nums text-[#8B9096]">{formatDateTime(meeting.starts_at)}</span>
                                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-md ${meetingTypeColors[meeting.meeting_type] || 'bg-[#F3F4F6] text-[#5F656D]'}`}>
                                        {meetingTypeLabels[meeting.meeting_type] || meeting.meeting_type}
                                    </span>
                                </div>
                                {meeting.contact && (
                                    <p className="text-[11px] text-[#8B9096] mt-0.5">{meeting.contact.first_name} {meeting.contact.last_name}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </DashboardPanel>
    );
}
