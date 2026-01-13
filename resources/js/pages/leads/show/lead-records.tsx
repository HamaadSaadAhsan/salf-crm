import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    return (
        <Tabs defaultValue="overview" className="grow text-sm">
            <TabsList
                variant="line"
                className="gap-6 bg-transparent px-5 [&_button]:border-b [&_button]:text-secondary-foreground [&_button_svg]:size-4"
            >
                <TabsTrigger value="overview">
                    <Grid2x2Check />
                    Overview
                </TabsTrigger>
                <TabsTrigger value="activity">
                    <Activity />
                    Activity
                </TabsTrigger>
                <TabsTrigger value="notes">
                    <GalleryVerticalEnd />
                    Notes
                </TabsTrigger>
                <TabsTrigger value="tasks">
                    <ListTodo />
                    Tasks
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        3
                    </Badge>
                </TabsTrigger>
                <TabsTrigger value="calls">
                    <Phone />
                    Calls
                </TabsTrigger>
                <TabsTrigger value="files">
                    <Bell />
                    Files
                </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-12rem)] w-full">
                <div className="px-5 py-4">
                    <TabsContent value="overview" className="mt-0">
                        <LeadRecordsOverview lead={lead} users={users} />
                    </TabsContent>
                    <TabsContent value="activity" className="mt-0">
                        <LeadRecordsActivity />
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
