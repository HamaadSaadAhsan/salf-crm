import { ActivityList, type ActivityItem } from '@/components/activity-list';
import type { LeadActivity } from '@/types/lead';

type LeadRecordsOverviewActivityProps = {
    activities?: LeadActivity[];
};

export function LeadRecordsOverviewActivity({ activities = [] }: LeadRecordsOverviewActivityProps) {
    // Transform LeadActivity to ActivityItem format expected by ActivityList
    const activityItems: ActivityItem[] = activities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        status: activity.status,
        subject: activity.subject,
        description: activity.description,
        user: activity.user ? ('data' in activity.user ? activity.user : { data: activity.user }) : null,
        attachments: activity.attachments?.map((att) => ({
            filepath: att.file_path,
            filename: att.file_name,
            uploaded_at: att.uploaded_at,
            mime_type: att.mime_type,
            size: att.file_size,
        })),
        created_at: activity.created_at,
    }));

    return (
        <ActivityList
            activities={activityItems}
            className="space-y-3.5"
        />
    );
}
