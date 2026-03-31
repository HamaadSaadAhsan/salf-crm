import { useCallback } from 'react';
import { useEcho } from '@laravel/echo-react';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';

interface MessageReceivedEvent {
    message_id: number;
    subject: string;
    preview: string;
    sender_id: number;
    sender_name: string;
    sent_at: string;
}

interface UseMailListenerOptions {
    userId: number;
    enabled?: boolean;
    onMessageReceived?: (event: MessageReceivedEvent) => void;
}

export function useMailListener({ userId, enabled = true, onMessageReceived }: UseMailListenerOptions) {
    const handleMessageReceived = useCallback((event: MessageReceivedEvent) => {
        if (!enabled) return;

        toast.info(`New message from ${event.sender_name}`, {
            description: event.subject,
            duration: 8000,
            action: {
                label: 'View',
                onClick: () => router.visit('/mail'),
            },
        });

        onMessageReceived?.(event);
    }, [enabled, onMessageReceived]);

    useEcho(`user.${userId}`, '.message.received', handleMessageReceived);
}
