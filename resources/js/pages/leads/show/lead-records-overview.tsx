import type { Lead, LeadActivity } from '@/types/lead';
import { LeadRecordsOverviewActivity } from './lead-records-overview-activity';
import { LeadRecordsOverviewHighlights } from './lead-records-overview-highlights';
import { LeadRecordsOverviewNotes } from './lead-records-overview-notes';
import { LeadRecordsOverviewTasks } from './lead-records-overview-tasks';
import { usePage } from '@inertiajs/react';
import { SharedData, User } from '@/types';
import { useLeadActivitiesLatest } from '@/hooks/useLead';

type UserRole = 'support-agent' | 'senior-support-agent' | 'super-admin';

type Props = {
    lead: Lead;
    users?: User[];
    onViewAllActivity?: () => void;
    onViewAllNotes?: () => void;
};

export function LeadRecordsOverview({ lead, users = [], onViewAllActivity, onViewAllNotes }: Props) {
    const tasks = lead.tasks?.data || [];
    const {props: {auth:{user}}} = usePage<SharedData>();

    // Fetch activities via API (server-side pagination)
    const { data: allActivities = [], isLoading: activitiesLoading } = useLeadActivitiesLatest(lead.id, 10);

    // CROs (support-agent) should not see advisor-related activities
    const isCRO = user?.roles?.some(role => role.name === 'support-agent' || role.name === 'senior-support-agent');
    const activities = isCRO
        ? allActivities.filter((activity: LeadActivity) => activity.type !== 'assignment_change')
        : allActivities;

    const userRole = user?.roles?.[0]?.name as UserRole | undefined;

    return (
        <div className="space-y-6">
            <LeadRecordsOverviewHighlights lead={lead} />
            <LeadRecordsOverviewActivity activities={activities} isLoading={activitiesLoading} onViewAll={onViewAllActivity} />
            <LeadRecordsOverviewNotes activities={allActivities} leadId={lead.id} onViewAll={onViewAllNotes} />
            <LeadRecordsOverviewTasks tasks={tasks} leadId={lead.id} users={users} currentUserId={user.id} userRole={userRole}/>
        </div>
    );
}
