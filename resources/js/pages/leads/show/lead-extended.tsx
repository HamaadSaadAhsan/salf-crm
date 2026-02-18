import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInfiniteLeadComments } from '@/hooks/useLead';
import { Lead } from '@/types/lead';
import { Building2, MessagesSquare } from 'lucide-react';
import { useMemo } from 'react';
import { LeadExtendedComments } from './lead-extended-comments';
import { LeadExtendedDetails } from './lead-extended-details';

export function LeadExtended({ lead }: { lead: Lead }) {
    const commentsQuery = useInfiniteLeadComments(lead.id);

    const commentCount = useMemo(() => {
        const firstPage = commentsQuery.data?.pages?.[0];
        return firstPage?.meta?.total ?? 0;
    }, [commentsQuery.data]);

    return (
        <Tabs defaultValue="details" className="flex h-full flex-1 flex-col text-sm">
            <div className="border-b border-border">
                <ScrollArea className="w-full">
                    <TabsList
                        variant="line"
                        className="inline-flex w-max min-w-full gap-4 bg-transparent px-4 sm:gap-6 sm:px-5"
                    >
                        <TabsTrigger value="details" className="min-h-[44px] gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            Details
                        </TabsTrigger>
                        <TabsTrigger value="comments" className="min-h-[44px] gap-1.5">
                            <MessagesSquare className="h-3.5 w-3.5" />
                            Comments
                            {commentCount > 0 && (
                                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                    {commentCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>
                    <ScrollBar orientation="horizontal" className="invisible" />
                </ScrollArea>
            </div>

            <TabsContent value="details" className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                <div className="px-4 py-4 sm:px-5">
                    <LeadExtendedDetails lead={lead} />
                </div>
            </TabsContent>
            <TabsContent value="comments" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
                <LeadExtendedComments lead={lead} />
            </TabsContent>
        </Tabs>
    );
}
