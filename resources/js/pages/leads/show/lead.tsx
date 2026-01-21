import { useState } from 'react';
import { Building2, PanelRight } from 'lucide-react';
import type { User } from '@/types';
import type { Lead } from '@/types/lead';
import { useMediaQuery } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { LeadExtended } from './lead-extended';
import { LeadRecords } from './lead-records';

const LEAD_DETAILS_BREAKPOINT = 1490;

type Props = {
    lead: Lead;
    users?: User[];
};

export function LeadPage({ lead, users = [] }: Props) {
    const hideLeadDetails = useMediaQuery(LEAD_DETAILS_BREAKPOINT);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-full overflow-hidden">
            {/* Main content area - full width when sidebar hidden */}
            <div className={`flex min-w-0 flex-1 flex-col ${!hideLeadDetails ? 'border-r' : ''}`}>
                <LeadRecords lead={lead} users={users} />
            </div>

            {/* Desktop sidebar - hidden below 1490px */}
            {!hideLeadDetails && (
                <div className="flex h-full w-[500px] shrink-0 flex-col">
                    <LeadExtended lead={lead} />
                </div>
            )}

            {/* Floating action button to open sidebar when hidden */}
            {hideLeadDetails && (
                <div className="fixed bottom-6 right-6 z-40 pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]">
                    <Button
                        size="lg"
                        className="h-14 w-14 rounded-full shadow-lg active:scale-95 transition-transform"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <PanelRight className="h-6 w-6" />
                        <span className="sr-only">View lead details</span>
                    </Button>
                </div>
            )}

            {/* Sheet for sidebar content when hidden */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent
                    side="right"
                    className="w-full p-0 sm:max-w-md md:max-w-lg"
                >
                    <SheetHeader className="shrink-0 border-b px-5 py-4">
                        <SheetTitle className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Lead Details
                        </SheetTitle>
                    </SheetHeader>
                    <div className="flex min-h-0 flex-1 flex-col">
                        <LeadExtended lead={lead} />
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}