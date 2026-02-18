import { useState, useMemo } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronDown,
    User,
    Users,
} from 'lucide-react';
import { Link, router } from '@inertiajs/react';
import { getInitials, toAbsoluteUrl } from '@/lib/helpers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Lead } from '@/types/lead';
import { Task } from '@/types/task';
import type { User as UserType } from '@/types';
import { toast } from 'sonner';
import { LeadTaskSheet } from '@/components/lead-task-sheet';

type Props = {
    lead: Lead;
    users?: UserType[];
};

type TasksByDate = {
    upcoming: Task[];
    today: Task[];
    yesterday: Task[];
    lastWeek: Task[];
    older: Task[];
};

function isToday(date: Date): boolean {
    const today = new Date();
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
}

function isYesterday(date: Date): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()
    );
}

function isLastWeek(date: Date): boolean {
    const today = new Date();
    const lastWeekStart = new Date();
    lastWeekStart.setDate(today.getDate() - 7);
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    return date >= lastWeekStart && date < yesterday;
}

export function LeadRecordsTasks({ lead, users = [] }: Props) {
    const [expanded, setExpanded] = useState({
        upcoming: true,
        today: true,
        yesterday: false,
        lastWeek: false,
        older: false,
    });
    const [showTaskSheet, setShowTaskSheet] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const tasks = useMemo(() => lead.tasks?.data || [], [lead.tasks]);

    const tasksByDate: TasksByDate = useMemo(() => {
        const result: TasksByDate = {
            upcoming: [],
            today: [],
            yesterday: [],
            lastWeek: [],
            older: [],
        };

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        tasks.forEach((task) => {
            if (!task.due_at) {
                result.older.push(task);
                return;
            }

            const dueDate = new Date(task.due_at);

            if (isToday(dueDate)) {
                result.today.push(task);
            } else if (dueDate > todayStart) {
                result.upcoming.push(task);
            } else if (isYesterday(dueDate)) {
                result.yesterday.push(task);
            } else if (isLastWeek(dueDate)) {
                result.lastWeek.push(task);
            } else {
                result.older.push(task);
            }
        });

        return result;
    }, [tasks]);

    const handleToggleCompletion = (taskId: number) => {
        router.post(
            `/tasks/${taskId}/complete`,
            {},
            {
                preserveScroll: true,
                only: ['lead'],
                onSuccess: () => {
                    toast.success('Task updated successfully');
                },
                onError: () => {
                    toast.error('Failed to update task');
                },
            }
        );
    };

    const handleAddTask = () => {
        setSelectedTask(null);
        setShowTaskSheet(true);
    };

    const renderTask = (task: Task, index: number) => {
        const assignees = task.collaborators && task.collaborators.length > 0
            ? task.collaborators
            : task.assigned_to
                ? [task.assigned_to]
                : [];

        return (
            <div
                key={task.id}
                className={`flex items-start gap-1.5 ps-2 sm:ps-6 py-1.5 cursor-pointer hover:bg-muted/50 rounded ${task.is_completed ? 'opacity-60' : ''}`}
                onClick={() => {
                    setSelectedTask(task);
                    setShowTaskSheet(true);
                }}
            >
                <span onClick={(e) => e.stopPropagation()} className="shrink-0 mt-0.5">
                    <Checkbox
                        size="sm"
                        checked={task.is_completed}
                        onCheckedChange={() => handleToggleCompletion(task.id)}
                    />
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                        <Link href="#" className="font-medium hover:text-primary shrink-0">
                            {task.created_by?.name || 'Team'}
                        </Link>
                        <span className="text-muted-foreground truncate">{task.title}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {task.status && (
                            <Badge
                                variant={
                                    task.status.value === 'completed' ? 'success'
                                    : task.status.value === 'in_progress' ? 'info'
                                    : task.status.value === 'cancelled' ? 'destructive'
                                    : 'secondary'
                                }
                                appearance="light"
                                size="sm"
                            >
                                {task.status.label}
                            </Badge>
                        )}
                        {assignees.length > 1 ? (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge
                                        variant="secondary"
                                        size="sm"
                                        className="cursor-pointer"
                                    >
                                        <Users className="size-3.5" />{' '}
                                        {assignees.length} People
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="p-2 flex gap-3.5">
                                    {assignees.map((assignee) => (
                                        <div
                                            key={assignee.id}
                                            className="flex items-center gap-1"
                                        >
                                            <Avatar className="size-4">
                                                {assignee.avatar && (
                                                    <AvatarImage
                                                        src={toAbsoluteUrl(assignee.avatar)}
                                                        alt={assignee.name}
                                                    />
                                                )}
                                                <AvatarFallback>
                                                    {getInitials(assignee.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs font-medium">
                                                {assignee.name}
                                            </span>
                                        </div>
                                    ))}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : assignees.length === 1 ? (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="secondary" size="sm">
                                        <User className="size-3.5" />{' '}
                                        {assignees[0].name}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="p-2 flex gap-3.5">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="size-4">
                                            {assignees[0].avatar && (
                                                <AvatarImage
                                                    src={toAbsoluteUrl(assignees[0].avatar)}
                                                    alt={assignees[0].name}
                                                />
                                            )}
                                            <AvatarFallback>
                                                {getInitials(assignees[0].name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium">
                                                {assignees[0].name}
                                            </div>
                                        </div>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : null}
                        {task.due_at_formatted && (
                            <Badge
                                variant={task.is_overdue ? 'destructive' : 'secondary'}
                                appearance="light"
                                size="sm"
                            >
                                <CalendarIcon
                                    className={`size-3.5 ${task.is_completed ? 'opacity-60' : ''}`}
                                />
                                {task.due_at_formatted}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderTaskGroup = (
        title: string,
        tasks: Task[],
        expandedKey: keyof typeof expanded
    ) => {
        if (tasks.length === 0) return null;

        return (
            <div>
                <button
                    className="w-full flex items-center py-2 cursor-pointer text-xs text-muted-foreground font-medium gap-2"
                    onClick={() =>
                        setExpanded((prev) => ({
                            ...prev,
                            [expandedKey]: !prev[expandedKey],
                        }))
                    }
                    aria-expanded={expanded[expandedKey]}
                >
                    <span
                        className={`transition-transform ${expanded[expandedKey] ? '' : '-rotate-90'}`}
                    >
                        <ChevronDown className="size-4" />
                    </span>
                    <span>{title}</span>
                </button>

                {expanded[expandedKey] && (
                    <div>{tasks.map((task, index) => renderTask(task, index))}</div>
                )}
            </div>
        );
    };

    return (
        <div className="grid">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Tasks</h2>
                <Button variant="outline" size="sm" className="gap-1" onClick={handleAddTask}>
                    + Create task
                </Button>
            </div>

            {tasks.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center">
                    No tasks assigned yet
                </div>
            ) : (
                <>
                    {renderTaskGroup('Upcoming', tasksByDate.upcoming, 'upcoming')}
                    {renderTaskGroup('Today', tasksByDate.today, 'today')}
                    {renderTaskGroup('Yesterday', tasksByDate.yesterday, 'yesterday')}
                    {renderTaskGroup('Last week', tasksByDate.lastWeek, 'lastWeek')}
                    {renderTaskGroup('Older', tasksByDate.older, 'older')}
                </>
            )}

            {/* Task Sheet for Create/Edit */}
            <LeadTaskSheet
                open={showTaskSheet}
                onOpenChange={setShowTaskSheet}
                leadId={lead.id}
                task={selectedTask}
                users={users}
                currentUserId={undefined}
                userRole={undefined}
            />
        </div>
    );
}