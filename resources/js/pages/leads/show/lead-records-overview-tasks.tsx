import {
  Calendar,
  ChevronRight,
  Eye,
  ListTodo,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  UserIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Task } from '@/types/task';
import { User } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LeadTaskSheet } from '@/components/lead-task-sheet';
import { TaskDetailsDialog } from '@/components/task-details-dialog';

interface LeadRecordsOverviewTasksProps {
    tasks?: Task[];
    leadId: string;
    users?: User[];
    currentUserId?: number;
    userRole?: 'support-agent' | 'senior-support-agent' | 'super-admin';
}

export function LeadRecordsOverviewTasks({
    tasks = [],
    leadId,
    users = [],
    currentUserId,
    userRole = 'support-agent',
}: LeadRecordsOverviewTasksProps) {
    const [isTasksOpen, setIsTasksOpen] = useState(true);
    const [showCompleted, setShowCompleted] = useState(false);
    const [showTaskSheet, setShowTaskSheet] = useState(false);
    const [showTaskDetails, setShowTaskDetails] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Filter tasks based on completion status
    const pendingTasks = tasks.filter(task => !task.is_completed);
    const completedTasks = tasks.filter(task => task.is_completed);
    const displayedTasks = showCompleted ? tasks : pendingTasks;

    const handleToggleCompletion = (taskId: number) => {
        const task = tasks.find(t => t.id === taskId);
        const willBeCompleted = task && !task.is_completed;

        router.post(
            `/tasks/${taskId}/complete`,
            {},
            {
                preserveScroll: true,
                only: ['lead'],
                onSuccess: () => {
                    toast.success('Task updated successfully');
                    // Automatically show completed tasks when marking as complete
                    if (willBeCompleted) {
                        setShowCompleted(true);
                    }
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

    const handleViewTask = (taskId: number) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            setSelectedTask(task);
            setShowTaskDetails(true);
        }
    };

    const handleEditTask = (taskId: number) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            setSelectedTask(task);
            setShowTaskSheet(true);
        }
    };

    const handleDeleteTask = (taskId: number) => {
        if (confirm('Are you sure you want to delete this task?')) {
            router.delete(`/tasks/${taskId}`, {
                preserveScroll: true,
                only: ['lead'],
                onSuccess: () => {
                    toast.success('Task deleted successfully');
                },
                onError: () => {
                    toast.error('Failed to delete task');
                },
            });
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getPriorityVariant = (color: string) => {
        switch (color) {
            case 'red':
                return 'destructive';
            case 'orange':
                return 'warning';
            case 'blue':
                return 'info';
            default:
                return 'secondary';
        }
    };

    return (
        <Collapsible className="mb-5 space-y-2" open={isTasksOpen} onOpenChange={setIsTasksOpen}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <CollapsibleTrigger asChild>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-semibold ps-1.5 text-sm hover:bg-accent [&:not(:hover)[data-state=open]]:bg-transparent"
                    >
                        <ListTodo />
                        Tasks {pendingTasks.length > 0 && `(${pendingTasks.length})`}
                        <ChevronRight className="[[data-state=open]_&]:rotate-90" />
                    </Button>
                </CollapsibleTrigger>
                <div className="flex items-center gap-1 sm:gap-2">
                    {completedTasks.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCompleted(!showCompleted)}
                            className="text-xs"
                        >
                            {showCompleted ? 'Hide' : 'Show'} completed ({completedTasks.length})
                        </Button>
                    )}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" mode="icon"  onClick={handleAddTask}>
                                    <Plus />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Add task</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            <CollapsibleContent>
                <Card className="shadow-none">
                    <CardContent className="space-y-4 p-3.5">
                        {displayedTasks.length === 0 ? (
                            <div className="py-8 text-center">
                                <ListTodo className="mx-auto size-12 text-muted-foreground/50" />
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {showCompleted ? 'No tasks found' : 'No pending tasks'}
                                </p>
                                <Button variant="outline" size="sm" className="mt-4" onClick={handleAddTask}>
                                    <Plus className="size-4" />
                                    Create your first task
                                </Button>
                            </div>
                        ) : (
                            <ul className="flex flex-col gap-2.5">
                                {displayedTasks.map(task => (
                                    <li
                                        key={task.id}
                                        className={cn(
                                            'flex items-start gap-2 rounded-md p-2 text-sm transition-colors hover:bg-accent/50',
                                            task.is_completed && 'opacity-60'
                                        )}
                                    >
                                        {/* Checkbox */}
                                        <Checkbox
                                            size="sm"
                                            className="mt-1 shrink-0"
                                            checked={task.is_completed}
                                            onCheckedChange={() => handleToggleCompletion(task.id)}
                                        />

                                        {/* Content: Title + Badges */}
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                            {/* Title row */}
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span
                                                    className={cn(
                                                        'font-medium hover:text-primary',
                                                        task.is_completed && 'line-through'
                                                    )}
                                                >
                                                    {task.title}
                                                </span>
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
                                                {task.is_overdue && (
                                                    <Badge variant="destructive" size="sm">
                                                        Overdue
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Meta row: Due date + Assigned user */}
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {task.due_at && (
                                                    <Badge
                                                        variant={task.is_overdue ? 'destructive' : 'secondary'}
                                                        size="sm"
                                                        appearance="light"
                                                    >
                                                        <Calendar className="size-3.5" />
                                                        {task.due_at_formatted}
                                                    </Badge>
                                                )}
                                                {task.assigned_to && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Badge variant="secondary" size="sm" className="cursor-pointer">
                                                                    <UserIcon className="size-3.5" />
                                                                    <span className="truncate max-w-[120px]">{task.assigned_to.name}</span>
                                                                </Badge>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar className="size-6">
                                                                        <AvatarImage src={task.assigned_to.avatar} />
                                                                        <AvatarFallback>
                                                                            {getInitials(task.assigned_to.name)}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div>
                                                                        <p className="text-xs font-medium">{task.assigned_to.name}</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {task.assigned_to.email}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                        </div>

                                        {/* Menu button - always visible as separate column */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" mode="icon" className="shrink-0 -mt-1 -mr-1">
                                                    <MoreVertical className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleViewTask(task.id)}>
                                                    <Eye className="size-4" />
                                                    View details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEditTask(task.id)}>
                                                    <Pencil className="size-4" />
                                                    Edit task
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteTask(task.id)}
                                                    className="text-destructive"
                                                >
                                                    <Trash2 className="size-4" />
                                                    Delete task
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </CollapsibleContent>

            {/* Task Sheet for Create/Edit */}
            <LeadTaskSheet
                open={showTaskSheet}
                onOpenChange={setShowTaskSheet}
                leadId={leadId}
                task={selectedTask}
                users={users}
                currentUserId={currentUserId}
                userRole={userRole}
                onTaskCompleted={() => setShowCompleted(true)}
            />

            {/* Task Details Dialog */}
            <TaskDetailsDialog
                open={showTaskDetails}
                onOpenChange={setShowTaskDetails}
                task={selectedTask}
                onEdit={() => {
                    if (selectedTask) {
                        setShowTaskDetails(false);
                        setShowTaskSheet(true);
                    }
                }}
                onDelete={() => {
                    if (selectedTask) {
                        handleDeleteTask(selectedTask.id);
                    }
                }}
            />
        </Collapsible>
    );
}
