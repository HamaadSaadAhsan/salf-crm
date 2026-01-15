import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { User } from '@/types';
import {
    Activity,
    Bell,
    GalleryVerticalEnd,
    Grid2x2Check,
    ListTodo,
    Phone,
} from 'lucide-react';
import { LeadRecordsActivity } from './lead-records-activity';
import { LeadRecordsCalls } from './lead-records-calls';
import { LeadRecordsNotes } from './lead-records-notes';
import { LeadRecordsOverview } from './lead-records-overview';
import { LeadRecordsTasks } from './lead-records-tasks';
import { Lead } from '@/types/lead';


type Props = {
    lead: Lead;
    users?: User[];
};

export function LeadRecords({ lead, users = [] }: Props) {
    const [activeTab, setActiveTab] = React.useState('overview');

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex grow flex-col text-sm">
            {/* Scrollable tabs container for mobile */}
            <div className="border-b border-border">
                <ScrollArea className="w-full">
                    <TabsList
                        variant="line"
                        className="inline-flex w-max min-w-full gap-0.5 bg-transparent px-2 sm:gap-1 sm:px-5 [&_button]:border-b [&_button]:text-secondary-foreground [&_button_svg]:size-4"
                    >
                        <TabsTrigger value="overview" className="min-h-[44px] gap-1.5 px-3 sm:gap-1.5 sm:px-3">
                            <Grid2x2Check className="h-4 w-4" />
                            <span className="hidden xs:inline sm:inline">Overview</span>
                        </TabsTrigger>
                        <TabsTrigger value="activity" className="min-h-[44px] gap-1.5 px-3 sm:gap-1.5 sm:px-3">
                            <Activity className="h-4 w-4" />
                            <span className="hidden xs:inline sm:inline">Activity</span>
                        </TabsTrigger>
                        <TabsTrigger value="notes" className="min-h-[44px] gap-1.5 px-3 sm:gap-1.5 sm:px-3">
                            <GalleryVerticalEnd className="h-4 w-4" />
                            <span className="hidden xs:inline sm:inline">Notes</span>
                        </TabsTrigger>
                        <TabsTrigger value="tasks" className="min-h-[44px] gap-1.5 px-3 sm:gap-1.5 sm:px-3">
                            <ListTodo className="h-4 w-4" />
                            <span className="hidden xs:inline sm:inline">Tasks</span>
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                3
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="calls" className="min-h-[44px] gap-1.5 px-3 sm:gap-1.5 sm:px-3">
                            <Phone className="h-4 w-4" />
                            <span className="hidden xs:inline sm:inline">Calls</span>
                        </TabsTrigger>
                        <TabsTrigger value="files" className="min-h-[44px] gap-1.5 px-3 sm:gap-1.5 sm:px-3">
                            <Bell className="h-4 w-4" />
                            <span className="hidden xs:inline sm:inline">Files</span>
                        </TabsTrigger>
                    </TabsList>
                    <ScrollBar orientation="horizontal" className="invisible" />
                </ScrollArea>
            </div>

            <ScrollArea className="h-[calc(100vh-12rem)] w-full touch-pan-y overscroll-contain">
                <div className="px-3 py-3 sm:px-5 sm:py-4">
                    <TabsContent value="overview" className="mt-0">
                        <LeadRecordsOverview lead={lead} users={users} onViewAllActivity={() => setActiveTab('activity')} />
                    </TabsContent>
                    <TabsContent value="activity" className="mt-0">
                        <LeadRecordsActivity activities={lead.activities?.data || []} />
                    </TabsContent>
                    <TabsContent value="notes" className="mt-0">
                        <LeadRecordsNotes />
                    </TabsContent>
                    <TabsContent value="tasks" className="mt-0">
                        <LeadRecordsTasks />
                    </TabsContent>
                    <TabsContent value="calls" className="mt-0">
                        <LeadRecordsCalls leadId={lead.id} />
                    </TabsContent>
                    <TabsContent value="files" className="mt-0">
                        <div className="py-12 text-center text-muted-foreground">
                            No files yet
                        </div>
                    </TabsContent>
                </div>
            </ScrollArea>
        </Tabs>
    );
}
