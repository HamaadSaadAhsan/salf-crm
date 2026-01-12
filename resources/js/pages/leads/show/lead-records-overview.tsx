import type { Lead } from '@/types/lead';
import { LeadRecordsOverviewActivity } from './lead-records-overview-activity';
import { LeadRecordsOverviewHighlights } from './lead-records-overview-highlights';
import { LeadRecordsOverviewNotes } from './lead-records-overview-notes';
import { LeadRecordsOverviewTasks } from './lead-records-overview-tasks';
import { usePage } from '@inertiajs/react';
import { SharedData, User } from '@/types';

type UserRole = 'support-agent' | 'senior-support-agent' | 'super-admin';

type Props = {
    lead: Lead;
    users?: User[];
};

export function LeadRecordsOverview({ lead, users = [] }: Props) {
    const allActivities = lead.activities?.data || [];
    const tasks = lead.tasks?.data || [];
    const {props: {auth:{user}}} = usePage<SharedData>();

    // CROs (support-agent) should not see advisor-related activities
    const isCRO = user?.roles?.some(role => role.name === 'support-agent' || role.name === 'senior-support-agent');
    const activities = isCRO
        ? allActivities.filter(activity => activity.type !== 'assignment_change')
        : allActivities;

    const userRole = user?.roles?.[0]?.name as UserRole | undefined;

    return (
        <div className="space-y-6">
            <LeadRecordsOverviewHighlights lead={lead} />
            <LeadRecordsOverviewActivity activities={activities} />
            <LeadRecordsOverviewNotes />
            <LeadRecordsOverviewTasks tasks={tasks} leadId={lead.id} users={users} currentUserId={user.id} userRole={userRole}/>
        </div>
    );
}
