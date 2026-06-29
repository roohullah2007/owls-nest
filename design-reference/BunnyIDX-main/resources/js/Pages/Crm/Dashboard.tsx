import CrmLayout from '@/Layouts/CrmLayout';
import { Head } from '@inertiajs/react';
import type { DashboardMeeting } from '@/types';
import GreetingHeader from './Dashboard/GreetingHeader';
import RecentLeadsCard from './Dashboard/RecentLeadsCard';
import MeetingsCard from './Dashboard/MeetingsCard';
import TasksDueTodayCard from './Dashboard/TasksDueTodayCard';
import ResourcesCard from './Dashboard/ResourcesCard';
import type { RecentLead, Stats, Task } from './Dashboard/types';

interface Props {
    stats: Stats;
    upcomingMeetings: DashboardMeeting[];
    recentLeads: RecentLead[];
    tasksDueToday: Task[];
}

export default function Dashboard({ stats, upcomingMeetings, recentLeads, tasksDueToday }: Props) {
    return (
        <CrmLayout>
            <Head title="Dashboard" />

            <div className="p-6 space-y-5">
                <GreetingHeader stats={stats} />

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                    <div className="lg:col-span-3 space-y-5">
                        <RecentLeadsCard leads={recentLeads} />
                    </div>

                    <div className="space-y-5">
                        <MeetingsCard meetings={upcomingMeetings} limit={3} />
                        <TasksDueTodayCard tasks={tasksDueToday} />
                        <ResourcesCard />
                    </div>
                </div>
            </div>
        </CrmLayout>
    );
}
