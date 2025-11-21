import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetBody,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { User } from '@/types';
import { Task } from '@/types/task';
import { router } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, CheckSquare, Clock, Mail, MessageCircle, Phone, Users as UsersIcon } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';
import { toast } from 'sonner';


interface LeadTaskSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadId: string;
    task?: Task | null;
    users?: User[];
    currentUserId?: number;
    userRole?: 'support-agent' | 'senior-support-agent' | 'super-admin';
    onTaskCompleted?: () => void;
}

export function LeadTaskSheet({
    open,
    onOpenChange,
    leadId,
    task = null,
    users = [],
    currentUserId,
    userRole = 'support-agent',
    onTaskCompleted,
}: LeadTaskSheetProps) {
    const isEditMode = !!task;

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'follow_up',
        priority: 'medium',
        status: 'pending',
        assigned_to_id: null as string | number | null,
        due_at: '',
        collaborators: [] as number[],
        taskable_type: 'App\\Models\\Lead',
        taskable_id: leadId as number | string,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [dueDate, setDueDate] = useState<Date | undefined>();
    const [dueTime, setDueTime] = useState<string>('09:00');
    const [createMore, setCreateMore] = useState(false);

    // Initialize form data when task or open state changes
    useEffect(() => {
        if (open) {
            if (isEditMode && task) {
                // Edit mode: populate with task data
                setFormData({
                    title: task.title,
                    description: task.description || '',
                    type: task.type.value,
                    priority: task.priority.value,
                    status: task.status.value,
                    assigned_to_id: task.assigned_to?.id || null,
                    due_at: task.due_at || '',
                    collaborators: task.collaborators?.map(u => u.id) || [],
                    taskable_type: task.taskable_type || 'App\\Models\\Lead',
                    taskable_id: task.taskable_id || leadId,
                });

                // Set due date/time if exists
                if (task.due_at) {
                    const date = parseISO(task.due_at);
                    setDueDate(date);
                    setDueTime(format(date, 'HH:mm'));
                }
            } else {
                // Create mode: set defaults
                setFormData({
                    title: '',
                    description: '',
                    type: 'follow_up',
                    priority: 'medium',
                    status: 'pending',
                    assigned_to_id: userRole === 'support-agent' ? (currentUserId || null) : null,
                    due_at: '',
                    collaborators: [],
                    taskable_type: 'App\\Models\\Lead',
                    taskable_id: leadId,
                });
                setDueDate(undefined);
                setDueTime('09:00');
            }
            setErrors({});
        }
    }, [open, task, isEditMode, leadId, currentUserId, userRole]);

    // Sync date and time with form data
    useEffect(() => {
        if (dueDate && dueTime) {
            const [hours, minutes] = dueTime.split(':');

            // Create datetime string in YYYY-MM-DD HH:mm:ss format
            const year = format(dueDate, 'yyyy');
            const month = format(dueDate, 'MM');
            const day = format(dueDate, 'dd');
            const dateTimeString = `${year}-${month}-${day} ${hours}:${minutes}:00`;

            setFormData(prev => ({ ...prev, due_at: dateTimeString }));
        } else {
            setFormData(prev => ({ ...prev, due_at: '' }));
        }
    }, [dueDate, dueTime]);

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        setProcessing(true);

        const url = isEditMode ? `/tasks/${task!.id}` : '/tasks';
        const method = isEditMode ? 'put' : 'post';

        router[method](url, formData, {
            preserveScroll: true,
            only: ['lead'],
            onSuccess: () => {
                toast.success(isEditMode ? 'Task updated successfully!' : 'Task created successfully!');

                // Notify parent if task is completed
                if (formData.status === 'completed' && onTaskCompleted) {
                    onTaskCompleted();
                }

                if (!createMore || isEditMode) {
                    onOpenChange(false);
                }
            },
            onError: (errors) => {
                setErrors(errors);
                toast.error('Failed to save task');
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    };

    const handleReset = () => {
        onOpenChange(false);
    };

    const taskTypes = [
        { value: 'follow_up', label: 'Follow Up', icon: Clock, color: 'text-blue-500' },
        { value: 'call', label: 'Call', icon: Phone, color: 'text-green-500' },
        { value: 'message', label: 'Message', icon: MessageCircle, color: 'text-purple-500' },
        { value: 'meeting', label: 'Meeting', icon: UsersIcon, color: 'text-orange-500' },
        { value: 'email', label: 'Email', icon: Mail, color: 'text-cyan-500' },
        { value: 'other', label: 'Other', icon: Clock, color: 'text-gray-500' },
    ];

    const priorityOptions = [
        { value: 'low', label: 'Low', color: 'bg-green-500' },
        { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
        { value: 'high', label: 'High', color: 'bg-red-500' },
        { value: 'urgent', label: 'Urgent', color: 'bg-red-600' },
    ];

    const statusOptions = [
        { value: 'pending', label: 'Pending', color: 'bg-gray-500' },
        { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
        { value: 'completed', label: 'Completed', color: 'bg-green-500' },
        { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
    ];

    // Generate time slots
    const timeSlots = Array.from({ length: 48 }, (_, i) => {
        const hours = Math.floor(i / 2);
        const minutes = i % 2 === 0 ? '00' : '30';
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
    });

    const canAssignUsers = userRole === 'senior-support-agent' || userRole === 'super-admin';

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="inset-5 start-auto h-auto rounded-lg p-0 sm:w-[600px] sm:max-w-none [&_[data-slot=sheet-close]]:end-5 [&_[data-slot=sheet-close]]:top-4.5">
                <SheetHeader className="border-b border-border px-5 py-3.5">
                    <SheetTitle className="flex items-center gap-2.5">
                        <CheckSquare className="size-4 text-primary" />
                        {isEditMode ? 'Edit Task' : 'New Task'}
                    </SheetTitle>
                </SheetHeader>
                <SheetBody className="p-0">
                    <ScrollArea className="h-[calc(100dvh-11.75rem)] ps-3 pe-2 me-1">
                        <form id="task-form" onSubmit={handleSubmit}>
                            <div className="space-y-6">
                                {/* Title */}
                                <div className="space-y-2">
                                    <Label htmlFor="title">Task Title *</Label>
                                    <Textarea
                                        id="title"
                                        rows={3}
                                        placeholder="Enter task title..."
                                        value={formData.title}
                                        onChange={(e) =>
                                            setFormData({ ...formData, title: e.target.value })
                                        }
                                        className={cn(errors.title && 'border-destructive focus-visible:ring-destructive')}
                                        required
                                    />
                                    {errors.title && (
                                        <p className="text-xs text-destructive">{errors.title}</p>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        rows={4}
                                        placeholder="Enter task description..."
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({ ...formData, description: e.target.value })
                                        }
                                        className={cn(errors.description && 'border-destructive focus-visible:ring-destructive')}
                                    />
                                    {errors.description && (
                                        <p className="text-xs text-destructive">{errors.description}</p>
                                    )}
                                </div>

                                {/* Task Type */}
                                <div className="space-y-2">
                                    <Label htmlFor="type">Task Type</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, type: value })
                                        }
                                    >
                                        <SelectTrigger id="type">
                                            <SelectValue placeholder="Select task type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {taskTypes.map((type) => {
                                                const Icon = type.icon;
                                                return (
                                                    <SelectItem key={type.value} value={type.value}>
                                                        <div className="flex items-center gap-2">
                                                            <Icon className={cn('size-4', type.color)} />
                                                            {type.label}
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Due Date and Time */}
                                <div className="flex flex-col gap-2.5">
                                    <Label className="flex w-full max-w-56 items-center gap-1">
                                        Due Date
                                    </Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <div className="relative grow">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    mode="input"
                                                    placeholder={!dueDate}
                                                    className={cn(
                                                        'w-full',
                                                        errors.due_at && 'border-destructive focus-visible:ring-destructive'
                                                    )}
                                                >
                                                    <CalendarIcon />
                                                    {dueDate ? (
                                                        format(dueDate, 'PPP') +
                                                        (dueTime
                                                            ? ` - ${dueTime}`
                                                            : '')
                                                    ) : (
                                                        <span>
                                                            Pick a date and time
                                                        </span>
                                                    )}
                                                </Button>
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-auto p-0"
                                            align="start"
                                        >
                                            <div className="flex max-sm:flex-col">
                                                <Calendar
                                                    mode="single"
                                                    selected={dueDate}
                                                    onSelect={(newDate: Date | undefined) => {
                                                        if (newDate) {
                                                            setDueDate(newDate);
                                                            setDueTime(dueTime || '09:00');
                                                        }
                                                    }}
                                                    className="p-2 sm:pe-5"
                                                    disabled={[{ before: new Date() }]}
                                                />
                                                <div className="relative w-full max-sm:h-48 sm:w-40">
                                                    <div className="absolute inset-0 py-4 max-sm:border-t">
                                                        <ScrollArea className="h-full sm:border-s">
                                                            <div className="space-y-3">
                                                                <div className="flex h-5 shrink-0 items-center px-5">
                                                                    <p className="text-sm font-medium">
                                                                        {dueDate
                                                                            ? format(
                                                                                  dueDate,
                                                                                  'EEEE, d',
                                                                              )
                                                                            : 'Pick a date'}
                                                                    </p>
                                                                </div>
                                                                <div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
                                                                    {timeSlots.map((time) => (
                                                                        <Button
                                                                            key={time}
                                                                            type="button"
                                                                            variant={
                                                                                dueTime === time
                                                                                    ? 'primary'
                                                                                    : 'outline'
                                                                            }
                                                                            size="sm"
                                                                            className="w-full"
                                                                            onClick={() =>
                                                                                setDueTime(time)
                                                                            }
                                                                        >
                                                                            {time}
                                                                        </Button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </ScrollArea>
                                                    </div>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    {errors.due_at && (
                                        <p className="text-xs text-destructive">
                                            {errors.due_at}
                                        </p>
                                    )}
                                </div>

                                {/* Priority */}
                                <div className="space-y-2">
                                    <Label htmlFor="priority">Priority</Label>
                                    <Select
                                        value={formData.priority}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, priority: value })
                                        }
                                    >
                                        <SelectTrigger id="priority" className={cn(errors.priority && 'border-destructive focus:ring-destructive')}>
                                            <SelectValue placeholder="Select priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {priorityOptions.map((priority) => (
                                                <SelectItem key={priority.value} value={priority.value}>
                                                    <span className="flex items-center gap-2.5">
                                                        <span className={cn('size-1.5 rounded-full', priority.color)} />
                                                        <span>{priority.label}</span>
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.priority && (
                                        <p className="text-xs text-destructive">{errors.priority}</p>
                                    )}
                                </div>

                                {/* Status */}
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, status: value })
                                        }
                                    >
                                        <SelectTrigger id="status" className={cn(errors.status && 'border-destructive focus:ring-destructive')}>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map((status) => (
                                                <SelectItem key={status.value} value={status.value}>
                                                    <span className="flex items-center gap-2.5">
                                                        <span className={cn('size-1.5 rounded-full', status.color)} />
                                                        <span>{status.label}</span>
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.status && (
                                        <p className="text-xs text-destructive">{errors.status}</p>
                                    )}
                                </div>

                                {/* Assigned To (role-based) */}
                                {canAssignUsers && users.length > 0 && (
                                    <div className="space-y-2">
                                        <Label htmlFor="assigned_to">Assigned To</Label>
                                        <Select
                                            value={formData.assigned_to_id?.toString()}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, assigned_to_id: value })
                                            }
                                        >
                                            <SelectTrigger id="assigned_to">
                                                <SelectValue placeholder="Select user" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Unassigned</SelectItem>
                                                {users.map((user) => (
                                                    <SelectItem key={user.id} value={user.id.toString()}>
                                                        {user.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Auto-assigned message for CRO */}
                                {!canAssignUsers && (
                                    <div className="rounded-md bg-muted p-3 text-sm">
                                        <p className="text-muted-foreground">
                                            This task will be automatically assigned to you.
                                        </p>
                                    </div>
                                )}

                                {/* Collaborators */}
                                {canAssignUsers && users.length > 0 && (
                                    <div className="space-y-2">
                                        <Label>Collaborators</Label>
                                        <div className="rounded-md border p-4">
                                            <div className="space-y-2">
                                                {users.map((user) => (
                                                    <label
                                                        key={user.id}
                                                        className="flex cursor-pointer items-center gap-2"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.collaborators.includes(user.id)}
                                                            onChange={(e) => {
                                                                const newCollaborators = e.target.checked
                                                                    ? [...formData.collaborators, user.id]
                                                                    : formData.collaborators.filter(
                                                                          (id) => id !== user.id
                                                                      );
                                                                setFormData({
                                                                    ...formData,
                                                                    collaborators: newCollaborators,
                                                                });
                                                            }}
                                                            className="rounded border-gray-300"
                                                        />
                                                        <span className="text-sm">{user.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </form>
                    </ScrollArea>
                </SheetBody>
                <SheetFooter className="flex items-center border-t border-border px-5 py-3.5 not-only-of-type:justify-between">
                    {!isEditMode && (
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="create-more"
                                size="sm"
                                checked={createMore}
                                onCheckedChange={setCreateMore}
                            />
                            <Label htmlFor="create-more" className="text-xs text-secondary-foreground">
                                Create more
                            </Label>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            type="button"
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" form="task-form" disabled={processing}>
                            {processing ? 'Saving...' : isEditMode ? 'Update Task' : 'Save Task'}
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
