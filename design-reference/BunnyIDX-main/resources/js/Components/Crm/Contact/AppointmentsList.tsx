interface Props {
    meetings: any[];
    pastMeetings: any[];
}

const meetingTypeIcons: Record<string, string> = {
    showing: 'M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819',
    in_person: 'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z',
    video: 'm15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z',
    phone: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z',
};
const meetingTypeLabels: Record<string, string> = { showing: 'Showing', in_person: 'In Person', video: 'Video', phone: 'Phone' };

export default function AppointmentsList({ meetings, pastMeetings }: Props) {
    if (meetings.length === 0 && pastMeetings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-6 text-center">
                <svg className="h-8 w-8 text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={0.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                <p className="mt-2 text-xs text-[#8B9096]">No appointments</p>
                <p className="text-[11px] text-[#C4C9D1] mt-0.5">Schedule one with the + button</p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {meetings.map((m: any) => (
                <div key={`m-${m.id}`} className="flex items-start gap-2.5 py-2 group">
                    <span className="shrink-0 h-5 w-5 mt-0.5 flex items-center justify-center rounded-full bg-[#D97706] text-white">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={meetingTypeIcons[m.meeting_type] || meetingTypeIcons.in_person} /></svg>
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#111315] truncate">{m.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[11px] text-[#8B9096]">
                                {new Date(m.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(m.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </p>
                            <span className="text-[10px] font-medium text-[#D97706] bg-[#FEF3C7] rounded-full px-1.5 py-0.5">{meetingTypeLabels[m.meeting_type] || 'Meeting'}</span>
                        </div>
                        {m.location && <p className="text-[11px] text-[#8B9096] truncate mt-0.5">{m.location}</p>}
                    </div>
                </div>
            ))}
            {pastMeetings.length > 0 && (
                <>
                    <div className="pt-2 mt-1 border-t border-[#F3F4F6]"><p className="text-[11px] text-[#8B9096] mb-1">Past</p></div>
                    {pastMeetings.slice(0, 3).map((m: any) => (
                        <div key={`pm-${m.id}`} className="flex items-start gap-2.5 py-1.5 opacity-50">
                            <span className="shrink-0 h-5 w-5 mt-0.5 flex items-center justify-center rounded-full bg-[#8B9096] text-white">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={meetingTypeIcons[m.meeting_type] || meetingTypeIcons.in_person} /></svg>
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-[#8B9096] truncate">{m.title}</p>
                                <p className="text-[11px] text-[#C4C9D1]">{new Date(m.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                            </div>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}
