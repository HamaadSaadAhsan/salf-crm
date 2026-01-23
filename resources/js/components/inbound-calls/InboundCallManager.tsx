import { useInboundCalls } from '@/hooks/useInboundCalls';
import React, { useState } from 'react';
import { InboundCallNotification } from './InboundCallNotification';
import { NewLeadCallDialog } from './NewLeadCallDialog';

export function InboundCallManager() {
    const { activeCall, updateLeadFromCall, createLeadFromCall } = useInboundCalls();
    const [showNotification, setShowNotification] = useState(true);
    const [showLeadDialog, setShowLeadDialog] = useState(false);

    React.useEffect(() => {
        console.log('InboundCallManager: activeCall changed', {
            activeCall,
            hasLead: !!activeCall?.lead,
            leadData: activeCall?.lead,
            isOwner: activeCall?.isOwner,
            event: activeCall?.event,
        });

        if (!activeCall) {
            // Call ended or cleared (picked up by another CRO) - reset everything
            console.log('InboundCallManager: Call ended or cleared, resetting state');
            setShowLeadDialog(false);
            setShowNotification(false);
            return;
        }

        // For ring events: Show notification to all CROs
        if (activeCall.event === 'ring') {
            console.log('InboundCallManager: Ring event, showing notification');
            setShowNotification(true);
            setShowLeadDialog(false);
            return;
        }

        // For connect events: Only show dialog if we own the call
        if (activeCall.event === 'connect' && activeCall.isOwner) {
            console.log('InboundCallManager: Connect event, we are owner, opening dialog');
            // Automatically show dialog for owner (both new leads and existing leads)
            setShowLeadDialog(true);
            setShowNotification(false);
            return;
        }

        // If we're not the owner and call is connected, hide everything
        if (activeCall.event === 'connect' && !activeCall.isOwner) {
            console.log('InboundCallManager: Connect event but not owner, hiding');
            setShowLeadDialog(false);
            setShowNotification(false);
            return;
        }
    }, [activeCall]);

    // Don't render anything if no active call
    if (!activeCall) {
        return null;
    }

    // Don't render anything if we're not the owner and call is connected
    if (activeCall.event === 'connect' && !activeCall.isOwner) {
        return null;
    }

    const handleOpenLeadDialog = () => {
        setShowNotification(false);
        setShowLeadDialog(true);
    };

    const handleCloseLeadDialog = () => {
        setShowLeadDialog(false);
        // Show notification again during ring or if we're the owner
        if (activeCall?.isOwner || activeCall?.event === 'ring') {
            setShowNotification(true);
        }
    };

    const handleDismiss = () => {
        setShowNotification(false);
    };

    return (
        <>
            {/* Call Notification Popup - shows during ring for all, shows during connect only for owner */}
            {showNotification && (
                <InboundCallNotification
                    call={activeCall}
                    onOpenLeadDialog={handleOpenLeadDialog}
                    onOpenNewLeadDialog={handleOpenLeadDialog}
                    onDismiss={handleDismiss}
                />
            )}

            {/* Lead Dialog - shows during ring (when user clicks button) or for owner during connect */}
            {(activeCall.isOwner || activeCall.event === 'ring') && (
                <NewLeadCallDialog
                    isOpen={showLeadDialog}
                    onClose={handleCloseLeadDialog}
                    call={activeCall}
                    onUpdateLead={updateLeadFromCall}
                    onCreateLead={createLeadFromCall}
                />
            )}
        </>
    );
}
