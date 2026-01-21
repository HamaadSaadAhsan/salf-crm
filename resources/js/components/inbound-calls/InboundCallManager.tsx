import { useInboundCalls, type ActiveCall } from '@/hooks/useInboundCalls';
import React, { useState, useRef } from 'react';
import { InboundCallNotification } from './InboundCallNotification';
import { NewLeadCallDialog } from './NewLeadCallDialog';

export function InboundCallManager() {
    const { activeCall, updateLeadFromCall, createLeadFromCall } = useInboundCalls();
    const [showNotification, setShowNotification] = useState(true);
    const [showLeadDialog, setShowLeadDialog] = useState(false);

    // Track the last call data so we can keep dialog open after call ends
    const lastOwnedCallRef = useRef<ActiveCall | null>(null);
    // Track showLeadDialog in a ref to avoid stale closure issues
    const showLeadDialogRef = useRef(showLeadDialog);
    showLeadDialogRef.current = showLeadDialog;

    React.useEffect(() => {
        console.log('InboundCallManager: activeCall changed', {
            activeCall,
            hasLead: !!activeCall?.lead,
            leadData: activeCall?.lead,
            isOwner: activeCall?.isOwner,
            event: activeCall?.event
        });

        if (!activeCall) {
            // Call ended - check if we were the owner with dialog open
            // If so, keep the dialog open so user can finish notes
            if (lastOwnedCallRef.current && showLeadDialogRef.current) {
                console.log('InboundCallManager: Call ended but keeping dialog open for notes');
                setShowNotification(false);
                return;
            }

            // Otherwise, reset everything (picked up by another CRO or no dialog was open)
            console.log('InboundCallManager: Call ended or cleared, resetting state');
            setShowLeadDialog(false);
            setShowNotification(false);
            lastOwnedCallRef.current = null;
            return;
        }

        // Update last owned call reference when we become the owner
        if (activeCall.isOwner) {
            lastOwnedCallRef.current = activeCall;
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

    // Get the call data to use (active call or last owned call for dialog)
    const callForDialog = activeCall || lastOwnedCallRef.current;

    // Don't render anything if no active call AND no last owned call with dialog open
    if (!activeCall && !lastOwnedCallRef.current) {
        return null;
    }

    // Don't render anything if we're not the owner and call is connected (and no dialog to keep open)
    if (activeCall?.event === 'connect' && !activeCall.isOwner && !showLeadDialog) {
        return null;
    }

    const handleOpenLeadDialog = () => {
        setShowNotification(false);
        setShowLeadDialog(true);
    };

    const handleCloseLeadDialog = () => {
        setShowLeadDialog(false);
        // Clear the last owned call ref when user explicitly closes
        lastOwnedCallRef.current = null;
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
            {showNotification && activeCall && (
                <InboundCallNotification
                    call={activeCall}
                    onOpenLeadDialog={handleOpenLeadDialog}
                    onOpenNewLeadDialog={handleOpenLeadDialog}
                    onDismiss={handleDismiss}
                />
            )}

            {/* Lead Dialog - shows during ring (when user clicks button) or for owner during connect, or after call ends */}
            {callForDialog && (callForDialog.isOwner || callForDialog.event === 'ring' || (!activeCall && showLeadDialog)) && (
                <NewLeadCallDialog
                    isOpen={showLeadDialog}
                    onClose={handleCloseLeadDialog}
                    call={callForDialog}
                    onUpdateLead={updateLeadFromCall}
                    onCreateLead={createLeadFromCall}
                />
            )}
        </>
    );
}
