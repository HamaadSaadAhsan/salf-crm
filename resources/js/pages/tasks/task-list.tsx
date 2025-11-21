import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTable } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { complete, destroy } from '@/routes/tasks';
import { Task, User } from '@/types';
import { router } from '@inertiajs/react';
import {
    ColumnDef,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    PaginationState,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import {
    AlertCircle,
    Edit,
    Filter,
    MoreVertical,
    Search,
    Trash,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { EditTaskSheet } from './edit-task-sheet';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TaskListProps {
    tasks: Task[];
    users: User[];
}

export function TaskList({ tasks, users }: TaskListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
    const [editTaskSheetOpen, setEditTaskSheetOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Delete confirmation dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [taskPendingDelete, setTaskPendingDelete] = useState<Task | null>(null);

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const [sorting, setSorting] = useState<SortingState>([
        { id: 'due_at', desc: false },
    ]);

    // Close edit sheet if the selected task is deleted
    useEffect(() => {
        if (selectedTask && editTaskSheetOpen) {
            // Check if the selected task still exists in the tasks array
            const taskStillExists = tasks.some((t) => t.id === selectedTask.id);

            if (!taskStillExists) {
                // Task was deleted, close the sheet
                setEditTaskSheetOpen(false);
                setSelectedTask(null);
            }
        }
    }, [tasks, selectedTask, editTaskSheetOpen]);

    const handleComplete = (task: Task) => {
        router.patch(
            complete(task.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        task.status === 'completed'
                            ? 'Task marked as incomplete'
                            : 'Task marked as complete',
                    );
                },
                onError: () => {
                    toast.error('Failed to update task status');
                },
            },
        );
    };

    const handleEdit = (task: Task) => {
        setSelectedTask(task);
        setEditTaskSheetOpen(true);
    };

    const handleDelete = (task: Task) => {
        setTaskPendingDelete(task);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (!taskPendingDelete) {
            return;
        }
        router.delete(destroy(taskPendingDelete.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Task deleted successfully');
            },
            onError: () => {
                toast.error('Failed to delete task');
            },
            onFinish: () => {
                setDeleteDialogOpen(false);
                setTaskPendingDelete(null);
            },
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <Badge variant="success" appearance="light">
                        Completed
                    </Badge>
                );
            case 'in_progress':
                return (
                    <Badge variant="info" appearance="light">
                        In Progress
                    </Badge>
                );
            case 'pending':
            default:
                return <Badge variant="secondary">Pending</Badge>;
        }
    };

    const getPriorityBadge = (priority: Task['priority']) => {
        switch (priority) {
            case 'high':
                return (
                    <Badge
                        variant="destructive"
                        className="px-1.5 py-0.5 text-xs"
                    >
                        High
                    </Badge>
                );
            case 'medium':
                return (
                    <Badge className="bg-yellow-500 px-1.5 py-0.5 text-xs">
                        Medium
                    </Badge>
                );
            case 'low':
                return (
                    <Badge className="bg-green-500 px-1.5 py-0.5 text-xs">
                        Low
                    </Badge>
                );
        }
    };

    const formatDate = (date: string | null) => {
        if (!date) {
            return '-';
        }
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const isOverdue = (task: Task) => {
        if (!task.due_at || task.completed_at) {
            return false;
        }
        return new Date(task.due_at) < new Date();
    };

    // Apply filters
    const filteredData = useMemo(() => {
        return tasks.filter((task) => {
            // Filter by status
            const matchesStatus =
                !selectedStatuses?.length ||
                selectedStatuses.includes(task.status);

            // Filter by priority
            const matchesPriority =
                !selectedPriorities?.length ||
                selectedPriorities.includes(task.priority);

            // Filter by search query
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                !searchQuery ||
                task.title.toLowerCase().includes(searchLower) ||
                task.description?.toLowerCase().includes(searchLower);

            return matchesStatus && matchesPriority && matchesSearch;
        });
    }, [tasks, searchQuery, selectedStatuses, selectedPriorities]);

    const statusCounts = useMemo(() => {
        return tasks.reduce(
            (acc, task) => {
                const status = task.status;
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>,
        );
    }, [tasks]);

    const priorityCounts = useMemo(() => {
        return tasks.reduce(
            (acc, task) => {
                acc[task.priority] = (acc[task.priority] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>,
        );
    }, [tasks]);

    const handleStatusChange = (checked: boolean, value: string) => {
        setSelectedStatuses((prev = []) =>
            checked ? [...prev, value] : prev.filter((v) => v !== value),
        );
    };

    const handlePriorityChange = (checked: boolean, value: string) => {
        setSelectedPriorities((prev = []) =>
            checked ? [...prev, value] : prev.filter((v) => v !== value),
        );
    };

    const columns = useMemo<ColumnDef<Task>[]>(
        () => [
            {
                accessorKey: 'status',
                id: 'status-toggle',
                header: '',
                cell: ({ row }) => {
                    const task = row.original;
                    return (
                        <div className="flex items-center justify-center ps-2.5">
                            <Checkbox
                                size="sm"
                                id={task.id.toString()}
                                checked={task.status === 'completed'}
                                onCheckedChange={() => handleComplete(task)}
                            />
                        </div>
                    );
                },
                enableSorting: false,
                size: 30,
                enableHiding: false,
                enableResizing: false,
            },
            {
                accessorKey: 'title',
                id: 'title',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Task"
                        visibility={true}
                        column={column}
                    />
                ),
                cell: ({ row }) => {
                    const task = row.original;
                    const taskIsOverdue = isOverdue(task);
                    const isDueSoon = task.due_at && !task.completed_at && !taskIsOverdue
                        ? new Date(task.due_at).getTime() - new Date().getTime() < 2 * 60 * 60 * 1000
                        : false;

                    return (
                        <div className="inline-flex flex-col gap-0.5 pe-2.5">
                            <div className="flex items-center gap-1.5">
                                <div
                                    className={cn(
                                        'font-medium',
                                        task.status === 'completed' &&
                                            'line-through',
                                        taskIsOverdue && 'text-destructive',
                                        isDueSoon && !taskIsOverdue && 'text-orange-500',
                                    )}
                                >
                                    {task.title}
                                </div>
                                {taskIsOverdue && (
                                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                        <AlertCircle className="mr-0.5 h-3 w-3" />
                                        Overdue
                                    </Badge>
                                )}
                                {isDueSoon && !taskIsOverdue && (
                                    <Badge className="h-5 bg-orange-500 px-1.5 text-[10px] hover:bg-orange-600">
                                        <AlertCircle className="mr-0.5 h-3 w-3" />
                                        Due Soon
                                    </Badge>
                                )}
                            </div>
                            {task.description && (
                                <div className="line-clamp-1 text-sm text-muted-foreground">
                                    {task.description}
                                </div>
                            )}
                        </div>
                    );
                },
                size: 225,
                enableSorting: true,
                enableHiding: false,
                enableResizing: true,
            },
            {
                accessorKey: 'assigned_to',
                id: 'assigned_to',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Assigned To"
                        visibility={true}
                        column={column}
                    />
                ),
                cell: ({ row }) => {
                    return (
                        <div className="flex gap-1.5 truncate overflow-hidden">
                            <div
                                key={row.original.assigned_to?.id}
                                className="group flex cursor-pointer items-center gap-1 rounded-full border border-border bg-accent/50 px-1"
                            >
                                <Avatar className="my-1 size-4">
                                    <AvatarImage
                                        src={toAbsoluteUrl(
                                            row.original.assigned_to?.avatar ||
                                                '',
                                        )}
                                        alt={row.original?.assigned_to?.name}
                                    />
                                    <AvatarFallback className="border-0 bg-green-500 text-[11px] font-semibold text-white">
                                        {row.original?.assigned_to?.name.charAt(
                                            0,
                                        )}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="h-full border-r border-border"></div>

                                <span className="max-w-[100px] truncate text-xs group-hover:text-primary">
                                    {row.original?.assigned_to?.name}
                                </span>
                            </div>
                        </div>
                    );
                },
                size: 150,
                enableSorting: true,
                enableHiding: true,
                enableResizing: true,
            },
            {
                accessorKey: 'priority',
                id: 'priority',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Priority"
                        visibility={true}
                        column={column}
                    />
                ),
                cell: ({ row }) => {
                    const task = row.original;
                    return task ? (
                        task.priority ? (
                            <Badge
                                variant={
                                    task.priority === 'high'
                                        ? 'destructive'
                                        : task.priority === 'medium'
                                          ? 'warning'
                                          : 'success'
                                }
                                appearance="light"
                                className="px-1.5 py-0.5 text-xs"
                            >
                                {task.priority.charAt(0).toUpperCase() +
                                    task.priority.slice(1)}
                            </Badge>
                        ) : (
                            <span className="text-muted-foreground">None</span>
                        )
                    ) : (
                        <span className="text-muted-foreground">-</span>
                    );
                },
                size: 100,
                enableSorting: true,
                enableHiding: true,
                enableResizing: true,
            },
            {
                accessorKey: 'due_at',
                id: 'due_at',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Due Date"
                        visibility={true}
                        column={column}
                    />
                ),
                cell: ({ row }) => {
                    const task = row.original;
                    return (
                        <span
                            className={cn(
                                isOverdue(task) && 'text-destructive',
                            )}
                        >
                            {formatDate(task.due_at ?? null)}
                        </span>
                    );
                },
                size: 150,
                enableSorting: true,
                enableHiding: true,
                enableResizing: true,
            },
            {
                accessorKey: 'status',
                id: 'status',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Status"
                        visibility={true}
                        column={column}
                    />
                ),
                cell: ({ row }) => getStatusBadge(row.original.status),
                size: 120,
                enableSorting: true,
                enableHiding: true,
                enableResizing: true,
            },
            {
                accessorKey: 'actions',
                id: 'actions',
                header: () => <></>,
                cell: ({ row }) => {
                    const task = row.original;
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="pointer-events-none opacity-0 transition-opacity duration-300 group-hover/row:pointer-events-auto group-hover/row:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:opacity-100"
                                >
                                    <MoreVertical className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="bottom">
                                <DropdownMenuItem
                                    onClick={() => handleEdit(task)}
                                >
                                    <Edit className="mr-2 size-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleDelete(task)}
                                    className="text-red-600"
                                >
                                    <Trash className="mr-2 size-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
                size: 60,
                enableSorting: false,
                enableHiding: false,
                enableResizing: false,
            },
        ],
        [],
    );

    const table = useReactTable({
        data: filteredData,
        columns,
        state: {
            sorting,
            pagination,
        },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <DataGrid
            table={table}
            recordCount={filteredData?.length || 0}
            tableClassNames={{
                bodyRow: 'group/row',
            }}
            tableLayout={{
                dense: true,
                columnsPinnable: true,
                columnsResizable: true,
                columnsMovable: true,
                columnsVisibility: true,
            }}
        >
            <Card className="border-none shadow-none">
                <CardHeader className="px-4 py-3">
                    <div className="flex gap-2">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-7 w-48 px-2.5 ps-9 text-xs file:me-2.5 file:pe-2.5"
                            />
                            {searchQuery.length > 0 && (
                                <Button
                                    variant="ghost"
                                    className="absolute end-1.5 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
                                    onClick={() => setSearchQuery('')}
                                >
                                    <X className="size-3.5" />
                                </Button>
                            )}
                        </div>

                        {/* Status Filter */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button size="sm" variant="outline">
                                    <Filter className="size-3.5" />
                                    Status
                                    {selectedStatuses.length > 0 && (
                                        <Badge size="sm" variant="outline">
                                            {selectedStatuses.length}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search status..." />
                                    <CommandList>
                                        <CommandEmpty>
                                            No status found.
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {[
                                                {
                                                    id: 'pending',
                                                    name: 'Pending',
                                                },
                                                {
                                                    id: 'in_progress',
                                                    name: 'In Progress',
                                                },
                                                {
                                                    id: 'completed',
                                                    name: 'Completed',
                                                },
                                            ].map((status) => {
                                                const count =
                                                    statusCounts[status.id] ||
                                                    0;
                                                return (
                                                    <CommandItem
                                                        key={status.id}
                                                        value={status.id}
                                                        className="flex items-center gap-2.5"
                                                    >
                                                        <Checkbox
                                                            id={status.id}
                                                            checked={selectedStatuses.includes(
                                                                status.id,
                                                            )}
                                                            onCheckedChange={(
                                                                checked,
                                                            ) =>
                                                                handleStatusChange(
                                                                    checked ===
                                                                        true,
                                                                    status.id,
                                                                )
                                                            }
                                                        />
                                                        <Label
                                                            htmlFor={status.id}
                                                            className="flex grow items-center justify-between gap-1.5 font-normal"
                                                        >
                                                            {getStatusBadge(
                                                                status.id as Task['status'],
                                                            )}
                                                            <span className="me-2.5 font-semibold text-muted-foreground">
                                                                {count}
                                                            </span>
                                                        </Label>
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        {/* Priority Filter */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button size="sm" variant="outline">
                                    <AlertCircle className="size-3.5" />
                                    Priority
                                    {selectedPriorities.length > 0 && (
                                        <Badge size="sm" variant="outline">
                                            {selectedPriorities.length}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search priority..." />
                                    <CommandList>
                                        <CommandEmpty>
                                            No priority found.
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {[
                                                { id: 'high', name: 'High' },
                                                {
                                                    id: 'medium',
                                                    name: 'Medium',
                                                },
                                                { id: 'low', name: 'Low' },
                                            ].map((priority) => {
                                                const count =
                                                    priorityCounts[
                                                        priority.id
                                                    ] || 0;
                                                return (
                                                    <CommandItem
                                                        key={priority.id}
                                                        value={priority.id}
                                                        className="flex items-center gap-2.5"
                                                    >
                                                        <Checkbox
                                                            id={priority.id}
                                                            checked={selectedPriorities.includes(
                                                                priority.id,
                                                            )}
                                                            onCheckedChange={(
                                                                checked,
                                                            ) =>
                                                                handlePriorityChange(
                                                                    checked ===
                                                                        true,
                                                                    priority.id,
                                                                )
                                                            }
                                                            size="sm"
                                                        />
                                                        <Label
                                                            htmlFor={
                                                                priority.id
                                                            }
                                                            className="flex grow items-center justify-between gap-1.5 font-normal"
                                                        >
                                                            {getPriorityBadge(
                                                                priority.id as Task['priority'],
                                                            )}
                                                            <span className="me-2.5 font-semibold text-muted-foreground">
                                                                {count}
                                                            </span>
                                                        </Label>
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>

                <CardTable>
                    <ScrollArea>
                        <DataGridTable />
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </CardTable>

                <CardFooter className="px-4 py-0">
                    <DataGridPagination className="py-1" />
                </CardFooter>
            </Card>

            <EditTaskSheet
                open={editTaskSheetOpen}
                onOpenChange={setEditTaskSheetOpen}
                task={selectedTask}
                users={users}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
                setDeleteDialogOpen(open);
                if (!open) {
                    setTaskPendingDelete(null);
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete task</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this task{taskPendingDelete?.title ? `: "${taskPendingDelete.title}"` : ''}? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setTaskPendingDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={confirmDelete}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DataGrid>
    );
}
