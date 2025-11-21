import React, { useEffect, useState } from 'react';
import { useCall } from '@/providers/CallContextProvider';
import { FloatingDialerButton } from './FloatingDialerButton';
import { PhoneDialer } from './PhoneDialer';
import { ActiveCallWidget } from './ActiveCallWidget';

/**
 * DialerIntegration
 * Main integration component that wires together all dialer components
 * with the CallContext state management
 */
export function DialerIntegration() {
    const {
        // Dialer state
        dialerOpen,
        dialedNumber,
        recentCalls,
        quickDialContacts,

        // Call state
        activeCall,
        incomingCall,
        isMuted,
        isSpeakerOn,

        // Dialer actions
        openDialer,
        closeDialer,
        addDigit,
        removeLastDigit,
        clearDialedNumber,
        initiateCall,

        // Call actions
        toggleMute,
        toggleSpeaker,
        endCall,
        answerCall,
        declineCall,

        // Audio device actions
        switchMicrophone,
        switchSpeaker,

        // Data actions
        toggleContactFavorite,
    } = useCall();

    const [missedCallsCount, setMissedCallsCount] = useState(0);
    const [callDuration, setCallDuration] = useState(0);

    // Calculate missed calls count
    useEffect(() => {
        const missedCount = recentCalls.filter((call) => call.status === 'missed').length;
        setMissedCallsCount(missedCount);
    }, [recentCalls]);

    // Update call duration for active calls
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (activeCall && activeCall.status === 'active' && activeCall.answered_at) {
            // Initialize duration
            const startTime = new Date(activeCall.answered_at).getTime();
            const updateDuration = () => {
                const now = Date.now();
                const seconds = Math.floor((now - startTime) / 1000);
                setCallDuration(seconds);
            };

            updateDuration();
            interval = setInterval(updateDuration, 1000);
        } else {
            setCallDuration(0);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [activeCall]);

    // Handle call initiation from dial pad
    const handleCall = async () => {
        if (dialedNumber) {
            await initiateCall(dialedNumber);
        }
    };

    // Handle call back from recent calls
    const handleCallBack = async (call: { contact_number: string }) => {
        await initiateCall(call.contact_number);
    };

    // Handle quick dial contact call
    const handleContactCall = async (contact: { phone_number: string }) => {
        await initiateCall(contact.phone_number);
    };

    // Determine call status for widget
    const getCallStatus = (): 'ringing' | 'connecting' | 'active' | 'on_hold' => {
        if (!activeCall) {
            return 'ringing';
        }

        if (activeCall.status === 'on_hold') {
            return 'on_hold';
        }

        if (activeCall.status === 'active' || activeCall.status === 'answered') {
            return 'active';
        }

        if (activeCall.status === 'ringing') {
            return 'ringing';
        }

        return 'connecting';
    };

    // Handle hold toggle
    const handleHoldToggle = () => {
        // TODO: Implement actual hold/resume API call
        console.log('Hold toggle');
    };

    const currentCall = incomingCall || activeCall;

    return (
        <>
            {/* Floating Dialer Button - Always visible */}
            {!currentCall && (
                <FloatingDialerButton
                    onClick={openDialer}
                    missedCallsCount={missedCallsCount}
                />
            )}

            {/* Main Dialer Sheet */}
            <PhoneDialer
                open={dialerOpen}
                onOpenChange={closeDialer}
                dialedNumber={dialedNumber}
                onDigitPress={addDigit}
                onBackspace={removeLastDigit}
                onClearNumber={clearDialedNumber}
                onCall={handleCall}
                recentCalls={recentCalls}
                quickDialContacts={quickDialContacts}
                onCallBack={handleCallBack}
                onContactCall={handleContactCall}
                onToggleFavorite={toggleContactFavorite}
            />

            {/* Active Call Widget - Shows during calls */}
            {currentCall && (
                <ActiveCallWidget
                    callId={currentCall.id}
                    contactName={
                        currentCall.call_direction === 'inbound'
                            ? currentCall.caller.name
                            : currentCall.callee.name
                    }
                    contactAvatar={
                        currentCall.call_direction === 'inbound'
                            ? currentCall.caller.avatar
                            : currentCall.callee.avatar
                    }
                    duration={callDuration}
                    status={getCallStatus()}
                    isMuted={isMuted}
                    isOnHold={currentCall.status === 'on_hold'}
                    isSpeakerOn={isSpeakerOn}
                    onMuteToggle={toggleMute}
                    onHoldToggle={handleHoldToggle}
                    onHangup={endCall}
                    onSpeakerToggle={toggleSpeaker}
                    onKeypadToggle={() => {
                        // Open dialer for DTMF input during call
                        openDialer();
                    }}
                />
            )}
        </>
    );
}
