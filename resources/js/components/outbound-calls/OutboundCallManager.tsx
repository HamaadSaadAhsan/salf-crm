import { useOutboundCalls, type OutboundCall } from '@/hooks/useOutboundCalls';
import { useAsteriskWebSocket } from '@/contexts/AsteriskWebSocketContext';
import axios from 'axios';
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
    const [resolvedLead, setResolvedLead] = useState<OutboundCall['lead'] | null>(null);
    const [isFetchingLead, setIsFetchingLead] = useState(false);

    // Convert outbound call to ActiveCall format for the dialog
    const activeCallForDialog = useMemo(() => {
        if (!activeOutboundCall) {
            return null;
        }

        // Prefer the lead we resolved/fetched, fall back to the one on the call
        const callWithLead: OutboundCall = {
            ...activeOutboundCall,
            lead: resolvedLead || activeOutboundCall.lead,
        };

        return toActiveCall(callWithLead);
    }, [activeOutboundCall, resolvedLead]);

    useEffect(() => {
        console.log('OutboundCallManager: activeOutboundCall changed', {
            activeOutboundCall,
            status: activeOutboundCall?.status,
            hasLead: !!activeOutboundCall?.lead,
        });

        if (!activeOutboundCall) {
            // Call ended - reset everything
            console.log('OutboundCallManager: Call ended, resetting state');
            setShowNotification(false);
            setShowLeadDialog(false);
            setResolvedLead(null);
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
                // Auto-open lead dialog when call connects.
                // If we only have leadId, fetch full lead details before showing.
                console.log('OutboundCallManager: Call connected, preparing lead dialog');

                if (!activeOutboundCall.lead && activeOutboundCall.leadId && !resolvedLead && !isFetchingLead) {
                    setIsFetchingLead(true);
                    axios
                        .get(`/api/leads/${activeOutboundCall.leadId}`)
                        .then((response) => {
                            const leadData = response.data?.data;
                            if (leadData) {
                                setResolvedLead({
                                    id: String(leadData.id),
                                    name: leadData.name,
                                    phone: leadData.phone,
                                    email: leadData.email ?? undefined,
                                    city: leadData.city ?? undefined,
                                    country: leadData.country ?? undefined,
                                    service: leadData.service ? { id: leadData.service.id, name: leadData.service.name } : undefined,
                                    inquiry_status: leadData.inquiry_status ?? undefined,
                                    priority: leadData.priority ?? undefined,
                                });
                            }
                        })
                        .catch((error) => {
                            console.error('Failed to fetch lead details for outbound call', error);
                        })
                        .finally(() => {
                            setIsFetchingLead(false);
                            setShowLeadDialog(true);
                            setShowNotification(false);
                        });
                } else {
                    setShowLeadDialog(true);
                    setShowNotification(false);
                }
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
