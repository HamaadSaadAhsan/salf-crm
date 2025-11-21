import type { ActivityItem } from '@/components/activity-list';
import { LeadExtended } from './lead-extended';
import { LeadRecords } from './lead-records';

type TagValue = string | { label: string; value: string; color?: string };

type Lead = {
    id: number | string;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    inquiry_status: string;
    source?: {
        data: {
            id: number;
            name: string;
            slug: string;
        };
    } | null;
    service?: {
        data: {
            id: number;
            name: string;
        };
    } | null;
    tags?: TagValue[];
    owner: {
        id: number;
        name: string;
        email: string;
    } | null;
    created_at: string;
    activities?: { data: ActivityItem[] };
};

export function Lead({ lead }: { lead: Lead }) {
    return (
        <div className="flex h-full overflow-hidden">
            <div className="flex flex-1 border-r">
                <LeadRecords lead={lead} />
            </div>
            <div className="w-[500px]">
                <LeadExtended lead={lead} />
            </div>
        </div>
    );
}
