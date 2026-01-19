import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { OutboundCall } from '@/hooks/useOutboundCalls';
import { Building, MapPin, Phone, PhoneOutgoing, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface OutboundCallNotificationProps {
    call: OutboundCall;
    onOpenLeadDialog?: () => void;
    onDismiss?: () => void;
    onHangup?: () => void;
}

export function OutboundCallNotification({
    call,
    onOpenLeadDialog,
    onDismiss,
    onHangup,
}: OutboundCallNotificationProps) {
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - call.startTime.getTime()) / 1000);
            setDuration(elapsed);
        }, 1000);

        return () => clearInterval(interval);
    }, [call.startTime]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getInitials = (name: string | null | undefined) => {
        if (!name) {
            return '??';
        }
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const statusColors = {
        initiating: 'bg-yellow-500',
        ringing: 'bg-blue-500',
        connected: 'bg-green-500',
        failed: 'bg-red-500',
        ended: 'bg-gray-500',
    };

    const statusLabels = {
        initiating: 'Initiating...',
        ringing: 'Ringing...',
        connected: 'Connected',
        failed: 'Failed',
        ended: 'Ended',
    };

    return (
        <Card className="fixed bottom-4 right-4 z-50 w-96 animate-in slide-in-from-bottom-4 shadow-2xl">
            <div className="flex flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className={`absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full ${statusColors[call.status]}`} />
                            <Avatar className="h-12 w-12 border-2 border-primary/20">
                                <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-blue-500/10 text-blue-600">
                                    {call.lead ? getInitials(call.lead.name) : <PhoneOutgoing className="h-5 w-5" />}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <PhoneOutgoing className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-medium">
                                    {call.lead ? (call.lead.name || 'Unknown Lead') : 'Outgoing Call'}
                                </p>
                            </div>
                            <p className="text-xs text-muted-foreground">To: {call.phoneNumber}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onDismiss}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Lead Info */}
                {call.lead && (
                    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <h3 className="font-semibold">{call.lead.name || 'Unknown Lead'}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {call.lead.inquiry_status && (
                                        <Badge variant="secondary" className="text-xs">
                                            {call.lead.inquiry_status}
                                        </Badge>
                                    )}
                                    {call.lead.priority && (
                                        <Badge variant="outline" className="text-xs">
                                            {call.lead.priority}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        {call.lead.city && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{call.lead.city}</span>
                                {call.lead.country && <span>, {call.lead.country}</span>}
                            </div>
                        )}

                        {call.lead.service && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Building className="h-3 w-3" />
                                <span>{call.lead.service.name}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Call Status */}
                <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
                    <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 animate-pulse rounded-full ${statusColors[call.status]}`} />
                        <span className="text-xs font-medium">{statusLabels[call.status]}</span>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums">{formatDuration(duration)}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    {call.lead && call.status === 'connected' && (
                        <Button variant="outline" className="flex-1" onClick={onOpenLeadDialog}>
                            View Lead
                        </Button>
                    )}
                    {(call.status === 'initiating' || call.status === 'ringing' || call.status === 'connected') && (
                        <Button variant="destructive" className="flex-1" onClick={onHangup}>
                            <Phone className="mr-2 h-4 w-4 rotate-135" />
                            End Call
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}
