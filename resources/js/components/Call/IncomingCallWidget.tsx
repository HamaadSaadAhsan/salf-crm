import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getInitials } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CallSession {
    id: string;
    session_id: string;
    caller: {
        id: string;
        name: string;
        avatar?: string;
    };
    callee: {
        id: string;
        name: string;
        avatar?: string;
    };
    caller_number: string;
    callee_number: string;
    status: 'initiated' | 'ringing' | 'answered' | 'ended' | 'failed';
    call_type: 'voice' | 'video';
    call_direction: 'inbound' | 'outbound';
    started_at: string;
    answered_at?: string;
}

interface IncomingCallWidgetProps {
    callSession: CallSession;
    onAnswer: () => void;
    onDecline: () => void;
    onHangup: () => void;
    onMute: () => void;
    onUnmute: () => void;
    onSpeaker: () => void;
    isMuted?: boolean;
    isSpeakerOn?: boolean;
    isVisible: boolean;
    currentUserId: string;
}

export function IncomingCallWidget({
    callSession,
    onAnswer,
    onDecline,
    onHangup,
    onMute,
    onUnmute,
    onSpeaker,
    isMuted = false,
    isSpeakerOn = false,
    isVisible,
    currentUserId,
}: IncomingCallWidgetProps) {
    const [duration, setDuration] = useState(0);
    const [isMinimized, setIsMinimized] = useState(false);

    const isIncoming = callSession.call_direction === 'inbound' && callSession.callee.id === currentUserId;
    const isOutgoing = callSession.call_direction === 'outbound' && callSession.caller.id === currentUserId;
    const isAnswered = callSession.status === 'answered';
    const isRinging = ['initiated', 'ringing'].includes(callSession.status);

    const displayUser = isIncoming ? callSession.caller : callSession.callee;
    const displayNumber = isIncoming ? callSession.caller_number : callSession.callee_number;

    useEffect(() => {
        if (isAnswered && callSession.answered_at) {
            const startTime = new Date(callSession.answered_at).getTime();

            const interval = setInterval(() => {
                const now = Date.now();
                const elapsed = Math.floor((now - startTime) / 1000);
                setDuration(elapsed);
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [isAnswered, callSession.answered_at]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAnswer = () => {
        if (callSession.id.startsWith('sim-')) {
            onAnswer();
            return;
        }
        router.post(
            `/calls/${callSession.id}/answer`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    onAnswer();
                },
            },
        );
    };

    const handleDecline = () => {
        if (callSession.id.startsWith('sim-')) {
            onDecline();
            return;
        }
        router.post(
            `/calls/${callSession.id}/hangup`,
            { reason: 'declined' },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onDecline();
                },
            },
        );
    };

    const handleHangup = () => {
        if (callSession.id.startsWith('sim-')) {
            onHangup();
            return;
        }
        router.post(
            `/calls/${callSession.id}/hangup`,
            { reason: 'hangup' },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onHangup();
                },
            },
        );
    };

    const handleMuteToggle = () => {
        // If this is a simulated call (used for demo/testing), do not hit the backend.
        if (callSession.id.startsWith('sim-')) {
            if (isMuted) {
                onUnmute();
            } else {
                onMute();
            }
            return;
        }
        const endpoint = isMuted ? 'unmute' : 'mute';
        router.post(
            `/calls/${callSession.id}/${endpoint}`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (isMuted) {
                        onUnmute();
                    } else {
                        onMute();
                    }
                },
            },
        );
    };

    if (!isVisible) return null;

    // Incoming call notification (full screen overlay)
    if (isRinging && isIncoming) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
                <Card className="mx-4 w-full max-w-sm border-green-200 bg-gradient-to-b from-green-50 to-background dark:border-green-800 dark:from-green-950/50 dark:to-background">
                    <CardContent className="space-y-6 p-8 text-center">
                        <div className="space-y-2">
                            <Avatar className="mx-auto h-24 w-24 ring-4 ring-green-500 ring-offset-2">
                                <AvatarImage src={displayUser.avatar} />
                                <AvatarFallback className="bg-green-100 text-2xl text-green-800 dark:bg-green-900 dark:text-green-200">
                                    {getInitials(displayUser.name)}
                                </AvatarFallback>
                            </Avatar>
                            <h2 className="text-xl font-semibold">{displayUser.name}</h2>
                            <p className="font-mono text-muted-foreground">{displayNumber}</p>
                            <p className="animate-pulse text-sm text-green-600 dark:text-green-400">Incoming {callSession.call_type} call...</p>
                        </div>

                        <div className="flex justify-center space-x-8">
                            <Button size="lg" variant="destructive" className="h-16 w-16 rounded-full p-0" onClick={handleDecline}>
                                <PhoneOff className="h-6 w-6" />
                            </Button>
                            <Button size="lg" className="h-16 w-16 rounded-full bg-green-500 p-0 hover:bg-green-600" onClick={handleAnswer}>
                                <Phone className="h-6 w-6" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Active call widget (top-right corner)
    if (isAnswered || (isRinging && isOutgoing)) {
        return (
            <div className={cn('fixed z-40 transition-all duration-300', isMinimized ? 'top-4 right-4' : 'top-4 right-4')}>
                <Card className={cn('border bg-background/95 shadow-lg backdrop-blur-sm', isMinimized ? 'w-48' : 'w-64')}>
                    <CardContent className={cn('p-3', isMinimized ? 'space-y-1' : 'space-y-3')}>
                        {!isMinimized && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={displayUser.avatar} />
                                        <AvatarFallback className="bg-primary/10 text-xs">{getInitials(displayUser.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{displayUser.name}</p>
                                        <p className="font-mono text-xs text-muted-foreground">{displayNumber}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsMinimized(!isMinimized)}>
                                    <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                                </Button>
                            </div>
                        )}

                        <div className={cn('flex items-center justify-between', isMinimized && 'flex-col space-y-1')}>
                            <div className={cn('flex items-center space-x-1 text-xs', isMinimized ? 'justify-center' : '')}>
                                <div className={cn('h-2 w-2 animate-pulse rounded-full', isAnswered ? 'bg-green-500' : 'bg-yellow-500')} />
                                <span className="font-mono">{isAnswered ? formatDuration(duration) : 'Calling...'}</span>
                            </div>

                            {isMinimized && (
                                <Button variant="ghost" size="sm" className="h-6 w-full text-xs" onClick={() => setIsMinimized(false)}>
                                    Expand
                                </Button>
                            )}
                        </div>

                        {!isMinimized && (
                            <div className="flex justify-center space-x-2">
                                <Button
                                    variant={isMuted ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={handleMuteToggle}
                                    disabled={!isAnswered}
                                >
                                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                </Button>
                                <Button
                                    variant={isSpeakerOn ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={onSpeaker}
                                    disabled={!isAnswered}
                                >
                                    <Volume2 className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="sm" className="h-8 w-8 p-0" onClick={handleHangup}>
                                    <PhoneOff className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}
