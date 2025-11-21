import { useState } from 'react';
import {
  BarChart2,
  CalendarClock,
  CheckSquare,
  Download,
  FileCheck2,
  FileText,
  History,
  Info,
  Plus,
  Share,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { NewTaskSheet } from './new-task-sheet';
import { User } from '@/types';

interface PageHeaderProps {
    users: User[];
}

export function PageHeader({ users }: PageHeaderProps) {
    const [taskSheetOpen, setTaskSheetOpen] = useState(false);

    return (
        <>
            <div className="flex items-center justify-between border-b px-6 py-4">
                <h1 className="inline-flex items-center gap-2.5 text-lg font-semibold">
                    <CheckSquare className="size-5 text-primary" /> Tasks
                </h1>

                <div className="flex items-center gap-2.5">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                                <FileCheck2 />
                                Reports
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[230px]">
                            <DropdownMenuItem
                                className="justify-between text-muted-foreground"
                                onClick={(e) => {
                                    e.preventDefault();
                                }}
                            >
                                <span>Enable Notifications</span>
                                <Switch defaultChecked size="sm" />
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem className="gap-2">
                                <BarChart2 />
                                <span>Generate Report</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem className="gap-2">
                                <CalendarClock />
                                <span>Schedule Report</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem className="gap-2">
                                <History />
                                <span>View Report History</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem className="gap-2">
                                <Download />
                                <span>Export view as CSV</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem className="gap-2">
                                <Share />
                                <span>Export view as Excel</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem className="gap-2">
                                <FileText />
                                <span>Import CSV</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem className="text-muted-foreground">
                                <Info />
                                <span className="text-sm">Learn more about Reports</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button size="sm" onClick={() => setTaskSheetOpen(true)}>
                        <Plus /> New Task
                    </Button>
                </div>
            </div>

            <NewTaskSheet open={taskSheetOpen} onOpenChange={setTaskSheetOpen} users={users} />
        </>
    );
}
