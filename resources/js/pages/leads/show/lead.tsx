import type { User } from '@/types';
import type { Lead } from '@/types/lead';
import { LeadExtended } from './lead-extended';
import { LeadRecords } from './lead-records';

type Props = {
    lead: Lead;
    users?: User[];
};

export function LeadPage({ lead, users = [] }: Props) {
    return (
        <div className="flex h-full overflow-hidden">
            <div className="flex flex-1 border-r">
                <LeadRecords lead={lead} users={users} />
            </div>
            <div className="w-[500px]">
                <LeadExtended lead={lead} />
            </div>
        </div>
    );
}
