import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, MessagesSquare } from 'lucide-react';
import { LeadExtendedComments } from './lead-extended-comments';
import { LeadExtendedDetails } from './lead-extended-details';
import { Lead } from '@/types/lead';

export function LeadExtended({ lead }: { lead: Lead }) {
    return (
        <Tabs defaultValue="details" className="flex h-full flex-1 flex-col text-sm">
            <div className="border-b border-border">
                <ScrollArea className="w-full">
                    <TabsList
                        variant="line"
                        className="inline-flex w-max min-w-full gap-4 bg-transparent px-4 sm:gap-6 sm:px-5"
                    >
                        <TabsTrigger value="details" className="gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            Details
                        </TabsTrigger>
                        <TabsTrigger value="comments" className="gap-1.5">
                            <MessagesSquare className="h-3.5 w-3.5" />
                            Comments
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                5
                            </Badge>
                        </TabsTrigger>
                    </TabsList>
                    <ScrollBar orientation="horizontal" className="invisible" />
                </ScrollArea>
            </div>

            <ScrollArea className="h-[calc(100vh-12rem)] w-full flex-1 lg:h-[calc(100vh-12rem)]">
                <div className="px-4 py-4 sm:px-5">
                    <TabsContent value="details" className="mt-0">
                        <LeadExtendedDetails lead={lead} />
                    </TabsContent>
                    <TabsContent value="comments" className="mt-0">
                        <LeadExtendedComments />
                    </TabsContent>
                </div>
            </ScrollArea>
        </Tabs>
    );
}