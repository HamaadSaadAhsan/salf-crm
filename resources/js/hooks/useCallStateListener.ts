import { useEcho } from '@laravel/echo-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export interface CallStateData {
    session_id: string;
    status: 'initiated' | 'ringing' | 'answered' | 'ended' | 'failed';
    caller_id?: number;
    caller_number?: string;
    callee_number?: string;
    lead_id?: number;
    end_reason?: string;
    timestamp: string;
}

export interface CallStatusData {
    session_id: string;
    status: 'ringing' | 'answered' | 'ended' | 'declined';
    lead_id?: number;
    end_reason?: string;
    timestamp: string;
}

interface UseCallStateListenerOptions {
    onStateChange?: (data: CallStateData) => void;
    onStatusChange?: (data: CallStatusData) => void;
    showToasts?: boolean;
}

/**
 * Hook to listen to call state and status changes from Laravel broadcasts
 * Listens to the authenticated user's channel for all their call updates
 */
export function useCallStateListener(options: UseCallStateListenerOptions = {}) {
    const { onStateChange, onStatusChange, showToasts = true } = options;
    const callbacksRef = useRef({ onStateChange, onStatusChange });

    // Update callbacks ref when they change
    useEffect(() => {
        callbacksRef.current = { onStateChange, onStatusChange };
    }, [onStateChange, onStatusChange]);

    // Listen to call state changes on user's private channel
    useEcho('user.{userId}', '.call.state.changed', (data: CallStateData) => {
        console.log('Call state changed:', data);

        // Show toast notification
        if (showToasts) {
            switch (data.status) {
                case 'initiated':
                    toast.info('Call initiated', {
                        description: `Calling ${data.callee_number}...`,
                    });
                    break;
                case 'ringing':
                    toast.info('Ringing...', {
                        description: `Calling ${data.callee_number}`,
                    });
                    break;
                case 'answered':
                    toast.success('Call connected', {
                        description: `Connected with ${data.callee_number}`,
                    });
                    break;
                case 'ended':
                    toast.info('Call ended', {
                        description: data.end_reason ? `Reason: ${data.end_reason}` : undefined,
                    });
                    break;
                case 'failed':
                    toast.error('Call failed', {
                        description: data.end_reason ? `Reason: ${data.end_reason}` : 'Unable to connect',
                    });
                    break;
            }
        }

        // Call the callback
        if (callbacksRef.current.onStateChange) {
            callbacksRef.current.onStateChange(data);
        }
    });

    // Listen to call status changes on user's private channel
    useEcho('user.{userId}', '.call.status.changed', (data: CallStatusData) => {
        console.log('Call status changed:', data);

        // Show toast notification
        if (showToasts) {
            switch (data.status) {
                case 'ringing':
                    toast.info('Ringing...');
                    break;
                case 'answered':
                    toast.success('Call answered');
                    break;
                case 'ended':
                    toast.info('Call ended');
                    break;
                case 'declined':
                    toast.warning('Call declined');
                    break;
            }
        }

        // Call the callback
        if (callbacksRef.current.onStatusChange) {
            callbacksRef.current.onStatusChange(data);
        }
    });
}

/**
 * Hook to listen to a specific call session's updates
 * Useful when displaying call details page
 */
export function useCallSessionListener(
    sessionId: string | null | undefined,
    options: UseCallStateListenerOptions = {}
) {
    const { onStateChange, onStatusChange, showToasts = false } = options;
    const callbacksRef = useRef({ onStateChange, onStatusChange });

    // Update callbacks ref when they change
    useEffect(() => {
        callbacksRef.current = { onStateChange, onStatusChange };
    }, [onStateChange, onStatusChange]);

    // Only subscribe if we have a session ID
    const channelName = sessionId ? `call-session.${sessionId}` : '';

    // Listen to call state changes on specific call session channel
    useEcho(
        channelName,
        '.call.state.changed',
        (data: CallStateData) => {
            console.log('Call session state changed:', data);

            if (showToasts) {
                toast.info(`Call ${data.status}`, {
                    description: data.end_reason ? `Reason: ${data.end_reason}` : undefined,
                });
            }

            if (callbacksRef.current.onStateChange) {
                callbacksRef.current.onStateChange(data);
            }
        },
        { enabled: !!sessionId }
    );

    // Listen to call status changes on specific call session channel
    useEcho(
        channelName,
        '.call.status.changed',
        (data: CallStatusData) => {
            console.log('Call session status changed:', data);

            if (showToasts) {
                toast.info(`Call ${data.status}`);
            }

            if (callbacksRef.current.onStatusChange) {
                callbacksRef.current.onStatusChange(data);
            }
        },
        { enabled: !!sessionId }
    );
}
