import { useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import type { OriginateCallParams, AsteriskWebSocketAction } from '../types';

interface UseCallOptions {
    wsRef: React.MutableRefObject<WebSocket | null>;
    dispatch: React.Dispatch<AsteriskWebSocketAction>;
}

interface UseCallReturn {
    makeCall: (params: OriginateCallParams) => Promise<boolean>;
}

interface CallInitiateResponse {
    success: boolean;
    message?: string;
    signature_data: {
        call_signature: string;
        caller_id: string;
        callee_number: string;
    };
}

/**
 * Hook for making calls via Asterisk
 */
export function useCall({ wsRef, dispatch }: UseCallOptions): UseCallReturn {
    const makeCall = useCallback(
        async (params: OriginateCallParams): Promise<boolean> => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                console.warn('WebSocket is not connected. Cannot make call.');
                toast.warning('Not connected to Asterisk Manager');
                return false;
            }

            try {
                // Step 1: Create call session via API
                const { data } = await axios.post<CallInitiateResponse>('/api/calls/initiate', {
                    phone_number: params.phoneNumber,
                    lead_id: params.leadId,
                });

                if (!data.success) {
                    throw new Error(data.message || 'Failed to initiate call session');
                }

                const { call_signature, caller_id, callee_number } = data.signature_data;

                // Step 2: Send originate action to Asterisk
                const originateAction = {
                    agent: params.extension,
                    client: callee_number,
                    call_signature,
                    lead_id: params.leadId,
                    caller_id,
                };

                wsRef.current.send(JSON.stringify(originateAction));
                dispatch({ type: 'INCREMENT_MESSAGES_SENT' });

                toast.success(`Calling ${callee_number}...`);
                return true;
            } catch (error) {
                console.error('Failed to originate call:', error);

                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                          'Failed to initiate call';

                dispatch({ type: 'ADD_ERROR', payload: errorMessage });
                toast.error(errorMessage);
                return false;
            }
        },
        [wsRef, dispatch]
    );

    return { makeCall };
}
