import { useOutboundCalls, type OutboundCall } from '@/hooks/useOutboundCalls';
import { useAsteriskWebSocket } from '@/contexts/AsteriskWebSocketContext';
import React, { useState, useEffect, useMemo } from 'react';
import { OutboundCallNotification } from './OutboundCallNotification';
import { NewLeadCallDialog } from '../inbound-calls/NewLeadCallDialog';
import type { ActiveCall } from '@/hooks/useInboundCalls';

/**
 * Convert OutboundCall to ActiveCall format for NewLeadCallDialog compatibility
 */
function toActiveCall(outboundCall: OutboundCall): ActiveCall {
    return {
        // Required InboundCallData fields
        event: outboundCall.status === 'connected' ? 'connect' : 'ring',
        caller: outboundCall.phoneNumber,
        exten: '', // Not applicable for outbound
        uniqueid: outboundCall.uniqueid,
        linkedid: outboundCall.linkedid,
        sessionId: outboundCall.sessionId || '',
        direction: 'outbound',
        call_direction: 'outbound',
        timestamp: new Date().toISOString(),
        // Lead data - convert OutboundCallLead to ActiveCall lead format
        lead: outboundCall.lead ? {
            id: outboundCall.lead.id,
            name: outboundCall.lead.name,
            email: outboundCall.lead.email,
            phone: outboundCall.lead.phone,
            city: outboundCall.lead.city,
            country: outboundCall.lead.country,
            service: outboundCall.lead.service,
            inquiry_status: outboundCall.lead.inquiry_status || 'new',
            priority: outboundCall.lead.priority || 'medium',
            detail: outboundCall.lead.detail,
            budget: outboundCall.lead.budget,
        } : undefined,
        // ActiveCall specific fields
        startTime: outboundCall.startTime,
        duration: outboundCall.duration,
        isOwner: true, // Always owner of outbound calls
        isCoverageCall: false, // Never a coverage call for outbound
    };
}

export function OutboundCallManager() {
    const { activeOutboundCall, clearOutboundCall, updateLeadFromCall, createLeadFromCall } = useOutboundCalls();
    const { actions } = useAsteriskWebSocket();
    const [showNotification, setShowNotification] = useState(true);
    const [showLeadDialog, setShowLeadDialog] = useState(false);

    // Convert outbound call to ActiveCall format for the dialog
    const activeCallForDialog = useMemo(() => {
        if (!activeOutboundCall) {
            return null;
        }

        const activeCall = toActiveCall(activeOutboundCall);
        console.log('OutboundCallManager: Converting to ActiveCall', {
            originalLead: activeOutboundCall.lead,
            convertedLead: activeCall.lead,
            hasLead: !!activeCall.lead,
        });
        return activeCall;
    }, [activeOutboundCall]);

    useEffect(() => {
        console.log('OutboundCallManager: activeOutboundCall changed', {
            activeOutboundCall,
            status: activeOutboundCall?.status,
            hasLead: !!activeOutboundCall?.lead,
            leadData: activeOutboundCall?.lead,
            leadId: activeOutboundCall?.leadId,
        });

        if (!activeOutboundCall) {
            // Call ended - reset everything
            console.log('OutboundCallManager: Call ended, resetting state');
            setShowNotification(false);
            setShowLeadDialog(false);
            return;
        }

        // Handle different call statuses
        switch (activeOutboundCall.status) {
            case 'initiating':
            case 'ringing':
                // Show notification only during initiating/ringing
                setShowNotification(true);
                setShowLeadDialog(false);
                break;
            case 'connected':
                // Auto-open lead dialog when call connects
                console.log('OutboundCallManager: Call connected, opening lead dialog', {
                    hasLead: !!activeOutboundCall.lead,
                    leadId: activeOutboundCall.leadId,
                });
                setShowLeadDialog(true);
                setShowNotification(false);
                break;
            case 'failed':
            case 'ended':
                // Call ended or failed - reset
                setShowNotification(false);
                setShowLeadDialog(false);
                break;
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
        setShowLeadDialog(false);
    };

    const handleOpenLeadDialog = () => {
        console.log('OutboundCallManager: Opening lead dialog');
        setShowNotification(false);
        setShowLeadDialog(true);
    };

    const handleCloseLeadDialog = () => {
        console.log('OutboundCallManager: Closing lead dialog');
        setShowLeadDialog(false);
        // Show notification again if call is still active
        if (activeOutboundCall && ['initiating', 'ringing', 'connected'].includes(activeOutboundCall.status)) {
            setShowNotification(true);
        }
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

            {/* Lead Dialog - shows when user clicks button or auto-opens on connect */}
            {activeCallForDialog && (
                <NewLeadCallDialog
                    isOpen={showLeadDialog}
                    onClose={handleCloseLeadDialog}
                    call={activeCallForDialog}
                    onUpdateLead={updateLeadFromCall}
                    onCreateLead={createLeadFromCall}
                />
            )}
        </>
    );
}
