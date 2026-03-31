import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiCalendarLine } from '@remixicon/react';
import { format } from 'date-fns';
import { Loader2, Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { CommandList } from 'cmdk';
import { StartHour, EndHour, DefaultStartHour } from '@/components/ui/calendar/constants';

interface CreateEventDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
    defaultDate?: Date;
}

interface UserOption {
    id: number;
    name: string;
}

interface LeadOption {
    id: number;
    name: string;
}

const TASK_TYPES = [
    { value: 'follow_up', label: 'Follow Up' },
    { value: 'call', label: 'Call' },
    { value: 'message', label: 'Message' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'email', label: 'Email' },
    { value: 'other', label: 'Other' },
];

const PRIORITIES = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

export function CreateEventDialog({ isOpen, onClose, onCreated, defaultDate }: CreateEventDialogProps) {
    const [tab, setTab] = useState<'task' | 'follow_up'>('task');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Task fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState<Date>(new Date());
    const [dueTime, setDueTime] = useState(`${DefaultStartHour}:00`);
    const [priority, setPriority] = useState('medium');
    const [taskType, setTaskType] = useState('follow_up');
    const [assignedToId, setAssignedToId] = useState<number | null>(null);

    // Follow-up fields
    const [leadId, setLeadId] = useState<number | null>(null);
    const [followUpDate, setFollowUpDate] = useState<Date>(new Date());
    const [followUpTime, setFollowUpTime] = useState(`${DefaultStartHour}:00`);

    // Lookup data
    const [users, setUsers] = useState<UserOption[]>([]);
    const [leads, setLeads] = useState<LeadOption[]>([]);
    const [leadSearch, setLeadSearch] = useState('');
    const [loadingLeads, setLoadingLeads] = useState(false);

    // Popover states
    const [dueDateOpen, setDueDateOpen] = useState(false);
    const [followUpDateOpen, setFollowUpDateOpen] = useState(false);
    const [leadPopoverOpen, setLeadPopoverOpen] = useState(false);

    const selectedLeadName = useMemo(() => leads.find((l) => l.id === leadId)?.name, [leads, leadId]);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            resetForm();
            if (defaultDate) {
                setDueDate(defaultDate);
                setFollowUpDate(defaultDate);
            }
        }
    }, [isOpen, defaultDate]);

    useEffect(() => {
        if (isOpen && tab === 'follow_up') {
            fetchLeads(leadSearch);
        }
    }, [isOpen, tab, leadSearch]);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/api/follow-up-calendar/users');
            setUsers(res.users);
        } catch {
            setUsers([]);
        }
    };

    const fetchLeads = useCallback(async (search: string) => {
        setLoadingLeads(true);
        try {
            const res = await api.get('/api/follow-up-calendar/leads', { search });
            setLeads(res.leads);
        } catch {
            setLeads([]);
        } finally {
            setLoadingLeads(false);
        }
    }, []);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDueDate(defaultDate ?? new Date());
        setDueTime(`${DefaultStartHour}:00`);
        setPriority('medium');
        setTaskType('follow_up');
        setAssignedToId(null);
        setLeadId(null);
        setFollowUpDate(defaultDate ?? new Date());
        setFollowUpTime(`${DefaultStartHour}:00`);
        setLeadSearch('');
        setError(null);
    };

    const timeOptions = useMemo(() => {
        const options = [];
        for (let hour = StartHour; hour <= EndHour; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const label = format(new Date(2000, 0, 1, hour, minute), 'h:mm a');
                options.push({ value, label });
            }
        }
        return options;
    }, []);

    const buildDateTime = (date: Date, time: string): string => {
        const d = new Date(date);
        const [hours = 0, minutes = 0] = time.split(':').map(Number);
        d.setHours(hours, minutes, 0, 0);
        return d.toISOString();
    };

    const handleSaveTask = async () => {
        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await api.post('/api/follow-up-calendar/tasks', {
                title: title.trim(),
                description: description.trim() || null,
                due_at: buildDateTime(dueDate, dueTime),
                priority,
                type: taskType,
                assigned_to_id: assignedToId,
            });
            onCreated();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to create task');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveFollowUp = async () => {
        if (!leadId) {
            setError('Please select a lead');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await api.post('/api/follow-up-calendar/follow-ups', {
                lead_id: leadId,
                next_follow_up_at: buildDateTime(followUpDate, followUpTime),
            });
            onCreated();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to set follow-up');
        } finally {
            setSaving(false);
        }
    };

    const handleSave = () => {
        if (tab === 'task') {
            handleSaveTask();
        } else {
            handleSaveFollowUp();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Create Event</DialogTitle>
                    <DialogDescription className="sr-only">Create a new task or schedule a lead follow-up</DialogDescription>
                </DialogHeader>

                <Tabs value={tab} onValueChange={(v) => setTab(v as 'task' | 'follow_up')}>
                    <TabsList className="w-full">
                        <TabsTrigger value="task" className="flex-1">
                            Task
                        </TabsTrigger>
                        <TabsTrigger value="follow_up" className="flex-1">
                            Lead Follow-up
                        </TabsTrigger>
                    </TabsList>

                    {error && (
                        <div className="bg-destructive/15 text-destructive mt-3 rounded-md px-3 py-2 text-sm">{error}</div>
                    )}

                    <TabsContent value="task" className="mt-3 space-y-4">
                        <div className="*:not-first:mt-1.5">
                            <Label htmlFor="task-title">Title</Label>
                            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Call back John" />
                        </div>

                        <div className="*:not-first:mt-1.5">
                            <Label htmlFor="task-description">Description</Label>
                            <Textarea
                                id="task-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                placeholder="Optional details..."
                            />
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-1 *:not-first:mt-1.5">
                                <Label>Due Date</Label>
                                <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="bg-background hover:bg-background border-input w-full justify-between px-3 font-normal"
                                        >
                                            <span className="truncate">{format(dueDate, 'PPP')}</span>
                                            <RiCalendarLine size={16} className="text-muted-foreground/80 shrink-0" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={dueDate}
                                            defaultMonth={dueDate}
                                            onSelect={(date) => {
                                                if (date) {
                                                    setDueDate(date);
                                                    setDueDateOpen(false);
                                                }
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="min-w-28 *:not-first:mt-1.5">
                                <Label>Time</Label>
                                <Select value={dueTime} onValueChange={setDueTime}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {timeOptions.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-1 *:not-first:mt-1.5">
                                <Label>Type</Label>
                                <Select value={taskType} onValueChange={setTaskType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TASK_TYPES.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>
                                                {t.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex-1 *:not-first:mt-1.5">
                                <Label>Priority</Label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRIORITIES.map((p) => (
                                            <SelectItem key={p.value} value={p.value}>
                                                {p.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="*:not-first:mt-1.5">
                            <Label>Assign to</Label>
                            <Select
                                value={assignedToId?.toString() ?? ''}
                                onValueChange={(v) => setAssignedToId(v ? Number(v) : null)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Self (default)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map((u) => (
                                        <SelectItem key={u.id} value={u.id.toString()}>
                                            {u.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </TabsContent>

                    <TabsContent value="follow_up" className="mt-3 space-y-4">
                        <div className="*:not-first:mt-1.5">
                            <Label>Lead</Label>
                            <Popover open={leadPopoverOpen} onOpenChange={setLeadPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={leadPopoverOpen}
                                        className="bg-background hover:bg-background border-input w-full justify-between px-3 font-normal"
                                    >
                                        <span className={cn('truncate', !leadId && 'text-muted-foreground')}>
                                            {selectedLeadName || 'Search and select a lead...'}
                                        </span>
                                        <Search className="text-muted-foreground/80 size-4 shrink-0" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command shouldFilter={false}>
                                        <CommandInput
                                            placeholder="Search leads..."
                                            value={leadSearch}
                                            onValueChange={setLeadSearch}
                                        />
                                        <CommandList>
                                            {loadingLeads ? (
                                                <div className="flex items-center justify-center py-6">
                                                    <Loader2 className="text-muted-foreground size-4 animate-spin" />
                                                </div>
                                            ) : (
                                                <>
                                                    <CommandEmpty>No leads found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {leads.map((lead) => (
                                                            <CommandItem
                                                                key={lead.id}
                                                                value={lead.id.toString()}
                                                                onSelect={() => {
                                                                    setLeadId(lead.id);
                                                                    setLeadPopoverOpen(false);
                                                                }}
                                                            >
                                                                {lead.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </>
                                            )}
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-1 *:not-first:mt-1.5">
                                <Label>Follow-up Date</Label>
                                <Popover open={followUpDateOpen} onOpenChange={setFollowUpDateOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="bg-background hover:bg-background border-input w-full justify-between px-3 font-normal"
                                        >
                                            <span className="truncate">{format(followUpDate, 'PPP')}</span>
                                            <RiCalendarLine size={16} className="text-muted-foreground/80 shrink-0" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={followUpDate}
                                            defaultMonth={followUpDate}
                                            onSelect={(date) => {
                                                if (date) {
                                                    setFollowUpDate(date);
                                                    setFollowUpDateOpen(false);
                                                }
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="min-w-28 *:not-first:mt-1.5">
                                <Label>Time</Label>
                                <Select value={followUpTime} onValueChange={setFollowUpTime}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {timeOptions.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button variant="mono" onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                        {tab === 'task' ? 'Create Task' : 'Set Follow-up'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
