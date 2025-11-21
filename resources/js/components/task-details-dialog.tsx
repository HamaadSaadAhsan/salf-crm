import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Task } from '@/types/task';
import { format, parseISO } from 'date-fns';
import {
    Calendar,
    Clock,
    Mail,
    MessageCircle,
    Pencil,
    Phone,
    Trash2,
    User as UserIcon,
    Users,
} from 'lucide-react';


interface TaskDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: Task | null;
    onEdit?: () => void;
    onDelete?: () => void;
}

export function TaskDetailsDialog({
    open,
    onOpenChange,
    task,
    onEdit,
    onDelete,
}: TaskDetailsDialogProps) {
    if (!task) {
        return null;
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getTypeIcon = (iconName: string) => {
        const icons = {
            clock: Clock,
            phone: Phone,
            'message-circle': MessageCircle,
            users: Users,
            mail: Mail,
            circle: Clock,
        };
        return icons[iconName as keyof typeof icons] || Clock;
    };

    const TypeIcon = getTypeIcon(task.type.icon);

    const getStatusColor = (color: string) => {
        const colors = {
            gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
            blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
            purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
            cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
        };
        return colors[color as keyof typeof colors] || colors.gray;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle className="flex items-start justify-between gap-4">
                        <span className="flex-1">{task.title}</span>
                        <div className="flex shrink-0 items-center gap-2">
                            <Badge className={cn('gap-1', getStatusColor(task.type.color))}>
                                <TypeIcon className="size-3" />
                                {task.type.label}
                            </Badge>
                        </div>
                    </DialogTitle>
                    {task.is_overdue && !task.is_completed && (
                        <DialogDescription className="text-destructive">
                            This task is overdue
                        </DialogDescription>
                    )}
                </DialogHeader>

                <ScrollArea className="max-h-[60vh]">
                    <div className="space-y-6 pr-4">
                        {/* Status and Priority */}
                        <div className="flex flex-wrap gap-2">
                            <Badge className={getStatusColor(task.status.color)}>
                                {task.status.label}
                            </Badge>
                            <Badge className={getStatusColor(task.priority.color)}>
                                Priority: {task.priority.label}
                            </Badge>
                            {task.is_completed && (
                                <Badge variant="success">Completed</Badge>
                            )}
                        </div>

                        {/* Description */}
                        {task.description && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold">Description</h4>
                                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                    {task.description}
                                </p>
                            </div>
                        )}

                        <Separator />

                        {/* Dates */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            {task.due_at && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <Calendar className="size-4" />
                                        Due Date
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {format(parseISO(task.due_at), 'PPP p')}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <Clock className="size-4" />
                                    Created
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {format(parseISO(task.created_at), 'PPP p')}
                                </p>
                            </div>

                            {task.completed_at && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <Calendar className="size-4" />
                                        Completed
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {format(parseISO(task.completed_at), 'PPP p')}
                                    </p>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Assigned To */}
                        {task.assigned_to && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <UserIcon className="size-4" />
                                    Assigned To
                                </div>
                                <div className="flex items-center gap-3">
                                    <Avatar className="size-8">
                                        <AvatarImage src={task.assigned_to.avatar} />
                                        <AvatarFallback>
                                            {getInitials(task.assigned_to.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium">{task.assigned_to.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {task.assigned_to.email}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Created By */}
                        {task.created_by && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <UserIcon className="size-4" />
                                    Created By
                                </div>
                                <div className="flex items-center gap-3">
                                    <Avatar className="size-8">
                                        <AvatarImage src={task.created_by.avatar} />
                                        <AvatarFallback>
                                            {getInitials(task.created_by.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium">{task.created_by.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {task.created_by.email}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Collaborators */}
                        {task.collaborators && task.collaborators.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <Users className="size-4" />
                                    Collaborators ({task.collaborators.length})
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {task.collaborators.map((collaborator) => (
                                        <div
                                            key={collaborator.id}
                                            className="flex items-center gap-2 rounded-md border p-2"
                                        >
                                            <Avatar className="size-6">
                                                <AvatarImage src={collaborator.avatar} />
                                                <AvatarFallback className="text-xs">
                                                    {getInitials(collaborator.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-xs font-medium">
                                                    {collaborator.name}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="gap-2">
                    {onDelete && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                onDelete();
                                onOpenChange(false);
                            }}
                        >
                            <Trash2 className="size-4" />
                            Delete
                        </Button>
                    )}
                    {onEdit && (
                        <Button
                            type="button"
                            onClick={() => {
                                onEdit();
                                onOpenChange(false);
                            }}
                        >
                            <Pencil className="size-4" />
                            Edit Task
                        </Button>
                    )}
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
