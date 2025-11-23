import { useInboundCalls } from '@/hooks/useInboundCalls';
import React, { useState } from 'react';
import { ExistingLeadCallDialog } from './ExistingLeadCallDialog';
import { InboundCallNotification } from './InboundCallNotification';
import { NewLeadCallDialog } from './NewLeadCallDialog';

export function InboundCallManager() {
    const { activeCall, createLeadFromCall, saveCallNotes } = useInboundCalls();
    const [showNotification, setShowNotification] = useState(true);
    const [showLeadDialog, setShowLeadDialog] = useState(false);
    const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);

    React.useEffect(() => {
        console.log('InboundCallManager: activeCall changed', {
            activeCall,
            hasLead: !!activeCall?.lead,
            leadData: activeCall?.lead
        });

        if (activeCall) {
            setShowNotification(true);

            // Automatically show the appropriate dialog based on whether lead exists
            if (activeCall.lead) {
                // Lead exists - show existing lead dialog
                console.log('InboundCallManager: Opening existing lead dialog');
                setShowLeadDialog(true);
                setShowNotification(false);
            } else {
                // No lead exists - show new lead creation dialog
                console.log('InboundCallManager: Opening new lead dialog');
                setShowNewLeadDialog(true);
                setShowNotification(false);
            }
        } else {
            // Reset state when call ends
            console.log('InboundCallManager: Call ended, resetting state');
            setShowLeadDialog(false);
            setShowNewLeadDialog(false);
            setShowNotification(true);
        }
    }, [activeCall]);

    if (!activeCall) {
        return null;
    }

    const handleOpenLeadDialog = () => {
        setShowNotification(false);
        setShowLeadDialog(true);
    };

    const handleOpenNewLeadDialog = () => {
        setShowNotification(false);
        setShowNewLeadDialog(true);
    };

    const handleCloseLeadDialog = () => {
        setShowLeadDialog(false);
        setShowNotification(true);
    };

    const handleCloseNewLeadDialog = () => {
        setShowNewLeadDialog(false);
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
                    onOpenNewLeadDialog={handleOpenNewLeadDialog}
                    onDismiss={handleDismiss}
                />
            )}

            {/* Existing Lead Dialog with Notes */}
            {activeCall.lead && (
                <ExistingLeadCallDialog
                    isOpen={showLeadDialog}
                    onClose={handleCloseLeadDialog}
                    call={activeCall}
                    onSaveNotes={saveCallNotes}
                />
            )}

            {/* New Lead Creation Dialog */}
            <NewLeadCallDialog
                isOpen={showNewLeadDialog}
                onClose={handleCloseNewLeadDialog}
                call={activeCall}
                onSubmit={createLeadFromCall}
            />
        </>
    );
}
