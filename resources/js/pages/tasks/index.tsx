import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData, Task, User } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { CalendarCheck, CalendarRange, ListChecks, CalendarX } from 'lucide-react';
import { PageHeader } from './page-header';
import { TaskList } from './task-list';
import { cn } from '@/lib/utils';
import * as tasksRoutes from '@/routes/tasks';
import { useEffect, useState } from 'react';
import { useEcho } from '@laravel/echo-react';
import { toast } from 'sonner';

interface TasksIndexProps {
    tasks: Task[];
    users: User[];
    filter: string;
}

export default function TasksIndex({ tasks: initialTasks, users, filter }: TasksIndexProps) {
    const page = usePage<SharedData>();
    const { auth } = page.props;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Tasks', href: '/tasks' },
    ];

    const activeFilter = filter || 'today';
    const [tasks, setTasks] = useState<Task[]>(initialTasks);

    // Update tasks when props change
    useEffect(() => {
        setTasks(initialTasks);
    }, [initialTasks]);

    // Check if the user is super admin
    const isSuperAdmin = auth.user.role === 'Super Admin';

    // Listen for new tasks via websockets (private channel for super admins only)
    useEcho('tasks', '.task.created', (event: { task: Task }) => {
        if (!isSuperAdmin) return;

        setTasks((prevTasks) => {
            // Check if task already exists (avoid duplicates)
            const taskExists = prevTasks.some((t) => t.id === event.task.id);
            if (taskExists) {
                return prevTasks;
            }

            // Add the new task to the beginning of the list
            return [event.task, ...prevTasks];
        });
    });

    useEcho('tasks', '.task.updated', (event: { task: Task }) => {
        console.log('[WebSocket] Task updated event received on tasks channel:', event);
        if (!isSuperAdmin) {
            console.log('[WebSocket] User is not super admin, skipping update');
            return;
        }

        setTasks((prevTasks) => {
            // Find and update the task in the list
            const taskIndex = prevTasks.findIndex((t) => t.id === event.task.id);
            if (taskIndex === -1) {
                console.log('[WebSocket] Task not found in current list:', event.task.id);
                return prevTasks;
            }

            console.log('[WebSocket] Updating task at index:', taskIndex);
            // Create new array with updated task
            const newTasks = [...prevTasks];
            newTasks[taskIndex] = event.task;
            return newTasks;
        });
    });

    useEcho('tasks', '.task.deleted', (event: { task_id: number }) => {
        if (!isSuperAdmin) return;

        setTasks((prevTasks) => {
            // Find the task to get its title before removing
            const deletedTask = prevTasks.find((t) => t.id === event.task_id);

            if (deletedTask) {
                toast.info(`Task "${deletedTask.title}" was deleted`);
            }

            // Remove the deleted task from the list
            return prevTasks.filter((t) => t.id !== event.task_id);
        });
    });

    // Listen for new tasks on the user's personal channel (for assigned tasks)
    useEcho(`users.${auth.user.id}`, '.task.created', (event: { task: Task }) => {
        setTasks((prevTasks) => {
            // Check if a task already exists (avoid duplicates)
            const taskExists = prevTasks.some((t) => t.id === event.task.id);
            if (taskExists) {
                return prevTasks;
            }

            // Add the new task to the beginning of the list
            return [event.task, ...prevTasks];
        });
    });

    // Listen for task updates on user's personal channel (for assigned tasks)
    useEcho(`users.${auth.user.id}`, '.task.updated', (event: { task: Task }) => {
        console.log('[WebSocket] Task updated event received on user channel:', event);
        setTasks((prevTasks) => {
            // Find and update the task in the list
            const taskIndex = prevTasks.findIndex((t) => t.id === event.task.id);
            if (taskIndex === -1) {
                console.log('[WebSocket] Task not found in current list:', event.task.id);
                return prevTasks;
            }

            console.log('[WebSocket] Updating task at index:', taskIndex);
            // Create a new array with an updated task
            const newTasks = [...prevTasks];
            newTasks[taskIndex] = event.task;
            return newTasks;
        });
    });

    // Listen for task deletions on user's personal channel (for assigned tasks)
    useEcho(`users.${auth.user.id}`, '.task.deleted', (event: { task_id: number }) => {
        setTasks((prevTasks) => {
            // Find the task to get its title before removing
            const deletedTask = prevTasks.find((t) => t.id === event.task_id);

            if (deletedTask) {
                toast.info(`Task "${deletedTask.title}" was deleted`);
            }

            // Remove the deleted task from the list
            return prevTasks.filter((t) => t.id !== event.task_id);
        });
    });
    // Hooks automatically handle cleanup on unmounting

    const tabs = [
        {
            value: 'today',
            label: 'Today',
            icon: CalendarCheck,
            cacheTags: ['tasks', 'tasks:today'],
        },
        {
            value: 'week',
            label: 'Week',
            icon: CalendarRange,
            cacheTags: ['tasks', 'tasks:week'],
        },
        {
            value: 'completed',
            label: 'Completed',
            icon: ListChecks,
            cacheTags: ['tasks', 'tasks:completed'],
        },
        {
            value: 'overdue',
            label: 'Overdue',
            icon: CalendarX,
            cacheTags: ['tasks', 'tasks:overdue'],
        },
    ];

    // Prefetch adjacent tabs on the mount for instant navigation
    useEffect(() => {
        tabs.forEach((tab) => {
            if (tab.value !== activeFilter) {
                // Prefetch other tabs with cache tags
                const url = tasksRoutes.index.url({ query: { filter: tab.value } });
                router.prefetch(
                    url,
                    {},
                    {
                        cacheTags: tab.cacheTags,
                        cacheFor: [30, 300], // Fresh for the 30s, stale for 5 min
                    }
                );
            }
        });
    }, [activeFilter]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tasks" />

            <PageHeader users={users} />

            <div className={cn('flex flex-1 flex-col py-0')}>
                {/* Tab Navigation */}
                <div className="border-b">
                    <div className="flex gap-6 px-5">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeFilter === tab.value;
                            const tabUrl = tasksRoutes.index.url({ query: { filter: tab.value } });

                            return (
                                <Link
                                    key={tab.value}
                                    href={tabUrl}
                                    prefetch
                                    cacheTags={tab.cacheTags}
                                    cacheFor={[30, 300]}
                                    preserveScroll
                                    className={cn(
                                        'inline-flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors',
                                        isActive
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-secondary-foreground hover:border-border hover:text-foreground'
                                    )}
                                >
                                    <Icon className="size-4" />
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Task List */}
                <div className="flex-1">
                    <TaskList tasks={tasks} users={users} />
                </div>
            </div>
        </AppLayout>
    );
}
