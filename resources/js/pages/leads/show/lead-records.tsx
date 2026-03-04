import * as React from 'react';
import { BadgeCount } from '@/components/ui/badge-count';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SharedData, User } from '@/types';
import { Activity, FileText, LayoutDashboardIcon, ListTodo, Phone } from 'lucide-react';
import { LeadRecordsActivity } from './lead-records-activity';
import { LeadRecordsCalls } from './lead-records-calls';
import { LeadRecordsDocuments } from './lead-records-documents';
import { LeadRecordsNotes } from './lead-records-notes';
import { LeadRecordsOverview } from './lead-records-overview';
import { LeadRecordsTasks } from './lead-records-tasks';
import { LeadRecordsFiles } from './lead-records-files';
import { Lead } from '@/types/lead';
import { useLeadFiles } from '@/hooks/useLead';
import { IconFile, IconFolder } from '@tabler/icons-react';
import { usePage } from '@inertiajs/react';

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

type Props = {
    lead: Lead;
    users?: User[];
    activeTab?: string;
};

export function LeadRecords({ lead, users = [], activeTab = 'overview' }: Props) {
    const { auth } = usePage<SharedData>().props;
    const permissions = auth.permissions ?? [];

    const canViewCalls = permissions.includes('make lead calls') || permissions.includes('make calls');
    const canViewNotes = permissions.includes('view lead notes');
    const canViewTasks = permissions.includes('view tasks');
    const canViewFiles = permissions.includes('view files');
    const canViewDocuments = permissions.includes('view documents');
    const canViewTimeline = permissions.includes('view lead timeline');

    const { data: filesData } = useLeadFiles(canViewFiles ? String(lead.id) : null);
    const filesCount = filesData?.data?.length ?? lead.files_count ?? 0;

    const [currentTab, setCurrentTab] = React.useState(activeTab);

    const handleTabChange = (tab: string) => {
        setCurrentTab(tab);
        window.history.replaceState({}, '', `/leads/${lead.id}/${tab}`);
    };

    return (
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden relative pt-2">
            {/* Tab bar — shrink-0, separate from content */}
            <Tabs
                value={currentTab}
                onValueChange={handleTabChange}
                className="shrink-0 0"
            >
                <TabsList
                    className={cn(
                        'relative flex items-center gap-1 bg-transparent p-0 px-3 pb-2',
                        'after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full',
                        'after:h-px after:rounded-sm after:bg-border',
                    )}
                >
                    {/* Overview with separator */}
                    <div className="flex items-center gap-3 pr-2">
                        <TabsTrigger value="overview" className={tabTriggerClass}>
                            <LayoutDashboardIcon />
                            <span className="hidden xs:inline sm:inline">Overview</span>
                        </TabsTrigger>
                        <span className="h-4 w-px bg-border" role="none" />
                    </div>
                    {canViewTimeline && (
                        <TabsTrigger value="activity" className={tabTriggerClass}>
                            <Activity />
                            <span className="hidden xs:inline sm:inline">Activity</span>
                        </TabsTrigger>
                    )}
                    {canViewNotes && (
                        <TabsTrigger value="notes" className={tabTriggerClass}>
                            <IconFile />
                            <span className="hidden xs:inline sm:inline">Notes</span>
                            <BadgeCount count={lead.notes_count ?? 0} variant="tertiary" />
                        </TabsTrigger>
                    )}
                    {canViewTasks && (
                        <TabsTrigger value="tasks" className={tabTriggerClass}>
                            <ListTodo />
                            <span className="hidden xs:inline sm:inline">Tasks</span>
                            <BadgeCount count={lead.pending_tasks_count ?? 0} variant="tertiary" />
                        </TabsTrigger>
                    )}
                    {canViewCalls && (
                        <TabsTrigger value="calls" className={tabTriggerClass}>
                            <Phone />
                            <span className="hidden xs:inline sm:inline">Calls</span>
                            <BadgeCount count={lead.calls_count ?? 0} variant="tertiary" />
                        </TabsTrigger>
                    )}
                    {canViewFiles && (
                        <TabsTrigger value="files" className={tabTriggerClass}>
                            <IconFolder className="rounded"/>
                            <span className="hidden xs:inline sm:inline">Files</span>
                            <BadgeCount count={filesCount} variant="tertiary" />
                        </TabsTrigger>
                    )}
                    {canViewDocuments && (
                        <TabsTrigger value="documents" className={tabTriggerClass}>
                            <FileText />
                            <span className="hidden xs:inline sm:inline">Documents</span>
                        </TabsTrigger>
                    )}
                </TabsList>
            </Tabs>

            {/* Content — flex-1, separate from tabs */}
            <div className="flex flex-1 overflow-hidden border-r border-border">
                <div className="flex flex-col flex-auto overflow-hidden isolate">
                    <ScrollArea className="w-full h-full">
                        <div className="flex flex-col gap-8 p-6">
                            {currentTab === 'overview' && (
                                <LeadRecordsOverview
                                    lead={lead}
                                    users={users}
                                    onViewAllActivity={() => handleTabChange('activity')}
                                    onViewAllNotes={() => handleTabChange('notes')}
                                />
                            )}
                            {currentTab === 'activity' && canViewTimeline && (
                                <LeadRecordsActivity leadId={lead.id} />
                            )}
                            {currentTab === 'notes' && canViewNotes && (
                                <LeadRecordsNotes leadId={lead.id} leadName={lead.name} leadUrl={lead.urls.show} />
                            )}
                            {currentTab === 'tasks' && canViewTasks && (
                                <LeadRecordsTasks lead={lead} users={users} />
                            )}
                            {currentTab === 'calls' && canViewCalls && (
                                <LeadRecordsCalls leadId={lead.id} />
                            )}
                            {currentTab === 'files' && canViewFiles && (
                                <LeadRecordsFiles leadId={lead.id} />
                            )}
                            {currentTab === 'documents' && canViewDocuments && (
                                <LeadRecordsDocuments lead={lead} />
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}
