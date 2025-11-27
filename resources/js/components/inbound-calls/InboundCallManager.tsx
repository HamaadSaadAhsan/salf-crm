import { useInboundCalls } from '@/hooks/useInboundCalls';
import React, { useState } from 'react';
import { InboundCallNotification } from './InboundCallNotification';
import { NewLeadCallDialog } from './NewLeadCallDialog';

export function InboundCallManager() {
    const { activeCall, updateLeadFromCall } = useInboundCalls();
    const [showNotification, setShowNotification] = useState(true);
    const [showLeadDialog, setShowLeadDialog] = useState(false);

    React.useEffect(() => {
        console.log('InboundCallManager: activeCall changed', {
            activeCall,
            hasLead: !!activeCall?.lead,
            leadData: activeCall?.lead
        });

        if (!activeCall) {
            // Call ended - reset everything
            console.log('InboundCallManager: Call ended, resetting state');
            setShowLeadDialog(false);
            setShowNotification(false);
            return;
        }

        if (activeCall.lead) {
            // Automatically show dialog when lead exists
            console.log('InboundCallManager: Opening lead update dialog');
            setShowLeadDialog(true);
            setShowNotification(false);
        } else if (!showLeadDialog) {
            // Only show notification if dialog is not already open
            // This prevents closing the dialog if it's already open with lead data
            setShowNotification(true);
        }
    }, [activeCall, showLeadDialog]);

    if (!activeCall) {
        return null;
    }

    const handleOpenLeadDialog = () => {
        setShowNotification(false);
        setShowLeadDialog(true);
    };

    const handleCloseLeadDialog = () => {
        setShowLeadDialog(false);
        setShowNotification(true);
    };

    const handleDismiss = () => {
        setShowNotification(false);
    };

    return (
        <>
            {/* Call Notification Popup */}
            {showNotification && (
                <InboundCallNotification
                    call={activeCall}
                    onOpenLeadDialog={handleOpenLeadDialog}
                    onOpenNewLeadDialog={handleOpenLeadDialog}
                    onDismiss={handleDismiss}
                />
            )}

            {/* Lead Update Dialog - only shows when lead exists */}
            {activeCall.lead && (
                <NewLeadCallDialog
                    isOpen={showLeadDialog}
                    onClose={handleCloseLeadDialog}
                    call={activeCall}
                    onUpdateLead={updateLeadFromCall}
                />
            )}
        </>
    );
}
