import { useEffect, useCallback } from 'react';
import { useEcho } from '@laravel/echo-react';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';
import { useNotificationSound, type NotificationSoundType } from './useNotificationSound';

interface TaskReminderData {
    task: {
        id: number;
        title: string;
        description?: string;
        priority: {
            value: 'low' | 'medium' | 'high' | 'urgent';
            label: string;
            color: string;
        };
        due_at: string;
        due_at_formatted: string;
        taskable_type?: string;
        taskable_id?: number;
    };
    reminder_type?: 'urgent' | 'due_soon';
    overdue_hours?: number;
    timestamp: string;
}

interface UseTaskReminderListenerOptions {
    userId: number;
    enabled?: boolean;
    soundEnabled?: boolean;
}

export function useTaskReminderListener(options: UseTaskReminderListenerOptions) {
    const { userId, enabled = true, soundEnabled = true } = options;
    const { play, hasPermission, requestPermission } = useNotificationSound({
        enabled: soundEnabled,
    });

    console.log('useTaskReminderListener', { userId, enabled, soundEnabled })

    const getSoundType = useCallback((data: TaskReminderData, isOverdue: boolean): NotificationSoundType => {
        if (isOverdue) {
            return 'overdue';
        }

        if (data.task.priority.value === 'urgent' || data.reminder_type === 'urgent') {
            return 'urgent';
        }

        if (data.task.priority.value === 'high') {
            return 'high';
        }

        return 'normal';
    }, []);

    const handleTaskDueReminder = useCallback((data: TaskReminderData) => {
        if (!enabled) {
            return;
        }

        console.log('handleTaskDueReminder called', data);

        // Play sound
        if (soundEnabled) {
            play(getSoundType(data, false));
        }

        const { task, reminder_type } = data;
        let title = '';
        let description = '';

        if (reminder_type === 'urgent') {
            title = `Task Due Soon: ${task.title}`;
            description = `Due at ${task.due_at_formatted}`;
        } else {
            title = `Upcoming Task: ${task.title}`;
            description = `Due at ${task.due_at_formatted}`;
        }

        toast(title, {

            description,
            duration: 7000,
            action: {
                label: 'View Task',
                onClick: () => {
                    if (task.taskable_type === 'App\\Models\\Lead') {
                        router.visit(`/leads/${task.taskable_id}`);
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
                toast: 'toast',
                actionButton: 'action-button',
            },
        });
    }, [enabled, soundEnabled, hasPermission, play, getSoundType]);

    const handleTaskOverdue = useCallback((data: TaskReminderData) => {
        if (!enabled) {
            return;
        }

        console.log('handleTaskOverdue called', data);

        // Play sound
        if (soundEnabled) {
            play(getSoundType(data, true));
        }

        const { task, overdue_hours } = data;
        const hoursText = overdue_hours && overdue_hours > 0
            ? `${Math.floor(overdue_hours)} hour${Math.floor(overdue_hours) > 1 ? 's' : ''} overdue`
            : 'overdue';

        toast(`Task Overdue: ${task.title}`, {
            description: `This task is ${hoursText}`,
            duration: 10000,
            action: {
                label: 'View Task',
                onClick: () => {
                    if (task.taskable_type === 'App\\Models\\Lead') {
                        router.visit(`/leads/${task.taskable_id}`);
                    }
                },
            },
            actionButtonStyle: {
                backgroundColor: 'hsl(var(--destructive))',
                color: 'hsl(var(--destructive-foreground))',
                borderRadius: '0.375rem',
                padding: '0.375rem 0.75rem',
                border: 'none',
            },
            classNames: {
                toast: 'border-destructive bg-destructive/10',
            },
        });
    }, [enabled, soundEnabled, hasPermission, play, getSoundType]);

    useEcho(`users.${userId}`, '.task.due.reminder', (event: any) => {
        handleTaskDueReminder(event);
    });

    useEcho(`users.${userId}`, '.task.overdue', (event: any) => {
        handleTaskOverdue(event);
    });

    useEffect(() => {
        if (!enabled) {
            return;
        }

        // Request notification permission if needed
        if (soundEnabled && !hasPermission) {
            requestPermission();
        }
    }, [
        enabled,
        userId,
        soundEnabled,
        hasPermission,
        requestPermission,
        handleTaskDueReminder,
        handleTaskOverdue,
    ]);

    return {
        hasPermission,
        requestPermission,
    };
}
