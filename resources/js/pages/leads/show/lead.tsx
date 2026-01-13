import { useState } from 'react';
import { Building2, PanelRight } from 'lucide-react';
import type { User } from '@/types';
import type { Lead } from '@/types/lead';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { LeadExtended } from './lead-extended';
import { LeadRecords } from './lead-records';

type Props = {
    lead: Lead;
    users?: User[];
};

export function LeadPage({ lead, users = [] }: Props) {
    const isMobile = useIsMobile();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-full overflow-hidden">
            {/* Main content area - full width on mobile, flex-1 on desktop */}
            <div className="flex min-w-0 flex-1 flex-col lg:border-r">
                <LeadRecords lead={lead} users={users} />
            </div>

            {/* Desktop sidebar - hidden on mobile and tablet */}
            <div className="hidden w-[500px] shrink-0 lg:block">
                <LeadExtended lead={lead} />
            </div>

            {/* Mobile/Tablet floating action button to open sidebar */}
            <div className="fixed bottom-6 right-6 z-40 lg:hidden">
                <Button
                    size="lg"
                    className="h-14 w-14 rounded-full shadow-lg"
                    onClick={() => setSidebarOpen(true)}
                >
                    <PanelRight className="h-6 w-6" />
                    <span className="sr-only">View lead details</span>
                </Button>
            </div>

            {/* Mobile/Tablet Sheet for sidebar content */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent
                    side="right"
                    className="w-full p-0 sm:max-w-md md:max-w-lg"
                >
                    <SheetHeader className="border-b px-5 py-4">
                        <SheetTitle className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Lead Details
                        </SheetTitle>
                    </SheetHeader>
                    <div className="h-[calc(100vh-5rem)]">
                        <LeadExtended lead={lead} />
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}