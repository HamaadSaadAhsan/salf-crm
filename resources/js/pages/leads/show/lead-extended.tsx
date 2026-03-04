import { BadgeCount } from '@/components/ui/badge-count';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInfiniteLeadComments } from '@/hooks/useLead';
import { cn } from '@/lib/utils';
import { Lead } from '@/types/lead';
import { Building2, MessagesSquare } from 'lucide-react';
import { useMemo } from 'react';
import { LeadExtendedComments } from './lead-extended-comments';
import { LeadExtendedDetails } from './lead-extended-details';

const tabTriggerClass = cn(
    // Base — matches Attio .ChUbo
    'relative rounded-lg py-1 px-2 gap-1.5 border-0 bg-transparent outline-none',
    '[box-shadow:inset_0_0_0_1px_transparent] transition-[box-shadow,background-color] duration-[140ms]',
    // Default dark text/icon: rgba(255,255,255,0.55)
    'dark:text-[rgba(255,255,255,0.55)]',
    // Hover
    'hover:[box-shadow:inset_0_0_0_1px_var(--color-border)]',
    'hover:text-foreground',
    // Active
    'data-[state=active]:bg-card',
    'data-[state=active]:[box-shadow:inset_0_0_0_1px_var(--color-border)]',
    'data-[state=active]:text-foreground',
    // Active dark — matches Attio .ChUbo[data-active="true"]
    'dark:data-[state=active]:!bg-[rgb(31,33,37)]',
    'dark:data-[state=active]:![box-shadow:inset_0_0_0_1px_rgb(39,40,43)]',
    'dark:data-[state=active]:!text-[#EEEFF1]',
    // Underline indicator
    'after:content-[""] after:absolute after:bottom-[-8px] after:left-0 after:w-full',
    'after:h-px after:rounded-sm after:z-[1]',
    'after:bg-transparent',
    'data-[state=active]:after:bg-foreground',
    // Icons
    '[&_svg]:size-3.5 [&_svg]:shrink-0',
    '[&_svg]:text-muted-foreground [&_svg]:transition-colors [&_svg]:duration-[140ms]',
    'dark:[&_svg]:text-[rgba(255,255,255,0.55)]',
    '[&:hover_svg]:text-foreground',
    '[&[data-state=active]_svg]:text-foreground',
    'dark:[&[data-state=active]_svg]:text-[#EEEFF1]',
);

export function LeadExtended({ lead }: { lead: Lead }) {
    const commentsQuery = useInfiniteLeadComments(lead.id);

    const commentCount = useMemo(() => {
        const firstPage = commentsQuery.data?.pages?.[0];
        return firstPage?.meta?.total ?? 0;
    }, [commentsQuery.data]);

    return (
        <Tabs defaultValue="details" className="flex h-full flex-1 flex-col text-sm">
            <div className="shrink-0 px-3 pt-2">
                <TabsList
                    className={cn(
                        'relative flex items-center gap-1 bg-transparent p-0 pb-2',
                        'after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full',
                        'after:h-px after:rounded-sm after:bg-border',
                    )}
                >
                    <TabsTrigger value="details" className={tabTriggerClass}>
                        <Building2 />
                        Details
                    </TabsTrigger>
                    <TabsTrigger value="comments" className={tabTriggerClass}>
                        <MessagesSquare />
                        Comments
                        <BadgeCount count={commentCount} variant="tertiary" />
                    </TabsTrigger>
                </TabsList>
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
