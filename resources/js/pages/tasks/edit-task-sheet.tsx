import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { update } from '@/routes/tasks';
import { Task } from '@/types/task';
import { User } from '@/types';
import { useForm } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Edit } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface EditTaskSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: Task | null;
    users: User[];
}

export function EditTaskSheet({
    open,
    onOpenChange,
    task,
    users,
}: EditTaskSheetProps) {
    const { data, setData, put, processing, errors, reset } = useForm({
        title: task?.title || '',
        description: task?.description || '',
        assigned_to_id: task?.assigned_to?.id?.toString() || '',
        priority: task?.priority?.value || 'medium',
        status: task?.status?.value || 'pending',
        due_at: task?.due_at || '',
    });

    const [availabilityDate, setAvailabilityDate] = useState<
        Date | undefined
    >();
    const [availabilityTime, setAvailabilityTime] = useState<
        string | undefined
    >();

    // Initialize date and time from task when opened
    useEffect(() => {
        if (task && open) {
            setData({
                title: task.title,
                description: task.description || '',
                assigned_to_id: task.assigned_to?.id?.toString() || '',
                priority: task.priority?.value || 'medium',
                status: task.status?.value || 'pending',
                due_at: task.due_at || '',
            });

            // Parse existing due_at to set date and time
            if (task.due_at) {
                try {
                    const dueDate = parseISO(task.due_at);
                    setAvailabilityDate(dueDate);
                    const hours = dueDate.getHours().toString().padStart(2, '0');
                    const minutes = dueDate
                        .getMinutes()
                        .toString()
                        .padStart(2, '0');
                    setAvailabilityTime(`${hours}:${minutes}`);
                } catch (error) {
                    console.error('Failed to parse due_at:', error);
                }
            }
        }
    }, [task, open]);

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!task) {
            return;
        }

        // Show optimistic toast immediately
        toast.loading('Updating task...', { id: 'task-update' });

        put(update(task.id).url, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success('Task updated successfully!', {
                    id: 'task-update',
                });
                onOpenChange(false);
            },
            onError: () => {
                toast.error('Failed to update task', { id: 'task-update' });
                const errorMessages = Object.values(errors).flat();
                errorMessages.forEach((error) => {
                    toast.error(error);
                });
            },
        });
    };

    const handleReset = () => {
        reset();
        setAvailabilityDate(undefined);
        setAvailabilityTime(undefined);
        onOpenChange(false);
    };

    const priorityOptions = [
        { value: 'high', label: 'High', state: 'bg-red-500' },
        { value: 'medium', label: 'Medium', state: 'bg-yellow-500' },
        { value: 'low', label: 'Low', state: 'bg-green-500' },
    ];

    const statusOptions = [
        { value: 'pending', label: 'Pending', state: 'bg-gray-500' },
        { value: 'in_progress', label: 'In Progress', state: 'bg-blue-500' },
        { value: 'completed', label: 'Completed', state: 'bg-green-500' },
    ];

    const today = new Date();

    // Sync date and time with form data
    useEffect(() => {
        if (availabilityDate && availabilityTime) {
            const [hours, minutes] = availabilityTime.split(':');
            const dateTimeString = `${format(availabilityDate, 'yyyy-MM-dd')} ${hours}:${minutes}:00`;
            setData((prev) => ({
                ...prev,
                due_at: dateTimeString,
            }));
        } else if (!availabilityDate && !availabilityTime) {
            setData((prev) => ({
                ...prev,
                due_at: '',
            }));
        }
    }, [availabilityDate, availabilityTime, setData]);

    // Generate all available time slots
    const availabilityTimeSlots = Array.from({ length: 48 }, (_, i) => {
        const hours = Math.floor(i / 2);
        const minutes = i % 2 === 0 ? '00' : '30';
        const time = `${hours.toString().padStart(2, '0')}:${minutes}`;
        return { time, available: true };
    });

    if (!task) {
        return null;
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="h-auto rounded-lg p-0 sm:w-[600px] sm:max-w-none [&_[data-slot=sheet-close]]:end-5 [&_[data-slot=sheet-close]]:top-4.5">
                <SheetHeader className="border-b border-border px-5 py-3.5">
                    <SheetTitle className="flex items-center gap-2.5">
                        <Edit className="size-4 text-primary" />
                        Edit Task
                    </SheetTitle>
                </SheetHeader>

                <SheetBody className="p-0">
                    <ScrollArea className="h-[calc(90dvh-11.75rem)] ps-3 pe-2 me-1">
                        <form
                            id="edit-task-form"
                            onSubmit={handleSubmit}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="title">Task Title *</Label>
                                <Textarea
                                    id="title"
                                    rows={3}
                                    placeholder="Enter task title..."
                                    value={data.title}
                                    onChange={(e) =>
                                        setData({
                                            ...data,
                                            title: e.target.value,
                                        })
                                    }
                                    className={cn(
                                        errors.title &&
                                            'border-destructive focus-visible:ring-destructive',
                                    )}
                                    required
                                />
                                {errors.title && (
                                    <p className="text-xs text-destructive">
                                        {errors.title}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    rows={4}
                                    placeholder="Enter task description..."
                                    value={data.description}
                                    onChange={(e) =>
                                        setData({
                                            ...data,
                                            description: e.target.value,
                                        })
                                    }
                                    className={cn(
                                        errors.description &&
                                            'border-destructive focus-visible:ring-destructive',
                                    )}
                                />
                                {errors.description && (
                                    <p className="text-xs text-destructive">
                                        {errors.description}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="assigned_to">Assign To</Label>
                                <Select
                                    value={data.assigned_to_id}
                                    onValueChange={(value) =>
                                        setData({
                                            ...data,
                                            assigned_to_id: value,
                                        })
                                    }
                                >
                                    <SelectTrigger
                                        id="assigned_to"
                                        className={cn(
                                            errors.assigned_to_id &&
                                                'border-destructive focus:ring-destructive',
                                        )}
                                    >
                                        <SelectValue placeholder="Select user..." />
                                    </SelectTrigger>
                                    <SelectContent className="z-[200]">
                                        {users.map((user) => (
                                            <SelectItem
                                                key={user.id}
                                                value={user.id.toString()}
                                            >
                                                {user.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.assigned_to_id && (
                                    <p className="text-xs text-destructive">
                                        {errors.assigned_to_id}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={data.priority}
                                    onValueChange={(value) =>
                                        setData({ ...data, priority: value })
                                    }
                                >
                                    <SelectTrigger
                                        id="priority"
                                        className={cn(
                                            errors.priority &&
                                                'border-destructive focus:ring-destructive',
                                        )}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="z-[200]">
                                        {priorityOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                <span className="flex items-center gap-2.5">
                                                    <span
                                                        className={cn(
                                                            'size-1.5 rounded-full',
                                                            option.state,
                                                        )}
                                                    />
                                                    <span>{option.label}</span>
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.priority && (
                                    <p className="text-xs text-destructive">
                                        {errors.priority}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={data.status}
                                    onValueChange={(value) =>
                                        setData({ ...data, status: value })
                                    }
                                >
                                    <SelectTrigger
                                        id="status"
                                        className={cn(
                                            errors.status &&
                                                'border-destructive focus:ring-destructive',
                                        )}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="z-[200]">
                                        {statusOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                <span className="flex items-center gap-2.5">
                                                    <span
                                                        className={cn(
                                                            'size-1.5 rounded-full',
                                                            option.state,
                                                        )}
                                                    />
                                                    <span>{option.label}</span>
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.status && (
                                    <p className="text-xs text-destructive">
                                        {errors.status}
                                    </p>
                                )}
                            </div>

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
                                                placeholder={!availabilityDate}
                                                className={cn(
                                                    'w-full',
                                                    errors.due_at &&
                                                        'border-destructive focus-visible:ring-destructive',
                                                )}
                                            >
                                                <CalendarIcon />
                                                {availabilityDate ? (
                                                    format(
                                                        availabilityDate,
                                                        'PPP',
                                                    ) +
                                                    (availabilityTime
                                                        ? ` - ${availabilityTime}`
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
                                                selected={availabilityDate}
                                                onSelect={(
                                                    newDate: Date | undefined,
                                                ) => {
                                                    if (newDate) {
                                                        setAvailabilityDate(
                                                            newDate,
                                                        );
                                                        if (!availabilityTime) {
                                                            setAvailabilityTime(
                                                                undefined,
                                                            );
                                                        }
                                                    }
                                                }}
                                                className="p-2 sm:pe-5"
                                                disabled={[{ before: today }]}
                                            />
                                            <div className="relative w-full max-sm:h-48 sm:w-40">
                                                <div className="absolute inset-0 py-4 max-sm:border-t">
                                                    <ScrollArea className="h-full sm:border-s">
                                                        <div className="space-y-3">
                                                            <div className="flex h-5 shrink-0 items-center px-5">
                                                                <p className="text-sm font-medium">
                                                                    {availabilityDate
                                                                        ? format(
                                                                              availabilityDate,
                                                                              'EEEE, d',
                                                                          )
                                                                        : 'Pick a date'}
                                                                </p>
                                                            </div>
                                                            <div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
                                                                {availabilityTimeSlots.map(
                                                                    ({
                                                                        time: timeSlot,
                                                                        available,
                                                                    }) => (
                                                                        <Button
                                                                            key={
                                                                                timeSlot
                                                                            }
                                                                            type="button"
                                                                            variant={
                                                                                availabilityTime ===
                                                                                timeSlot
                                                                                    ? 'primary'
                                                                                    : 'outline'
                                                                            }
                                                                            size="sm"
                                                                            className="w-full"
                                                                            onClick={() =>
                                                                                setAvailabilityTime(
                                                                                    timeSlot,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                !available
                                                                            }
                                                                        >
                                                                            {
                                                                                timeSlot
                                                                            }
                                                                        </Button>
                                                                    ),
                                                                )}
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
                        </form>
                    </ScrollArea>
                </SheetBody>
                <SheetFooter className="flex items-center border-t border-border px-5 py-3.5 justify-end">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            type="button"
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="edit-task-form"
                            disabled={processing}
                        >
                            {processing ? 'Updating...' : 'Update Task'}
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
