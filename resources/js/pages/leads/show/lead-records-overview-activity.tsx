import { ActivityList, type ActivityItem } from '@/components/activity-list';

type LeadRecordsOverviewActivityProps = {
    activities?: ActivityItem[];
};

export function LeadRecordsOverviewActivity({ activities = [] }: LeadRecordsOverviewActivityProps) {
    return (
        <ActivityList
            activities={activities}
            className="space-y-3.5"
        />
    );
}
