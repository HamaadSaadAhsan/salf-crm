/**
 * Re-export from modular structure for backwards compatibility
 *
 * @deprecated Import from '@/contexts/asterisk' instead
 */
export {
    AsteriskWebSocketProvider,
    useAsteriskWebSocket,
    type AsteriskMessage,
    type AsteriskConnectionConfig,
    type OriginateCallParams,
    type AsteriskWebSocketState,
    type AsteriskWebSocketAction,
    type AsteriskContextValue,
} from './asterisk';
