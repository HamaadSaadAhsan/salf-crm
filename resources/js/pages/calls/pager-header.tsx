import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { ContentHeader } from '@/crm/layout/components/content-header';
import { BarChart2, Calendar, CalendarClock, Download, FileCheck2, FileText, History, Info, Settings2, Share } from 'lucide-react';

export function PageHeader() {
    return (
        <ContentHeader>
            <div className="flex w-full items-center justify-between">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <Settings2 className="size-5 text-primary" />
                        <h1 className="text-lg font-semibold">Call Sessions</h1>
                    </div>
                    <p className="text-sm text-muted-foreground">View and manage your call history and active sessions</p>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button variant="outline">
                        <Calendar className="mr-2 h-4 w-4" />
                        History
                    </Button>
                </div>
            </div>
        </ContentHeader>
    );
}
