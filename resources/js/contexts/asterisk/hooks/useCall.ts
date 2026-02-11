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
        lead_id: number;
        session_id: string;
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
                // Step 1: Create call session via API (phone resolved server-side from lead)
                const { data } = await axios.post<CallInitiateResponse>('/api/calls/initiate', {
                    lead_id: params.leadId,
                });

                if (!data.success) {
                    throw new Error(data.message || 'Failed to initiate call session');
                }

                const { call_signature, caller_id, lead_id, session_id } = data.signature_data;

                // Step 2: Send originate action to Asterisk
                // The Node server will look up the phone number from the lead
                const originateAction = {
                    agent: params.extension,
                    call_signature,
                    lead_id: lead_id || params.leadId,
                    caller_id,
                    session_id,
                };

                wsRef.current.send(JSON.stringify(originateAction));
                dispatch({ type: 'INCREMENT_MESSAGES_SENT' });

                toast.success('Initiating call...');
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
