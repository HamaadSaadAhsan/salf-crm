import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ResponsiveSelect, useResponsiveSelectStyles } from '@/components/responsive-select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Sheet,
    SheetBody,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { User } from '@/types';
import { Task } from '@/types/task';
import { router } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Check, ChevronsUpDown, Mail, Phone, Users as UsersIcon, X, Clock } from 'lucide-react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type UserRole = 'support-agent' | 'senior-support-agent' | 'super-admin' | 'sales-rep';

interface LeadTaskSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadId: string;
    task?: Task | null;
    users?: User[];
    currentUserId?: number;
    userRole?: UserRole;
    onTaskCompleted?: () => void;
}

const TASK_TYPES = [
    { value: 'call', label: 'Call', icon: Phone, color: 'text-green-500' },
    { value: 'email', label: 'Email', icon: Mail, color: 'text-cyan-500' },
    { value: 'meeting', label: 'Meeting', icon: UsersIcon, color: 'text-orange-500' },
] as const;

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low', color: 'bg-green-500' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
    { value: 'high', label: 'High', color: 'bg-orange-500' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
] as const;

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending', color: 'bg-gray-500' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
    { value: 'completed', label: 'Completed', color: 'bg-green-500' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
] as const;

// CRO working hours: 10:00 AM to 2:00 AM (two shifts)
const TIME_SLOTS = [
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
    '22:00', '22:30', '23:00', '23:30', '00:00', '00:30',
    '01:00', '01:30', '02:00',
];

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
    const isCRO = userRole === 'support-agent' || userRole === 'senior-support-agent';
    const isAdvisor = userRole === 'sales-rep';
    const canAssignUsers = userRole === 'senior-support-agent' || userRole === 'super-admin';
    const isMobile = useIsMobile();
    const { itemClassName, listClassName, inputClassName, inputWrapperClassName } = useResponsiveSelectStyles();

    // Filter collaborators - CROs can only add other CROs as collaborators
    const availableCollaborators = useMemo(() => {
        if (!isCRO) return [];
        return users.filter(user =>
            user.id !== currentUserId &&
            user.roles?.some(role =>
                role.name === 'support-agent' || role.name === 'senior-support-agent'
            )
        );
    }, [users, currentUserId, isCRO]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: '',
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
    const [collaboratorsOpen, setCollaboratorsOpen] = useState(false);
    const [collaboratorSearch, setCollaboratorSearch] = useState('');

    // Initialize form data when sheet opens
    useEffect(() => {
        if (open) {
            if (isEditMode && task) {
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

                if (task.due_at) {
                    const date = parseISO(task.due_at);
                    setDueDate(date);
                    setDueTime(format(date, 'HH:mm'));
                }
            } else {
                setFormData({
                    title: '',
                    description: '',
                    type: 'follow_up',
                    priority: 'medium',
                    status: 'pending',
                    assigned_to_id: !canAssignUsers ? (currentUserId || null) : null,
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
    }, [open, task, isEditMode, leadId, currentUserId, canAssignUsers]);

    // Sync date and time
    useEffect(() => {
        if (dueDate && dueTime) {
            const [hours, minutes] = dueTime.split(':');
            const dateTimeString = `${format(dueDate, 'yyyy-MM-dd')} ${hours}:${minutes}:00`;
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
                toast.success(isEditMode ? 'Follow-up updated!' : 'Follow-up scheduled!');
                if (formData.status === 'completed' && onTaskCompleted) {
                    onTaskCompleted();
                }
                onOpenChange(false);
            },
            onError: (errors) => {
                setErrors(errors);
                toast.error('Failed to save follow-up');
            },
            onFinish: () => setProcessing(false),
        });
    };

    const toggleCollaborator = (userId: number) => {
        setFormData(prev => ({
            ...prev,
            collaborators: prev.collaborators.includes(userId)
                ? prev.collaborators.filter(id => id !== userId)
                : [...prev.collaborators, userId],
        }));
    };

    const removeCollaborator = (userId: number) => {
        setFormData(prev => ({
            ...prev,
            collaborators: prev.collaborators.filter(id => id !== userId),
        }));
    };

    // Get selected collaborators as User objects
    const selectedCollaborators = useMemo(() => {
        return availableCollaborators.filter(user => formData.collaborators.includes(user.id));
    }, [availableCollaborators, formData.collaborators]);

    // Filter available collaborators by search term
    const filteredCollaborators = useMemo(() => {
        if (!collaboratorSearch.trim()) return availableCollaborators;
        return availableCollaborators.filter(user =>
            user.name.toLowerCase().includes(collaboratorSearch.toLowerCase())
        );
    }, [availableCollaborators, collaboratorSearch]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className={cn(
                    'p-0 sm:w-[540px] sm:max-w-none [&_[data-slot=sheet-close]]:end-5 [&_[data-slot=sheet-close]]:top-4.5',
                    // Full-screen on mobile, rounded sheet on desktop
                    isMobile ? 'inset-0 h-full w-full rounded-none' : 'inset-5 start-auto h-auto rounded-lg',
                )}
            >
                <SheetHeader className="border-b border-border px-5 py-3.5">
                    <SheetTitle className="flex items-center gap-2.5">
                        <Clock className="size-4 text-primary" />
                        {isEditMode ? 'Edit Follow-up' : 'Schedule Follow-up'}
                    </SheetTitle>
                </SheetHeader>

                <SheetBody className="p-0">
                    <ScrollArea className="h-[calc(100dvh-11.75rem)] px-5 py-4">
                        <form id="task-form" onSubmit={handleSubmit} className="space-y-5">
                            {/* Title */}
                            <div className="space-y-2">
                                <Label htmlFor="title">What needs to be done? *</Label>
                                <Textarea
                                    id="title"
                                    rows={2}
                                    placeholder="e.g., Call back to discuss pricing..."
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className={cn(errors.title && 'border-destructive focus-visible:ring-destructive')}
                                    required
                                />
                                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                            </div>

                            {/* Type & Priority Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type">Type (Optional)</Label>
                                    <Select value={formData.type || undefined} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                                        <SelectTrigger id="type">
                                            <SelectValue placeholder="Select type (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Types</SelectLabel>
                                                {TASK_TYPES.map((type) => {
                                                    const Icon = type.icon;
                                                    return (
                                                        <SelectItem key={type.value} value={type.value}>
                                                            <span className="flex items-center gap-2">
                                                                <Icon className={cn('size-4', type.color)} />
                                                                {type.label}
                                                            </span>
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="priority">Priority</Label>
                                    <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                                        <SelectTrigger id="priority">
                                            <SelectValue placeholder="Select priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PRIORITY_OPTIONS.map((priority) => (
                                                <SelectItem key={priority.value} value={priority.value}>
                                                    <span className="flex items-center gap-2">
                                                        <span className={cn('size-2 rounded-full', priority.color)} />
                                                        {priority.label}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Due Date */}
                            <div className="space-y-2">
                                <Label>When?</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={cn(
                                                'w-full justify-start text-left font-normal',
                                                !dueDate && 'text-muted-foreground',
                                                errors.due_at && 'border-destructive',
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 size-4" />
                                            {dueDate ? `${format(dueDate, 'PPP')} at ${dueTime}` : 'Pick date and time'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <div className="flex max-sm:flex-col">
                                            <Calendar
                                                mode="single"
                                                selected={dueDate}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        setDueDate(date);
                                                        if (!dueTime) setDueTime('09:00');
                                                    }
                                                }}
                                                disabled={[{ before: new Date() }]}
                                                className="p-3"
                                            />
                                            <div className="border-t p-3 sm:border-t-0 sm:border-l">
                                                <p className="mb-2 text-sm font-medium">{dueDate ? format(dueDate, 'EEE, MMM d') : 'Select time'}</p>
                                                <ScrollArea className="h-48">
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        {TIME_SLOTS.map((time) => (
                                                            <Button
                                                                key={time}
                                                                type="button"
                                                                variant={dueTime === time ? 'primary' : 'outline'}
                                                                size="sm"
                                                                className="w-full"
                                                                onClick={() => setDueTime(time)}
                                                            >
                                                                {time}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                {errors.due_at && <p className="text-xs text-destructive">{errors.due_at}</p>}
                            </div>

                            {/* Status - Only show in edit mode */}
                            {isEditMode && (
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                                        <SelectTrigger id="status">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STATUS_OPTIONS.map((status) => (
                                                <SelectItem key={status.value} value={status.value}>
                                                    <span className="flex items-center gap-2">
                                                        <span className={cn('size-2 rounded-full', status.color)} />
                                                        {status.label}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Assigned To - Only for senior roles */}
                            {canAssignUsers && users.length > 0 && (
                                <div className="space-y-2">
                                    <Label htmlFor="assigned_to">Assign To</Label>
                                    <Select
                                        value={formData.assigned_to_id?.toString() || ''}
                                        onValueChange={(value) => setFormData({ ...formData, assigned_to_id: value || null })}
                                    >
                                        <SelectTrigger id="assigned_to">
                                            <SelectValue placeholder="Select user" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.map((user) => (
                                                <SelectItem key={user.id} value={user.id.toString()}>
                                                    {user.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Collaborators - Only for CROs, show other CROs */}
                            {isCRO && !isAdvisor && availableCollaborators.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Collaborators</Label>
                                    <div className="space-y-2.5">
                                        {/* Selected collaborators badges */}
                                        {selectedCollaborators.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedCollaborators.map((user) => (
                                                    <Badge
                                                        key={user.id}
                                                        variant="secondary"
                                                        appearance="outline"
                                                        size="md"
                                                        className="gap-1.5 pe-1.5"
                                                    >
                                                        <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </span>
                                                        {user.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeCollaborator(user.id)}
                                                            className="flex size-4 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        >
                                                            <X className="size-3" />
                                                            <span className="sr-only">Remove {user.name}</span>
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        {/* Searchable combobox */}
                                        <ResponsiveSelect
                                            open={collaboratorsOpen}
                                            onOpenChange={setCollaboratorsOpen}
                                            trigger={
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={collaboratorsOpen}
                                                    className={cn('w-full justify-between font-normal', isMobile && 'h-11')}
                                                >
                                                    <span className="text-muted-foreground">
                                                        {selectedCollaborators.length > 0
                                                            ? `${selectedCollaborators.length} collaborator${selectedCollaborators.length > 1 ? 's' : ''} selected`
                                                            : 'Search and add collaborators...'}
                                                    </span>
                                                    <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                                                </Button>
                                            }
                                            title="Add Collaborators"
                                            contentClassName={isMobile ? 'w-full' : 'w-[calc(var(--radix-popover-trigger-width))]'}
                                        >
                                            <Command shouldFilter={false} className={inputWrapperClassName}>
                                                <CommandInput
                                                    placeholder="Search collaborators..."
                                                    value={collaboratorSearch}
                                                    onValueChange={setCollaboratorSearch}
                                                    className={inputClassName}
                                                />
                                                <CommandList className={listClassName}>
                                                    <CommandEmpty>No collaborators found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {filteredCollaborators.map((user) => {
                                                            const isSelected = formData.collaborators.includes(user.id);
                                                            return (
                                                                <CommandItem
                                                                    key={user.id}
                                                                    value={user.name}
                                                                    onSelect={() => toggleCollaborator(user.id)}
                                                                    className={cn(itemClassName, 'gap-2')}
                                                                >
                                                                    <span
                                                                        className={cn(
                                                                            'flex items-center justify-center rounded-full bg-primary/10 font-medium text-primary',
                                                                            isMobile ? 'size-7 text-xs' : 'size-5 text-[10px]',
                                                                        )}
                                                                    >
                                                                        {user.name.charAt(0).toUpperCase()}
                                                                    </span>
                                                                    <span className="flex-1">{user.name}</span>
                                                                    <Check
                                                                        className={cn('size-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')}
                                                                    />
                                                                </CommandItem>
                                                            );
                                                        })}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </ResponsiveSelect>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="description">Notes</Label>
                                <Textarea
                                    id="description"
                                    rows={3}
                                    placeholder="Additional details..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </form>
                    </ScrollArea>
                </SheetBody>

                <SheetFooter className="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5">
                    <Button variant="outline" onClick={() => onOpenChange(false)} type="button" disabled={processing}>
                        Cancel
                    </Button>
                    <Button type="submit" form="task-form" disabled={processing}>
                        {processing ? 'Saving...' : isEditMode ? 'Update' : 'Schedule'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
