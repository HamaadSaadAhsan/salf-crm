import type { Lead } from '@/types/lead';
import { useEcho } from '@laravel/echo-react';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { IncomingCallWidget } from './IncomingCallWidget';
import { LeadDetailsDialog } from './LeadDetailsDialog';

// ——————————————————————————————————————————————————————————
// Types
// ——————————————————————————————————————————————————————————
interface CallParty {
    id: string;
    name: string;
    avatar?: string;
}

export interface CallSession {
    id: string;
    session_id: string;
    caller: CallParty;
    callee: CallParty;
    caller_number: string;
    callee_number: string;
    status: 'initiated' | 'ringing' | 'answered' | 'ended' | 'failed' | 'active' | 'on_hold';
    call_type: 'voice' | 'video';
    call_direction: 'inbound' | 'outbound';
    started_at: string;
    answered_at?: string;
    ended_at?: string;
    duration?: number;
    lead?: any; // Lead data if associated
}

export interface CallLog {
    id: string;
    contact_name: string;
    contact_number: string;
    contact_avatar?: string;
    direction: 'inbound' | 'outbound';
    status: 'completed' | 'missed' | 'rejected' | 'busy';
    duration?: number;
    created_at: string;
}

export interface QuickDialContact {
    id: string;
    name: string;
    phone_number: string;
    avatar?: string;
    is_favorite: boolean;
    call_count?: number;
    last_called_at?: string;
}

export interface AudioDeviceInfo {
    deviceId: string;
    label: string;
    kind: 'audioinput' | 'audiooutput';
}

interface CallContextType {
    // Existing call state
    activeCall: CallSession | null;
    incomingCall: CallSession | null;
    isMuted: boolean;
    isSpeakerOn: boolean;
    isCallWidgetVisible: boolean;

    // Dialer state
    dialerOpen: boolean;
    dialedNumber: string;
    recentCalls: CallLog[];
    quickDialContacts: QuickDialContact[];
    isLoadingCalls: boolean;
    isLoadingContacts: boolean;

    // Audio devices state
    microphones: AudioDeviceInfo[];
    speakers: AudioDeviceInfo[];
    selectedMicrophone: string | null;
    selectedSpeaker: string | null;
    audioPermissionGranted: boolean;

    // Existing call actions
    startCall: (callData: Partial<CallSession>) => void;
    endCall: () => void;
    answerCall: () => void;
    declineCall: () => void;
    toggleMute: () => void;
    toggleSpeaker: () => void;
    showLeadDialog: (lead: any) => void;
    hideLeadDialog: () => void;
    simulateIncomingCall: (callData: CallSession) => void;
    simulateOutgoingCall: (phoneNumber: string) => void;

    // Dialer actions
    openDialer: () => void;
    closeDialer: () => void;
    dialNumber: (number: string) => void;
    addDigit: (digit: string) => void;
    removeLastDigit: () => void;
    clearDialedNumber: () => void;
    initiateCall: (number: string) => Promise<void>;

    // Audio device actions
    getAudioDevices: () => Promise<void>;
    switchMicrophone: (deviceId: string) => void;
    switchSpeaker: (deviceId: string) => void;

    // Data fetching actions
    fetchRecentCalls: () => Promise<void>;
    fetchQuickDialContacts: () => Promise<void>;
    toggleContactFavorite: (contactId: string, isFavorite: boolean) => Promise<void>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

interface CallProviderProps {
    children: ReactNode;
    user: {
        id: number;
        name: string;
        email?: string;
        avatar?: string;
    };
    // echo prop no longer required when using @laravel/echo-react hook,
    // but kept optional for backwards compatibility.
    echo?: any;
}

export function CallContextComponent({ children, user }: CallProviderProps) {
    // Existing call state
    const [activeCall, setActiveCall] = useState<CallSession | null>(null);
    const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const [isCallWidgetVisible, setIsCallWidgetVisible] = useState(false);
    const [showLead, setShowLead] = useState<any>(null);
    const [leadDialogOpen, setLeadDialogOpen] = useState(false);

    // Dialer state
    const [dialerOpen, setDialerOpen] = useState(false);
    const [dialedNumber, setDialedNumber] = useState('');
    const [recentCalls, setRecentCalls] = useState<CallLog[]>([]);
    const [quickDialContacts, setQuickDialContacts] = useState<QuickDialContact[]>([]);
    const [isLoadingCalls, setIsLoadingCalls] = useState(false);
    const [isLoadingContacts, setIsLoadingContacts] = useState(false);

    // Audio devices state
    const [microphones, setMicrophones] = useState<AudioDeviceInfo[]>([]);
    const [speakers, setSpeakers] = useState<AudioDeviceInfo[]>([]);
    const [selectedMicrophone, setSelectedMicrophone] = useState<string | null>(null);
    const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
    const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);

    const channelName = useMemo(() => `user.${user.id}` as const, [user.id]);

    // ——————————————————————————————————————————————————————————
    // useEcho hooks (auto-subscribe / auto-cleanup)
    // NOTE: Our events are custom-named via broadcastAs on the backend,
    // so we listen with a leading dot per Laravel docs.
    // ——————————————————————————————————————————————————————————

    // call.initiated
    useEcho(channelName, '.call.initiated', (event: { callSession: CallSession }) => {
        const call = event.callSession;

        if (call.call_direction === 'inbound' && call.callee.id === user.id.toString()) {
            setIncomingCall(call);
            setIsCallWidgetVisible(true);
            playIncomingCallSound();

            toast('Incoming Call', {
                description: `${call.caller.name} is calling you`,
                duration: Infinity,
                action: {
                    label: 'Answer',
                    onClick: () => answerCall(),
                },
            });
        } else if (call.caller.id === user.id.toString()) {
            // Outgoing call
            setActiveCall(call);
            setIsCallWidgetVisible(true);

            toast.success('Call Initiated', {
                description: `Calling ${call.callee.name}...`,
            });
        }
    });

    // call.answered
    useEcho(channelName, '.call.answered', (event: { callSession: CallSession }) => {
        const call = event.callSession;

        if (incomingCall?.session_id === call.session_id) {
            setIncomingCall(null);
            setActiveCall(call);

            // Lead dialog logic
            if (call.lead) {
                setShowLead(call.lead);
                setLeadDialogOpen(true);
            } else {
                setShowLead({
                    phone: maskPhoneNumber(call.caller_number),
                    isNew: true,
                });
                setLeadDialogOpen(true);
            }

            toast.success('Call Connected', { description: 'Call has been answered' });
        } else if (activeCall?.session_id === call.session_id) {
            setActiveCall(call);
            toast.success('Call Answered', {
                description: `${call.callee.name} answered your call`,
            });
        }
    });

    // call.ended
    useEcho(channelName, '.call.ended', (event: { callSession: CallSession }) => {
        const call = event.callSession;

        if (activeCall?.session_id === call.session_id || incomingCall?.session_id === call.session_id) {
            setActiveCall(null);
            setIncomingCall(null);
            setIsCallWidgetVisible(false);
            setIsMuted(false);
            setIsSpeakerOn(false);

            toast.dismiss();

            const duration = call.duration ? formatCallDuration(call.duration) : 'Unknown';
            toast.info('Call Ended', { description: `Call duration: ${duration}` });
        }
    });

    // ——————————————————————————————————————————————————————————
    // Actions
    // ——————————————————————————————————————————————————————————

    const startCall = (callData: Partial<CallSession>) => {
        const newCall: CallSession = {
            id: callData.id || '',
            session_id: callData.session_id || '',
            caller: callData.caller || { id: user.id.toString(), name: user.name },
            callee: callData.callee || { id: '', name: '' },
            caller_number: callData.caller_number || '',
            callee_number: callData.callee_number || '',
            status: 'initiated',
            call_type: callData.call_type || 'voice',
            call_direction: 'outbound',
            started_at: new Date().toISOString(),
        };

        setActiveCall(newCall);
        setIsCallWidgetVisible(true);
    };

    const endCall = () => {
        setActiveCall(null);
        setIncomingCall(null);
        setIsCallWidgetVisible(false);
        setIsMuted(false);
        setIsSpeakerOn(false);
        toast.dismiss();
    };

    const answerCall = () => {
        // API call is handled by IncomingCallWidget component. This just handles local state.
    };

    const declineCall = () => {
        setIncomingCall(null);
        setIsCallWidgetVisible(false);
        toast.dismiss();
    };

    const toggleMute = () => {
        setIsMuted((prev) => !prev);
        toast.info(!isMuted ? 'Microphone Muted' : 'Microphone Unmuted');
    };

    const toggleSpeaker = () => {
        setIsSpeakerOn((prev) => !prev);
        toast.info(!isSpeakerOn ? 'Speaker On' : 'Speaker Off');
    };

    const showLeadDialog = (lead: Lead) => {
        setShowLead(lead);
        setLeadDialogOpen(true);
    };

    const hideLeadDialog = () => {
        setShowLead(null);
        setLeadDialogOpen(false);
    };

    const simulateIncomingCall = (callData: CallSession) => {
        setIncomingCall(callData);
        setIsCallWidgetVisible(true);

        if (callData.call_direction === 'inbound' && !callData.lead) {
            const maskedPhone = maskPhoneNumber(callData.caller_number);
            const newLead = { phone: maskedPhone, isNew: true };
            setTimeout(() => {
                showLeadDialog(newLead as any);
            }, 1000);
        }

        playIncomingCallSound();
    };

    const simulateOutgoingCall = (phoneNumber: string) => {
        const now = Date.now();
        const outgoingCall: CallSession = {
            id: `sim-out-${now}`,
            session_id: `session-out-${now}`,
            caller: { id: user.id.toString(), name: user.name, avatar: '' },
            callee: { id: 'callee-unknown', name: 'Unknown', avatar: '' },
            caller_number: '+1-555-AGENT',
            callee_number: phoneNumber,
            status: 'initiated',
            call_type: 'voice',
            call_direction: 'outbound',
            started_at: new Date().toISOString(),
        };

        setActiveCall(outgoingCall);
        setIsCallWidgetVisible(true);

        setTimeout(() => {
            setActiveCall((prev) => (prev ? { ...prev, status: 'ringing' } : null));
            toast.info('Ringing...');
        }, 1000);

        setTimeout(() => {
            setActiveCall((prev) => (prev ? { ...prev, status: 'answered', answered_at: new Date().toISOString() } : null));
            toast.success('Call answered');
        }, 3000);
    };

    // ——————————————————————————————————————————————————————————
    // Dialer Actions
    // ——————————————————————————————————————————————————————————

    const openDialer = () => {
        setDialerOpen(true);
    };

    const closeDialer = () => {
        setDialerOpen(false);
    };

    const dialNumber = (number: string) => {
        setDialedNumber(number);
    };

    const addDigit = (digit: string) => {
        setDialedNumber((prev) => prev + digit);
    };

    const removeLastDigit = () => {
        setDialedNumber((prev) => prev.slice(0, -1));
    };

    const clearDialedNumber = () => {
        setDialedNumber('');
    };

    const initiateCall = async (number: string) => {
        try {
            // TODO: Replace with actual API call to backend
            // const response = await axios.post('/api/calls/initiate', {
            //     callee_id: number,
            //     call_type: 'voice',
            // });

            // For now, simulate the call
            simulateOutgoingCall(number);
            closeDialer();
            clearDialedNumber();

            toast.success('Call Initiated', {
                description: `Calling ${formatPhoneNumber(number)}...`,
            });
        } catch (error) {
            console.error('Failed to initiate call:', error);
            toast.error('Call Failed', {
                description: 'Failed to initiate call. Please try again.',
            });
        }
    };

    // ——————————————————————————————————————————————————————————
    // Audio Device Actions
    // ——————————————————————————————————————————————————————————

    const getAudioDevices = async (): Promise<void> => {
        try {
            // Environment and feature detection
            if (typeof window === 'undefined' || typeof navigator === 'undefined') {
                console.warn('[CallProvider] Media devices are not available in this environment.');
                setAudioPermissionGranted(false);
                return;
            }

            if (!('mediaDevices' in navigator) || typeof navigator.mediaDevices?.getUserMedia !== 'function') {
                console.warn('[CallProvider] navigator.mediaDevices or getUserMedia is not available.');
                setAudioPermissionGranted(false);
                toast.error('Media Devices Unavailable', {
                    description: 'Your browser does not support audio devices here. Please try a supported browser over HTTPS.',
                });
                return;
            }

            if (window.isSecureContext === false) {
                // getUserMedia typically requires a secure context (https or localhost)
                toast.warning('Insecure Context', {
                    description: 'Microphone access may be blocked on non-HTTPS pages. Use HTTPS or localhost.',
                });
            }

            // Request permissions first
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((track) => track.stop());

            setAudioPermissionGranted(true);

            // Enumerate devices (guard presence)
            const devices = typeof navigator.mediaDevices.enumerateDevices === 'function'
                ? await navigator.mediaDevices.enumerateDevices()
                : [];

            const audioInputs: AudioDeviceInfo[] = devices
                .filter((device) => device.kind === 'audioinput')
                .map((device) => ({
                    deviceId: device.deviceId,
                    label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`,
                    kind: 'audioinput',
                }));

            const audioOutputs: AudioDeviceInfo[] = devices
                .filter((device) => device.kind === 'audiooutput')
                .map((device) => ({
                    deviceId: device.deviceId,
                    label: device.label || `Speaker ${device.deviceId.slice(0, 5)}`,
                    kind: 'audiooutput',
                }));

            setMicrophones(audioInputs);
            setSpeakers(audioOutputs);

            // Auto-select default devices if none selected
            if (!selectedMicrophone && audioInputs.length > 0) {
                setSelectedMicrophone(audioInputs[0].deviceId);
            }
            if (!selectedSpeaker && audioOutputs.length > 0) {
                setSelectedSpeaker(audioOutputs[0].deviceId);
            }
        } catch (error) {
            console.error('Failed to get audio devices:', error);
            setAudioPermissionGranted(false);
            toast.error('Microphone Access Error', {
                description: 'Could not access microphone. Check permissions and try again.',
            });
        }
    };

    const switchMicrophone = (deviceId: string) => {
        setSelectedMicrophone(deviceId);
        toast.info('Microphone Changed', {
            description: 'Switched to new microphone',
        });
    };

    const switchSpeaker = (deviceId: string) => {
        setSelectedSpeaker(deviceId);
        toast.info('Speaker Changed', {
            description: 'Switched to new speaker',
        });
    };

    // ——————————————————————————————————————————————————————————
    // Data Fetching Actions
    // ——————————————————————————————————————————————————————————

    const fetchRecentCalls = async () => {
        try {
            setIsLoadingCalls(true);

            // TODO: Replace with actual API call
            // const response = await axios.get('/api/calls/recent', {
            //     params: { limit: 50 },
            // });
            // setRecentCalls(response.data.data.calls);

            // Mock data for now
            setRecentCalls([]);
        } catch (error) {
            console.error('Failed to fetch recent calls:', error);
            toast.error('Failed to Load Calls', {
                description: 'Could not load recent calls.',
            });
        } finally {
            setIsLoadingCalls(false);
        }
    };

    const fetchQuickDialContacts = async () => {
        try {
            setIsLoadingContacts(true);

            // TODO: Replace with actual API call
            // const response = await axios.get('/api/contacts/quick-dial');
            // setQuickDialContacts(response.data.data.contacts);

            // Mock data for now
            setQuickDialContacts([]);
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
            toast.error('Failed to Load Contacts', {
                description: 'Could not load quick dial contacts.',
            });
        } finally {
            setIsLoadingContacts(false);
        }
    };

    const toggleContactFavorite = async (contactId: string, isFavorite: boolean) => {
        try {
            // TODO: Replace with actual API call
            // await axios.post(`/api/contacts/${contactId}/toggle-favorite`, {
            //     is_favorite: isFavorite,
            // });

            // Update local state
            setQuickDialContacts((prev) =>
                prev.map((contact) =>
                    contact.id === contactId ? { ...contact, is_favorite: isFavorite } : contact
                )
            );

            toast.success(isFavorite ? 'Added to Favorites' : 'Removed from Favorites');
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            toast.error('Update Failed', {
                description: 'Could not update favorite status.',
            });
        }
    };

    // ——————————————————————————————————————————————————————————
    // Utils
    // ——————————————————————————————————————————————————————————

    const playIncomingCallSound = () => {
        const audio = new Audio('/sounds/incoming-call.mp3');
        audio.loop = true;
        audio.play().catch(() => {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            oscillator.start();
            setTimeout(() => oscillator.stop(), 500);
        });
    };

    const maskPhoneNumber = (phone: string): string => {
        if (!phone) return '';
        if (phone.length <= 4) return phone;
        return phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4);
    };

    const formatCallDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`;
        if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
        return `${remainingSeconds}s`;
    };

    const formatPhoneNumber = (number: string): string => {
        // Remove all non-digit characters
        const cleaned = number.replace(/\D/g, '');

        // US/Canada format: (XXX) XXX-XXXX
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }

        // US/Canada with country code: +1 (XXX) XXX-XXXX
        if (cleaned.length === 11 && cleaned[0] === '1') {
            return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
        }

        // International format with + prefix
        if (number.startsWith('+')) {
            return number;
        }

        // Return original if doesn't match patterns
        return number;
    };

    const validatePhoneNumber = (number: string): boolean => {
        // Remove all non-digit characters
        const cleaned = number.replace(/\D/g, '');

        // Valid if 10 digits (US/Canada) or 11+ digits (international)
        return cleaned.length >= 10;
    };

    // ——————————————————————————————————————————————————————————
    // Effects
    // ——————————————————————————————————————————————————————————

    // Initialize audio devices on mount
    useEffect(() => {
        let cleanup: (() => void) | undefined;

        // Guard for SSR and unsupported browsers
        if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && (navigator as any).mediaDevices) {
            // Attempt to get devices/permissions
            getAudioDevices();

            // Listen for device changes when supported
            const handleDeviceChange = () => {
                getAudioDevices();
            };

            const md = (navigator as any).mediaDevices;
            if (typeof md.addEventListener === 'function') {
                md.addEventListener('devicechange', handleDeviceChange);
                cleanup = () => md.removeEventListener('devicechange', handleDeviceChange);
            } else if ('ondevicechange' in md) {
                const prev = md.ondevicechange as ((this: MediaDevices, ev: Event) => any) | null;
                md.ondevicechange = handleDeviceChange as any;
                cleanup = () => {
                    md.ondevicechange = prev as any;
                };
            }
        }
        // Silently skip if not available (normal for HTTP/non-secure contexts)

        return () => {
            if (cleanup) {
                cleanup();
            }
        };
    }, []);

    // Fetch recent calls and contacts when dialer opens
    useEffect(() => {
        if (dialerOpen) {
            fetchRecentCalls();
            fetchQuickDialContacts();
        }
    }, [dialerOpen]);

    useEffect(() => {
        console.log('[CallProvider] mounted for user', user?.id, 'at', import.meta.url);
    }, [user?.id]);

    const contextValue: CallContextType = {
        // Existing call state
        activeCall,
        incomingCall,
        isMuted,
        isSpeakerOn,
        isCallWidgetVisible,

        // Dialer state
        dialerOpen,
        dialedNumber,
        recentCalls,
        quickDialContacts,
        isLoadingCalls,
        isLoadingContacts,

        // Audio devices state
        microphones,
        speakers,
        selectedMicrophone,
        selectedSpeaker,
        audioPermissionGranted,

        // Existing call actions
        startCall,
        endCall,
        answerCall,
        declineCall,
        toggleMute,
        toggleSpeaker,
        showLeadDialog,
        hideLeadDialog,
        simulateIncomingCall,
        simulateOutgoingCall,

        // Dialer actions
        openDialer,
        closeDialer,
        dialNumber,
        addDigit,
        removeLastDigit,
        clearDialedNumber,
        initiateCall,

        // Audio device actions
        getAudioDevices,
        switchMicrophone,
        switchSpeaker,

        // Data fetching actions
        fetchRecentCalls,
        fetchQuickDialContacts,
        toggleContactFavorite,
    };

    const currentCall = incomingCall || activeCall;

    return (
        <CallContext.Provider value={contextValue}>
            {children}

            {/* Global Call Widget */}
            {currentCall && (
                <IncomingCallWidget
                    callSession={currentCall}
                    onAnswer={answerCall}
                    onDecline={declineCall}
                    onHangup={endCall}
                    onMute={toggleMute}
                    onUnmute={toggleMute}
                    onSpeaker={toggleSpeaker}
                    isMuted={isMuted}
                    isSpeakerOn={isSpeakerOn}
                    isVisible={isCallWidgetVisible}
                    currentUserId={user.id.toString()}
                />
            )}

            {/* Lead Details Dialog */}
            {showLead && <LeadDetailsDialog lead={showLead} open={leadDialogOpen} onOpenChange={setLeadDialogOpen} callSession={currentCall} />}
        </CallContext.Provider>
    );
}

export function useCall() {
    const context = useContext(CallContext);
    if (context === undefined) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
}
