import type { Lead } from '@/types/lead';
import { LeadRecordsOverviewActivity } from './lead-records-overview-activity';
import { LeadRecordsOverviewHighlights } from './lead-records-overview-highlights';
import { LeadRecordsOverviewNotes } from './lead-records-overview-notes';
import { LeadRecordsOverviewTasks } from './lead-records-overview-tasks';
import { usePage } from '@inertiajs/react';
import { SharedData } from '@/types';

export function LeadRecordsOverview({ lead }: { lead: Lead }) {
    const activities = lead.activities?.data || [];
    const tasks = lead.tasks?.data || [];
    const {props: {auth:{user}}} = usePage<SharedData>();
    return (
        <div className="space-y-6">
            <LeadRecordsOverviewHighlights lead={lead} />
            <LeadRecordsOverviewActivity activities={activities} />
            <LeadRecordsOverviewNotes />
            <LeadRecordsOverviewTasks tasks={tasks} leadId={lead.id} currentUserId={user.id} userRole={user?.roles[0]?.name}/>
        </div>
    );
}
