import { useEffect, useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNotificationSound, type NotificationSoundType } from './useNotificationSound';
import { type Task } from '@/types/task';
import { differenceInMinutes, isPast, parseISO } from 'date-fns';
import { router } from '@inertiajs/react';

interface TaskReminderOptions {
    enabled?: boolean;
    soundEnabled?: boolean;
    pollInterval?: number; // in milliseconds
    reminderThresholds?: {
        urgent: number; // minutes before due
        soon: number; // minutes before due
    };
}

interface TaskReminder {
    task: Task;
    type: 'overdue' | 'due_soon' | 'urgent';
    minutesUntilDue: number;
}

const DEFAULT_OPTIONS: Required<TaskReminderOptions> = {
    enabled: true,
    soundEnabled: true,
    pollInterval: 5 * 60 * 1000, // 5 minutes
    reminderThresholds: {
        urgent: 30, // 30 minutes before due
        soon: 120, // 2 hours before due
    },
};

export function useTaskReminders(options: TaskReminderOptions = {}) {
    const config = { ...DEFAULT_OPTIONS, ...options };
    const [reminders, setReminders] = useState<TaskReminder[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const shownNotifications = useRef<Set<string>>(new Set());
    const pollIntervalRef = useRef<number | null>(null);

    const { play, requestPermission, hasPermission } = useNotificationSound({
        enabled: config.soundEnabled,
    });

    const getSoundType = useCallback((reminder: TaskReminder): NotificationSoundType => {
        if (reminder.type === 'overdue') {
            return 'overdue';
        }

        if (reminder.task.priority.value === 'urgent') {
            return 'urgent';
        }

        if (reminder.task.priority.value === 'high') {
            return 'high';
        }

        return 'normal';
    }, []);

    const showNotification = useCallback((reminder: TaskReminder) => {
        const notificationKey = `${reminder.task.id}-${reminder.type}`;

        console.log('showNotification called', { reminder, notificationKey });
        console.log('showNotification called', shownNotifications.current.has(notificationKey));

        // Prevent duplicate notifications
        if (shownNotifications.current.has(notificationKey)) {
            return;
        }

        shownNotifications.current.add(notificationKey);

        // Play sound
        if (config.soundEnabled && hasPermission) {
            play(getSoundType(reminder));
        }

        // Show toast notification
        const { task, type, minutesUntilDue } = reminder;

        let title = '';
        let description = '';

        if (type === 'overdue') {
            const hoursOverdue = Math.abs(Math.floor(minutesUntilDue / 60));
            title = `Task Overdue: ${task.title}`;
            description = hoursOverdue > 0
                ? `This task is ${hoursOverdue} hour${hoursOverdue > 1 ? 's' : ''} overdue`
                : 'This task is overdue';
        } else if (type === 'urgent') {
            title = `Task Due Soon: ${task.title}`;
            description = `Due in ${minutesUntilDue} minutes`;
        } else {
            const hours = Math.floor(minutesUntilDue / 60);
            title = `Upcoming Task: ${task.title}`;
            description = hours > 0
                ? `Due in ${hours} hour${hours > 1 ? 's' : ''}`
                : `Due in ${minutesUntilDue} minutes`;
        }

        toast(title, {
            description,
            duration: 7000,
            action: {
                label: 'View Task',
                onClick: () => {
                    if (task.taskable_type === 'App\\Models\\Lead' && task.taskable_id) {
                        router.visit(`/leads/${task.taskable_id}`);
                    } else {
                        router.visit('/tasks');
                    }
                },
            },
            actionButtonStyle: {
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                borderRadius: '0.375rem',
                padding: '0.375rem 0.75rem',
                border: 'none',
            },
            classNames: {
                toast: 'group toast pointer-events-auto',
                actionButton: 'pointer-events-auto',
            },
        });
    }, [config.soundEnabled, hasPermission, play, getSoundType]);

    const analyzeTask = useCallback((task: Task): TaskReminder | null => {
        // Skip completed tasks
        if (task.is_completed || task.completed_at) {
            return null;
        }

        // Skip tasks without due dates
        if (!task.due_at) {
            return null;
        }

        const now = new Date();
        const dueDate = parseISO(task.due_at);
        const minutesUntilDue = differenceInMinutes(dueDate, now);

        // Task is overdue
        if (isPast(dueDate)) {
            return {
                task,
                type: 'overdue',
                minutesUntilDue,
            };
        }

        // Task is due within urgent threshold
        if (minutesUntilDue <= config.reminderThresholds.urgent) {
            return {
                task,
                type: 'urgent',
                minutesUntilDue,
            };
        }

        // Task is due within soon threshold
        if (minutesUntilDue <= config.reminderThresholds.soon) {
            return {
                task,
                type: 'due_soon',
                minutesUntilDue,
            };
        }

        return null;
    }, [config.reminderThresholds]);

    const fetchPendingReminders = useCallback(async () => {
        if (!config.enabled) {
            return;
        }

        try {
            const response = await fetch('/api/tasks/pending-reminders');

            if (!response.ok) {
                throw new Error('Failed to fetch pending reminders');
            }

            const data = await response.json();
            const tasks: Task[] = data.data || [];

            // Analyze tasks and create reminders
            const newReminders: TaskReminder[] = tasks
                .map(analyzeTask)
                .filter((reminder): reminder is TaskReminder => reminder !== null);

            setReminders(newReminders);

            // Show notifications for new reminders
            newReminders.forEach(showNotification);

        } catch (error) {
            console.error('Error fetching task reminders:', error);
        } finally {
            setIsLoading(false);
        }
    }, [config.enabled, analyzeTask, showNotification]);

    // Request notification permission on mount
    useEffect(() => {
        if (config.enabled && config.soundEnabled && !hasPermission) {
            requestPermission();
        }
    }, [config.enabled, config.soundEnabled, hasPermission, requestPermission]);

    // Set up polling
    useEffect(() => {
        if (!config.enabled) {
            return;
        }

        // Fetch immediately
        fetchPendingReminders();

        // Set up interval
        pollIntervalRef.current = window.setInterval(
            fetchPendingReminders,
            config.pollInterval
        );

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [config.enabled, config.pollInterval, fetchPendingReminders]);

    const clearNotifications = useCallback(() => {
        shownNotifications.current.clear();
    }, []);

    return {
        reminders,
        isLoading,
        refetch: fetchPendingReminders,
        clearNotifications,
        hasPermission,
        requestPermission,
    };
}
