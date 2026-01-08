import { useOutboundCalls } from '@/hooks/useOutboundCalls';
import { useAsteriskWebSocket } from '@/contexts/AsteriskWebSocketContext';
import React, { useState, useEffect } from 'react';
import { OutboundCallNotification } from './OutboundCallNotification';

export function OutboundCallManager() {
    const { activeOutboundCall, clearOutboundCall } = useOutboundCalls();
    const { actions } = useAsteriskWebSocket();
    const [showNotification, setShowNotification] = useState(true);

    useEffect(() => {
        console.log('OutboundCallManager: activeOutboundCall changed', {
            activeOutboundCall,
            status: activeOutboundCall?.status
        });

        if (!activeOutboundCall) {
            // Call ended - reset notification state
            console.log('OutboundCallManager: Call ended, resetting state');
            setShowNotification(false);
            return;
        }

        // Show notification for active outbound calls
        if (['initiating', 'ringing', 'connected'].includes(activeOutboundCall.status)) {
            setShowNotification(true);
        } else {
            // Call failed or ended
            setShowNotification(false);
        }
    }, [activeOutboundCall]);

    // Don't render anything if no active outbound call
    if (!activeOutboundCall) {
        return null;
    }

    const handleDismiss = () => {
        setShowNotification(false);
    };

    const handleHangup = () => {
        // Send hangup command through WebSocket
        if (activeOutboundCall.uniqueid) {
            actions.sendMessage({
                Action: 'Hangup',
                Channel: `PJSIP/${activeOutboundCall.uniqueid}`,
            });
        }
        clearOutboundCall();
        setShowNotification(false);
    };

    const handleOpenLeadDialog = () => {
        // Could open a lead dialog here if needed
        console.log('Opening lead dialog for outbound call');
    };

    return (
        <>
            {/* Outbound Call Notification Popup */}
            {showNotification && (
                <OutboundCallNotification
                    call={activeOutboundCall}
                    onOpenLeadDialog={handleOpenLeadDialog}
                    onDismiss={handleDismiss}
                    onHangup={handleHangup}
                />
            )}
        </>
    );
}
